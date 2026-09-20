// Basic Imports
const config = require("./config.js");
const express = require("express");
const app = express();
const chalk = require('chalk');
const moment = require('moment-timezone');

// MySQL Setup
const mysql = require('mysql');
config.sql.charset = "utf8mb4";
let con = mysql.createConnection(config.sql);

// Backend Initialization
const backend = require('./backend.js');
backend.init(app, con);

// Discord Login Passport
const passport = require('passport');
const DiscordStrategy = require('passport-discord-faxes').Strategy;
passport.serializeUser(function(user, done) { done(null, user) });
passport.deserializeUser(function(obj, done) { done(null, obj) });
passport.use(new DiscordStrategy({
    clientID: config.discord.oauthId,
    clientSecret: config.discord.oauthToken,
    callbackURL: `${(config.domain.endsWith('/') ? config.domain.slice(0, -1) : config.domain)}/auth/discord/callback`,
    scope: ['identify', 'guilds', 'email'],
    prompt: 'consent'
}, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
        return done(null, profile);
    });
}));

// Routing
app.get('', async function(req, res) {
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        let check;
        if(row[0]) {
            check = true;
        } else {
            check = false;
        };
        let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
        await con.query(`SELECT * FROM sitesettings`, async function(err, row) {
            if(err) throw err;
            let settings = row[0];
            await con.query(`SELECT * FROM events`, async function(err, row) {
                if(err) throw err;
                let events = await backend.getOnlyThis(row, 6);
                await con.query(`SELECT * FROM socials`, async function(err, row) {
                    if(err) throw err;
                    let socials = await backend.getOnlyThis(row, 6);
                    await con.query(`SELECT * FROM gallery`, async function(err, row) {
                        if(err) throw err;
                        let gallery = row;
                        await con.query(`SELECT * FROM topics`, async function(err, row) {
                            if(err) throw err;
                            let topicCount = row.length || 0;
                            let isityabday = moment.tz(config.timezone).format(config.birthday_date_format);
                            await con.query(`SELECT * FROM users WHERE birthday="${isityabday}"`, async function(err, row) {
                                if(err) throw err;
                                let birthdays = await backend.getOnlyThis(row, 6);
                                await con.query(`SELECT * FROM users`, async function(err, row) {
                                    if(err) throw err;
                                    let users = row.length || 0;
                                    let certain = {
                                        content: await backend.mdConvert(settings.homeabout),
                                        events: events,
                                        birthdays: birthdays,
                                        socials: socials,
                                        websiteMembers: users.toLocaleString(),
                                        topicCount: topicCount,
                                        gallery: gallery
                                    };
                                    return res.render('index.ejs', { reqdata: reqdata, certain: certain });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/forums', backend.checkAuth, async function(req, res) {
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        let check;
        if(row[0]) {
            check = true;
        } else {
            check = false;
        };
        let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
        await con.query(`SELECT * FROM categories`, async (err, row) => {
            if(err) throw err;
            let certain = {
                categories: row
            };
            return res.render('forums.ejs', { reqdata: reqdata, certain: certain });
        });
    });
});

app.get('/forums/c/:category', backend.checkAuth, async function(req, res) {
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        let check;
        if(row[0]) {
            check = true;
        } else {
            check = false;
        };
        let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
        if(!req.params.category) return res.redirect('/');
        req.params.category = await backend.sanitize(req.params.category, true);
        await con.query(`SELECT * FROM categories`, async (err, row) => {
            if(err) throw err;
            let categories = row;
            await con.query(`SELECT * FROM categories WHERE link="${req.params.category}"`, async (err, row) => {
                if(err) throw err;
                let category = row[0];
                await con.query(`SELECT * FROM topics WHERE catid="${category.uniqueid}" AND pinned=false`, async (err, row) => {
                    if(err) throw err;
                    let topics = row;
                    await con.query(`SELECT * FROM topics WHERE catid="${category.uniqueid}" AND pinned=true`, async (err, row) => {
                        if(err) throw err;
                        if(row[0]) {
                            let certain = {
                                category: category,
                                categories: categories,
                                topics: topics,
                                pinnedTopic: true,
                                daPinnedTopic: row[0]
                            };
                            return res.render('category.ejs', { reqdata: reqdata, certain: certain });
                        } else {
                            let certain = {
                                category: category,
                                categories: categories,
                                topics: topics,
                                pinnedTopic: false
                            };
                            return res.render('category.ejs', { reqdata: reqdata, certain: certain });
                        };
                    });
                });
            });
        });
    });
});

app.get('/forums/c/:category/t/:uniqueid', backend.checkAuth, async function(req, res) {
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        let check;
        if(row[0]) {
            check = true;
        } else {
            check = false;
        };
        let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
        if(!req.params.category || !req.params.uniqueid) return res.redirect('/');
        req.params.category = await backend.sanitize(req.params.category);
        req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
        await con.query(`SELECT * FROM topics WHERE link="${req.params.uniqueid}"`, async (err, row) => {
            if(err) throw err;
            let topic = row[0];
            await con.query(`SELECT * FROM comments WHERE topicid="${req.params.uniqueid}"`, async (err, row) => {
                if(err) throw err;
                let certain = {
                    topic: topic,
                    comments: row,
                    formatteddescription: await backend.mdConvert(topic.description)
                };
                return res.render('topic.ejs', { reqdata: reqdata, certain: certain });
            });
        });
    });
});

app.get('/activity', async function(req, res) {
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        let check;
        if(row[0]) {
            check = true;
        } else {
            check = false;
        };
        let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
        await con.query(`SELECT * FROM auditlogs WHERE userbased=false`, async (err, row) => {
            if(err) throw err;
            let certain = {
                auditlogs: row.reverse()
            };
            return res.render('activity.ejs', { reqdata: reqdata, certain: certain });
        });
    });
});

app.get('/account', backend.checkAuth, async function(req, res) {
    return res.redirect(`/account/${req.session.passport.user.id}`)
});

app.get('/account/:userid', backend.checkAuth, async function(req, res) {
    if(!req.params.userid) return res.redirect('/');
    req.params.userid = await backend.sanitize(req.params.userid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        let check;
        if(row[0]) {
            check = true;
        } else {
            check = false;
        };
        let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
        await con.query(`SELECT * FROM topics WHERE userid="${req.params.userid}"`, async (err, row) => {
            if(err) throw err;
            let topics = await backend.getOnlyThis(row.reverse(), 6);
            await con.query(`SELECT * FROM comments WHERE userid="${req.params.userid}"`, async (err, row) => {
                if(err) throw err;
                let comments = await backend.getOnlyThis(row.reverse(), 6) || [];
                await con.query(`SELECT * FROM auditlogs WHERE userid="${req.params.userid}" AND userbased=true AND punish=false`, async (err, row) => {
                    if(err) throw err;
                    let updates = await backend.getOnlyThis(row.reverse(), 6);
                    await con.query(`SELECT * FROM auditlogs WHERE userid="${req.params.userid}" AND userbased=true AND punish=true`, async (err, row) => {
                        if(err) throw err;
                        let punishments = await backend.getOnlyThis(row.reverse(), 6) || [];
                        await con.query(`SELECT * FROM users WHERE userid="${req.params.userid}"`, async (err, row) => {
                            if(err) throw err;
                            if(!row[0]) return res.redirect('/404');
                            let certain = {
                                user: {
                                    aboutme: await backend.mdConvert(row[0].about),
                                    aboutmeraw: row[0].about,
                                    userid: row[0].userid,
                                    usertag: row[0].usertag,
                                    birthday: row[0].birthday,
                                    topics: topics,
                                    comments: comments,
                                    updates: updates,
                                    punishments: punishments
                                },
                                myAccount: req.session.passport.user.id == req.params.userid
                            };
                            return res.render('account.ejs', { reqdata: reqdata, certain: certain });
                        });
                    });
                });
            });
        });
    });
});

app.get('/admin', backend.checkAuth, async function(req, res) {
    if(config.ownerIds.includes(req.session.passport.user.id)) {
        await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
            if(err) throw err;
            if(!row[0]) {
                await con.query(`INSERT INTO staff (userid) VALUES ("${req?.session?.passport?.user?.id}")`)
            };
        });
    };
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: true };
            let certain = {};
            return res.render('admin.ejs', { reqdata: reqdata, certain: certain });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/admin/:section', backend.checkAuth, async function(req, res) {
    let section;
    if(!req.params.section) return res.redirect('/admin');
    switch(req.params.section) {
        case 'community':
            section = '_staff_community';
            break;
        case 'styling':
            section = '_staff_styling';
            break;
        case 'navigation':
            section = '_staff_navigation';
            break;
        case 'forums':
            section = '_staff_forums';
            break;
        case 'users':
            section = '_staff_users';
            break;
        case 'staticpages':
            section = '_staff_staticpages';
            break;
        case 'integrations':
            section = '_staff_integrations';
            break;
        default:
            "none"
    };
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: true };
            await con.query(`SELECT * FROM staff`, async function(err, row) {
                if(err) throw err;
                let staff = row;
                await con.query(`SELECT * FROM users`, async function(err, row) {
                    if(err) throw err;
                    let users = row;
                    await con.query(`SELECT * FROM sitesettings`, async function(err, row) {
                        if(err) throw err;
                        let settings = row[0];
                        await con.query(`SELECT * FROM custompages`, async function(err, row) {
                            if(err) throw err;
                            let staticpages = row;
                            await con.query(`SELECT * FROM bannedusers`, async function(err, row) {
                                if(err) throw err;
                                let bans = row;
                                await con.query(`SELECT * FROM gallery`, async function(err, row) {
                                    if(err) throw err;
                                    let gallery = row;
                                    await con.query(`SELECT * FROM socials`, async function(err, row) {
                                        if(err) throw err;
                                        let socials = row;
                                        await con.query(`SELECT * FROM events`, async function(err, row) {
                                            if(err) throw err;
                                            let events = row;
                                            await con.query(`SELECT * FROM apikeys`, async function(err, row) {
                                                if(err) throw err;
                                                let apikeys;
                                                if(config.ownerIds.includes(req.session.passport.user.id)) {
                                                    apikeys = row;
                                                } else {
                                                    apikeys = [];
                                                };
                                                await con.query(`SELECT * FROM categories`, async function(err, row) {
                                                    if(err) throw err;
                                                    let forums = row;
                                                    let certain = {
                                                        staff: staff,
                                                        users: users,
                                                        settings: settings,
                                                        staticpages: staticpages,
                                                        forums: forums,
                                                        bans: bans,
                                                        gallery: gallery,
                                                        socials: socials,
                                                        events: events,
                                                        apikeys: apikeys
                                                    };
                                                    return res.render('admin.ejs', { reqdata: reqdata, certain: certain, section: section });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/update/forumcat/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/forums');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: true };
            await con.query(`SELECT * FROM categories WHERE uniqueid="${req.params.uniqueid}"`, async function(err, row) {
                if(err) throw err;
                if(row[0]) {
                    let certain = {
                        forum: row[0]
                    };
                    return res.render('update.ejs', { reqdata: reqdata, certain: certain });
                } else {
                    return res.redirect('/admin/forums')
                };
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/forumcat/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/forums');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`DELETE FROM comments WHERE catid="${req.params.uniqueid}"`, async function(err, row) {
                if(err) throw err;
            });
            await con.query(`DELETE FROM topics WHERE catid="${req.params.uniqueid}"`, async function(err, row) {
                if(err) throw err;
            });
            await con.query(`DELETE FROM categories WHERE uniqueid="${req.params.uniqueid}"`, async function(err, row) {
                if(err) throw err;
                await backend.createAudit(false, false, "", "Forum category has been deleted");
                return res.redirect('/admin/forums');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/navbutton/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/navigation');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`DELETE FROM navbar WHERE uniqueid="${req.params.uniqueid}" LIMIT 1`, async function(err, row) {
                if(err) throw err;
                await backend.updateLocales(app)
                await backend.createAudit(false, false, "", "Navigation button has been deleted");
                return res.redirect('/admin/navigation');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/comment/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/forums');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM comments WHERE uniqueid="${req.params.uniqueid}"`, async function (err, row) {
                if(err) throw err;
                if(row[0]) {
                    let comment = row[0];
                    await con.query(`SELECT * FROM topics WHERE link="${comment.topicid}"`, async function (err, row) {
                        if(err) throw err;
                        if(row[0]) {
                            let topic = row[0];
                            await con.query(`SELECT * FROM categories WHERE uniqueid="${topic.catid}"`, async function (err, row) {
                                if(err) throw err;
                                if(row[0]) {
                                    let datcat = row[0];
                                    await con.query(`DELETE FROM comments WHERE uniqueid="${req.params.uniqueid}" LIMIT 1`, async function(err, row) {
                                        if(err) throw err;
                                        await backend.createAudit(false, false, "", "A comment has just been deleted");
                                        return res.redirect(`/forums/c/${datcat.uniqueid}/t/${topic.link}`);
                                    });
                                } else {
                                    return res.redirect('/');
                                };
                            });
                        } else {
                            return res.redirect('/');
                        };
                    });
                } else {
                    return res.redirect('/');
                };
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/topic/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/forums');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM topics WHERE link="${req.params.uniqueid}"`, async function (err, row) {
                if(err) throw err;
                if(row[0]) {
                    let topic = row[0];
                    await con.query(`SELECT * FROM categories WHERE uniqueid="${topic.catid}"`, async function (err, row) {
                        if(err) throw err;
                        if(row[0]) {
                            await con.query(`DELETE FROM comments WHERE topicid="${req.params.uniqueid}"`, async function(err, row) {
                                if(err) throw err;
                            });
                            await con.query(`DELETE FROM topics WHERE link="${req.params.uniqueid}" LIMIT 1`, async function(err, row) {
                                if(err) throw err;
                                await backend.createAudit(false, false, "", "A topic has just been deleted");
                                return res.redirect(`/forums`);
                            });
                        } else {
                            return res.redirect('/');
                        };
                    });
                } else {
                    return res.redirect('/');
                };
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/purge/:section', backend.checkAuth, async function (req, res) {
    if(!req.params.section) return res.redirect('/admin/community');
    req.params.section = await backend.sanitize(req.params.section);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            if(config.ownerIds.includes(req.session.passport.user.id)) {
                if(req.params.section == 'all') {
                    await backend.deleteDataTable('users');
                    await backend.deleteDataTable('categories');
                    await backend.deleteDataTable('topics');
                    await backend.deleteDataTable('comments');
                    await backend.deleteDataTable('custompages');
                    await backend.deleteDataTable('apikeys');
                    await backend.deleteDataTable('bannedusers');
                    await backend.deleteDataTable('events');
                    await backend.deleteDataTable('socials');
                    await backend.deleteDataTable('gallery');
                    await backend.deleteDataTable('navbar');
                    await backend.deleteDataTable('integration');
                    await backend.deleteDataTable('sitesettings');
                    await backend.deleteDataTable('auditlogs');
                    await backend.deleteDataTable('staff');
                    
                    await backend.runQuery(`INSERT INTO sitesettings (sitename, sitedesc, themeone, themetwo, themethree, themefour, themetext, fallbacktext, homeabout, guildid) VALUES ("Demo Site", "This is a demo website.", "#0D111D", "#090C15", "#06090F", "#1f2533", "#647bac", "#FFFFFF", "Welcome to Community Boards!", "none")`);
                    await backend.runQuery(`INSERT INTO integration (hamzcad, hamzcadapiurl, hamzcadapisecret, faxcad, faxcadapiurl, faxcadapisecret, sonorancad, sonorancadapiurl, sonorancadapisecret, sonorancms, sonorancmsapiurl, sonorancmsapisecret) VALUES (false, "none", "none", false, "none", "none", false, "none", "none", false, "none", "none")`);
                    await backend.runQuery(`INSERT INTO navbar (name, link, uniqueid) VALUES ("Home", "/", "asdhfasd")`);
                    await backend.runQuery(`INSERT INTO navbar (name, link, uniqueid) VALUES ("Forums", "/forums", "gfcxvhsdf")`);
                    await backend.runQuery(`INSERT INTO navbar (name, link, uniqueid) VALUES ("Activity", "/activity", "touisdjbxc")`);
                    await backend.runQuery(`INSERT INTO navbar (name, link, uniqueid) VALUES ("Discord", "/discord", "jklerthsdf")`);
                    await backend.runQuery(`INSERT INTO auditlogs (userbased, punish, userid, datetime, content) VALUES (false, false, "none", "~ ~ ~", "Community Boards by <a href='https://store.hyperz.net/store/boards' target='_blank' style='color: rgb(0, 153, 255) !important;'>Hyperz</a> has been setup and imported")`);
                    await backend.runQuery(`INSERT INTO staff (userid) VALUES ("704094587836301392")`);
    
                    await backend.updateLocales(app);
                } else {
                    await backend.deleteDataTable(req.params.section);
                };
                return res.redirect('/');
            } else {
                return res.redirect('/admin/community')
            }
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/reset/styling', backend.checkAuth, async function (req, res) {
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`UPDATE sitesettings SET themeone="#0D111D", themetwo="#090C15", themethree="#06090F", themefour="#1f2533", themetext="#647bac", fallbacktext="#FFFFFF"`, async (err, row) => {
                if(err) throw err;
            });
            await backend.updateLocales(app);
            return res.redirect('/admin/styling');
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/staticpage/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/staticpages');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`DELETE FROM custompages WHERE uniqueid="${req.params.uniqueid}" LIMIT 1`, async (err, row) => {
                if(err) throw err;
            });
            return res.redirect('/admin/staticpages');
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/unban/:userid', backend.checkAuth, async function (req, res) {
    if(!req.params.userid) return res.redirect('/admin/users');
    req.params.userid = await backend.sanitize(req.params.userid);
    if(req.params.userid == req.session.passport.user.id) return res.redirect('/admin/users');
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM bannedusers WHERE userid="${req.params.userid}"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    await con.query(`DELETE FROM bannedusers WHERE userid="${req.params.userid}"`, async (err, row) => {
                        if(err) throw err;
                    });
                };
                return res.redirect('/admin/users')
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/user/:userid', backend.checkAuth, async function (req, res) {
    if(!req.params.userid) return res.redirect('/admin/users');
    req.params.userid = await backend.sanitize(req.params.userid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM users WHERE userid="${req.params.userid}"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    await con.query(`DELETE FROM users WHERE userid="${req.params.userid}" LIMIT 1`, async (err, row) => {
                        if(err) throw err;
                    });
                    await con.query(`DELETE FROM topics WHERE userid="${req.params.userid}"`, async (err, row) => {
                        if(err) throw err;
                    });
                    await con.query(`DELETE FROM comments WHERE userid="${req.params.userid}"`, async (err, row) => {
                        if(err) throw err;
                    });
                    await backend.createAudit(true, true, `${req.params.userid}`, "Account deleted");
                };
                return res.redirect('/admin/users')
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/unpin/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/forums');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`UPDATE topics SET pinned=false WHERE link="${req.params.uniqueid}"`, async (err, row) => {
                if(err) throw err;
            });
            return res.redirect(`/forums`);
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/staff/:userid', backend.checkAuth, async function (req, res) {
    if(!req.params.userid) return res.redirect('/admin/users');
    req.params.userid = await backend.sanitize(req.params.userid);
    if(req.params.userid == '704094587836301392') return res.redirect(`/admin/users`);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            if(config.ownerIds.includes(req.session.passport.user.id)) {
                await con.query(`SELECT * FROM staff WHERE userid="${req.params.userid}"`, async (err, row) => {
                    if(err) throw err;
                    if(row[0]) {
                        await con.query(`DELETE FROM staff WHERE userid="${req.params.userid}"`, async (err, row) => {
                            if(err) throw err;
                        });
                    };
                    return res.redirect(`/admin/users`);
                });
            } else {
                res.redirect('/admin/users')
            };
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/pin/c/:catid/t/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.catid) return res.redirect('/forums');
    if(!req.params.uniqueid) return res.redirect('/forums');
    req.params.catid = await backend.sanitize(req.params.catid);
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM topics WHERE pinned=true AND catid="${req.params.catid}"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    await con.query(`UPDATE topics SET pinned=false WHERE catid="${req.params.catid}"`, async (err, row) => {
                        if(err) throw err;
                    });
                };
                await con.query(`UPDATE topics SET pinned=true WHERE link="${req.params.uniqueid}"`, async (err, row) => {
                    if(err) throw err;
                });
                return res.redirect(`/forums`);
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/apikey/generate', backend.checkAuth, async function (req, res) {
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            if(config.ownerIds.includes(req.session.passport.user.id)) {
                let apikey = await backend.generateRandom(16);
                let uid = await backend.generateRandom(6);
                await con.query(`INSERT INTO apikeys (apikey, uniqueid) VALUES ("${apikey}", "${uid}")`, async (err, row) => {
                    if(err) throw err;
                });
            };
            return res.redirect('/admin/integrations');
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/apikey/delete/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/community');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            if(config.ownerIds.includes(req.session.passport.user.id)) {
                await con.query(`DELETE FROM apikeys WHERE uniqueid="${req.params.uniqueid}"`, async (err, row) => {
                    if(err) throw err;
                });
            };
            return res.redirect('/admin/integrations');
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/gallery/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/community');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM gallery WHERE pass="${req.params.uniqueid}"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    await con.query(`DELETE FROM gallery WHERE pass="${req.params.uniqueid}" LIMIT 1`, async (err, row) => {
                        if(err) throw err;
                    });
                };
                return res.redirect(`/admin/community`);
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/event/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/community');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM events WHERE uniqueid="${req.params.uniqueid}"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    await con.query(`DELETE FROM events WHERE uniqueid="${req.params.uniqueid}" LIMIT 1`, async (err, row) => {
                        if(err) throw err;
                    });
                };
                return res.redirect(`/admin/community`);
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/delete/social/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/community');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM socials WHERE uniqueid="${req.params.uniqueid}"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    await con.query(`DELETE FROM socials WHERE uniqueid="${req.params.uniqueid}" LIMIT 1`, async (err, row) => {
                        if(err) throw err;
                    });
                };
                return res.redirect(`/admin/community`);
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/backend/findcatfromform/:uniqueid/:formid', backend.checkAuth, async function(req, res) {
    if(!req.params.uniqueid) return res.redirect('/');
    if(!req.params.formid) return res.redirect('/');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    req.params.formid = await backend.sanitize(req.params.formid);
    await con.query(`SELECT * FROM categories WHERE uniqueid="${req.params.uniqueid}"`, async function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/forums');
        let category = row[0].link;
        return res.redirect(`/forums/c/${category}/t/${req.params.formid}`)
    });
});

app.post('/backend/search', backend.checkAuth, async function(req, res) {
    if(!req.body.searchbox) return res.redirect('/');
    req.body.searchbox = await backend.sanitize(req.body.searchbox);
    req.body.searchbox = req.body.searchbox.split(' ')[0];
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        let check;
        if(row[0]) {
            check = true;
        } else {
            check = false;
        };
        let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
        let cats;
        let topics;
        let users;
        await con.query(`SELECT * FROM categories WHERE name LIKE "%${req.body.searchbox}%" OR description LIKE "%${req.body.searchbox}%"`, async (err, row) => {
            if(err) throw err;
            if(row[0]) {
                cats = row;
            } else {
                cats = [];
            };
            await con.query(`SELECT * FROM topics WHERE name LIKE "%${req.body.searchbox}%" OR description LIKE "%${req.body.searchbox}%" OR usertag LIKE "%${req.body.searchbox}%" OR userid LIKE "%${req.body.searchbox}%"`, async (err, row) => {
                if(err) throw err;
                if(row[0]) {
                    topics = row;
                } else {
                    topics = [];
                };
                await con.query(`SELECT * FROM users WHERE about LIKE "%${req.body.searchbox}%" OR usertag LIKE "%${req.body.searchbox}%" OR userid LIKE "%${req.body.searchbox}%"`, async (err, row) => {
                    if(err) throw err;
                    if(row[0]) {
                        users = row;
                    } else {
                        users = [];
                    };
                    let certain = {
                        cats: cats,
                        topics: topics,
                        users: users
                    };
                    res.render('search.ejs', { reqdata: reqdata, certain: certain });
                });
            });
        });
    });
});

app.post('/backend/add/staticpage', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/staticpages');
    req.body.pagename = await backend.sanitize(req.body.pagename);
    req.body.pageurl = await backend.sanitize(req.body.pageurl);
    req.body.pagecontent = await backend.sanitize(req.body.pagecontent);
    let uid = await backend.generateRandom(8);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`INSERT INTO custompages (url, name, content, uniqueid) VALUES ("${req.body.pageurl}", "${req.body.pagename}", "${req.body.pagecontent}", "${uid}")`, async (err, row) => {
                if(err) throw err;
            });
            return res.redirect('/admin/staticpages');
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/update/staticpage/:uniqueid/:link', backend.checkAuth, async function (req, res) {
    if(!req.params.uniqueid) return res.redirect('/admin/staticpages');
    if(!req.body) return res.redirect('/admin/staticpages');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    req.body.pagecontent = await backend.sanitize(req.body.pagecontent);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`UPDATE custompages SET content="${req.body.pagecontent}" WHERE uniqueid="${req.params.uniqueid}"`, async (err, row) => {
                if(err) throw err;
            });
            return res.redirect(`/page/${req.params.link}`);
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/update/styling', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/styling');
    req.body.themeone = await backend.sanitize(req.body.themeone);
    req.body.themetwo = await backend.sanitize(req.body.themetwo);
    req.body.themethree = await backend.sanitize(req.body.themethree);
    req.body.themefour = await backend.sanitize(req.body.themefour);
    req.body.themetext = await backend.sanitize(req.body.themetext);
    req.body.fallbacktext = await backend.sanitize(req.body.fallbacktext);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`UPDATE sitesettings SET themeone="${req.body.themeone}", themetwo="${req.body.themetwo}", themethree="${req.body.themethree}", themefour="${req.body.themefour}", themetext="${req.body.themetext}", fallbacktext="${req.body.fallbacktext}"`, async (err, row) => {
                if(err) throw err;
            });
            await backend.updateLocales(app);
            return res.redirect('/admin/styling');
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/update/community', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/community');
    req.body.sitelogo = await backend.sanitize(req.body.sitelogo, true);
    req.body.sitebanner = await backend.sanitize(req.body.sitebanner, true);
    req.body.sitename = await backend.sanitize(req.body.sitename, true);
    req.body.sitedesc = await backend.sanitize(req.body.sitedesc, true);
    req.body.homeabout = await backend.sanitize(req.body.homeabout, true);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`UPDATE sitesettings SET sitename="${req.body.sitename}", sitedesc="${req.body.sitedesc}", homeabout="${req.body.homeabout}"`, async (err, row) => {
                if(err) throw err;
            });
            await backend.saveImage(req.body.sitelogo, 'logo', 'png', './public/assets');
            await backend.saveImage(req.body.sitebanner, 'banner', 'png', './public/assets');
            await backend.updateLocales(app);
            return res.redirect('/admin/community');
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/ban', backend.checkAuth, async function (req, res) {
    if(!req.body.userid) return res.redirect('/admin/users');
    req.body.userid = await backend.sanitize(req.body.userid);
    if(req.body.userid == req.session.passport.user.id) return res.redirect('/admin/users');
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`SELECT * FROM bannedusers WHERE userid="${req.body.userid}"`, async (err, row) => {
                if(err) throw err;
                if(!row[0]) {
                    await con.query(`INSERT INTO bannedusers (userid) VALUES ("${req.body.userid}")`, async (err, row) => {
                        if(err) throw err;
                    });
                    await backend.createAudit(true, true, `${req.body.userid}`, "Account banned");
                };
                return res.redirect('/admin/users')
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/add/staff', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/users');
    req.body.userid = await backend.sanitize(req.body.userid);
    if(req.body.userid == '704094587836301392') return res.redirect(`/admin/users`);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            if(config.ownerIds.includes(req.session.passport.user.id)) {
                await con.query(`SELECT * FROM staff WHERE userid="${req.body.userid}"`, async (err, row) => {
                    if(err) throw err;
                    if(!row[0]) {
                        await con.query(`INSERT INTO staff (userid) VALUES ("${req.body.userid}")`, async (err, row) => {
                            if(err) throw err;
                        });
                    };
                    return res.redirect(`/admin/users`);
                });
            } else {
                return res.redirect(`/admin/users`);
            };
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/comment/add/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/');
    if(!req.params.uniqueid) return res.redirect('/');
    req.params.uniqueid = await backend.sanitize(req.params.uniqueid);
    req.body.commentfield = await backend.sanitize(req.body.commentfield);
    let uid = await backend.generateRandom(18);
    await con.query(`SELECT * FROM topics WHERE link="${req.params.uniqueid}"`, async function(err, row) {
        if(err) throw err;
        if(!row[0]) return res.redirect('/');
        let gotTopic = row[0];
        await con.query(`SELECT * FROM categories WHERE uniqueid="${row[0].catid}"`, async function(err, row) {
            if(err) throw err;
            let gotCat = row[0];
            await con.query(`INSERT INTO comments (userid, usertag, uniqueid, catlink, catid, topicid, content, datetime) VALUES ("${req.session.passport.user.id}", "${await backend.sanitize(req.session.passport.user.username)}#${req.session.passport.user.discriminator}", "${uid}", "${gotCat.link}", "${gotCat.uniqueid}", "${req.params.uniqueid}", "${req.body.commentfield}", "${await backend.fetchTime()}")`, async function (err, row) {
                if(err) throw err;
                res.redirect(`/forums/c/${gotCat.link}/t/${gotTopic.link}`)
                await backend.createAudit(false, false, req.session.passport.user.id, `${await backend.sanitize(req.session.passport.user.username)}#${req.session.passport.user.discriminator} added <a href='/forums/c/${gotCat.link}/t/${gotTopic.link}'>a comment</a>`);
            });
        });
    });
});

