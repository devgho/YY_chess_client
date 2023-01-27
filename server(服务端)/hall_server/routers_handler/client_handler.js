const configs = require("../../configs");
const config = configs.hall_server();
const db = require('../../db')

// 创建角色（用户名）
exports.createName = (req, res) => {
    let userid = req.body.userid
    let name = req.body.name
    let sql = `UPDATE t_users SET name=? WHERE userid=?`
    db.query(sql, [name, userid], (err, result) => {
        if (err) return res.cc(err.message);
        if (result.affectedRows !== 1) return res.cc("角色创建失败，请稍后再试！")
        let sql = "SELECT userid,account,name,roomid,headimg,coins,gems,tili FROM t_users WHERE userid=?"
        db.query(sql, userid, (err, results) => {
            if (err) return res.cc(err.message);
            if (results.length !== 1) return res.cc("角色创建失败，请稍后再试！")
            results[0].halladdr = config.HALL_IP + ":" + config.HALL_PORT
            res.cc("角色创建完成！", 0, results[0])
        })
    })
}

// 获取用户信息
exports.getUserInfo = (req, res) => {
    let userid = req.params.id
    let sql = "SELECT * FROM t_users WHERE userid=?"
    db.query(sql, userid, (err, results) => {
        if (err) return res.cc(err.message);
        if (results.length !== 1) return res.cc("用户信息不存在！")
        let userinfo = results[0]
        userinfo.password = "******"
        res.cc("当前用户信息", 0, userinfo)
    })
}
// 退出登陆
exports.exitLogin = (req, res) => {
    let userid = req.params.id
    let sql = `UPDATE t_users SET history='',roomid='' WHERE userid=?`
    db.query(sql, userid, (err, result) => {
        if (err) return res.cc(err.message);
        if (result.affectedRows !== 1) return res.cc("退出登陆失败，请稍后再试！")
        res.cc("退出登陆成功！", 0)
    })
}

// 获取用户战绩
exports.getRecord = (req, res) => {
    let userid = req.params.id
    let sql = `SELECT * FROM t_user_record WHERE userid=?`
    db.query(sql, userid, (err, results) => {
        if (err) return res.cc(err.message);
        if (results.length == 0) return res.cc("暂无战绩")
        res.cc("当前用户战绩", 0, results)
    })
}