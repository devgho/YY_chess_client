// 导入数据库操作模块
const crypto = require('../utils/crypto');
const configs = require(process.argv[2]);
const config = configs.account_server();
const db = require('../db/index')

const hallAddr = config.HALL_IP + ":" + config.HALL_PORT;

let roomipArr = []
let roomipArrTime = []
let gameServer = { majiang: [], paodeikuai: [], zipai: [] }
let gameServerTime = { majiang: [], paodeikuai: [], zipai: [] }

const constantLoadRoom = () => {
    if (roomipArr.length !== 0) return Math.floor(Math.random() * roomipArr.length)
}
const constantLoadMajiang = () => {
    if (gameServer.majiang.length !== 0) return Math.floor(Math.random() * gameServer.majiang.length)
}
const constantLoadPaodeikuai = () => {
    if (gameServer.paodeikuai.length !== 0) return Math.floor(Math.random() * gameServer.paodeikuai.length)
}
const constantLoadZipai = () => {
    if (gameServer.zipai.length !== 0) return Math.floor(Math.random() * gameServer.zipai.length)
}

// 注册头像
const randomImgUrl = () => {
    const imgUrl = [
        "https://vkceyugu.cdn.bspapp.com/VKCEYUGU-a5868cbf-fc96-465b-bbdc-24e11c89b7a8/b5b4c9e4-8731-4a95-8b70-a6dd5646833b.png",
        "https://vkceyugu.cdn.bspapp.com/VKCEYUGU-b76ebcd0-af51-481a-8ce7-e6c240ce4928/1d605817-1c09-4072-8626-8e9a85fb2345.jpeg",
        "https://vkceyugu.cdn.bspapp.com/VKCEYUGU-b76ebcd0-af51-481a-8ce7-e6c240ce4928/d28589a7-c7a9-4664-abbd-15567106616b.jpeg",
        "https://vkceyugu.cdn.bspapp.com/VKCEYUGU-b76ebcd0-af51-481a-8ce7-e6c240ce4928/2bca0a01-1498-4712-8a31-ef2b3b5ce3f3.jpeg",
        "https://vkceyugu.cdn.bspapp.com/VKCEYUGU-b76ebcd0-af51-481a-8ce7-e6c240ce4928/3aa13cb6-42e0-409f-ac35-4513ad3f8795.jpg"
    ]
    return imgUrl[Math.floor(Math.random() * imgUrl.length)]
}

// 账号注册
exports.register = (req, res) => {
    let userinfo = req.body
    let sql = `SELECT account FROM t_users WHERE account=?`
    db.query(sql, userinfo.account, (err, results) => {
        if (err) return res.cc(err.message)
        if (results.length !== 0) return res.cc("该账号已注册！")
        let password = crypto.md5(userinfo.password + config.ACCOUNT_PRI_KEY);
        let sql = `INSERT INTO t_users SET ?`
        db.query(sql, { account: userinfo.account, password, name: userinfo.name, headimg: randomImgUrl() }, (err, result) => {
            // 判断 SQL 语句是否执行成功
            if (err) return res.cc(err.message)
            if (result.affectedRows !== 1) return res.cc('注册用户失败，请稍后再试！')
            res.cc('注册成功！', 0)
        })
    })
}