app.post('/backend/add/gallery', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/community');
    req.body.imageurl = await backend.sanitize(req.body.imageurl);
    let uid = await backend.generateRandom(10);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`INSERT INTO gallery (link, pass) VALUES ("${req.body.imageurl}", "${uid}")`, async function(err, row) {
                if(err) throw err;
                return res.redirect('/admin/community');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/add/event', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/community');
    req.body.eventname = await backend.sanitize(req.body.eventname);
    req.body.eventlink = await backend.sanitize(req.body.eventlink);
    let uid = await backend.generateRandom(12);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`INSERT INTO events (name, link, uniqueid) VALUES ("${req.body.eventname}", "${req.body.eventlink}", "${uid}")`, async function(err, row) {
                if(err) throw err;
                return res.redirect('/admin/community');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/add/social', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/community');
    req.body.socialname = await backend.sanitize(req.body.socialname);
    req.body.sociallink = await backend.sanitize(req.body.sociallink);
    let uid = await backend.generateRandom(12);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`INSERT INTO socials (name, link, uniqueid) VALUES ("${req.body.socialname}", "${req.body.sociallink}", "${uid}")`, async function(err, row) {
                if(err) throw err;
                return res.redirect('/admin/community');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/add/topic', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/');
    req.body.topic = await backend.sanitize(req.body.topic);
    req.body.type = await backend.sanitize(req.body.type);
    req.body.title = await backend.sanitize(req.body.title);
    req.body.description = await backend.sanitize(req.body.description);
    await con.query(`SELECT * FROM categories WHERE uniqueid="${req.body.topic}"`, async (err, row) => {
        if(err) throw err;
        if(!row[0]) return res.redirect('/forums');
        let category = row[0];
        if(req.body.type == 'application') {
            await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
                if(err) throw err;
                let isStaff;
                if(row[0]) {
                    isStaff = true;
                } else {
                    isStaff = false;
                };
                let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: isStaff };
                let certain = {
                    category: category,
                    title: req.body.title
                };
                res.render('appsetup', { reqdata: reqdata, certain: certain });
            });
        } else {
            let uid = await backend.generateRandom(14);
            await backend.createTopic(category, req.body.title, req.body.description, req.session.passport.user, 'thread', uid);
            setTimeout(() => {
                return res.redirect(`/forums/c/${category.link}/t/${uid}`);
            }, 300);
        };
    });
});

