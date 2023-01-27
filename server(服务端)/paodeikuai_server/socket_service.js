const db = require('../db')
const paodeikuai = require("./paodeikuai")
const paodeikuaiDatabase = require("./paodeikuai_database")
const guildGame = require("./guild_game")
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
let socketRoom = []
let socketRoomPeople = []
exports.start = (io) => {
    io.on("connection", (socket) => {
        socket.emit("connect_result", resCC("连接成功", 0))
        // 玩家进入游戏
        socket.on("join_game", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const gameid = data.gameid
            const userid = data.userid
            socket.join("room-" + gameid)
            let index = socketRoom.indexOf(gameid)
            if (index > -1) {
                socketRoomPeople[index].push(userid)
                let sql = `SELECT people_number,player0pai FROM t_games_paodeikuai WHERE majiangid=?`
                db.query(sql, gameid, (err, results) => {
                    if (err) {
                        socket.emit("err_game_result", resCC(err.message))
                        socket.disconnect()
                    } else {
                        if (!results[0].player0pai) {
                            let peopleNumber = results[0].people_number
                            if (socketRoomPeople[index].length > peopleNumber) {
                            } else if (peopleNumber == socketRoomPeople[index].length) {
                                io.sockets.in("room-" + gameid).emit("game_room_ok", resCC("服务器人员加载完成", 0))
                            }
                        }
                        socketRoomPeople[index] = Array.from(new Set(socketRoomPeople[index]))
                    }
                })
            } else {
                if (gameid && userid) {
                    socketRoom.push(gameid)
                    socketRoomPeople.push([userid])
                }
            }
        })
        socket.on("paodeikuai_fapai_init", gameid => {
            // gameid = 1
            let sql = `SELECT * FROM t_games_paodeikuai WHERE paodeikuaiid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let gameInfo = results[0]
                    const peopleNumber = gameInfo.people_number
                    gameInfo = paodeikuai.initpai(peopleNumber, gameInfo)
                    let updateSql = paodeikuaiDatabase.handdatabase(gameInfo)
                    io.sockets.in("room-" + gameid).emit("paodeikuai_next_chupai", resCC("指定位置玩家出牌", 0, gameInfo))
                    updateGameInfo(updateSql, gameid)
                }
            })
        })
        socket.on("paodeikuai_chupai", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const gameid = data.gameid
            const chupai_deck = data.chupai_deck
            let sql = `SELECT * FROM t_games_paodeikuai WHERE paodeikuaiid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let gameInfo = results[0]
                    const roomid = gameInfo.roomid
                    const peopleNumber = gameInfo.people_number
                    const grabBird = gameInfo.grab_bird
                    gameInfo = paodeikuaiDatabase.databasedemand(gameInfo)
                    console.log(gameInfo);
                    const chuPaiposition = gameInfo.positionIndex
                    gameInfo = paodeikuai.removeChupaiDeck(gameInfo, chupai_deck)
                    if (gameInfo[`player${gameInfo.positionIndex}Pai`].length == 0) {
                        // 游戏结束
                        let insertsql = []
                        let sumWinner = 0 // 玩家剩余牌数
                        let birdPosition = null // 抓鸟玩家位置
                        for (let i = 0; i < peopleNumber; i++) {
                            let shouPai = JSON.stringify({
                                shouPai: gameInfo[`player${i}Pai`],
                                outPai: gameInfo[`player${i}OutPai`]
                            })
                            insertsql.push([
                                gameInfo[`playerid${i}`],
                                1,
                                i == gameInfo.positionIndex ? 1 : 2,
                                shouPai
                            ])
                            sumWinner = sumWinner + gameInfo[`player${i}Pai`] <= 1 ? 0 : gameInfo[`player${i}Pai`].length
                            // 抓鸟判断
                            if (grabBird && grabBird == 1) {
                                let doubleBird = paodeikuai.grabBird(gameInfo[`player${i}Pai`], gameInfo[`player${i}OutPai`])
                                if (doubleBird) {
                                    birdPosition == i
                                    sumWinner = i == gameInfo.positionIndex ? sumWinner * 2 :
                                        sumWinner + gameInfo[`player${i}Pai`] <= 1 ? 0 : gameInfo[`player${i}Pai`].length
                                }
                            }
                        }
                        addUserRecord(insertsql, gameid)
                        // 按剩余多少牌进行扣钱
                        let animation = {}
                        if (results[0].guild && results[0].guild == 1) {
                            // 公会
                            let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                            db.query(sql, [roomid], (err, results) => {
                                if (err) {
                                    socket.emit("err_game_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    let roomInfo = results[0]
                                    let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                    roomInfo = gameOverGuild.data
                                    const userLeaveRoom = gameOverGuild.leaveRoom
                                    roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                    let tili = roomInfo.tili / 10
                                    for (let i = 0; i < 2; i++) {
                                        let userScore = roomInfo[`user_tili${i}`]
                                        let userPaiLength = gameInfo[`player${i}Pai`].length
                                        roomInfo[`user_tili${i}`] = i == positionIndex ? userScore + (tili * sumWinner) :
                                            birdPosition == i ? userScore - (userPaiLength <= 1 ? 0 : userPaiLength * tili) * 2 :
                                                userScore - userPaiLength <= 1 ? 0 : userPaiLength * tili
                                        animation[`player${i}`] = i == positionIndex ? `+ ${(tili * sumWinner).toString()}` :
                                            birdPosition == i ? ` - ${((userPaiLength <= 1 ? 0 : userPaiLength * tili) * 2).toString()} ` :
                                                ` - ${(userPaiLength <= 1 ? 0 : userPaiLength * tili).toString()}`
                                        // 扣手续费
                                        if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                            roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], roomInfo.tili)
                                        }
                                        // 同步更新
                                        updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                    }
                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-天胡", 0, {
                                        roomInfo,
                                        gameInfo,
                                        animation
                                    }))
                                    if (userLeaveRoom.length > 0) {
                                        for (let i = 0; i < userLeaveRoom.length; i++) {
                                            let userid = userLeaveRoom[i];
                                            updateUserRoomInfo({ guild_roomid: null }, userid)
                                        }
                                    }
                                    removeGameCache(gameid)
                                    updateGuildRoomInfo(roomInfo, roomid)
                                }
                            })
                        } else {
                            // 普通
                            let sql = `SELECT * FROM t_rooms WHERE id=?`
                            db.query(sql, [roomid], (err, results) => {
                                if (err) {
                                    socket.emit("err_game_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    let roomInfo = results[0]
                                    roomInfo.state = 0
                                    roomInfo.next_button = roomInfo.next_button - 1
                                    let score = 10 / 10
                                    for (let i = 0; i < peopleNumber; i++) {
                                        roomInfo[`user_state${i}`] = 0
                                        let userScore = roomInfo[`user_score${i}`]
                                        let userPaiLength = gameInfo[`player${i}Pai`].length
                                        roomInfo[`user_score${i}`] = i == positionIndex ? userScore + (score * sumWinner) :
                                            birdPosition == i ? userScore - (userPaiLength <= 1 ? 0 : userPaiLength * score) * 2 :
                                                userScore - userPaiLength <= 1 ? 0 : userPaiLength * score
                                        animation[`player${i}`] = i == positionIndex ? `+ ${(score * sumWinner).toString()}` :
                                            birdPosition == i ? ` - ${((userPaiLength <= 1 ? 0 : userPaiLength * score) * 2).toString()} ` :
                                                ` - ${(userPaiLength <= 1 ? 0 : userPaiLength * score).toString()}`
                                    }
                                    // 达到使用上限删除房间
                                    if (roomInfo.next_button <= 0) roomLeave(roomid)
                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-天胡", 0, {
                                        roomInfo,
                                        gameInfo,
                                        animation
                                    }))
                                    removeGameCache(gameid)
                                    updateRoomInfo(roomInfo, roomid)
                                    if (roomInfo.num_of_turns - roomInfo.next_button == 1) {
                                        // 扣房卡
                                        roomWithholdingCard(roomInfo.user_id0, roomInfo.num_of_turns < 10 ? 5 : 10)
                                    }
                                }
                            })
                        }
                    } else {
                        // 判断其他玩家是否可以出牌
                        let nextPlayerAndType = paodeikuai.nextPlayer(gameInfo)
                        gameInfo = nextPlayerAndType.gameInfo
                        if (nextPlayerAndType.type == 2) {
                            // 炸弹
                            let animation = {}
                            if (results[0].guild && results[0].guild == 1) {
                                // 公会
                                let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                                db.query(sql, [roomid], (err, results) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        let tili = roomInfo.tili
                                        for (let i = 0; i < peopleNumber; i++) {
                                            roomInfo[`user_tili${i}`] = i == chuPaiposition ? roomInfo[`user_tili${i}`] + tili * (peopleNumber - 1) : roomInfo[`user_tili${i}`] - tili
                                            animation[`player${i}`] = i == chuPaiposition ? "+ " + tili.toString() * (peopleNumber - 1) : "- " + tili.toString()
                                            updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                        }
                                        io.sockets.in("room - " + gameid).emit("paodeikuai_action_animation", resCC({ type: nextPlayerAndType.type, chupai_deck, animation }))
                                        updateGuildRoomInfo(roomInfo, roomid)
                                    }
                                })
                            } else {
                                // 普通
                                let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                                db.query(sql, [roomid], (err, results) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                        for (let i = 0; i < peopleNumber; i++) {
                                            roomInfo[`user_score${i}`] = i == chuPaiposition ? roomInfo[`user_score${i}`] + 10 * (peopleNumber - 1) : roomInfo[`user_score${i}`] - 10
                                            animation[`player${i}`] = i == chuPaiposition ? `+ ${(10 * (peopleNumber - 1)).toString()}` : "- 10"
                                        }
                                        io.sockets.in("room - " + gameid).emit("paodeikuai_action_animation", resCC({ type: nextPlayerAndType.type, chupai_deck, animation }))
                                        updateRoomInfo(roomInfo, roomid)
                                    }
                                })
                            }
                        } else io.sockets.in("room - " + gameid).emit("paodeikuai_action_animation", resCC({ type: nextPlayerAndType.type, chupai_deck }))
                        io.sockets.in("room-" + gameid).emit("paodeikuai_next_chupai", resCC("指定位置玩家出牌", 0, gameInfo))
                        let updateSql = paodeikuaiDatabase.handdatabase(gameInfo)
                        console.log(updateSql);
                        updateGameInfo(updateSql, gameid)
                    }
                }
            })



            //     let chupaiHand = paodeikuai.chupaiHand(chupaiarr)
            //     let typePai = paodeikuai.typeHandling(chupaiHand)
            //     if (typePai === 5) {
            //         socket.emit("paodeikuai_no_compliance", resCC("请重新选择出牌"))
            //     } else {
            //         let sql = `SELECT * FROM t_games_paodeikuai WHERE paodeikuaiid=?`
            //         db.query(sql, gameid, (err, results) => {
            //             if (err) {
            //                 socket.emit("err_game_result", resCC(err.message))
            //                 socket.disconnect()
            //             } else {
            //                 let gameData = results[0]
            //                 const roomid = gameData.roomid
            //                 let gameInfo = paodeikuai.handDataBase(gameData)
            //                 let chupaiHandGameInfo = paodeikuai.chupaiHandGameInfo(gameInfo, chupaiarr, victoryPostition)
            //                 gameInfo = chupaiHandGameInfo.gameData
            //                 let realPai = chupaiHandGameInfo.realPai
            //                 console.log(chupaiHandGameInfo);
            //                 if (gameInfo[`player${victoryPostition}Pai`].length == 0) {
            //                     console.log("游戏结束");
            //                     const peopleNumber = gameInfo.peopleNumber
            //                     let insetsql = []
            //                     for (let i = 0; i < peopleNumber; i++) {
            //                         insetsql.push([
            //                             gameInfo[`playerid${i}`],
            //                             1,
            //                             i == victoryPostition ? 1 : 2
            //                         ])
            //                     }
            //                     let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
            //                     db.query(sql, insetsql, (err, result) => {
            //                         if (err) {
            //                             socket.emit("err_game_result", resCC(err.message))
            //                             socket.disconnect()
            //                         } else {
            //                             let sql = `DELECT FROM t_games_paodeikuai WHERE paodeikuaiid=?`
            //                             db.query(sql, gameid, (err, result) => {
            //                                 if (err) {
            //                                     socket.emit("err_game_result", resCC(err.message))
            //                                     socket.disconnect()
            //                                 } else {
            //                                     let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
            //                                     db.query(sql, (err, results) => {
            //                                         let roomInfo = results[0]
            //                                         let updatesql = {
            //                                             state: 0,
            //                                             next_button: roomInfo.next_button - 1,
            //                                             makers: victoryPostition
            //                                         }
            //                                         for (let i = 0; i < peopleNumber; i++) {
            //                                             updatesql[`user_state${i}`] = i === 0 ? 1 : 0
            //                                         }
            //                                         let sql = `UPDATE t_rooms SET ? WHERE id=?`
            //                                         db.query(sql, [updatesql, roomid], (err, result) => {
            //                                             if (err) {
            //                                                 socket.emit("err_game_result", resCC(err.message))
            //                                                 socket.disconnect()
            //                                             } else {
            //                                                 io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0))
            //                                             }
            //                                         })
            //                                     })
            //                                 }
            //                             })
            //                         }
            //                     })
            //                     // let updatesql = {}
            //                     // for (let i = 0; i < peopleNumber; i++) {
            //                     //     updatesql[`player${i}result`] = i == victoryPostition ? 1 : 2
            //                     // }
            //                     // // console.log(updatesql);
            //                     // let sql = `UPDATE t_games_paodeikuai SET ? WHERE paodeikuaiid=?`
            //                     // db.query(sql, [updatesql, gameid], (err, result) => {
            //                     //     if (err) {
            //                     //         socket.emit("err_game_result", resCC(err.message))
            //                     //         socket.disconnect()
            //                     //     } else {
            //                     //         console.log(resCC("游戏结束", 0, gameInfo));
            //                     //         io.sockets.in("room-" + gameid).emit("paodeikuai_over", resCC("游戏结束", 0, gameInfo))
            //                     //         socket.disconnect()
            //                     //     }
            //                     // })
            //                 } else {
            //                     console.log("游戏继续");
            //                     let nextPlayer = paodeikuai.nextPlayer(realPai, chupaiHand, typePai)
            //                     nextPlayer = nextPlayer == 10 ? victoryPostition : nextPlayer
            //                     console.log(nextPlayer);
            //                     gameInfo.positionIndex = nextPlayer
            //                     let updatesql = paodeikuai.updateDataBaseChuPai(gameInfo, nextPlayer)
            //                     console.log(updatesql);
            //                     let sql = `UPDATE t_games_paodeikuai SET ? WHERE paodeikuaiid=?`
            //                     db.query(sql, [updatesql, gameid], (err, result) => {
            //                         if (err) {
            //                             socket.emit("err_game_result", resCC(err.message))
            //                             socket.disconnect()
            //                         } else {
            //                             console.log(resCC("指定位置玩家出牌", 0, gameInfo));
            //                             io.sockets.in("room-" + gameid).emit("paodeikuai_next_chupai", resCC("指定位置玩家出牌", 0, gameInfo))
            //                         }
            //                     })
            //                 }
            //             }
            //         })
            //     }
        })
    })
}

