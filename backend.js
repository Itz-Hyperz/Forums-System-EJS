const config = require("./config.js");
const passport = require('passport');
const chalk = require('chalk');
const axios = require('axios');
const figlet = require('figlet');
const multer = require('multer');
const bodyParser = require('body-parser');
const session  = require('express-session');
const express = require("express");
const moment = require('moment-timezone');
const filedl = require("nodejs-file-downloader");
const pjson = require('./package.json');
const utils = require('hyperz-utils')
require('hyperz-verbatim').setExtension('.hyperz');
const md = require('markdown-it-faxes')({
    html: false, // Enable HTML tags in source
    xhtmlOut: false, // Use '/' to close single tags (<br />).
    breaks: true, // Convert '\n' in paragraphs into <br>
    linkify: false // Autoconvert URL-like text to links
}).use(require('markdown-it-highlightjs'), { code: true });
let dbcon;

let d;
if(config.domain.endsWith('/')) {
    d = config.domain;
} else {
    d = config.domain + '/';
};

async function init(app, con) {
    if (Number(process.version.slice(1).split(".")[0] < 16)) throw new Error(`Node.js v16 or higher is required, Discord.JS relies on this version, please update @ https://nodejs.org`);
    var multerStorage = multer.memoryStorage()
    app.use(multer({ storage: multerStorage }).any());
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: false,
        cookie: {maxAge: 31556952000},
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.static('public'));
    app.use('/assets', express.static(__dirname + 'public/assets'))
    app.use('/images', express.static(__dirname + 'public/images'))
    app.set('views', './views');
    app.set('view engine', 'ejs');
    dbcon = con;
    let font = await maths(["Graffiti", "Standard", "Stop", "Slant", "Pagga", "Larry 3D"])
    figlet.text('Comm. Boards', { font: font, width: 700 }, function(err, data) {
        if(err) throw err;
        let str = `${data}\n-------------------------------------------`
        console.log(chalk.bold(chalk.blueBright(str)));
    });
    setTimeout(async () => {
        let currver = pjson.version
        let request = await axios({
            method: 'get',
            url: `https://raw.githubusercontent.com/Itz-Hyperz/version-pub-api/main/versions.json`,
            headers: {Accept: 'application/json, text/plain, */*','User-Agent': '*' }
        });
        let latestver = request.data.boards
        if(latestver != currver) {
            console.log(`${chalk.yellow(`[Version Checker]`)} ${chalk.red(`You are not on the latest version.\nCurrent Version: ${currver}\nLatest Version: ${latestver}`)}`)
        } else {
            console.log(`${chalk.green(`[Version Checker]`)} You are on the latest version.`)
        };
    }, 3000);
    await con.query(`SELECT * FROM sitesettings`, async function(err, row) {
        if(err) throw err;
        if(!err) {
            setTimeout(() => { console.log(`${chalk.yellow(`[SQL Manager]`)} MySQL successfully connected.`); }, 3400);
        };
        let settings = row[0];
        if(!settings.themeone.startsWith('#')) { await con.query(`UPDATE sitesettings SET themeone="#${settings.themeone}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themetwo.startsWith('#')) { await con.query(`UPDATE sitesettings SET themetwo="#${settings.themetwo}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themethree.startsWith('#')) { await con.query(`UPDATE sitesettings SET themethree="#${settings.themethree}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themefour.startsWith('#')) { await con.query(`UPDATE sitesettings SET themefour="#${settings.themefour}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themetext.startsWith('#')) { await con.query(`UPDATE sitesettings SET themetext="#${settings.themetext}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.fallbacktext.startsWith('#')) { await con.query(`UPDATE sitesettings SET fallbacktext="#${settings.fallbacktext}"`, async (err, row) => { if(err) throw err; }); };
        await con.query(`SELECT * FROM navbar`, async function(err, row) {
            if (err) throw err;
            app.locals = {
                site: {
                    title: settings.sitename,
                    description: settings.sitedesc,
                    themeone: settings.themeone,
                    themetwo: settings.themetwo,
                    themethree: settings.themethree,
                    themefour: settings.themefour,
                    themetext: settings.themetext,
                    fallbacktext: settings.fallbacktext
                },
                navbaritems: row,
                d: d,
                config: config,
                currentyear: await utils.fetchTime(config.timezone, "YYYY")
            }
        });
    });
    setInterval(async () => {
        await con.query(`SELECT * FROM sitesettings`, async function(err, row) {
            if (err) throw err;
            let settings = row[0];
            await con.query(`SELECT * FROM navbar`, async function(err, row) {
                if (err) throw err;
                app.locals = {
                    site: {
                        title: settings.sitename,
                        description: settings.sitedesc,
                        themeone: settings.themeone,
                        themetwo: settings.themetwo,
                        themethree: settings.themethree,
                        themefour: settings.themefour,
                        themetext: settings.themetext,
                        fallbacktext: settings.fallbacktext
                    },
                    navbaritems: row,
                    d: d,
                    config: config,
                    currentyear: await utils.fetchTime(config.timezone, "YYYY")
                }
            });
        });
    }, 120000);
    sqlLoop(con);
};

async function sqlLoop(con) {
    if(con == 0) return;
    await con.ping();
    setTimeout(() => sqlLoop(con), 60000 * 30);
};

async function checkAuth(req, res, next) {
    if(req.isAuthenticated()) {
        if(!req?.session?.passport?.user) return;
        await dbcon.query(`SELECT * FROM bannedusers WHERE userid="${req.session.passport.user.id}"`, async (err, row) => {
            if(err) throw err;
            if(row[0]) return res.redirect('/banned');
            next();
            await dbcon.query(`SELECT * FROM users WHERE userid="${req.session.passport.user.id}"`, async function(err, row) {
                if(err) throw err;
                if(!row[0]) {
                    await dbcon.query(`INSERT INTO users (userid, usertag, about, birthday) VALUES ("${req.session.passport.user.id}", "${req.session.passport.user.username}#${req.session.passport.user.discriminator}", "I have not described myself yet...", "none")`, function(err, row) {
                        if(err) throw err;
                    });
                    await saveImage(`https://cdn.discordapp.com/banners/${req.session.passport.user.id}/${req.session.passport.user.banner}.png?size=512`, `banner_${req.session.passport.user.id}`, 'png');
                };
            });
            await saveImage(`https://cdn.discordapp.com/avatars/${req.session.passport.user.id}/${req.session.passport.user.avatar}.png?size=512`, `avatar_${req.session.passport.user.id}`, 'png');
        });
    } else {
        res.redirect("/auth/discord");
    };
};

async function updateLocales(app) {
    await dbcon.query(`SELECT * FROM sitesettings`, async function(err, row) {
        if (err) throw err;
        let settings = row[0];
        if(!settings.themeone.startsWith('#')) { await dbcon.query(`UPDATE sitesettings SET themeone="#${settings.themeone}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themetwo.startsWith('#')) { await dbcon.query(`UPDATE sitesettings SET themetwo="#${settings.themetwo}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themethree.startsWith('#')) { await dbcon.query(`UPDATE sitesettings SET themethree="#${settings.themethree}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themefour.startsWith('#')) { await dbcon.query(`UPDATE sitesettings SET themefour="#${settings.themefour}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.themetext.startsWith('#')) { await dbcon.query(`UPDATE sitesettings SET themetext="#${settings.themetext}"`, async (err, row) => { if(err) throw err; }); };
        if(!settings.fallbacktext.startsWith('#')) { await dbcon.query(`UPDATE sitesettings SET fallbacktext="#${settings.fallbacktext}"`, async (err, row) => { if(err) throw err; }); };
        await dbcon.query(`SELECT * FROM navbar`, async function(err, row) {
            if (err) throw err;
            app.locals = {
                site: {
                    title: settings.sitename,
                    description: settings.sitedesc,
                    themeone: settings.themeone,
                    themetwo: settings.themetwo,
                    themethree: settings.themethree,
                    themefour: settings.themefour,
                    themetext: settings.themetext,
                    fallbacktext: settings.fallbacktext
                },
                navbaritems: row,
                d: d,
                config: config
            }
        });
    });
};

async function mdConvert(content) {
    let rendered = await md.render(content);
    return rendered;
};

async function generateRandom(length) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

async function sanitize(value, bypassScripting) {
    if(!bypassScripting || typeof bypassScripting == 'undefined') {
        if(value.toLowerCase().includes('</')) {
            value = await value.replaceAll('<', 'NULLED:lessThan').replaceAll('>', 'NULLED:greaterThan');
        };
    };
    value = await value.replaceAll('"', '\'').replaceAll('`', '\`').replaceAll("'", "\'");
    return value;
};

async function saveImage(url, name, type, dir) {
    try {
        const downloader = new filedl({
            url: url, //If the file name already exists, a new file with the name 200MB1.zip is created.
            directory: dir || "./public/images", //This folder will be created, if it doesn't exist.
            fileName: `${name}.${type}`,
            cloneFiles: false
        });
        await downloader.download();
    } catch(e) {};
};

async function fetchTime() {
    let datethingy = moment.tz(config.timezone).format(config.logging_date_format);
    return datethingy;
};

async function getOnlyThis(array, amount) {
    let count = 0;
    let newarray = [];
    for (let item of array) {
        if(count < amount) {
            count++;
            newarray.push(item);
        };
    };
    return newarray;
};

async function createAudit(userbased, punishment, userid, content, datetime) {
    if(typeof datetime == 'undefined') {
        datetime = await fetchTime();
    };
    content = await sanitize(content, true);
    await dbcon.query(`INSERT INTO auditlogs (userbased, punish, userid, datetime, content) VALUES (${userbased}, ${punishment}, "${userid}", "${datetime}", "${content}")`, async function(err, row) {
        if(err) throw err;
    });
};

async function createTopic(category, title, description, user, type, uniqueid) {
    let time = await fetchTime();
    await dbcon.query(`INSERT INTO topics (catid, name, link, description, userid, usertag, datetime, type, pinned) VALUES ("${category.uniqueid}", "${title}", "${uniqueid}", "${description}", "${user.id}", "${await sanitize(user.username)}#${user.discriminator}", "${time}", "${type}", 0)`, async function(err, row) {
        if(err) throw err;
    });
};

async function deleteDataTable(tablename) {
    await dbcon.query(`DELETE FROM ${tablename}`, async function(err, row) {
        if(err) throw err;
    });
};

async function runQuery(query) {
    await dbcon.query(`${query}`, async function(err, row) {
        if(err) throw err;
    });
};

async function maths(array) {
    let bruh = array[Math.floor(array.length * Math.random())];
    return bruh;
};

module.exports = {
    init: init,
    checkAuth: checkAuth,
    mdConvert: mdConvert,
    generateRandom: generateRandom,
    sanitize: sanitize,
    saveImage: saveImage,
    fetchTime: fetchTime,
    getOnlyThis: getOnlyThis,
    updateLocales: updateLocales,
    createAudit: createAudit,
    createTopic: createTopic,
    deleteDataTable: deleteDataTable,
    runQuery: runQuery,
    maths: maths
};