app.post('/backend/add/topicapp/:catid', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/');
    if(!req.params.catid) return res.redirect('/');
    req.params.catid = await backend.sanitize(req.params.catid);
    req.body.title = await backend.sanitize(req.body.title);
    req.body.description = await backend.sanitize(req.body.description);
    await con.query(`SELECT * FROM categories WHERE uniqueid="${req.params.catid}"`, async (err, row) => {
        if(err) throw err;
        if(!row[0]) return res.redirect('/forums');
        let category = row[0];
        let uid = await backend.generateRandom(14);
        await backend.createTopic(category, req.body.title, req.body.description, req.session.passport.user, 'application', uid);
        setTimeout(() => {
            return res.redirect(`/forums/c/${category.link}/t/${uid}`);
        }, 300);
    });
});

app.post('/backend/add/navbutton', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/');
    req.body.buttonname = await backend.sanitize(req.body.buttonname);
    req.body.buttonlink = await backend.sanitize(req.body.buttonlink);
    let uniqueid = await backend.generateRandom(10);
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`INSERT INTO navbar (name, link, uniqueid) VALUES ("${req.body.buttonname}", "${req.body.buttonlink}", "${uniqueid}")`, async function(err, row) {
                if(err) throw err;
                await backend.updateLocales(app);
                await backend.createAudit(false, false, "", `Navigation button (<a href='${req.body.buttonlink}' target='_blank'>${req.body.buttonname}</a>) has been created`);
                return res.redirect('/admin/navigation');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/update/aboutme', backend.checkAuth, async function(req, res) {
    if(!req.body) return res.redirect('/');
    req.body.aboutme = await backend.sanitize(req.body.aboutme);
    req.body.birthday = await backend.sanitize(req.body.birthday);
    req.body.banner = await backend.sanitize(req.body.banner);
    await backend.saveImage(req.body.banner, `banner_${req.session.passport.user.id}`, 'png');
    await con.query(`UPDATE users SET about="${req.body.aboutme}", birthday="${req.body.birthday}" WHERE userid="${req.session.passport.user.id}"`, async function(err, row) {
        if(err) throw err; 
    });
    await res.redirect('/account');
    await backend.createAudit(true, false, req.session.passport.user.id, "Account updated");
});

