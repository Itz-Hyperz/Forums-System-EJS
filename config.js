const _config = {

    domain: "http://localhost:3000",
    port: 3000,
    debugMode: false,

    timezone: "America/New_York", // Get a timezone from here: https://momentjs.com/timezone/
    birthday_date_format: "MM-DD", // Just needs Month & Day, year is not relevant
    logging_date_format: "MM-DD-YYYY", // This is used for logging purposes, include a year with this

    sql: {
        host: "localhost",
        user: "root",
        password: "",
        database: "boards" // By default the database name in the install.sql file is boards. Unless you change it manually, leave it as that.
    },

    discord: {
        oauthId: "YOUR_CLIENT_ID",
        oauthToken: "YOUR_CLIENT_SECRET"
    },

    ownerIds: ["704094587836301392", "YOUR_USER_ID"],

    redirects: [
        { name: `hyperz`, link: `https://store.hyperz.net/store/boards` },
        { name: `discord`, link: `https://store.hyperz.net/discord` },
    ]

};

module.exports = _config;