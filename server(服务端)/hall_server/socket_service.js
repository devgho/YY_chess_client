const express = require('express')
const app = express()
const fibers = require('fibers');

const httpZHU = require("../utils/http")

const http = require("http")
const socketIo = require("socket.io")

const server = http.createServer(app)
const io = new socketIo(server)
const db = require('../db');

const gameHand = require("./gameInfoDataBaseHand");
const roomInfoHandling = require("./roomInfo_handling");
const guildGameRule = require("./guild_game_and_room")

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    fibers(function () {
        next();
    }).run();
});

// 移除人员指定roomid
const removeRoomId = (id) => {
    let sqlupdate = {
        roomid: null
    }
    let sql = `UPDATE t_users SET ? WHERE roomid=?`
    db.query(sql, [sqlupdate, id])
}
// 封装返回数据
const resCC = (err, status = 1, data) => {
    return data ? {
        status,
        message: err instanceof Error ? err.message : err,
        data: data
    } : {
        status,
        message: err instanceof Error ? err.message : err,
    }
}
// 修改用户roomid
const updateUserRoomId = (roomid, userid) => {
    let sql = `UPDATE t_users SET roomid=? WHERE userid=?`
    db.query(sql, [roomid, userid])
}
// 返回查询人员和房间数据
const maxSqlNumber = (maxNumber) => {
    let sql = ""
    for (let i = 0; i < maxNumber; i++) {
        sql += `user_id${i},user_icon${i},user_name${i},user_score${i},user_state${i}${(maxNumber == i + 1) ? "" : ","}`
    }
    return sql
}

