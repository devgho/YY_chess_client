const db = require('../db')
const leiyangMaJiang = require("./leiyang_guipai")
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
let socketRoom = [] // 房间
let socketRoomPeople = [] // 房间人数

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
                let sql = `SELECT people_number,player0pai FROM t_games_majiang WHERE majiangid=?`
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
        // 初始化发牌
        socket.on("majiang_fapai_init", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            const gameid = data.gameid // 房间号
            const diceNumber = data.diceNumber // 色子
            let sql = `SELECT * FROM t_games_majiang WHERE majiangid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const gameInfo = results[0]
                    const peopleNumber = gameInfo.people_number
                    let mahjiangsData = leiyangMaJiang.initfapai(peopleNumber, gameInfo.guipaiid)
                    for (let i = 0; i < peopleNumber; i++) {
                        mahjiangsData[`playerid${i}`] = gameInfo[`player${i}id`]
                    }
                    const indexPlayer = diceNumber % peopleNumber
                    mahjiangsData.positionIndex = indexPlayer
                    mahjiangsData[`playerShouPai${indexPlayer}`].push(mahjiangsData.unknownPai[0])
                    mahjiangsData.moPaiid = mahjiangsData.unknownPai[0]
                    mahjiangsData.unknownPai.shift()
                    let sqlUpdate = {
                        dice_number: diceNumber,
                        mopaiid: mahjiangsData.moPaiid,
                        position_index: indexPlayer,
                        unknownpai: JSON.stringify({ data: mahjiangsData.unknownPai })
                    }
                    for (let i = 0; i < peopleNumber; i++) {
                        sqlUpdate[`player${i}pai`] = {}
                        sqlUpdate[`player${i}pai`][`playerShouPai${i}`] = mahjiangsData[`playerShouPai${i}`]
                        sqlUpdate[`player${i}pai`][`playerMingGang${i}`] = mahjiangsData[`playerMingGang${i}`]
                        sqlUpdate[`player${i}pai`][`playerMingPeng${i}`] = mahjiangsData[`playerMingPeng${i}`]
                        sqlUpdate[`player${i}pai`][`playerOutPai${i}`] = mahjiangsData[`playerOutPai${i}`]
                        sqlUpdate[`player${i}pai`] = JSON.stringify(sqlUpdate[`player${i}pai`])
                    }
                    let gangplayer = leiyangMaJiang.mopaigang(mahjiangsData)
                    let huplayer = leiyangMaJiang.initgang(mahjiangsData)
                    if (!gangplayer && !huplayer) {
                        sqlUpdate.operation = JSON.stringify({
                            title: "majiang_next_chupai"
                        })
                        io.sockets.in("room-" + gameid).emit("majiang_next_chupai", resCC("直接出牌", 0, mahjiangsData))
                    } else {
                        let operation = {
                            title: "majiang_me_operation",
                            operation: {
                                gang: gangplayer,
                                zimo: huplayer,
                            },
                            gameInfo: mahjiangsData
                        }
                        sqlUpdate.operation = JSON.stringify(operation)
                        io.sockets.in("room-" + gameid).emit("majiang_me_operation", resCC("有自摸、杠操作", 0, operation))
                    }
                    console.log(sqlUpdate);
                    updateGameInfo(sqlUpdate, gameid)
                }
            })
        })
        // 出牌
        socket.on("majiang_chupai", data => {
            console.log("出牌", data, new Date().getTime());
            if (typeof data == "string")
                data = JSON.parse(data)
            const gameid = data.gameid
            const chuPaiid = data.chuPaiid
            io.sockets.in("room-" + gameid).emit("game_chupai", resCC("打出出牌", 0, chuPaiid ? chuPaiid : chuPaiid.toString()))
            let sql = `SELECT * FROM t_games_majiang WHERE majiangid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const gameInfo = results[0]
                    const peopleNumber = gameInfo.people_number
                    const roomid = gameInfo.roomid
                    let majiangData = leiyangMaJiang.handleMaJiang(gameInfo)
                    majiangData = leiyangMaJiang.chupai(majiangData, chuPaiid)
                    let operationPlayer = leiyangMaJiang.operationHandPlayer(majiangData, peopleNumber)
                    let operationBol = leiyangMaJiang.operationHand(operationPlayer)
                    if (!operationBol) {
                        // 下一个人出牌
                        if (majiangData.unknownPai.length === 0) {
                            // 和牌
                            let insertsql = []
                            for (let i = 0; i < peopleNumber; i++) {
                                let shouPai = JSON.stringify({
                                    shouPai: majiangData[`playerShouPai${i}`],
                                    mingPai: {
                                        gang: majiangData[`playerMingGang${i}`],
                                        peng: majiangData[`playerMingPeng${i}`]
                                    }
                                })
                                insertsql.push([
                                    majiangData[`playerid${i}`],
                                    0,
                                    0,
                                    shouPai
                                ])
                            }
                            let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
                            db.query(sql, [insertsql], (err, result) => {
                                if (err) {
                                    socket.emit("err_game_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    let sql = `DELETE FROM t_games_majiang WHERE majiangid=${gameid}`
                                    db.query(sql, (err, result) => {
                                        if (err) {
                                            socket.emit("err_game_result", resCC(err.message))
                                            socket.disconnect()
                                        } else {
                                            if (gameInfo.guild == 1) {
                                                // 公会房间
                                                let sql = `SELECT * FROM t_rooms_guild WHERE id=${roomid}`
                                                db.query(sql, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_game_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        let roomInfo = results[0]
                                                        let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                                        roomInfo = gameOverGuild.data
                                                        const userLeaveRoom = gameOverGuild.leaveRoom
                                                        roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                                        // 扣手续费
                                                        let tili = roomInfo.tili
                                                        for (let i = 0; i < 2; i++) {
                                                            if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                                roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], tili)
                                                            }
                                                            updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                                        }
                                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                            roomInfo,
                                                            animationType: 0
                                                        }))
                                                        // 清除用户房间id
                                                        if (userLeaveRoom.length > 0) {
                                                            for (let i = 0; i < userLeaveRoom.length; i++) {
                                                                let userid = userLeaveRoom[i];
                                                                updateUserRoomInfo({ guild_roomid: null }, userid)
                                                            }
                                                        }
                                                        removeGameCache(gameid)
                                                        // 修改房间
                                                        updateGuildRoomInfo(roomInfo, roomid)
                                                    }
                                                })
                                            } else {
                                                let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
                                                db.query(sql, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_game_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        let roomInfo = results[0]
                                                        roomInfo.state = 0
                                                        roomInfo.next_button = roomInfo.next_button - 1
                                                        for (let i = 0; i < peopleNumber; i++) {
                                                            roomInfo[`user_state${i}`] = 0
                                                        }
                                                        if (roomInfo.next_button <= 0) roomLeave(roomid)
                                                        roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                            roomInfo,
                                                            animationType: 0
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
                                        }
                                    })
                                }
                            })
                        } else {
                            majiangData.positionIndex = (majiangData.positionIndex + 1) % peopleNumber
                            majiangData = leiyangMaJiang.mopai(majiangData)
                            let updatesql = leiyangMaJiang.mopaiDataBase(majiangData, peopleNumber)
                            let gangplayer = leiyangMaJiang.mopaigang(majiangData)
                            let huplayer = leiyangMaJiang.mopaihu(majiangData)
                            if (!gangplayer && !huplayer) {
                                updatesql.operation = JSON.stringify({
                                    title: "majiang_next_chupai"
                                })
                                io.sockets.in("room-" + gameid).emit("majiang_next_chupai", resCC("直接出牌", 0, majiangData))
                            } else {
                                let operation = {
                                    title: "majiang_me_operation",
                                    operation: {
                                        gang: gangplayer,
                                        zimo: huplayer,
                                    },
                                    gameInfo: majiangData
                                }
                                updatesql.operation = JSON.stringify(operation)
                                io.sockets.in("room-" + gameid).emit("majiang_me_operation", resCC("有自摸、杠操作", 0, operation))
                            }
                            updateGameInfo(updatesql, gameid)
                        }
                    } else {
                        let updateSql = leiyangMaJiang.updateBaseChuOperation(majiangData)
                        const operationHandUseless = leiyangMaJiang.removeOperationHand(operationPlayer)
                        operationPlayer = operationHandUseless.data
                        let operationPlayerArr = operationHandUseless.player
                        let operation = {
                            title: "majiang_all_operation",
                            operation: operationPlayer,
                            gameInfo: majiangData
                        }
                        for (let i = 1; i <= peopleNumber; i++) {
                            let nextOperationPosition = (gameInfo.positionIndex + i) % peopleNumber
                            let index = operationPlayerArr.indexOf(nextOperationPosition)
                            if (index > -1) {
                                operationPlayerArr.splice(index, 1)
                                operation.nextOperationPosition = nextOperationPosition
                                break
                            }
                        }
                        operation.operationPlayer = operationPlayerArr
                        updateSql.operation = JSON.stringify(operation)
                        io.sockets.in("room-" + gameid).emit("majiang_all_operation", resCC("碰、杠、胡等待其他玩家操作", 0, operation))
                        updateGameInfo(updateSql, gameid)
                    }
                }
            })
        })
        // 玩家操作
        socket.on("majiang_operation", data => {
            console.log("玩家操作majiang_operation", data, new Date().getTime());
            if (typeof data == "string")
                data = JSON.parse(data)
            const gameid = data.gameid
            const operationType = parseInt(data.operationType)
            // const playerPosition = parseInt(data.playerPosition)
            let sql = `SELECT * FROM t_games_majiang WHERE majiangid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const gameInfo = results[0]
                    const roomid = gameInfo.roomid
                    let operation = JSON.parse(gameInfo.operation)
                    let majiangData = operation.gameInfo
                    let playerPosition = operation.nextOperationPosition
                    let operationPlayer = operation.operationPlayer
                    operation = operation.operation
                    const positionIndex = majiangData.positionIndex
                    const peopleNumber = gameInfo.people_number
                    if (operationType == 0) {
                        io.sockets.in("room-" + gameid).emit("action_animation", { type: 0 })
                        // 过
                        if (operationPlayer.length) {
                            // 直接进入下一个玩家摸牌
                            if (majiangData.unknownPai.length === 0) {
                                // 和牌
                                let insertsql = []
                                for (let i = 0; i < peopleNumber; i++) {
                                    let shouPai = JSON.stringify({
                                        shouPai: majiangData[`playerShouPai${i}`],
                                        mingPai: {
                                            gang: majiangData[`playerMingGang${i}`],
                                            peng: majiangData[`playerMingPeng${i}`]
                                        }
                                    })
                                    insertsql.push([
                                        majiangData[`playerid${i}`],
                                        0,
                                        0,
                                        shouPai
                                    ])
                                }
                                let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
                                db.query(sql, [insertsql], (err, result) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let sql = `DELETE FROM t_games_majiang WHERE majiangid=${gameid}`
                                        db.query(sql, (err, result) => {
                                            if (err) {
                                                socket.emit("err_game_result", resCC(err.message))
                                                socket.disconnect()
                                            } else {
                                                if (gameInfo.guild == 1) {
                                                    // 公会房间
                                                    let sql = `SELECT * FROM t_rooms_guild WHERE id=${roomid}`
                                                    db.query(sql, (err, results) => {
                                                        if (err) {
                                                            socket.emit("err_game_result", resCC(err.message))
                                                            socket.disconnect()
                                                        } else {
                                                            let roomInfo = results[0]
                                                            let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                                            roomInfo = gameOverGuild.data
                                                            const userLeaveRoom = gameOverGuild.leaveRoom
                                                            roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                                            // 扣手续费
                                                            let tili = roomInfo.tili
                                                            for (let i = 0; i < 2; i++) {
                                                                if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                                    roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], tili)
                                                                }
                                                                updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                                            }
                                                            io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                                roomInfo,
                                                                animationType: 0
                                                            }))
                                                            // 清除用户房间id
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
                                                    let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
                                                    db.query(sql, (err, results) => {
                                                        if (err) {
                                                            socket.emit("err_game_result", resCC(err.message))
                                                            socket.disconnect()
                                                        } else {
                                                            let roomInfo = results[0]
                                                            roomInfo.state = 0
                                                            roomInfo.next_button = roomInfo.next_button - 1
                                                            for (let i = 0; i < peopleNumber; i++) {
                                                                roomInfo[`user_state${i}`] = 0
                                                            }
                                                            if (roomInfo.next_button <= 0) roomLeave(roomid)
                                                            roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                                            io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                                roomInfo,
                                                                animationType: 0
                                                            }))
                                                            removeGameCache(gameid)
                                                            updateRoomInfo(roomInfo, roomid)
                                                            if (roomInfo.num_of_turns - roomInfo.next_button == 1) {
                                                                // 扣房卡
                                                                console.log("扣房卡");
                                                                roomWithholdingCard(roomInfo.user_id0, roomInfo.num_of_turns < 10 ? 5 : 10)
                                                            }


                                                        }
                                                    })
                                                }
                                            }
                                        })
                                    }
                                })
                            } else {
                                majiangData.positionIndex = (positionIndex + 1) % peopleNumber
                                majiangData = leiyangMaJiang.mopai(majiangData)
                                let updatesql = leiyangMaJiang.mopaiDataBase(majiangData, peopleNumber)
                                let gangplayer = leiyangMaJiang.mopaigang(majiangData)
                                let huplayer = leiyangMaJiang.mopaihu(majiangData)
                                if (!gangplayer && !huplayer) {
                                    updatesql.operation = JSON.stringify({
                                        title: "majiang_next_chupai"
                                    })
                                    io.sockets.in("room-" + gameid).emit("majiang_next_chupai", resCC("直接出牌", 0, majiangData))
                                } else {
                                    let operation = {
                                        title: "majiang_me_operation",
                                        operation: {
                                            gang: gangplayer,
                                            zimo: huplayer
                                        },
                                        gameInfo: majiangData
                                    }
                                    updatesql.operation = JSON.stringify(operation)
                                    io.sockets.in("room-" + gameid).emit("majiang_me_operation", resCC("有自摸、杠操作", 0, operation))
                                }
                                updateGameInfo(updatesql, gameid)
                            }
                        } else {
                            console.log("进行下一个玩家操作判断");
                            for (let i = 1; i <= peopleNumber; i++) {
                                let nextOperationPosition = (operationPlayer + i) % peopleNumber
                                let index = operationPlayer.indexOf(nextOperationPosition)
                                if (index > -1) {
                                    operationPlayer.splice(index, 1)
                                    playerPosition = nextOperationPosition
                                    break
                                }
                            }
                            let updateOperation = {
                                title: "majiang_all_operation",
                                operation,
                                gameInfo: majiangData,
                                nextOperationPosition: playerPosition,
                                operationPlayer
                            }
                            io.sockets.in("room-" + gameid).emit("majiang_all_operation", resCC("碰、杠、胡等待其他玩家操作", 0, updateOperation))
                            updateGameInfo({ operation: JSON.stringify(updateOperation) }, gameid)
                        }
                    } else if (operationType == 1) {
                        // 碰
                        majiangData = leiyangMaJiang.penghand(majiangData, playerPosition)
                        let updatesql = leiyangMaJiang.penggangDataBase(majiangData)
                        updatesql.operation = JSON.stringify({ title: "majiang_operation_chupai" })
                        io.sockets.in("room-" + gameid).emit("majiang_operation_chupai", resCC("玩家碰后出牌", 0, {
                            gameInfo: majiangData,
                            type: 0,
                            paiid: majiangData.chuPaiid
                        }))
                        updateGameInfo(updatesql, gameid)
                    } else if (operationType == 2) {
                        // 杠
                        majiangData = leiyangMaJiang.ganghand(majiangData, playerPosition)
                        if (majiangData.unknownPai.length === 0) {
                            // 和牌
                            let insertsql = []
                            for (let i = 0; i < peopleNumber; i++) {
                                let shouPai = JSON.stringify({
                                    shouPai: majiangData[`playerShouPai${i}`],
                                    mingPai: {
                                        gang: majiangData[`playerMingGang${i}`],
                                        peng: majiangData[`playerMingPeng${i}`]
                                    }
                                })
                                insertsql.push([
                                    majiangData[`playerid${i}`],
                                    0,
                                    0,
                                    shouPai
                                ])
                            }
                            let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
                            db.query(sql, [insertsql], (err, result) => {
                                if (err) {
                                    socket.emit("err_game_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    let sql = `DELETE FROM t_games_majiang WHERE majiangid=${gameid}`
                                    db.query(sql, (err, result) => {
                                        if (err) {
                                            socket.emit("err_game_result", resCC(err.message))
                                            socket.disconnect()
                                        } else {
                                            if (gameInfo.guild == 1) {
                                                // 公会房间
                                                let sql = `SELECT * FROM t_rooms_guild WHERE id=${roomid}`
                                                db.query(sql, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_game_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        let roomInfo = results[0]
                                                        let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                                        roomInfo = gameOverGuild.data
                                                        const userLeaveRoom = gameOverGuild.leaveRoom
                                                        roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                                        let tili = roomInfo.tili
                                                        let animation = {}
                                                        animation[`player${playerPosition}`] = `+ ${tili}`
                                                        animation[`player${positionIndex}`] = `- ${tili}`
                                                        roomInfo[`user_tili${playerPosition}`] = roomInfo[`user_tili${playerPosition}`] + 10
                                                        roomInfo[`user_tili${positionIndex}`] = roomInfo[`user_tili${positionIndex}`] - 10
                                                        // 扣手续费
                                                        for (let i = 0; i < 2; i++) {
                                                            if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                                roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], tili)
                                                            }
                                                            updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                                        }
                                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                            roomInfo,
                                                            animationType: 3,
                                                            gang: {
                                                                animation,
                                                                paiid: majiangData.chuPaiid,
                                                            }
                                                        }))
                                                        // 清除用户房间id
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
                                                let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
                                                db.query(sql, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_game_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        let roomInfo = results[0]
                                                        roomInfo.state = 0
                                                        roomInfo.next_button = roomInfo.next_button - 1
                                                        for (let i = 0; i < peopleNumber; i++) {
                                                            roomInfo[`user_state${i}`] = 0
                                                        }
                                                        if (roomInfo.next_button <= 0) roomLeave(roomid)
                                                        let animation = {}
                                                        animation[`player${playerPosition}`] = `+ 10`
                                                        animation[`player${positionIndex}`] = `- 10`
                                                        roomInfo[`user_score${playerPosition}`] = roomInfo[`user_score${playerPosition}`] + 10
                                                        roomInfo[`user_score${positionIndex}`] = roomInfo[`user_score${positionIndex}`] - 10
                                                        roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                            roomInfo,
                                                            animationType: 3,
                                                            gang: {
                                                                animation,
                                                                paiid: majiangData.chuPaiid,
                                                            }
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
                                        }
                                    })
                                }
                            })
                        } else {
                            majiangData = leiyangMaJiang.gangMopai(majiangData)
                            let updatesql = leiyangMaJiang.mopaiDataBase(majiangData, peopleNumber)
                            let gangplayer = leiyangMaJiang.mopaigang(majiangData)
                            let huplayer = leiyangMaJiang.mopaihu(majiangData)
                            // 扣钱事件
                            if (gameInfo.guild == 1) {
                                // 公会房间进行杠
                                let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                                db.query(sql, roomid, (err, results) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        let tili = roomInfo.tili
                                        roomInfo[`user_tili${playerPosition}`] = roomInfo[`user_tili${playerPosition}`] + tili
                                        roomInfo[`user_tili${positionIndex}`] = roomInfo[`user_tili${positionIndex}`] - tili
                                        updateUserRoomInfo({ tili: roomInfo[`user_tili${playerPosition}`] }, roomInfo[`user_id${playerPosition}`])
                                        updateUserRoomInfo({ tili: roomInfo[`user_tili${positionIndex}`] }, roomInfo[`user_id${positionIndex}`])
                                        let animation = {}
                                        animation[`player${playerPosition}`] = `+ 10`
                                        animation[`player${positionIndex}`] = `- 10`
                                        roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                        if (!gangplayer && !huplayer) {
                                            updatesql.operation = JSON.stringify({
                                                title: "majiang_operation_chupai"
                                            })
                                            io.sockets.in("room-" + gameid).emit("majiang_operation_chupai", resCC("直接出牌", 0, {
                                                gameInfo: majiangData,
                                                type: 1,
                                                paiid: majiangData.chuPaiid,
                                                roomInfo,
                                                roomid,
                                                animation
                                            }))
                                        } else {
                                            let operation = {
                                                title: "majiang_me_operation",
                                                operation: {
                                                    gang: gangplayer,
                                                    zimo: huplayer,
                                                },
                                                gameInfo: majiangData,
                                                roomInfo,
                                                animation
                                            }
                                            operation.animation = animation
                                            io.sockets.in("room-" + gameid).emit("majiang_me_operation", resCC("有自摸、杠操作", 0, operation))
                                            updatesql.operation = JSON.stringify(operation)
                                        }
                                        updateGameInfo(updatesql, gameid)
                                        updateGuildRoomInfo(roomInfo, roomid)
                                    }
                                })
                            } else {
                                let sql = `SELECT * FROM t_rooms WHERE id=?`
                                db.query(sql, roomid, (err, results) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        roomInfo[`user_score${playerPosition}`] = roomInfo[`user_score${playerPosition}`] + 10
                                        roomInfo[`user_score${positionIndex}`] = roomInfo[`user_score${positionIndex}`] - 10
                                        let animation = {}
                                        animation[`player${playerPosition}`] = `+ 10`
                                        animation[`player${positionIndex}`] = `- 10`
                                        roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                        if (!gangplayer && !huplayer) {
                                            updatesql.operation = JSON.stringify({
                                                title: "majiang_operation_chupai"
                                            })
                                            io.sockets.in("room-" + gameid).emit("majiang_operation_chupai", resCC("直接出牌", 0, {
                                                gameInfo: majiangData,
                                                type: 1,
                                                paiid: majiangData.chuPaiid,
                                                roomInfo,
                                                roomid,
                                                animation
                                            }))
                                        } else {
                                            let operation = {
                                                title: "majiang_me_operation",
                                                operation: {
                                                    gang: gangplayer,
                                                    zimo: huplayer,
                                                },
                                                gameInfo: majiangData,
                                                roomInfo,
                                                animation
                                            }
                                            operation.animation = animation
                                            io.sockets.in("room-" + gameid).emit("majiang_me_operation", resCC("有自摸、杠操作", 0, operation))
                                            updatesql.operation = JSON.stringify(operation)
                                        }
                                        updateRoomInfo(roomInfo, roomid)
                                        updateGameInfo(updatesql, gameid)
                                    }
                                })
                            }
                        }
                    } else if (operationType == 3) {
                        // 胡
                        const ghost = gameInfo.ghost
                        let insertsql = []
                        majiangData[`playerShouPai${playerPosition}`].push(majiangData.chuPaiid)
                        for (let i = 0; i < peopleNumber; i++) {
                            let shouPai = JSON.stringify({
                                shouPai: majiangData[`playerShouPai${i}`],
                                mingPai: {
                                    gang: majiangData[`playerMingGang${i}`],
                                    peng: majiangData[`playerMingPeng${i}`]
                                }
                            })
                            insertsql.push([
                                majiangData[`playerid${i}`],
                                0,
                                i == playerPosition ? 1 : i == positionIndex ? 2 : 0,
                                shouPai
                            ])
                        }
                        let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
                        db.query(sql, [insertsql], (err, result) => {
                            if (err) {
                                socket.emit("err_game_result", resCC(err.message))
                                socket.disconnect()
                            } else {
                                let sql = `DELETE FROM t_games_majiang WHERE majiangid=${gameid}`
                                db.query(sql, (err, result) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        if (gameInfo.guild == 1) {
                                            // 公会房间
                                            let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                                            db.query(sql, [roomid], (err, results) => {
                                                if (err) {
                                                    socket.emit("err_game_result", resCC(err.message))
                                                    socket.disconnect()
                                                } else {
                                                    let roomInfo = results[0]
                                                    let tili = roomInfo.tili
                                                    if (ghost && ghost == 1) {
                                                        let kill = leiyangMaJiang.killGhost(majiangData[`playerShouPai${playerPosition}`], gameInfo.guipaiid)
                                                        if (kill) tili = tili * 2
                                                    }
                                                    for (let i = 0; i < 2; i++) {
                                                        roomInfo[`user_state${i}`] = 0
                                                    }
                                                    let animation = {}
                                                    animation[`player${playerPosition}`] = `+ ${tili}`
                                                    animation[`player${positionIndex}`] = `- ${tili}`
                                                    // 扣手续费
                                                    for (let i = 0; i < 2; i++) {
                                                        if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                            roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], roomInfo.tili)
                                                        }
                                                        updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                                    }
                                                    let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                                    roomInfo = gameOverGuild.data
                                                    roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                                    const userLeaveRoom = gameOverGuild.leaveRoom
                                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-胡", 0, {
                                                        roomInfo,
                                                        animation,
                                                        animationType: 2
                                                    }))
                                                    // 清除用户房间id
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
                                            let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
                                            db.query(sql, (err, results) => {
                                                if (err) {
                                                    socket.emit("err_game_result", resCC(err.message))
                                                    socket.disconnect()
                                                } else {
                                                    let roomInfo = results[0]
                                                    roomInfo.state = 0
                                                    roomInfo.next_button = roomInfo.next_button - 1
                                                    let score = 10
                                                    if (ghost && ghost == 1) {
                                                        let kill = leiyangMaJiang.killGhost(majiangData[`playerShouPai${playerPosition}`], gameInfo.guipaiid)
                                                        if (kill) score = score = score * 2
                                                    }
                                                    for (let i = 0; i < peopleNumber; i++) {
                                                        roomInfo[`user_state${i}`] = 0
                                                    }
                                                    roomInfo[`user_score${playerPosition}`] = roomInfo[`user_score${playerPosition}`] + score
                                                    roomInfo[`user_score${positionIndex}`] = roomInfo[`user_score${positionIndex}`] - score
                                                    let animation = {}
                                                    animation[`player${playerPosition}`] = `+ ${score}`
                                                    animation[`player${positionIndex}`] = `- ${score}`
                                                    if (roomInfo.next_button <= 0) roomLeave(roomid)
                                                    roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-胡", 0, {
                                                        roomInfo,
                                                        animation,
                                                        animationType: 2
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
                                    }
                                })
                            }
                        })
                    } else {
                        console.log("有BUG");
                    }
                }
            })
        })
        socket.on("majiang_current_operation", data => {
            console.log("当前玩家操作majiang_current_operation", data, new Date().getTime());
            if (typeof data == "string")
                data = JSON.parse(data)
            const gameid = data.gameid
            const operationType = parseInt(data.operationType)
            let sql = `SELECT * FROM t_games_majiang WHERE majiangid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const gameInfo = results[0]
                    const roomid = gameInfo.roomid
                    let majiangData = leiyangMaJiang.handleMaJiang(gameInfo)
                    const positionIndex = majiangData.positionIndex
                    const peopleNumber = gameInfo.people_number
                    if (operationType == 0) {
                        io.sockets.in("room-" + gameid).emit("majiang_operation_chupai", resCC("当前玩家直接出牌", 0, {
                            gameInfo: majiangData,
                            type: 2
                        }))
                    } else if (operationType == 1) {
                        const paiid = majiangData.moPaiid
                        // 暗杠
                        let bugang = leiyangMaJiang.bugang(majiangData, positionIndex)
                        majiangData = leiyangMaJiang.anganghand(majiangData, positionIndex)
                        if (majiangData.unknownPai.length === 0) {
                            // 和牌
                            let insertsql = []
                            for (let i = 0; i < peopleNumber; i++) {
                                let shouPai = JSON.stringify({
                                    shouPai: majiangData[`playerShouPai${i}`],
                                    mingPai: {
                                        gang: majiangData[`playerMingGang${i}`],
                                        peng: majiangData[`playerMingPeng${i}`]
                                    }
                                })
                                insertsql.push([
                                    majiangData[`playerid${i}`],
                                    0,
                                    0,
                                    shouPai
                                ])
                            }
                            let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
                            db.query(sql, [insertsql], (err, result) => {
                                if (err) {
                                    socket.emit("err_game_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    let sql = `DELETE FROM t_games_majiang WHERE majiangid=${gameid}`
                                    db.query(sql, (err, result) => {
                                        if (err) {
                                            socket.emit("err_game_result", resCC(err.message))
                                            socket.disconnect()
                                        } else {
                                            if (gameInfo.guild == 1) {
                                                // 公会房间
                                                let sql = `SELECT * FROM t_rooms_guild WHERE id=${roomid}`
                                                db.query(sql, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_game_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        let roomInfo = results[0]
                                                        let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                                        roomInfo = gameOverGuild.data
                                                        const userLeaveRoom = gameOverGuild.leaveRoom
                                                        roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                                        let tili = roomInfo.tili
                                                        let animation = {}
                                                        for (let i = 0; i < peopleNumber; i++) {
                                                            let userScore = roomInfo[`user_tili${i}`]
                                                            roomInfo[`user_tili${i}`] = i == positionIndex ? userScore + (tili * peopleNumber - 1) : userScore - tili
                                                            animation[`player${i}`] = i == positionIndex ? `+ ${tili.toString()}` : `- ${tili.toString()}`
                                                            // 扣手续费
                                                            if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                                roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], tili)
                                                            }
                                                            updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                                        }
                                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                            roomInfo,
                                                            animationType: 3,
                                                            gang: {
                                                                animation,
                                                                paiid: majiangData.moPaiid,
                                                                bugang
                                                            }
                                                        }))
                                                        // 清除用户房间id
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
                                                let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
                                                db.query(sql, (err, results) => {
                                                    if (err) {
                                                        socket.emit("err_game_result", resCC(err.message))
                                                        socket.disconnect()
                                                    } else {
                                                        let roomInfo = results[0]
                                                        roomInfo.state = 0
                                                        roomInfo.next_button = roomInfo.next_button - 1
                                                        let animation = {}
                                                        for (let i = 0; i < peopleNumber; i++) {
                                                            roomInfo[`user_state${i}`] = 0
                                                            let userScore = roomInfo[`user_score${i}`]
                                                            roomInfo[`user_score${i}`] = i == positionIndex ? userScore + (10 * peopleNumber - 1) : userScore - 10
                                                            animation[`player${i}`] = i == positionIndex ? "+ 10" : "- 10"
                                                        }
                                                        if (roomInfo.next_button <= 0) roomLeave(roomid)
                                                        roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                                            roomInfo,
                                                            animationType: 3,
                                                            angang: {
                                                                animation,
                                                                paiid: majiangData.moPaiid,
                                                                bugang
                                                            }
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
                                        }
                                    })
                                }
                            })
                        } else {
                            majiangData = leiyangMaJiang.gangMopai(majiangData)
                            let updatesql = leiyangMaJiang.mopaiDataBase(majiangData, peopleNumber)
                            let gangplayer = leiyangMaJiang.mopaigang(majiangData)
                            let huplayer = leiyangMaJiang.mopaihu(majiangData)
                            if (gameInfo.guild == 1) {
                                // 公会房间进行杠
                                let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                                db.query(sql, roomid, (err, results) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        let tili = roomInfo.tili
                                        let animation = {}
                                        for (let i = 0; i < 2; i++) {
                                            roomInfo[`user_tili${i}`] = i == positionIndex ? roomInfo[`user_tili${i}`] + tili : roomInfo[`user_tili${i}`] - tili
                                            animation[`player${i}`] = i == positionIndex ? `- ${tili.toString()}` : `- ${tili.toString()}`
                                            updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                        }
                                        roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                        if (!gangplayer && !huplayer) {
                                            io.sockets.in("room-" + gameid).emit("majiang_operation_chupai", resCC("直接出牌", 0, {
                                                gameInfo: majiangData,
                                                type: 1,
                                                paiid,
                                                gang: {
                                                    roomInfo,
                                                    roomid: roomInfo.id,
                                                    animation,
                                                    bugang
                                                }
                                            }))
                                        } else {
                                            let operation = {
                                                title: "majiang_me_operation",
                                                gameInfo: majiangData,
                                                operation: {
                                                    gang: gangplayer,
                                                    zimo: huplayer,
                                                },
                                                roomInfo,
                                                animation
                                            }
                                            io.sockets.in("room-" + gameid).emit("majiang_me_operation", resCC("有自摸、杠操作", 0, operation))
                                            updatesql.operation = JSON.stringify(operation)
                                        }
                                        updateGameInfo(updatesql, gameid)
                                        updateGuildRoomInfo(roomInfo, roomid)
                                    }
                                })
                            } else {
                                let sql = `SELECT * FROM t_rooms WHERE id=?`
                                db.query(sql, roomid, (err, results) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        let animation = {}
                                        for (let i = 0; i < peopleNumber; i++) {
                                            roomInfo[`user_score${i}`] = i == positionIndex ? roomInfo[`user_score${i}`] + 10 : roomInfo[`user_score${i}`] - 10
                                            animation[`player${i}`] = i == positionIndex ? "+ 10" : "- 10"
                                        }
                                        roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                        if (!gangplayer && !huplayer) {
                                            io.sockets.in("room-" + gameid).emit("majiang_operation_chupai", resCC("直接出牌", 0, {
                                                gameInfo: majiangData,
                                                type: 1,
                                                paiid,
                                                gang: {
                                                    roomInfo,
                                                    roomid: roomInfo.id,
                                                    animation,
                                                    bugang
                                                }
                                            }))
                                        } else {
                                            let operation = {
                                                title: "majiang_me_operation",
                                                gameInfo: majiangData,
                                                operation: {
                                                    gang: gangplayer,
                                                    zimo: huplayer,
                                                },
                                                roomInfo,
                                                animation
                                            }
                                            io.sockets.in("room-" + gameid).emit("majiang_me_operation", resCC("有自摸、杠操作", 0, operation))
                                            updatesql.operation = JSON.stringify(operation)
                                        }
                                        updateGameInfo(updatesql, gameid)
                                        updateRoomInfo(roomInfo, roomid)
                                    }
                                })
                            }
                        }
                    } else if (operationType == 2) {
                        // 自摸
                        let insertsql = []
                        for (let i = 0; i < peopleNumber; i++) {
                            let shouPai = JSON.stringify({
                                shouPai: majiangData[`playerShouPai${i}`],
                                mingPai: {
                                    gang: majiangData[`playerMingGang${i}`],
                                    peng: majiangData[`playerMingPeng${i}`]
                                }
                            })
                            insertsql.push([
                                majiangData[`playerid${i}`],
                                0,
                                i == positionIndex ? 1 : 2,
                                shouPai
                            ])
                        }
                        let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
                        db.query(sql, [insertsql], (err, result) => {
                            if (err) {
                                socket.emit("err_game_result", resCC(err.message))
                                socket.disconnect()
                            } else {
                                let sql = `DELETE FROM t_games_majiang WHERE majiangid=${gameid}`
                                db.query(sql, (err, result) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        if (gameInfo.guild == 1) {
                                            // 公会房间
                                            let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                                            db.query(sql, [roomid], (err, results) => {
                                                if (err) {
                                                    socket.emit("err_game_result", resCC(err.message))
                                                    socket.disconnect()
                                                } else {
                                                    let roomInfo = results[0]
                                                    let tili = roomInfo.tili
                                                    if (ghost && ghost == 1) {
                                                        let kill = leiyangMaJiang.killGhost(majiangData[`playerShouPai${positionIndex}`], gameInfo.guipaiid)
                                                        if (kill) tili = tili * 2
                                                    }
                                                    let success = tili * (peopleNumber - 1)
                                                    let animation = {}
                                                    for (let i = 0; i < 2; i++) {
                                                        roomInfo[`user_state${i}`] = 0
                                                        roomInfo[`user_tili${i}`] = i == positionIndex ? roomInfo[`user_tili${i}`] + success : roomInfo[`user_tili${i}`] - tili
                                                        animation[`player${i}`] = i == positionIndex ? "+ " + success.toString() : "- " + tili.toString()
                                                        // 扣手续费
                                                        if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                            roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], roomInfo.tili)
                                                        }
                                                        updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                                    }
                                                    let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                                    roomInfo = gameOverGuild.data
                                                    roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                                    const userLeaveRoom = gameOverGuild.leaveRoom
                                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-胡", 0, {
                                                        roomInfo,
                                                        animation,
                                                        animationType: 2
                                                    }))
                                                    // 清除用户房间id
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
                                            let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
                                            db.query(sql, (err, results) => {
                                                if (err) {
                                                    socket.emit("err_game_result", resCC(err.message))
                                                    socket.disconnect()
                                                } else {
                                                    let roomInfo = results[0]
                                                    const ghost = roomInfo.ghost
                                                    roomInfo.state = 0
                                                    roomInfo.next_button = roomInfo.next_button - 1
                                                    let animation = {}
                                                    let score = 10
                                                    // 杀鬼
                                                    if (ghost && ghost == 1) {
                                                        let kill = leiyangMaJiang.killGhost(majiangData[`playerShouPai${playerPosition}`], gameInfo.guipaiid)
                                                        if (kill) score = score = score * 2
                                                    }
                                                    let success = score * (peopleNumber - 1)
                                                    for (let i = 0; i < peopleNumber; i++) {
                                                        roomInfo[`user_state${i}`] = 0
                                                        roomInfo[`user_score${i}`] = i == positionIndex ? roomInfo[`user_score${i}`] + success : roomInfo[`user_score${i}`] - score
                                                        animation[`player${i}`] = i == positionIndex ? "+ " + success.toString() : "- " + score.toString()
                                                    }
                                                    if (roomInfo.next_button <= 0) roomLeave(roomid)
                                                    roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-自摸", 0, {
                                                        roomInfo,
                                                        animation,
                                                        animationType: 1
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
// 更新游戏数据
const updateGameInfo = (update, gameid) => {
    let sql = `UPDATE t_games_majiang SET ? WHERE majiangid=?`
    db.query(sql, [update, gameid], (err, result) => {
        console.log(err, result);
    })
}

// 修改用户信息
const updateUserRoomInfo = (update, userid) => {
    let sql = `UPDATE t_users SET ? WHERE userid=?`
    db.query(sql, [update, userid], (err, result) => {
    })
}
// 修改房间信息
const updateRoomInfo = (update, roomid) => {
    if (update.id) delete update.id
    if (update.roomid) delete update.roomid
    let sql = `UPDATE t_rooms SET ? WHERE id=?`
    db.query(sql, [update, roomid], (err, result) => {
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