CREATE DATABASE boards CHARACTER SET utf8;
use boards;

CREATE TABLE sitesettings (
    sitename TEXT,
    sitedesc TEXT,
    themeone TEXT,
    themetwo TEXT,
    themethree TEXT,
    themefour TEXT,
    themetext TEXT,
    fallbacktext TEXT,
    homeabout TEXT,
    guildid TEXT
);

CREATE TABLE integration (
    hamzcad boolean,
    hamzcadapiurl TEXT,
    hamzcadapisecret TEXT,
    faxcad boolean,
    faxcadapiurl TEXT,
    faxcadapisecret TEXT,
    sonorancad boolean,
    sonorancadapiurl TEXT,
    sonorancadapisecret TEXT,
    sonorancms boolean,
    sonorancmsapiurl TEXT,
    sonorancmsapisecret TEXT
);

CREATE TABLE navbar (
    name TEXT,
    link TEXT,
    uniqueid TEXT
);

CREATE TABLE categories (
    name TEXT,
    link TEXT,
    uniqueid TEXT,
    description TEXT,
    imageurl TEXT,
    placeholder TEXT
);

CREATE TABLE topics (
    catid TEXT,
    name TEXT,
    link TEXT,
    description TEXT,
    userid TEXT,
    usertag TEXT,
    datetime TEXT,
    type TEXT,
    pinned boolean
);

CREATE TABLE comments (
    userid TEXT,
    usertag TEXT,
    uniqueid TEXT,
    catlink TEXT,
    catid TEXT,
    topicid TEXT,
    content TEXT,
    datetime TEXT
);

CREATE TABLE users (
    userid TEXT,
    usertag TEXT,
    about TEXT,
    birthday TEXT
);

CREATE TABLE events (
    name TEXT,
    link TEXT,
    uniqueid TEXT
);

CREATE TABLE socials (
    name TEXT,
    link TEXT,
    uniqueid TEXT
);

CREATE TABLE gallery (
    link TEXT,
    pass TEXT
);

CREATE TABLE auditlogs (
    userbased boolean,
    punish boolean,
    userid TEXT,
    datetime TEXT,
    content TEXT
);

CREATE TABLE staff (
    userid TEXT
);

CREATE TABLE bannedusers (
    userid TEXT
);

CREATE TABLE custompages (
    url TEXT,
    name TEXT,
    content TEXT,
    uniqueid TEXT
);

CREATE TABLE apikeys (
    apikey TEXT,
    uniqueid TEXT
);

ALTER DATABASE boards CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE sitesettings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE integration CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE navbar CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE categories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE topics CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE comments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE events CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE socials CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE gallery CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE auditlogs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE staff CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE bannedusers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE custompages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE apikeys CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

INSERT INTO sitesettings (sitename, sitedesc, themeone, themetwo, themethree, themefour, themetext, fallbacktext, homeabout, guildid) VALUES ("Demo Site", "This is a demo website.", "0D111D", "090C15", "06090F", "1f2533", "647bac", "FFFFFF", "Welcome to Community Boards!", "none");
INSERT INTO integration (hamzcad, hamzcadapiurl, hamzcadapisecret, faxcad, faxcadapiurl, faxcadapisecret, sonorancad, sonorancadapiurl, sonorancadapisecret, sonorancms, sonorancmsapiurl, sonorancmsapisecret) VALUES (false, "none", "none", false, "none", "none", false, "none", "none", false, "none", "none");
INSERT INTO navbar (name, link, uniqueid) VALUES ("Home", "/", "asdhfasd");
INSERT INTO navbar (name, link, uniqueid) VALUES ("Forums", "/forums", "gfcxvhsdf");
INSERT INTO navbar (name, link, uniqueid) VALUES ("Activity", "/activity", "touisdjbxc");
INSERT INTO navbar (name, link, uniqueid) VALUES ("Discord", "/discord", "jklerthsdf");
INSERT INTO auditlogs (userbased, punish, userid, datetime, content) VALUES (false, false, "none", "~ ~ ~", "Community Boards by <a href='https://store.hyperz.net/store/boards' target='_blank' style='color: rgb(0, 153, 255) !important;'>Hyperz</a> has been setup and imported");
INSERT INTO staff (userid) VALUES ("704094587836301392");