// let userCardiopalmus = {}
exports.start = (config) => {
    server.listen(config.HALL_ROOM_PORT, () => {
        console.log(`hall_server_room running at ws://${config.HALL_IP}:${config.HALL_ROOM_PORT}`)
    })
    io.on("connection", (socket) => {
        // 退出房间
        socket.on("out_room", (data) => {
            if (typeof data == "string")
                data = JSON.parse(data)
            console.log("退出房间", data);
            const roomid = data.roomid
            const userid = data.userid
            let sql = `SELECT * FROM t_rooms WHERE id=?`
            db.query(sql, roomid, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const roomInfo = results[0]
                    if (roomInfo.state && roomInfo.state == 1) socket.emit("playing_result", resCC("正在游戏中不能退出"))
                    else if (roomInfo.user_id0 == userid) socket.emit("playing_result", resCC("创建房间者不能离开"))
                    else {
                        let keyRes = ''
                        for (let key in roomInfo) {
                            if (key.indexOf("user_id") > -1 && roomInfo[key] == userid) {
                                keyRes = key
                                break
                            }
                        }
                        if (!keyRes) {
                            socket.emit("playing_result", resCC("你不在房间内"))
                            socket.disconnect()
                        } else {
                            let sqlupdate = ""
                            if (keyRes == "user_id1") {
                                sqlupdate = { user_id1: null, user_icon1: null, user_name1: null, user_score1: null, user_state1: null }
                            }
                            else if (keyRes == "user_id2") {
                                sqlupdate = { user_id2: null, user_icon2: null, user_name2: null, user_score2: null, user_state2: null }
                            }
                            else {
                                sqlupdate = { user_id3: null, user_icon3: null, user_name3: null, user_score3: null, user_state3: null }
                            }
                            sqlupdate.state = 0
                            let sql = `UPDATE t_rooms SET ? WHERE id=?`
                            db.query(sql, [sqlupdate, roomid], (err, result) => {
                                if (err) {
                                    socket.emit("err_result", resCC(err.message))
                                    socket.disconnect()
                                } else if (result.affectedRows !== 1) socket.emit("playing_result", resCC("离开房间失败，请稍后再试"))
                                else {
                                    let sql = `UPDATE t_users SET roomid='' WHERE userid=?`
                                    db.query(sql, userid, (err, result) => {
                                        if (err) {
                                            socket.emit("err_result", resCC(err.message))
                                            socket.disconnect()
                                        } else {
                                            let baseInfo = roomInfo.base_info //规则
                                            baseInfo = eval('(' + baseInfo + ')')
                                            let maxNumSql = maxSqlNumber(baseInfo.num_of_people)
                                            let sql = `SELECT type,base_info,num_of_turns,next_button,state,${maxNumSql} FROM t_rooms WHERE id=?`
                                            db.query(sql, roomid, (err, results) => {
                                                if (err) {
                                                    socket.emit("err_result", resCC(err.message))
                                                    socket.disconnect()
                                                } else {
                                                    results[0].roomid = roomid
                                                    socket.leave("room-" + roomid)
                                                    io.sockets.in("room-" + roomid).emit("room_result", resCC("房间数据加载完成", 0, results[0]))
                                                    socket.emit("leave_room", resCC("正在离开房间", 0))
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    }
                }
            })
        })
        // 房主解散房间
        socket.on("disband_room", roomid => {
            console.log("房主解散房间", roomid);
            let sql = `SELECT state,base_info,user_id0,user_id1,user_id2,user_id3 FROM t_rooms WHERE id=${roomid}`
            db.query(sql, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    if (results.length !== 0) {
                        let roomInfo = results[0]
                        let baseInfo = roomInfo.base_info //规则
                        baseInfo = eval('(' + baseInfo + ')')
                        if (roomInfo.state == 1) {
                            socket.emit("leave_room", resCC("游戏正在进行中，不能解散房间"))
                        } else {
                            let sql = `DELETE FROM t_rooms WHERE id=${roomid}`
                            db.query(sql, (err, result) => {
                                if (err) {
                                    socket.emit("err_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    removeRoomId(roomid)
                                    io.sockets.in("room-" + roomid).emit("leave_room", resCC("房间已解散", 0))
                                    socket.leave("room-" + roomid)
                                }
                            })
                        }
                    }
                }
            })
        })
        // 玩家准备
        socket.on("prepare_player", (data) => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const roomid = data.roomid
            const userid = data.userid
            const prepare = data.prepare
            let sql = `SELECT * FROM t_rooms WHERE id=?`
            db.query(sql, roomid, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    console.log(err.message)
                } else {
                    let roomInfo = results[0]
                    let baseInfo = roomInfo.base_info
                    baseInfo = eval('(' + baseInfo + ')')
                    const maxNumber = baseInfo.num_of_people
                    let readyCount = 0 // 已准备人数
                    for (let i = 0; i < maxNumber; i++) {
                        if (roomInfo[`user_id${i}`] == userid) roomInfo[`user_state${i}`] = prepare
                        if (roomInfo[`user_state${i}`] == 1) readyCount++
                    }
                    if (maxNumber == readyCount) {
                        // 全部已准备
                        roomInfo.state = 1
                        httpZHU.get(`${config.CLIENT_IP}`, `${config.CLIENT_PORT}`, "/get_games_servers", {
                            ip: `${config.HALL_IP}:${config.HALL_PORT}`,
                            type: roomInfo.type + 1,
                        }, function (ret, data) {
                            // console.log("游戏服务", data);
                            if (data.status == 0 && data.data) {
                                const gameip = data.data
                                let ipconfig = gameip.split(":")
                                let sql = ``
                                let insertSql = {
                                    roomid,
                                    create_time: new Date().getTime(),
                                    people_number: maxNumber,
                                    ip: ipconfig[0],
                                    port: ipconfig[1],
                                }
                                for (let i = 0; i < maxNumber; i++) {
                                    insertSql[`player${i}id`] = roomInfo[`user_id${i}`]
                                }
                                switch (parseInt(roomInfo.type)) {
                                    case 0:
                                        // 麻将
                                        insertSql.guipaiid = baseInfo.ghost_card == 1 ? 27 : Math.floor(Math.random() * 27) // 鬼牌
                                        insertSql.ghost = baseInfo.kill_ghost == 1 ? 1 : 0
                                        sql = `INSERT INTO t_games_majiang SET ?`
                                        db.query(sql, insertSql, (err, result) => {
                                            if (err) {
                                                socket.emit("err_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                let sql = `SELECT majiangid FROM t_games_majiang WHERE roomid=?`
                                                db.query(sql, roomid, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        io.sockets.in("room-" + roomid).emit("game_start", resCC("游戏开始", 0, {
                                                            gameip,
                                                            gameid: results[0].majiangid,
                                                            text: "麻将服务器",
                                                            diceNumber: [Math.floor(Math.random() * 5) + 1, Math.floor(Math.random() * 5) + 1, Math.floor(Math.random() * 5) + 1]
                                                        }))
                                                    }
                                                })
                                            }
                                        })
                                        break;
                                    case 1:
                                        // 跑得快
                                        insertSql.fifty = baseInfo.fifty ? 1 : 0
                                        insertSql.boom = baseInfo.boom ? 1 : 0
                                        insertSql.four_b_three = baseInfo.fourBthree ? 1 : 0
                                        insertSql.first_spade = baseInfo.first_spade ? 1 : 0
                                        insertSql.grab_bird = baseInfo.grab_bird ? 1 : 0
                                        sql = `INSERT INTO t_games_paodeikuai SET ?`
                                        db.query(sql, insertSql, (err, result) => {
                                            if (err) {
                                                socket.emit("err_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                let sql = `SELECT paodeikuaiid FROM t_games_paodeikuai WHERE roomid=?`
                                                db.query(sql, roomid, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        io.sockets.in("room-" + roomid).emit("game_start", resCC("游戏开始", 0, {
                                                            gameip,
                                                            gameid: results[0].paodeikuaiid,
                                                            text: "跑得快服务器"
                                                        }))
                                                    }
                                                })
                                            }
                                        })
                                        break;
                                    case 2:
                                        // 字牌
                                        insertSql.position_index = roomInfo.makers || 0
                                        insertSql.wu_hu = baseInfo.without_wh == 1 ? 1 : 0
                                        insertSql.one_ho = baseInfo.without_ydh == 1 ? 1 : 0
                                        sql = `INSERT INTO t_games_zipai SET ?`
                                        db.query(sql, insertSql, (err, result) => {
                                            if (err) {
                                                socket.emit("err_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                let sql = `SELECT zipaiid FROM t_games_zipai WHERE roomid=?`
                                                db.query(sql, roomid, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        io.sockets.in("room-" + roomid).emit("game_start", resCC("游戏开始", 0, {
                                                            gameip,
                                                            gameid: results[0].zipaiid,
                                                            text: "字牌服务器"
                                                        }))
                                                    }
                                                })
                                            }
                                        })
                                        break;
                                    default:
                                        break;
                                }
                            }
                            // 发送新状态
                            let sendRoomInfo = roomInfoHandling.roomInfoPeopleHand(roomInfo, maxNumber)
                            io.sockets.in("room-" + roomid).emit("room_result", resCC("准备状态", 0, sendRoomInfo))
                            updateRoomInfo(sendRoomInfo)
                        })
                    } else {
                        // 发送新状态
                        let sendRoomInfo = roomInfoHandling.roomInfoPeopleHand(roomInfo, maxNumber)
                        io.sockets.in("room-" + roomid).emit("room_result", resCC("准备状态", 0, sendRoomInfo))
                        updateRoomInfo(sendRoomInfo)
                    }
                }
            })
        })
        // 断线重连
        socket.on("reconnection_room", roomid => {
            console.log("断线重连", roomid);
            let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
            db.query(sql, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else if (results.length !== 1) {
                    removeRoomId(roomid)
                    socket.emit("room_not", resCC("房间已解散"))
                    socket.disconnect()
                } else {
                    socket.join("room-" + roomid)
                    let roomInfo = results[0]
                    let baseInfo = roomInfo.base_info //规则
                    baseInfo = eval('(' + baseInfo + ')')
                    const maxNumber = baseInfo.num_of_people
                    const gameType = parseInt(roomInfo.type)
                    let sendRoomInfo = roomInfoHandling.roomInfoPeopleHand(roomInfo, maxNumber)
                    io.sockets.in("room-" + roomid).emit("room_result", resCC("房间数据", 0, sendRoomInfo))
                    let sql = ``
                    if (roomInfo.state == 1) {
                        switch (gameType) {
                            case 0:
                                // 麻将
                                sql = `SELECT * FROM t_games_majiang WHERE roomid=?`
                                db.query(sql, [roomid], (err, results) => {
                                    if (err) {
                                        socket.emit("err_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let gameInfo = results[0]
                                        const gameip = `${gameInfo.ip}:${gameInfo.port}`
                                        const gameid = gameInfo.majiangid
                                        if (gameInfo.player0pai) {
                                            // 发游戏数据
                                            let sendGame = {
                                                gameip,
                                                gameid,
                                                text: "麻将服务器"
                                            }
                                            if (gameInfo.operation) {
                                                let operation = JSON.parse(gameInfo.operation)
                                                if (operation.title.indexOf("chupai") > -1) {
                                                    sendGame.gameInfo = gameHand.majiang(gameInfo)
                                                } else {
                                                    sendGame.gameInfo = operation.gameInfo
                                                    sendGame.operation = operation.operation
                                                    sendGame.nextOperationPosition = operation.nextOperationPosition
                                                }
                                            } else {
                                                sendGame.gameInfo = gameHand.majiang(gameInfo)
                                            }
                                            socket.emit("game_reconnection", resCC("游戏数据", 0, sendGame))
                                        } else {
                                            //游戏未开始
                                            io.sockets.in("room-" + roomid).emit("game_start", resCC("游戏未开始,请初始化发牌", 0, {
                                                gameip,
                                                gameid,
                                                text: "麻将服务器",
                                                diceNumber: [Math.floor(Math.random() * 5) + 1, Math.floor(Math.random() * 5) + 1, Math.floor(Math.random() * 5) + 1]
                                            }))
                                        }
                                    }
                                })
                                break;
                            case 1:
                                // 跑得快
                                break;
                            case 2:
                                // 字牌
                                sql = `SELECT * FROM t_games_zipai WHERE roomid=?`
                                db.query(sql, [roomid], (err, results) => {
                                    if (err) {
                                        socket.emit("err_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let gameInfo = results[0]
                                        const gameip = `${gameInfo.ip}:${gameInfo.port}`
                                        const gameid = gameInfo.zipaiid
                                        if (gameInfo.player0pai) {
                                            // 发游戏数据
                                            let sendGame = {
                                                gameip,
                                                gameid,
                                                text: "字牌服务器"
                                            }
                                            if (gameInfo.operation) {
                                                let operation = JSON.parse(gameInfo.operation)
                                                if (operation.title.indexOf("chupai") > -1) {
                                                    sendGame.gameInfo = gameHand.zipai(gameInfo)
                                                } else {
                                                    sendGame.gameInfo = operation.gameInfo
                                                    sendGame.operation = operation.operation
                                                    sendGame.nextOperationPosition = operation.nextOperationPosition
                                                }
                                            } else {
                                                sendGame.gameInfo = gameHand.zipai(gameInfo)
                                            }
                                            socket.emit("game_reconnection", resCC("游戏数据", 0, sendGame))
                                        } else {
                                            //游戏未开始
                                            io.sockets.in("room-" + roomid).emit("game_start", resCC("游戏未开始,请初始化发牌", 0, {
                                                gameip,
                                                gameid,
                                                text: "字牌服务器",
                                            }))
                                        }
                                    }
                                })
                                break;
                            default:
                                break;
                        }
                    }
                }
            })
        })
        // 公会
        // 查询公会中游戏房间
        socket.on("guild_room_select", data => {
            console.log("guild_room_select", data);
            if (typeof data == "string")
                data = JSON.parse(data)
            const guildid = data.guildid
            const type = data.type
            if (type.toString()) {
                let sql = `SELECT * FROM t_rooms_guild WHERE guildid=? AND type=? AND (user_id0 IS NULL OR user_id1 IS NULL)`
                db.query(sql, [guildid, type], (err, results) => {
                    if (err) {
                        socket.emit("err_result", resCC(err.message))
                        socket.disconnect()
                    } else {
                        io.sockets.in("guild-" + guildid).emit("guild_room_all", resCC("公会所有游戏房间", 0, results))
                        deleteGuildNoFixedRoom()
                    }
                })
            } else {
                let sql = `SELECT * FROM t_rooms_guild WHERE guildid=? AND (user_id0 IS NULL OR user_id1 IS NULL)`
                db.query(sql, guildid, (err, results) => {
                    if (err) {
                        socket.emit("err_result", resCC(err.message))
                        socket.disconnect()
                    } else {
                        socket.join("guild-" + guildid)
                        console.log("guild_room_all", resCC("公会所有游戏房间", 0, results));
                        io.sockets.in("guild-" + guildid).emit("guild_room_all", resCC("公会所有游戏房间", 0, results))
                        deleteGuildNoFixedRoom()
                    }
                })
            }
        })
        // 进入公会房间
        socket.on("guild_room_join", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const guildid = data.guildid
            const roomid = data.roomid
            const userid = data.userid
            let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
            db.query(sql, roomid, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let roomInfo = results[0]
                    let sql = `SELECT * FROM t_users WHERE userid=?`
                    db.query(sql, userid, (err, results) => {
                        if (err) {
                            socket.emit("err_result", resCC(err.message))
                            socket.disconnect()
                        } else {
                            let userInfo = results[0]
                            if (userInfo.tili <= threshold) {
                                socket.emit("refuse_to_join", resCC("没有达到最低体力值要求"))
                            } else {
                                if (roomInfo.user_id0 && roomInfo.user_id1) {
                                    socket.emit("refuse_to_join", resCC("房间已满"))
                                } else {
                                    let i = !roomInfo.user_id0 ? 0 : 1
                                    roomInfo[`user_id${i}`] = userid
                                    roomInfo[`user_icon${i}`] = userInfo.headimg
                                    roomInfo[`user_name${i}`] = userInfo.name
                                    roomInfo[`user_tili${i}`] = userInfo.tili
                                    roomInfo[`user_next_button${i}`] = roomInfo.num_of_turns
                                    roomInfo[`user_state${i}`] = 0
                                    socket.leave("guild-" + guildid)
                                    socket.join("guild-" + guildid + "-room-" + roomid)
                                    let sendRoomInfo = roomInfoHandling.roomInfoGuildHand(roomInfo)
                                    io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_room_result", resCC("公会房间数据", 0, sendRoomInfo))
                                    let sql = `SELECT * FROM t_rooms_guild WHERE guildid=? AND (user_id0 IS NULL OR user_id1 IS NULL)`
                                    db.query(sql, guildid, (err, results) => {
                                        if (err) {
                                            socket.emit("err_result", resCC(err.message))
                                            socket.disconnect()
                                        } else {
                                            io.sockets.in("guild-" + guildid).emit("guild_room_all", resCC("公会所有游戏房间", 0, results))
                                        }
                                    })
                                    updateUserRoomInfo({ guild_roomid: roomid }, userid)
                                    updateGuildRoom(roomInfo, roomid)
                                }
                            }
                        }
                    })
                }
            })
        })
        // 公会离开
        socket.on("guild_room_leave", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const guildid = data.guildid
            const roomid = data.roomid
            const userid = data.userid
            let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
            db.query(sql, roomid, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let roomInfo = results[0]
                    if (roomInfo.user_state0 == 1 && roomInfo.user_state1 == 1) {
                        socket.emit("guild_room_leave", resCC("正在游戏中不能离开"))
                    } else {
                        let i = roomInfo.user_id0 == userid ? 0 : 1
                        if (roomInfo[`user_state${i}`] == 1) {
                            socket.emit("guild_room_leave", resCC("请取消准备才能离开"))
                        } else {
                            roomInfo[`user_id${i}`] = null
                            roomInfo[`user_icon${i}`] = null
                            roomInfo[`user_name${i}`] = null
                            roomInfo[`user_tili${i}`] = null
                            roomInfo[`user_state${i}`] = null
                            roomInfo[`user_next_button${i}`] = null
                            socket.leave("guild-" + guildid + "-room-" + roomid)
                            socket.emit("guild_room_leave", resCC("离开房间中", 0))
                            let sendRoomInfo = roomInfoHandling.roomInfoGuildHand(roomInfo)
                            io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_room_result", resCC("公会房间数据", 0, sendRoomInfo))
                            // 其余所有公会游戏房间进行更新
                            let sql = `SELECT * FROM t_rooms_guild WHERE guildid=? AND (user_id0 IS NULL OR user_id1 IS NULL)`
                            db.query(sql, guildid, (err, results) => {
                                if (err) {
                                    socket.emit("err_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    socket.join("guild-" + guildid)
                                    io.sockets.in("guild-" + guildid).emit("guild_room_all", resCC("公会所有游戏房间", 0, results))
                                }
                            })
                            updateUserRoomInfo({ guild_roomid: null }, userid)
                            updateGuildRoom(roomInfo, roomid)
                        }
                    }
                }
            })
        })
        // 公会准备
        socket.on("guild_room_prepare", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const guildid = data.guildid
            const roomid = data.roomid
            const userid = data.userid
            let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
            db.query(sql, roomid, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let roomInfo = results[0]
                    let i = roomInfo.user_id0 == userid ? 0 : 1
                    roomInfo[`user_state${i}`] = roomInfo[`user_state${i}`] == 0 ? 1 : 0
                    if (roomInfo.state0 == 1 && roomInfo.state1 == 1) {
                        // 游戏开始
                        httpZHU.get(`${config.CLIENT_IP}`, `${config.CLIENT_PORT}`, "/get_games_servers", {
                            ip: `${config.HALL_IP}:${config.HALL_PORT}`,
                            type: roomInfo.type + 1,
                        }, function (ret, data) {
                            if (data.status == 0) {
                                const gameip = data.data
                                let ipconfig = gameip.split(":")
                                let insertSql = {
                                    roomid,
                                    create_time: new Date().getTime(),
                                    people_number: 2,
                                    ip: ipconfig[0],
                                    port: ipconfig[1],
                                    guild: 1
                                }
                                for (let i = 0; i < 2; i++) {
                                    insertSql[`player${i}id`] = roomInfo[`user_id${i}`]
                                }
                                let sql = null
                                let getGameInsertRule = guildGameRule.getGameInsertRule(roomInfo.type, roomInfo.game_rule)
                                insertSql = guildGameRule.mergeInsertCondition(insertSql, getGameInsertRule)
                                switch (parseInt(roomInfo.type)) {
                                    case 0:
                                        // 麻将
                                        sql = `INSERT INTO t_games_majiang SET ?`
                                        db.query(sql, [insertSql], (err, results) => {
                                            if (err) {
                                                socket.emit("err_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                let sql = `SELECT majiangid FROM t_games_majiang WHERE roomid=? AND guild=1`
                                                db.query(sql, roomid, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_game_start", resCC("开始公会游戏", 0, {
                                                            gameip,
                                                            gameid: results[0].majiangid,
                                                            text: "公会麻将服务器",
                                                            diceNumber: [Math.floor(Math.random() * 5) + 1, Math.floor(Math.random() * 5) + 1, Math.floor(Math.random() * 5) + 1],
                                                        }))
                                                    }
                                                })
                                            }
                                        })
                                        break;
                                    case 1:
                                        // 跑得快
                                        sql = `INSERT INTO t_games_paodeikuai SET ?`
                                        db.query(sql, [insertSql], (err, results) => {
                                            if (err) {
                                                socket.emit("err_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                let sql = `SELECT paodeikuaiid FROM t_games_paodeikuai WHERE roomid=? AND guild=1`
                                                db.query(sql, roomid, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_game_start", resCC("开始公会游戏", 0, {
                                                            gameip,
                                                            gameid: results[0].paodeikuaiid,
                                                            text: "公会跑得快服务器",
                                                        }))
                                                    }
                                                })
                                            }
                                        })
                                        break;
                                    case 2:
                                        // 字牌
                                        insertSql.position_index = roomInfo.makers || 0
                                        sql = `INSERT INTO t_games_zipai SET ?`
                                        db.query(sql, insertSql, (err, result) => {
                                            if (err) {
                                                socket.emit("err_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                let sql = `SELECT zipaiid FROM t_games_zipai WHERE roomid=? AND guild=1`
                                                db.query(sql, roomid, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_game_start", resCC("开始公会游戏", 0, {
                                                            gameip,
                                                            gameid: results[0].zipaiid,
                                                            text: "公会字牌服务器",
                                                        }))
                                                    }
                                                })
                                            }
                                        })
                                        break;
                                    default:
                                        break;
                                }
                            }
                            // 发送状态
                            let sendRoomInfo = roomInfoHandling.roomInfoGuildHand(roomInfo)
                            io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_room_result", resCC("准备状态", 0, sendRoomInfo))
                            updateGuildRoom(roomInfo, roomid)
                        })
                    } else {
                        let sendRoomInfo = roomInfoHandling.roomInfoGuildHand(roomInfo)
                        io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_room_result", resCC("准备状态", 0, sendRoomInfo))
                        updateGuildRoom(roomInfo, roomid)
                    }
                }
            })
        })
        // 公会随机匹配加入
        socket.on("guild_room_quickly_join", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const guildid = data.guildid
            const userid = data.userid
            const gametype = data.gametype
            const ruletype = data.ruletype
            const guildRoomRule = guildGameRule.getGuildRoomRule(gametype, ruletype)
            let sql = `SELECT headimg,name,tili FROM t_users WHERE userid=?`
            db.query(sql, userid, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const userInfo = results[0]
                    if (userInfo.tili <= guildRoomRule.threshold) {
                        socket.emit("join_create_blocked", resCC("您的体力没有到达上限,请选择其他类型"))
                    } else {
                        let sql = `SELECT * FROM t_rooms_guild WHERE guildid=? AND type=? AND game_rule=? AND (user_id0 IS NULL OR user_id1 IS NULL)`
                        db.query(sql, [guildid, gametype, ruletype], (err, results) => {
                            if (err) {
                                socket.emit("err_result", resCC(err.message))
                                socket.disconnect()
                            } else {
                                if (results.length == 0)
                                    socket.emit("join_create_blocked", resCC("暂时没有可加入的房间,请稍后再试"))
                                else {
                                    let roomInfo = results[Math.floor(Math.random() * results.length)]
                                    const roomid = roomInfo.id
                                    let i = roomInfo.user_id0 ? 1 : 0
                                    roomInfo[`user_id${i}`] = userid
                                    roomInfo[`user_icon${i}`] = userInfo.headimg
                                    roomInfo[`user_name${i}`] = userInfo.name
                                    roomInfo[`user_tili${i}`] = userInfo.tili
                                    roomInfo[`user_state${i}`] = 0
                                    roomInfo[`user_next_button${i}`] = roomInfo.num_of_turns
                                    socket.leave("guild-" + guildid)
                                    socket.join("guild-" + guildid + "-room-" + roomid)
                                    let sendRoomInfo = roomInfoHandling.roomInfoGuildHand(roomInfo)
                                    io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_room_result", resCC("公会房间数据", 0, sendRoomInfo))
                                    // 其余所有公会游戏房间进行更新
                                    let sql = `SELECT * FROM t_rooms_guild WHERE guildid=? AND (user_id0 IS NULL OR user_id1 IS NULL)`
                                    db.query(sql, guildid, (err, results) => {
                                        if (err) {
                                            socket.emit("err_result", resCC(err.message))
                                            socket.disconnect()
                                        } else {
                                            io.sockets.in("guild-" + guildid).emit("guild_room_all", resCC("公会所有游戏房间", 0, results))
                                        }
                                    })
                                    updateUserRoomInfo({ guild_roomid: roomid }, userid)
                                    updateGuildRoom(roomInfo, roomid)
                                }
                            }
                        })
                    }
                }
            })
        })
        // 公会创建新房间
        socket.on("guild_room_create", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const guildid = data.guildid
            const userid = data.userid
            const gametype = data.gametype
            const ruletype = data.ruletype
            let guildRoomRule = guildGameRule.getGuildRoomRule(gametype, ruletype)
            let sql = `SELECT headimg,name,tili FROM t_users WHERE userid=?`
            db.query(sql, userid, (err, results) => {
                if (err) {
                    socket.emit("err_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const userInfo = results[0]
                    if (userInfo.tili <= guildRoomRule.threshold) {
                        socket.emit("join_create_blocked", resCC("您的体力没有到达上限,请选择其他类型"))
                    } else {
                        guildRoomRule.ip = config.HALL_IP
                        guildRoomRule.port = config.HALL_ROOM_PORT
                        guildRoomRule.guildid = guildid
                        guildRoomRule.game_rule = ruletype
                        guildRoomRule.user_id0 = userid
                        guildRoomRule.user_icon0 = userInfo.headimg
                        guildRoomRule.user_name0 = userInfo.name
                        guildRoomRule.user_tili0 = userInfo.tili
                        guildRoomRule.user_state0 = 0
                        guildRoomRule.user_next_button0 = guildRoomRule.num_of_turns
                        let sql = `INSERT INTO t_rooms_guild SET ?`
                        db.query(sql, [guildRoomRule], (err, result) => {
                            if (err) {
                                socket.emit("err_result", resCC(err.message))
                                socket.disconnect()
                            } else {
                                let sql = `SELECT * FROM t_rooms_guild WHERE fixed_room=0 AND guildid=? AND game_rule=? AND type=? AND user_id0=?`
                                db.query(sql, [guildid, ruletype, gametype, userid], (err, results) => {
                                    if (err) {
                                        socket.emit("err_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        const roomid = roomInfo.id
                                        socket.leave("guild-" + guildid)
                                        socket.join("guild-" + guildid + "-room-" + roomid)
                                        let sendRoomInfo = roomInfoHandling.roomInfoGuildHand(roomInfo)
                                        io.sockets.in("guild-" + guildid + "-room-" + roomid).emit("guild_room_result", resCC("公会房间数据", 0, sendRoomInfo))
                                        // 其余所有公会游戏房间进行更新
                                        let sql = `SELECT * FROM t_rooms_guild WHERE guildid=? AND (user_id0 IS NULL OR user_id1 IS NULL)`
                                        db.query(sql, guildid, (err, results) => {
                                            if (err) {
                                                socket.emit("err_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                io.sockets.in("guild-" + guildid).emit("guild_room_all", resCC("公会所有游戏房间", 0, results))
                                            }
                                        })
                                        updateUserRoomInfo({ guild_roomid: roomid }, userid)
                                    }
                                })
                            }
                        })
                    }
                }
            })
        })
    })
}