// 修改游戏数据
const updateGameInfo = (data, gameid) => {
    let sql = `UPDATE t_games_paodeikuai SET ? WHERE paodeikuaiid=?`
    db.query(sql, [data, gameid], (err, result) => {
    })
}
// 修改房间信息
const updateRoomInfo = (update, roomid) => {
    if (update.id) delete update.id
    if (update.roomid) delete update.roomid
    let sql = `UPDATE t_rooms SET ? WHERE id=?`
    db.query(sql, [update, roomid], (err, result) => {
        console.log(err, result);
    })
}
// 修改公会房间信息
const updateGuildRoomInfo = (update, roomid) => {
    if (update.id) delete update.id
    if (update.roomid) delete update.roomid
    let sql = `UPDATE t_rooms_guild SET ? WHERE id=?`
    db.query(sql, [update, roomid], (err, result) => {
    })
}
// 已达到使用上限
const roomLeave = (roomid) => {
    let sql = `DELETE FROM t_rooms WHERE id=?`
    db.query(sql, roomid, (err, result) => {
        if (!err) {
            updateUserRoomInfo({ roomid: null }, userid)
        }
    })
}
// 修改用户信息
const updateUserRoomInfo = (update, userid) => {
    let sql = `UPDATE t_users SET ? WHERE userid=?`
    db.query(sql, [update, userid], (err, result) => {
    })
}
// 扣房卡
const roomWithholdingCard = (userid, number) => {
    let sql = `SELECT userid,gems FROM WHERE userid=?`
    db.query(sql, userid, (err, results) => {
        if (!err) {
            updateUserRoomInfo({ gems: results[0].gems - number }, userid)
        }
    })
}
// 移除游戏结束的缓存
const removeGameCache = (gameid) => {
    let index = socketRoom.indexOf(gameid)
    if (index > -1) {
        socketRoom.splice(index, 1)
        socketRoomPeople.splice(index, 1)
    }
}
// 扣手续费
const serviceCharge = (userid, userTili, tili) => {
    let total = userTili - tili
    if (total < 0) total = 0
    let sql = `SELECT petty_cash t_users WHERE userid=?`
    db.query(sql, userid, (err, results) => {
        if (!err) {
            updateUserRoomInfo({ tili: total, petty_cash: Math.floor(tili / 3) + parseInt(results[0].petty_cash || 0) }, userid)
        }
    })
    return total
}
// 添加战绩
const addUserRecord = (insert, gameid) => {
    let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
    db.query(sql, [insert], (err, result) => {
        console.log(err, result);
        if (!err) {
            let sql = `DELETE FROM t_games_paodeikuai WHERE zipaiid=?`
            db.query(sql, [gameid], (err, result) => {
                console.log(err, result);
            })
        }
    })
}
// 房间数据处理
const roomInfoPeopleHand = (data, peopleNumber) => {
    let roomInfo = {
        roomid: data.id,
        type: data.type,
        base_info: data.base_info,
        num_of_turns: data.num_of_turns,
        next_button: data.next_button,
    }
    for (let i = 0; i < peopleNumber; i++) {
        roomInfo[`user_id${i}`] = data[`user_id${i}`]
        roomInfo[`user_icon${i}`] = data[`user_icon${i}`]
        roomInfo[`user_name${i}`] = data[`user_name${i}`]
        roomInfo[`user_score${i}`] = data[`user_score${i}`]
        roomInfo[`user_state${i}`] = data[`user_state${i}`]
    }
    return roomInfo
}