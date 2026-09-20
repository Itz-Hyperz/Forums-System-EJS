const backend = require('./backend.js');
const config = require("./config.js");
const chalk = require('chalk');
const moment = require('moment-timezone');

module.exports = async function(app, con) {
    app.get('/api', async function(req, res) {
        return res.redirect(`https://docs.hyperz.net/c/products/boardsapi`)
    });
    app.get('/api/get/:section/:data', async function(req, res) {
        res.set('Access-Control-Allow-Origin', '*');
        if(!req.params.section) {
            let json_ = {
                "pass": false,
                "reason": "No section provided within URL request."
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
        req.params.section = req.params.section.toLowerCase();
        if(!req?.headers) {
            let json_ = {
                "pass": false,
                "reason": "No headers provided within the request."
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
        if(!req?.headers?.authorization) {
            let json_ = {
                "pass": false,
                "reason": "No authorization header was provided within the request."
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
        req.headers.authorization = await backend.sanitize(req.headers.authorization);
        await con.query(`SELECT * FROM apikeys WHERE apikey="${req.headers.authorization}"`, async (err, row) => {
            if(err) throw err;
            if(row[0]) {
                let section;
                switch(req.params.section) {
                    case 'forum':
                        section = 'forum';
                        break;
                    case 'topic':
                        section = 'topic';
                        break;
                    case 'user':
                        section = 'user';
                        break;
                    case 'statistics':
                        section = 'statistics';
                        break;
                    default:
                        section = 'none';
                };
                if(section == 'none') {
                    let json_ = {
                        "pass": false,
                        "reason": "Section provided within URL request was invalid."
                    };
                    return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                } else if(section == 'statistics') {
                    await con.query(`SELECT * FROM users`, async (err, row) => {
                        if(err) throw err;
                        let users = row.length || 0;
                        await con.query(`SELECT * FROM topics`, async (err, row) => {
                            if(err) throw err;
                            let topics = row.length || 0;
                            await con.query(`SELECT * FROM categories`, async (err, row) => {
                                if(err) throw err;
                                let categories = row.length || 0;
                                await con.query(`SELECT * FROM comments`, async (err, row) => {
                                    if(err) throw err;
                                    let comments = row.length || 0;
                                    await con.query(`SELECT * FROM bannedusers`, async (err, row) => {
                                        if(err) throw err;
                                        let bannedusers = row.length || 0;
                                        await con.query(`SELECT * FROM staff`, async (err, row) => {
                                            if(err) throw err;
                                            let staff = row.length || 0;
                                            await con.query(`SELECT * FROM auditlogs`, async (err, row) => {
                                                if(err) throw err;
                                                let auditlogs = row.length || 0;
                                                await con.query(`SELECT * FROM events`, async (err, row) => {
                                                    if(err) throw err;
                                                    let events = row.length || 0;
                                                    await con.query(`SELECT * FROM socials`, async (err, row) => {
                                                        if(err) throw err;
                                                        let socials = row.length || 0;
                                                        await con.query(`SELECT * FROM gallery`, async (err, row) => {
                                                            if(err) throw err;
                                                            let gallery = row.length || 0;
                                                            await con.query(`SELECT * FROM custompages`, async (err, row) => {
                                                                if(err) throw err;
                                                                let custompages = row.length || 0;
                                                                let json_ = {
                                                                    "pass": true,
                                                                    "code": 200,
                                                                    "stats": {
                                                                        "users": users,
                                                                        "topics": topics,
                                                                        "staff": staff,
                                                                        "socials": socials,
                                                                        "auditlogs": auditlogs,
                                                                        "events": events,
                                                                        "gallery": gallery,
                                                                        "custompages": custompages,
                                                                        "bannedusers": bannedusers,
                                                                        "categories": categories,
                                                                        "comments": comments
                                                                    }
                                                                };
                                                                return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
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
                    });
                } else if(section == 'forum') {
                    if(!req.params.data) {
                        let json_ = {
                            "pass": false,
                            "reason": "No data was provided within URL parameters."
                        };
                        return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                    };
                    req.params.data = await backend.sanitize(req.params.data);
                    await con.query(`SELECT * FROM categories WHERE uniqueid="${req.params.data}"`, async (err, row) => {
                        if(err) throw err;
                        if(!row[0]) {
                            let json_ = {
                                "pass": true,
                                "code": 200,
                                "forum": {}
                            };
                            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                        } else {
                            let json_ = {
                                "pass": true,
                                "code": 200,
                                "forum": row[0]
                            };
                            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                        };
                    });
                } else if(section == 'topic') {
                    if(!req.params.data) {
                        let json_ = {
                            "pass": false,
                            "reason": "No data was provided within URL parameters."
                        };
                        return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                    };
                    req.params.data = await backend.sanitize(req.params.data);
                    await con.query(`SELECT * FROM topics WHERE link="${req.params.data}"`, async (err, row) => {
                        if(err) throw err;
                        if(!row[0]) {
                            let json_ = {
                                "pass": true,
                                "code": 200,
                                "topic": {}
                            };
                            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                        } else {
                            let json_ = {
                                "pass": true,
                                "code": 200,
                                "topic": row[0]
                            };
                            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                        };
                    });
                } else if(section == 'user') {
                    if(!req.params.data) {
                        let json_ = {
                            "pass": false,
                            "reason": "No data was provided within URL parameters."
                        };
                        return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                    };
                    req.params.data = await backend.sanitize(req.params.data);
                    await con.query(`SELECT * FROM staff WHERE userid="${req.params.data}"`, async (err, row) => {
                        if(err) throw err;
                        let staff;
                        if(row[0]) {
                            staff = true;
                        } else {
                            staff = false;
                        };
                        await con.query(`SELECT * FROM bannedusers WHERE userid="${req.params.data}"`, async (err, row) => {
                            if(err) throw err;
                            let isBanned;
                            if(row[0]) {
                                isBanned = true;
                            } else {
                                isBanned = false;
                            };
                            await con.query(`SELECT * FROM users WHERE userid="${req.params.data}"`, async (err, row) => {
                                if(err) throw err;
                                if(!row[0]) {
                                    let json_ = {
                                        "pass": true,
                                        "code": 200,
                                        "user": {},
                                        "isBanned": isBanned,
                                        "isStaff": staff
                                    };
                                    return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                                } else {
                                    let json_ = {
                                        "pass": true,
                                        "code": 200,
                                        "user": row[0],
                                        "isBanned": isBanned,
                                        "isStaff": staff
                                    };
                                    return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                                };
                            });
                        });
                    });
                };
            } else {
                let json_ = {
                    "pass": false,
                    "reason": "Invalid authorization token provided within the request."
                };
                return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
            };
        });
    });
    
    app.post('/api/post/:section', async function(req, res) {
        res.set('Access-Control-Allow-Origin', '*');
        if(!req.params.section) {
            let json_ = {
                "pass": false,
                "reason": "No section provided within URL request."
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
        req.params.section = req.params.section.toLowerCase();
        if(!req?.headers) {
            let json_ = {
                "pass": false,
                "reason": "No headers provided within the request."
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
        if(!req?.headers?.authorization) {
            let json_ = {
                "pass": false,
                "reason": "No authorization header was provided within the request."
            };
            return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
        };
        req.headers.authorization = await backend.sanitize(req.headers.authorization);
        await con.query(`SELECT * FROM apikeys WHERE apikey="${req.headers.authorization}"`, async (err, row) => {
            if(err) throw err;
            if(row[0]) {
                let section;
                switch(req.params.section) {
                    case 'auditlogs':
                        section = 'auditlogs';
                        break;
                    default:
                        section = 'none';
                };
                if(section == 'none') {
                    let json_ = {
                        "pass": false,
                        "reason": "Section provided within URL request was invalid."
                    };
                    return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                } else if(section == 'auditlogs') {
                    if(typeof req.body.userbased != 'boolean') req.body.userbased = false;
                    if(typeof req.body.punishment != 'boolean') req.body.punishment = false;
                    await backend.createAudit(req.body.userbased, req.body.punishment, `${req.body.userid || ''}`, `${req.body.content || 'Unspecified'}`);
                    let json_ = {
                        "pass": true,
                        "code": 200
                    };
                    return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
                };
            } else {
                let json_ = {
                    "pass": false,
                    "reason": "Invalid authorization token provided within the request."
                };
                return res.type('json').send(JSON.stringify(json_, null, 4) + '\n');
            };
        });
    });
    setTimeout(() => {
        console.log(`${chalk.blue(`[API Manager]`)} Community Boards API is now initialized.`);
    }, 4000);
};