const myPositionIndex = (data, userid) => {
    let index = ""
    for (const key in data) {
        if (key.indexOf("user_id") > -1) {
            if (data[key] == userid) {
                index = key.split("user_id")[1]
                break
            }
        }
    }
    return index
}

// 修改用户信息
const updateUserRoomInfo = (update, userid) => {
    let sql = `UPDATE t_users SET ? WHERE userid=?`
    db.query(sql, [update, userid], (err, result) => {
    })
}

// 删除非固定房间
const deleteGuildNoFixedRoom = () => {
    let sql = `DELETE FROM t_rooms_guild WHERE fixed_room!=1 AND user_id0 IS NULL AND user_id1 IS NULL`
    db(sql, (err, result) => {
    })
}

// 修改房间信息
const updateRoomInfo = (update) => {
    const id = update.id || update.roomid
    if (update.roomid) delete update.roomid
    if (update.id) delete update.id
    let sql = `UPDATE t_rooms SET ? WHERE id=?`
    db.query(sql, [update, id], (err, result) => {
        console.log(err, result);
    })
}

// 修改公会房间
const updateGuildRoom = (update, roomid) => {
    if (update.id) delete update.id
    if (update.roomid) delete update.roomid
    let sql = `UPDATE t_rooms_guild SET ? WHERE id=?`
    db.query(sql, [update, roomid], (err, result) => {
        deleteGuildNoFixedRoom()
    })
}