// 账号登陆
exports.login = (req, res) => {
    let userinfo = req.body
    console.log("账号登陆", userinfo);
    let sql = `SELECT account FROM t_users WHERE account=?`
    db.query(sql, userinfo.account, (err, results) => {
        if (err) return res.cc(err.message)
        if (results.length === 0) return res.cc("该账号未注册！")
        let password = crypto.md5(userinfo.password + config.ACCOUNT_PRI_KEY);
        let sql = `SELECT userid,account,name,roomid,headimg,coins,gems,tili,equipment_code,guildid,guild_roomid,petty_cash FROM t_users WHERE account=? AND password=?`
        db.query(sql, [userinfo.account, password], (err, results) => {
            if (err) return res.cc(err.message)
            if (results.length === 0) return res.cc("密码错误！")
            let userinfo = results[0]
            let sign = crypto.md5(userinfo.account + req.ip + config.ACCOUNT_PRI_KEY);
            let sql = `UPDATE t_users SET ? WHERE account=?`
            db.query(sql, [{ history: sign }, userinfo.account], (err, result) => {
                if (err) return res.cc(err.message);
                if (result.affectedRows !== 1) return res.cc('登陆失败，请重新登陆！');
                let sendData = {
                    userid: userinfo.userid,
                    account: userinfo.account,
                    name: userinfo.name,
                    headimg: userinfo.headimg,
                    coins: userinfo.coins,
                    gems: userinfo.gems,
                    tili: userinfo.tili,
                    hallServer: roomipArr[constantLoadRoom()],
                    sign,
                    equipmentCode: userinfo.equipment_code,
                    pettyCash: userinfo.petty_cash,
                    guildid: userinfo.guildid ? userinfo.guildid.split(",") : []
                }
                if (userinfo.roomid) {
                    let sql = `SELECT ip,port,type,user_id0,user_id1,user_id2,user_id3,base_info from t_rooms WHERE id=?`
                    db.query(sql, userinfo.roomid, (err, results) => {
                        if (err) return res.cc(err.message);
                        let position = 0
                        for (const key in results[0]) {
                            if (key.indexOf("user_id") > -1 && userinfo.userid == results[0][key]) {
                                position = key.split("user_id")[1]
                            }
                        }
                        let baseInfo = results[0].base_info //规则
                        baseInfo = eval('(' + baseInfo + ')')
                        if (results.length !== 0) {
                            sendData.roomData = {
                                roomid: userinfo.roomid,
                                roomip: `${results[0].ip}:${results[0].port}`,
                                type: results[0].type,
                                landlord: userinfo.userid == results[0].user_id0,
                                position,
                                num_of_people: baseInfo.num_of_people
                            }
                        }
                        res.cc("登陆成功", 0, sendData)
                    })
                } else if (userinfo.guild_roomid) {
                    let sql = `SELECT ip,port,type,user_id0,user_id1 from t_user_record WHERE id=?`
                    db.query(sql, userinfo.roomid, (err, results) => {
                        if (err) return res.cc(err.message);
                        let position = userinfo.userid == results[0].user_id0 ? 0 : 1
                        if (results.length !== 0) {
                            sendData.roomGuildData = {
                                roomid: userinfo.roomid,
                                roomip: `${results[0].ip}:${results[0].port}`,
                                type: results[0].type,
                                landlord: userinfo.userid == results[0].user_id0,
                                position,
                                num_of_people: 2
                            }
                        }
                        res.cc("登陆成功", 0, sendData)
                    })
                } else res.cc("登陆成功", 0, sendData)
            })
        })
    })
}

// 微信登陆
exports.wechat_auth = (req, res) => {
    res.cc("开发中")
}

// 账号验证
exports.auth = (req, res) => {
    let sign = req.query.sign
    console.log("账号验证", sign);
    let sql = "SELECT userid,account,name,roomid,headimg,coins,gems,tili,equipment_code,guildid,guild_roomid,petty_cash FROM t_users WHERE history=?"
    db.query(sql, sign, (err, results) => {
        if (err) return res.cc(err.message)
        if (results.length === 0) return res.cc("登陆失效，请重新登陆")
        const userinfo = results[0]
        let sendData = {
            userid: userinfo.userid,
            account: userinfo.account,
            name: userinfo.name,
            headimg: userinfo.headimg,
            coins: userinfo.coins,
            gems: userinfo.gems,
            tili: userinfo.tili,
            hallServer: roomipArr[constantLoadRoom()],
            sign,
            equipmentCode: userinfo.equipment_code,
            pettyCash: userinfo.petty_cash,
            guildid: userinfo.guildid ? userinfo.guildid.split(",") : []
        }
        if (results[0].roomid) {
            let sql = `SELECT ip,port,type,user_id0,user_id1,user_id2,user_id3,base_info from t_rooms WHERE id=?`
            db.query(sql, userinfo.roomid, (err, results) => {
                if (err) return res.cc(err.message);
                let position = 0
                for (const key in results[0]) {
                    if (key.indexOf("user_id") > -1 && userinfo.userid == results[0][key]) {
                        position = key.split("user_id")[1]
                    }
                }
                let baseInfo = results[0].base_info //规则
                baseInfo = eval('(' + baseInfo + ')')
                sendData.roomData = {
                    roomid: userinfo.roomid,
                    roomip: `${results[0].ip}:${results[0].port}`,
                    type: results[0].type,
                    landlord: userinfo.userid == results[0].user_id0,
                    position,
                    num_of_people: baseInfo.num_of_people
                }
                res.cc("登陆成功", 0, sendData)
            })
        } else if (userinfo.guild_roomid) {
            let sql = `SELECT ip,port,type,user_id0,user_id1 from t_user_record WHERE id=?`
            db.query(sql, userinfo.roomid, (err, results) => {
                if (err) return res.cc(err.message);
                let position = userinfo.userid == results[0].user_id0 ? 0 : 1
                sendData.roomGuildData = {
                    roomid: userinfo.roomid,
                    roomip: `${results[0].ip}:${results[0].port}`,
                    type: results[0].type,
                    landlord: userinfo.userid == results[0].user_id0,
                    position,
                    num_of_people: 2
                }
                res.cc("登陆成功", 0, sendData)
            })
        } else res.cc("登陆成功", 0, sendData)
    })
}
// 获取公告
exports.notice = (req, res) => {
    let sql = `SELECT * FROM t_message WHERE type='notice'`
    db.query(sql, (err, results) => {
        if (err) return res.cc(err.message);
        res.cc("公告", 0, results)
    })
}

