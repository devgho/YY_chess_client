const mysql=require("mysql");

const configs = require(process.argv[2]);
const config = configs.mysql();

const db = mysql.createPool({
    host: config.HOST,
    user: config.USER,
    password: config.PSWD,
    database: config.DB,
    port: config.PORT,
})

module.exports = db