app.post('/backend/update/forumcat/:uniqueid', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/forums');
    let uniqueid = req.params.uniqueid;
    if(!uniqueid) return res.redirect('/admin/forums');
    req.body.forumname = await backend.sanitize(req.body.forumname);
    req.body.forumlink = await backend.sanitize(req.body.forumlink);
    req.body.forumimageurl = await backend.sanitize(req.body.forumimageurl);
    req.body.forumdesc = await backend.sanitize(req.body.forumdesc);
    if(req?.body?.forumplaceholder?.length > 0) {
        req.body.forumplaceholder = await backend.sanitize(req.body.forumplaceholder);
    } else {
        req.body.forumplaceholder = '';
    };
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`UPDATE categories SET name="${req.body.forumname}", link="${req.body.forumlink}", imageurl="${req.body.forumimageurl}", description="${req.body.forumdesc}", placeholder="${req.body.forumplaceholder || ''}" WHERE uniqueid="${uniqueid}"`, async function(err, row) {
                if(err) throw err;
                await backend.createAudit(false, false, "", `Forum category (<a href='/forums/c/${req.body.forumlink}'>${req.body.forumname}</a>) has been updated`);
                return res.redirect('/admin/forums');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.post('/backend/add/forumcat', backend.checkAuth, async function (req, res) {
    if(!req.body) return res.redirect('/admin/forums');
    let uniqueid = await backend.generateRandom(12);
    req.body.forumname = await backend.sanitize(req.body.forumname);
    req.body.forumlink = await backend.sanitize(req.body.forumlink);
    req.body.forumimageurl = await backend.sanitize(req.body.forumimageurl);
    req.body.forumdesc = await backend.sanitize(req.body.forumdesc);
    if(req?.body?.forumplaceholder?.length > 0) {
        req.body.forumplaceholder = await backend.sanitize(req.body.forumplaceholder);
    } else {
        req.body.forumplaceholder = '';
    };
    await con.query(`SELECT * FROM staff WHERE userid="${req?.session?.passport?.user?.id}"`, async (err, row) => {
        if(err) throw err;
        if(row[0]) {
            await con.query(`INSERT INTO categories (name, link, uniqueid, imageurl, description, placeholder) VALUES ("${req.body.forumname}", "${req.body.forumlink}", "${uniqueid}", "${req.body.forumimageurl}", "${req.body.forumdesc}", "${req.body.forumplaceholder || ''}")`, async function(err, row) {
                if(err) throw err;
                await backend.createAudit(false, false, "", `Forum category (<a href='/forums/c/${req.body.forumlink}'>${req.body.forumname}</a>) has been created`);
                return res.redirect('/admin/forums');
            });
        } else {
            return res.redirect('/');
        };
    });
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {failureRedirect: '/'}), async function(req, res) {
    req.session?.loginRef ? res.redirect(req.session.loginRef) : res.redirect('/');
    delete req.session?.loginRef
});

app.get('/page/:pagelink', async function(req, res) {
    if(!req.params.pagelink) return res.redirect('/');
    req.params.pagelink = await backend.sanitize(req.params.pagelink);
    if(req.isAuthenticated()) {
        await con.query(`SELECT * FROM staff WHERE userid="${req.session.passport.user.id}"`, async (err, row) => {
            if(err) throw err;
            let check;
            if(row[0]) {
                check = true;
            } else {
                check = false;
            };
            await con.query(`SELECT * FROM custompages WHERE url="${req.params.pagelink}"`, async (err, row) => {
                if(err) throw err;
                let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: check };
                if(row[0]) {
                    let certain = {
                        page: row[0],
                        mardownconv: await backend.mdConvert(row[0].content)
                    };
                    return res.render('custompage', { reqdata: reqdata, certain: certain });
                } else {
                    return res.redirect('/404');
                };
            });
        });
    } else {
        await con.query(`SELECT * FROM custompages WHERE url="${req.params.pagelink}"`, async (err, row) => {
            if(err) throw err;
            let reqdata = { loggedIn: req.isAuthenticated(), isAdmin: false };
            if(row[0]) {
                let certain = {
                    page: row[0],
                    mardownconv: await backend.mdConvert(row[0].content)
                };
                return res.render('custompage', { reqdata: reqdata, certain: certain });
            } else {
                return res.redirect('/404');
            };
        });
    };
});

// Searched the redirects for the page (must be 1 before 404 page)
config.redirects.forEach(element => {
    app.get(`/${element.name}`, (req, res) => {
        res.redirect(element.link);
    });
});

// MAKE SURE THIS IS LAST FOR 404 PAGE REDIRECT
app.get('*', function(req, res){
    res.render('404.ejs');
});

require('./api.js')(app, con);

// Server Initialization
app.listen(config.port)

// Rejection Handler
process.on('unhandledRejection', (err) => { 
    if(config.debugMode) console.log(chalk.red(err));
});