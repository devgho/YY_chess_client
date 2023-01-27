const configs = require("../../configs");
const config = configs.hall_server();
const db = require('../../db')

// 公会信息
exports.getGuild = (req, res) => {
    let guildid = req.params.id
    let sql = `SELECT * FROM t_guild WHERE id=?`
    db.query(sql, guildid, (err, results) => {
        if (err) return res.cc(err.message)
        else {
            let guildInfo = results[0]
            guildInfo.ip = `${config.HALL_IP}:${config.HALL_ROOM_PORT}`
            let sql = `SELECT * FROM t_guild_games_rule`
            db.query(sql, (err, results) => {
                if (err) return res.cc(err.message)
                guildInfo.gameRule = results
                res.cc("公会信息", 0, guildInfo)
            })
        }
    })
}