// 服务器启动
exports.record = (req, res) => {
    // console.log(req.query,new Date().getTime());
    const query = req.query
    const nowTime = new Date().getTime()
    // console.log("更新服务", query);
    if (query.type == 0) {
        let index = roomipArr.indexOf(query.ip)
        if (index === -1) {
            roomipArrTime.push(nowTime)
            roomipArr.push(query.ip)
        } else roomipArrTime[index] = nowTime

    } else {
        if (query.gameType == 0) {
            let index = gameServer.majiang.indexOf(query.ip)
            if (index === -1) {
                gameServerTime.majiang.push(nowTime)
                gameServer.majiang.push(query.ip)
            } else gameServerTime.majiang[index] = nowTime
        } else if (query.gameType == 1) {
            let index = gameServer.paodeikuai.indexOf(query.ip)
            if (index === -1) {
                gameServer.paodeikuai.push(query.ip)
                gameServerTime.paodeikuai.push(nowTime)
            } else gameServerTime.paodeikuai[index] = nowTime
        } else {
            let index = gameServer.zipai.indexOf(query.ip)
            if (index === -1) {
                gameServer.zipai.push(query.ip)
                gameServerTime.zipai.push(nowTime)
            } else gameServerTime.zipai[index] = nowTime
        }
    }
    res.send()
}

const switchServer = (type) => {
    let ip = ""
    switch (type) {
        case 0:
            ip = roomipArr[constantLoadRoom()]
            break;
        case "1":
            ip = gameServer.majiang[constantLoadMajiang()]
            break;
        case "2":
            ip = gameServer.paodeikuai[constantLoadPaodeikuai()]
            break;
        case "3":
            ip = gameServer.zipai[constantLoadZipai()]
            break;
        default:
            break;
    }
    return ip
}

// 获取服务器
exports.getServers = (req, res) => {
    const type = req.query.type
    res.cc("游戏服务器", 0, switchServer(type))
}

// 检查校验
if (roomipArrTime.length !== 0) {
    roomipArrTime.forEach((item, index) => {
        if (new Date().getTime() - item > config.ONLINE_TIME) {
            roomipArrTime.splice(index, 1)
            roomipArr.splice(index, 1)
        }
    })
}
if (gameServer.majiang.length !== 0) {
    gameServerTime.majiang.forEach((item, index) => {
        if (new Date().getTime() - item > config.ONLINE_TIME) {
            gameServerTime.majiang.splice(index, 1)
            gameServer.majiang.splice(index, 1)
        }
    })
}
if (gameServer.paodeikuai.length !== 0) {
    gameServerTime.paodeikuai.forEach((item, index) => {
        if (new Date().getTime() - item > config.ONLINE_TIME) {
            gameServerTime.paodeikuai.splice(index, 1)
            gameServer.paodeikuai.splice(index, 1)
        }
    })
}
if (gameServer.zipai.length !== 0) {
    gameServerTime.zipai.forEach((item, index) => {
        if (new Date().getTime() - item > config.ONLINE_TIME) {
            gameServerTime.zipai.splice(index, 1)
            gameServer.zipai.splice(index, 1)
        }
    })
}
// console.log(new Date().getTime());
// console.log(roomipArr);
// console.log(gameServer);
setInterval(() => {
    // 房间服务器
    if (roomipArrTime.length !== 0) {
        roomipArrTime.forEach((item, index) => {
            if (new Date().getTime() - item > config.ONLINE_TIME) {
                roomipArrTime.splice(index, 1)
                roomipArr.splice(index, 1)
            }
        })
    }
    if (gameServer.majiang.length !== 0) {
        gameServerTime.majiang.forEach((item, index) => {
            if (new Date().getTime() - item > config.ONLINE_TIME) {
                gameServerTime.majiang.splice(index, 1)
                gameServer.majiang.splice(index, 1)
            }
        })
    }
    if (gameServer.paodeikuai.length !== 0) {
        gameServerTime.paodeikuai.forEach((item, index) => {
            if (new Date().getTime() - item > config.ONLINE_TIME) {
                gameServerTime.paodeikuai.splice(index, 1)
                gameServer.paodeikuai.splice(index, 1)
            }
        })
    }
    if (gameServer.zipai.length !== 0) {
        gameServerTime.zipai.forEach((item, index) => {
            if (new Date().getTime() - item > config.ONLINE_TIME) {
                gameServerTime.zipai.splice(index, 1)
                gameServer.zipai.splice(index, 1)
            }
        })
    }
    // console.log(new Date().getTime());
    // console.log(roomipArr);
    // console.log(gameServer);
}, config.HEARTBEAT)