const db = require('../db')
const initZipai = require("./zipai_init")
const zipaiDataBase = require("./zipai_database")
const zipaiHandPai = require("./zipai_paihand")
const zipaiPublicmethods = require("./zipaiPublicmethods")
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
                let sql = `SELECT people_number,player0pai FROM t_games_zipai WHERE zipaiid=?`
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
            // gameid + "join_game玩家" + userid, socketRoom, socketRoomPeople
        })
        socket.on("zipai_fapai_init", gameid => {
            // // console.log("初始化字牌", gameid);
            // gameid = 1
            let sql = `SELECT * FROM t_games_zipai WHERE zipaiid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let gameInfo = results[0]
                    const roomid = results[0].roomid
                    const wuhu = gameInfo.wu_hu
                    const oneho = gameInfo.one_ho
                    const peopleNumber = gameInfo.people_number
                    const positionIndex = gameInfo.position_index
                    let deck = initZipai.initpai()
                    let paiData = initZipai.fapai(deck, peopleNumber)
                    let excludeAll = zipaiDataBase.excludeHand(gameInfo)
                    gameInfo = zipaiDataBase.handdatabaseInit(gameInfo, paiData)
                    // 确定初始化排除牌
                    // excludeAll = initZipai.checkExclude(excludeAll,gameInfo)
                    // 提
                    let tiHand = zipaiHandPai.tiHand(gameInfo)
                    if (tiHand.return) {
                        // // console.log("提");
                        gameInfo = tiHand.data
                        io.sockets.in("room-" + gameid).emit("action_animation", { type: 1, deck: tiHand.paiid, gameInfo, positionIndex: gameInfo.positionIndex })
                    }
                    let tianHu = zipaiHandPai.judgeHu(gameInfo[`player${gameInfo.positionIndex}Pai`], wuhu, oneho)
                    if (tianHu.return) {

                        
                        // // console.log("天胡直接胡", tianHu);
                        // 战绩
                        let insertsql = []
                        for (let i = 0; i < peopleNumber; i++) {
                            let shouPai = JSON.stringify({
                                shouPai: gameInfo[`player${i}Pai`],
                                mingPai: gameInfo[`player${i}MingPai`]
                            })
                            insertsql.push([
                                gameInfo[`playerid${i}`],
                                2,
                                i == positionIndex ? 1 : 2,
                                shouPai
                            ])
                        }
                        addUserRecord(insertsql, gameid)
                        let animation = {}
                        if (results[0].guild == 1) {
                            // 公会
                            let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                            db.query(sql, roomid, (err, results) => {
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
                                    for (let i = 0; i < 2; i++) {
                                        let userScore = roomInfo[`user_tili${i}`]
                                        roomInfo[`user_tili${i}`] = i == positionIndex ? userScore + (tili * peopleNumber - 1) : userScore - tili
                                        animation[`player${i}`] = i == positionIndex ? `+ ${tili.toString()}` : `- ${tili.toString()}`
                                        // 扣手续费
                                        if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                            roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], roomInfo.tili)
                                        }
                                        updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                    }
                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-天胡", 0, {
                                        roomInfo,
                                        gameInfo,
                                        animation,
                                        type: 1
                                    }))
                                    if (userLeaveRoom.length > 0) {
                                        for (let i = 0; i < userLeaveRoom.length; i++) {
                                            let userid = userLeaveRoom[i];
                                            updateUserRoomInfo({ guild_roomid: null }, userid)
                                        }
                                    }
                                    removeGameCache(gameid)
                                    roomInfo.makers = positionIndex
                                    updateGuildRoomInfo(roomInfo, roomid)
                                }
                            })
                        } else {
                            // 普通房间
                            let sql = `SELECT * FROM t_rooms WHERE id=${roomid}`
                            db.query(sql, (err, results) => {
                                if (err) {
                                    socket.emit("err_game_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    let roomInfo = results[0]
                                    roomInfo.state = 0
                                    roomInfo.next_button = roomInfo.next_button - 1
                                    let score = 10 * zipaiPublicmethods.huziDouble(tianHu.Jihu)
                                    for (let i = 0; i < peopleNumber; i++) {
                                        roomInfo[`user_state${i}`] = 0
                                        roomInfo[`user_score${i}`] = i == positionIndex ? roomInfo[`user_score${i}`] + (score * (peopleNumber - 1)) : roomInfo[`user_score${i}`] - score
                                        animation[`player${i}`] = i == positionIndex ? "+ " + (score * (peopleNumber - 1)) : "- " + score
                                    }
                                    if (roomInfo.next_button <= 0) roomLeave(roomid)
                                    roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-天胡", 0, {
                                        roomInfo,
                                        gameInfo,
                                        animation,
                                        type: 1
                                    }))
                                    removeGameCache(gameid)
                                    roomInfo.makers = positionIndex
                                    updateRoomInfo(roomInfo, roomid)
                                    if (roomInfo.num_of_turns - roomInfo.next_button == 1) {
                                        // 扣房卡
                                        roomWithholdingCard(roomInfo.user_id0, roomInfo.num_of_turns < 10 ? 5 : 10)
                                    }
                                }
                            })
                        }
                    } else {
                        // 没有胡出牌
                        let updatesql = zipaiDataBase.databaseUpdatesql(gameInfo)
                        updatesql.operation = JSON.stringify({ title: "zipai_next_chupai" })
                        let sql = `UPDATE t_games_zipai SET ? WHERE zipaiid=?`
                        // 
                        db.query(sql, [updatesql, gameid], (err, result) => {
                            if (err) {
                                socket.emit("err_game_result", resCC(err.message))
                                socket.disconnect()
                            } else {
                                io.sockets.in("room-" + gameid).emit("zipai_next_chupai", resCC("玩家出牌", 0, gameInfo))
                            }
                        })
                    }
                }
            })
        })
        socket.on("zipai_chupai", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            // console.log("字牌出牌", data);
            const gameid = data.gameid
            const chupaiid = data.chupaiid
            // const gameid = 1
            // const chupaiid = 8
            io.sockets.in("room-" + gameid).emit("zipai_player_chupai", chupaiid)
            let sql = `SELECT * FROM t_games_zipai WHERE zipaiid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let gameInfo = results[0]
                    const wuhu = gameInfo.wu_hu
                    const oneho = gameInfo.one_ho
                    // const roomid = gameInfo.roomid
                    gameInfo.chupaiid = chupaiid
                    // 获取排除牌
                    const excludeAll = zipaiDataBase.excludeHand(gameInfo)
                    gameInfo = zipaiDataBase.databaseHand(gameInfo)
                    // 其他玩家操作
                    let operationDeckChupai = zipaiHandPai.operationDeckChupai(gameInfo, excludeAll, chupaiid, wuhu, oneho)
                    gameInfo = operationDeckChupai.data
                    operationDeckChupai = operationDeckChupai.operation
                    let paoDoesItExist = zipaiHandPai.paoDoesItExist(operationDeckChupai)
                    let updatesqloperation = null
                    const peopleNumber = gameInfo.peopleNumber
                    if (paoDoesItExist.return) {
                        // 有跑
                        const paoPlayerDeclLength = zipaiHandPai.surplusDeck(gameInfo, paoDoesItExist.index)
                        gameInfo.positionIndex = paoDoesItExist.index
                        io.sockets.in("room-" + gameid).emit("action_animation", { type: 3, deck: [chupaiid, chupaiid, chupaiid, chupaiid], positionIndex: gameInfo.positionIndex })
                        if (paoPlayerDeclLength == 21) {
                            // 跑后出牌
                            updatesqloperation = JSON.stringify({ title: "zipai_next_chupai" })
                            io.sockets.in("room-" + gameid).emit("zipai_next_chupai", resCC("玩家出牌", 0, gameInfo))
                        } else {
                            // 直接下一个摸牌
                            console.log("摸牌", gameInfo.unknownPai[0]);
                            gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                            updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                            io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                        }
                    } else {
                        operationDeckChupai = zipaiHandPai.removeUnwantedOperations(operationDeckChupai)
                        const judgeOperationHand = zipaiHandPai.judgeOperationHand(operationDeckChupai)
                        if (judgeOperationHand) {
                            // console.log("有其他操作");
                            let getoperationPlayer = zipaiHandPai.getoperationPlayer(operationDeckChupai)
                            let operationPlayer = getoperationPlayer.player
                            if (getoperationPlayer.return) {
                                operationDeckChupai.nextOperationPosition = getoperationPlayer.nextOperationPosition
                            } else {
                                for (let i = 1; i <= peopleNumber; i++) {
                                    let nextOperationPosition = (gameInfo.positionIndex + i) % peopleNumber
                                    let index = operationPlayer.indexOf(nextOperationPosition)
                                    if (index > -1) {
                                        operationPlayer.splice(index, 1)
                                        operationDeckChupai.nextOperationPosition = nextOperationPosition
                                        break
                                    }
                                }
                            }
                            updatesqloperation = JSON.stringify({ title: "zipai_operation_all", operation: operationDeckChupai, gameInfo, operationPlayer })
                            io.sockets.in("room-" + gameid).emit("zipai_operation_all", resCC("玩家操作判断、碰、吃、胡", 0, { gameInfo, operation: operationDeckChupai }))
                        } else {
                            console.log("摸牌", gameInfo.unknownPai[0]);
                            gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                            updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                            io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                        }
                    }
                    // 更新数据库
                    let updatesql = zipaiDataBase.databaseUpdatesql(gameInfo)
                    updatesql.operation = updatesqloperation

                    updateGameInfo(updatesql, gameid)
                }
            })
        })
        socket.on("zipai_mopai", gameid => {
            console.log("字牌摸牌", gameid);
            // gameid = 1
            let sql = `SELECT * FROM t_games_zipai WHERE zipaiid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    let gameInfo = results[0]
                    const roomid = gameInfo.roomid
                    const wuhu = gameInfo.wu_hu
                    const oneho = gameInfo.one_ho
                    const excludeAll = zipaiDataBase.excludeHand(gameInfo)
                    gameInfo = zipaiDataBase.databaseHand(gameInfo)
                    const paiid = gameInfo.unknownPai[0]
                    const peopleNumber = gameInfo.peopleNumber
                    let updatesqloperation = null
                    // 游戏结束
                    if (gameInfo.unknownPai.length === 0) {
                        // console.log("游戏结束和牌");
                        let insertsql = []
                        for (let i = 0; i < peopleNumber; i++) {
                            let shouPai = JSON.stringify({
                                shouPai: gameInfo[`player${i}Pai`],
                                mingPai: gameInfo[`player${i}MingPai`]
                            })
                            insertsql.push([
                                gameInfo[`playerid${i}`],
                                2,
                                0,
                                shouPai
                            ])
                        }
                        addUserRecord(insertsql, gameid)
                        if (results[0].guild == 1) {
                            // 公会
                            console.log("公会");
                            let sql = `SELECT * FROM t_rooms_guild WHERE id=${roomid}`
                            db.query(sql, roomid, (err, results) => {
                                if (err) {
                                    socket.emit("err_game_result", resCC(err.message))
                                    socket.disconnect()
                                } else {
                                    let roomInfo = results[0]
                                    let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                    roomInfo = gameOverGuild.data
                                    const userLeaveRoom = gameOverGuild.leaveRoom
                                    for (let i = 0; i < 2; i++) {
                                        // 扣手续费
                                        if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                            roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], roomInfo.tili)
                                        }
                                        updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                    }
                                    roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                    io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-和牌", 0, {
                                        roomInfo,
                                        gameInfo,
                                        type: 0
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
                                        gameInfo,
                                        type: 0
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
                        let operationAndData = zipaiHandPai.mopaiAndOperation(gameInfo, excludeAll, wuhu, oneho)
                        gameInfo = operationAndData.data
                        let operation = operationAndData.operation
                        let currentPositionOperation = operation[`player${gameInfo.positionIndex}`]
                        console.log(currentPositionOperation);
                        if (currentPositionOperation.ti || currentPositionOperation.wei) {
                            // 有提-煨
                            console.log("有提-煨");
                            let currentpaiCount = zipaiHandPai.surplusDeck(gameInfo)
                            io.sockets.in("room-" + gameid).emit("action_animation", {
                                type: currentPositionOperation.ti ? 7 : 8,
                                deck: currentPositionOperation.ti ? [paiid, paiid, paiid, paiid] : [paiid, paiid, paiid],
                                positionIndex: gameInfo.positionIndex
                            })
                            if (currentpaiCount >= 21) {
                                console.log("直接出牌");
                                updatesqloperation = JSON.stringify({ title: "zipai_next_chupai" })
                                io.sockets.in("room-" + gameid).emit("zipai_next_chupai", resCC("玩家出牌", 0, gameInfo))
                            } else {
                                console.log("摸牌", gameInfo.unknownPai[0]);
                                gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                                updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                                io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                            }
                        } else {
                            // 其他判断操作
                            let paoDoesItExist = zipaiHandPai.paoDoesItExist(operation)
                            if (paoDoesItExist.return) {
                                console.log("有跑");
                                const paoPlayerDeclLength = zipaiHandPai.surplusDeck(gameInfo, paoDoesItExist.index)
                                gameInfo.positionIndex = paoDoesItExist.index
                                io.sockets.in("room-" + gameid).emit("action_animation", { type: 3, deck: [paiid, paiid, paiid, paiid], positionIndex: gameInfo.positionIndex })
                                if (paoPlayerDeclLength == 21) {
                                    console.log("跑后出牌");
                                    updatesqloperation = JSON.stringify({ title: "zipai_next_chupai" })
                                    io.sockets.in("room-" + gameid).emit("zipai_next_chupai", resCC("玩家出牌", 0, gameInfo))
                                } else {
                                    console.log("摸牌", gameInfo.unknownPai[0]);
                                    gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                                    updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                                    io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                                }
                            } else {
                                operation = zipaiHandPai.removeUnwantedOperations(operation)
                                const judgeOperationHand = zipaiHandPai.judgeOperationHand(operation)
                                // console.log(operation, judgeOperationHand);
                                console.log("有其他操作", judgeOperationHand);
                                console.log("当前摸牌玩家位置", gameInfo.positionIndex);
                                if (judgeOperationHand) {
                                    // 有胡优先
                                    for (const key in operation) {
                                        const element = operation[key];
                                        if (element.hu) {
                                            operation.nextOperationPosition = key.split("player")[1]
                                            updatesqloperation = JSON.stringify({ title: "zipai_operation_all", operation, gameInfo })
                                            break
                                        }
                                    }
                                    if (!operation.nextOperationPosition) {
                                        delete operation[`player${gameInfo.positionIndex}`]
                                        if (operation && JSON.stringify(operation) != "{}") {
                                            let getoperationPlayer = zipaiHandPai.getoperationPlayer(operation)
                                            let operationPlayer = getoperationPlayer.player
                                            if (getoperationPlayer.return) {
                                                operation.nextOperationPosition = getoperationPlayer.nextOperationPosition
                                            } else {
                                                for (let i = 1; i <= peopleNumber; i++) {
                                                    let nextOperationPosition = (gameInfo.positionIndex + i) % peopleNumber
                                                    let index = operationPlayer.indexOf(nextOperationPosition)
                                                    if (index > -1) {
                                                        operationPlayer.splice(index, 1)
                                                        operation.nextOperationPosition = nextOperationPosition
                                                        break
                                                    }
                                                }
                                            }
                                            updatesqloperation = JSON.stringify({ title: "zipai_operation_all", operation, gameInfo, operationPlayer })
                                        }
                                    }
                                    if (!operation || JSON.stringify(operation) == "{}") {
                                        console.log("摸牌", gameInfo.unknownPai[0]);
                                        gameInfo[`player${gameInfo.positionIndex}OutPai`].push(paiid)
                                        gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                                        updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                                        io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                                    } else {
                                        io.sockets.in("room-" + gameid).emit("zipai_operation_all", resCC("玩家操作判断、碰、吃、胡", 0, { gameInfo, operation }))
                                    }
                                } else {
                                    console.log("摸牌", gameInfo.unknownPai[0]);
                                    gameInfo[`player${gameInfo.positionIndex}OutPai`].push(paiid)
                                    gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                                    updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                                    io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                                }
                            }
                        }
                    }
                    // 更新数据库
                    let updatesql = zipaiDataBase.databaseUpdatesql(gameInfo)
                    updatesql.operation = updatesqloperation
                    console.log(updatesql);
                    updateGameInfo(updatesql, gameid)
                }
            })
        })
        socket.on("zipai_operation", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            console.log("字牌玩家判断", data);
            const gameid = data.gameid
            const operationType = parseInt(data.operationType) // 0过 1碰 2跑 3胡
            const deck = data.deck //牌组
            let sql = `SELECT * FROM t_games_zipai WHERE zipaiid=?`
            db.query(sql, gameid, (err, results) => {
                if (err) {
                    socket.emit("err_game_result", resCC(err.message))
                    socket.disconnect()
                } else {
                    const excludeAll = zipaiDataBase.excludeHand(results[0])
                    let operation = JSON.parse(results[0].operation)
                    let gameInfo = operation.gameInfo
                    let operationPlayer = operation.operationPlayer
                    operation = operation.operation
                    console.log(operation);
                    if (operation && (operation.nextOperationPosition || operation.nextOperationPosition === 0)) {
                        let nextOperationPosition = operation.nextOperationPosition
                        const paiid = gameInfo.moPaiid || gameInfo.chuPaiid
                        const peopleNumber = gameInfo.peopleNumber
                        let updatesqloperation = null
                        if (operationType == 0) {
                            console.log("过");
                            io.sockets.in("room-" + gameid).emit("action_animation", { type: 0, positionIndex: nextOperationPosition })
                            let updatesqlOutPai = null
                            let original = gameInfo.positionIndex
                            if (operation[`player${nextOperationPosition}`].peng.length != 0 || operation[`player${nextOperationPosition}`].chi.length != 0)
                                excludeAll[`player${nextOperationPosition}Exclude`].push(paiid)
                            if (operationPlayer && operationPlayer.length == 0) {
                                gameInfo[`player${original}OutPai`].push(paiid)
                                updatesqlOutPai = JSON.stringify({ data: gameInfo[`player${original}OutPai`] })
                                console.log("摸牌", gameInfo.unknownPai[0]);
                                gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                                updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                                io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                            } else {
                                console.log("进行下一个玩家判断");
                                if (operation.nextOperationPosition == original) {
                                    console.log("摸牌玩家进行其他判断");
                                    let getoperationPlayer = zipaiHandPai.getoperationPlayer(operation)
                                    operationPlayer = getoperationPlayer.player
                                    if (getoperationPlayer.return) {
                                        operation.nextOperationPosition = operationPlayer.nextOperationPosition
                                    } else {
                                        for (let i = 1; i <= peopleNumber; i++) {
                                            let nextOperationPosition = (gameInfo.positionIndex + i) % peopleNumber
                                            let index = operationPlayer.indexOf(nextOperationPosition)
                                            if (index > -1) {
                                                operationPlayer.splice(index, 1)
                                                operation.nextOperationPosition = nextOperationPosition
                                                break
                                            }
                                        }
                                    }
                                } else {
                                    for (let i = 1; i <= peopleNumber; i++) {
                                        let index = operationPlayer.indexOf(nextOperationPosition + i)
                                        if (index > -1) {
                                            operationPlayer.splice(index, 1)
                                            nextOperationPosition = nextOperationPosition + i
                                            operation.nextOperationPosition = nextOperationPosition
                                            break
                                        }
                                    }
                                }
                                updatesqloperation = JSON.stringify({ title: "zipai_operation_all", operation, gameInfo, operationPlayer })
                                io.sockets.in("room-" + gameid).emit("zipai_operation_all", resCC("玩家操作判断、碰、吃、胡", 0, { gameInfo, operation }))
                            }
                            let updatesqlExclude = zipaiDataBase.excludeDatabaseHand(excludeAll, peopleNumber)
                            updatesqlExclude.operation = updatesqloperation
                            if (updatesqlOutPai) {
                                updatesqlExclude[`player${original}outpai`] = updatesqlOutPai
                                updatesqlExclude.chupaiid = null
                                updatesqlExclude.mopaiid = null,
                                    updatesqlExclude.position_index = gameInfo.positionIndex
                            }
                            console.log(updatesqlExclude);
                            updateGameInfo(updatesqlExclude, gameid)
                        } else if (operationType == 1) {
                            console.log("碰");
                            gameInfo = zipaiHandPai.pengHand(gameInfo, operation)
                            const currentPlayerCount = zipaiHandPai.surplusDeck(gameInfo)
                            io.sockets.in("room-" + gameid).emit("action_animation", { type: 4, deck: [paiid, paiid, paiid], positionIndex: gameInfo.positionIndex })
                            if (currentPlayerCount >= 21) {
                                console.log("出牌");
                                updatesqloperation = JSON.stringify({ title: "zipai_next_chupai" })
                                io.sockets.in("room-" + gameid).emit("zipai_next_chupai", resCC("玩家出牌", 0, gameInfo))
                            } else {
                                console.log("摸牌", gameInfo.unknownPai[0]);
                                gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                                updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                                io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                            }
                            // 更新数据库
                            let updatesql = zipaiDataBase.databaseUpdatesql(gameInfo)
                            updatesql.operation = updatesqloperation
                            updateGameInfo(updatesql, gameid)
                        } else if (operationType == 2) {
                            console.log("吃");
                            gameInfo = zipaiHandPai.chiDeckHand(gameInfo, [deck], operation.nextOperationPosition, paiid)
                            const currentPlayerCount = zipaiHandPai.surplusDeck(gameInfo)
                            io.sockets.in("room-" + gameid).emit("action_animation", { type: 5, deck, positionIndex: gameInfo.positionIndex })
                            if (currentPlayerCount >= 21) {
                                console.log("出牌");
                                updatesqloperation = JSON.stringify({ title: "zipai_next_chupai" })
                                io.sockets.in("room-" + gameid).emit("zipai_next_chupai", resCC("玩家出牌", 0, gameInfo))
                            } else {
                                console.log("摸牌", gameInfo.unknownPai[0]);
                                gameInfo.positionIndex = (gameInfo.positionIndex + 1) % peopleNumber
                                updatesqloperation = JSON.stringify({ title: "zipai_next_mopai" })
                                io.sockets.in("room-" + gameid).emit("zipai_next_mopai", resCC("玩家摸牌", 0, { gameInfo, paiid: gameInfo.unknownPai[0], position: parseInt(gameInfo.positionIndex) }))
                            }
                            let updatesql = zipaiDataBase.databaseUpdatesql(gameInfo)
                            updatesql.operation = updatesqloperation
                            updateGameInfo(updatesql, gameid)
                        } else if (operationType == 3) {
                            console.log("胡");
                            let insertsql = []
                            const positionIndex = gameInfo.positionIndex
                            for (let i = 0; i < peopleNumber; i++) {
                                let shouPai = JSON.stringify({
                                    shouPai: gameInfo[`player${i}Pai`],
                                    mingPai: gameInfo[`player${i}MingPai`]
                                })
                                insertsql.push([
                                    gameInfo[`playerid${i}`],
                                    2,
                                    i == nextOperationPosition ? 1 :
                                        nextOperationPosition == positionIndex ? 2 :
                                            i == positionIndex ? 2 : 0,
                                    shouPai
                                ])
                            }
                            addUserRecord(insertsql, gameid)
                            let animation = {}
                            if (results[0].guild == 1) {
                                // 公会
                                let sql = `SELECT * FROM t_rooms_guild WHERE id=?`
                                db.query(sql, roomid, (err, results) => {
                                    if (err) {
                                        socket.emit("err_game_result", resCC(err.message))
                                        socket.disconnect()
                                    } else {
                                        let roomInfo = results[0]
                                        let gameOverGuild = guildGame.gameOverGuild(roomInfo)
                                        roomInfo = gameOverGuild.data
                                        const userLeaveRoom = gameOverGuild.leaveRoom
                                        roomInfo = guildGame.roomInfoGuildHand(roomInfo)
                                        let tili = roomInfo.tili * zipaiPublicmethods.huziDouble(tianHu.Jihu)
                                        if (nextOperationPosition == positionIndex) {
                                            for (let i = 0; i < 2; i++) {
                                                let userScore = roomInfo[`user_tili${i}`]
                                                roomInfo[`user_tili${i}`] = i == positionIndex ? userScore + (tili * (peopleNumber - 1)) : userScore - tili
                                                animation[`player${i}`] = i == positionIndex ? "+ " + (tili * (peopleNumber - 1)).toString() : "- " - tili.toString()
                                                // 扣手续费
                                                if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                    roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], roomInfo.tili)
                                                }
                                                updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                            }
                                        } else {
                                            roomInfo[`user_tili${nextOperationPosition}`] = roomInfo[`user_tili${nextOperationPosition}`] + tili
                                            roomInfo[`user_tili${positionIndex}`] = roomInfo[`user_tili${positionIndex}`] - tili
                                            animation[`player${nextOperationPosition}`] = "+ " + tili.toString()
                                            animation[`player${positionIndex}`] = "- " + tili.toString()
                                            for (let i = 0; i < 2; i++) {
                                                // 扣手续费
                                                if (roomInfo[`user_id${i}`] && roomInfo.num_of_turns - roomInfo[`user_next_button${i}`] == 1) {
                                                    roomInfo[`user_tili${i}`] = serviceCharge(roomInfo[`user_id${i}`], roomInfo[`user_tili${i}`], roomInfo.tili)
                                                }
                                                updateUserRoomInfo({ tili: roomInfo[`user_tili${i}`] }, roomInfo[`user_id${i}`])
                                            }
                                        }
                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-天胡", 0, {
                                            roomInfo,
                                            gameInfo,
                                            animation,
                                            type: 1
                                        }))
                                        if (userLeaveRoom.length > 0) {
                                            for (let i = 0; i < userLeaveRoom.length; i++) {
                                                let userid = userLeaveRoom[i];
                                                updateUserRoomInfo({ guild_roomid: null }, userid)
                                            }
                                        }
                                        removeGameCache(gameid)
                                        roomInfo.makers = nextOperationPosition
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
                                        let score = 10 * zipaiPublicmethods.huziDouble(tianHu.Jihu)
                                        if (nextOperationPosition == positionIndex) {
                                            for (let i = 0; i < peopleNumber; i++) {
                                                roomInfo[`user_state${i}`] = 0
                                                let userScore = roomInfo[`user_score${i}`]
                                                roomInfo[`user_score${i}`] = i == positionIndex ? userScore + (score * (peopleNumber - 1)) : userScore - score
                                                animation[`player${i}`] = i == positionIndex ? "+ " + (score * (peopleNumber - 1)) : "- " - score
                                            }
                                        } else {
                                            for (let i = 0; i < peopleNumber; i++) {
                                                roomInfo[`user_state${i}`] = 0
                                            }
                                            roomInfo[`user_score${nextOperationPosition}`] = roomInfo[`user_score${nextOperationPosition}`] + score
                                            roomInfo[`user_score${positionIndex}`] = roomInfo[`user_score${positionIndex}`] - score
                                            animation[`player${nextOperationPosition}`] = "+ " + score
                                            animation[`player${positionIndex}`] = "- " + score
                                        }
                                        if (roomInfo.next_button <= 0) roomLeave(roomid)
                                        roomInfo = roomInfoPeopleHand(roomInfo, peopleNumber)
                                        io.sockets.in("room-" + gameid).emit("game_over", resCC("游戏结束-天胡", 0, {
                                            roomInfo,
                                            gameInfo,
                                            animation,
                                            type: 1
                                        }))
                                        removeGameCache(gameid)
                                        roomInfo.makers = nextOperationPosition
                                        updateRoomInfo(roomInfo, roomid)
                                        if (roomInfo.num_of_turns - roomInfo.next_button == 1) {
                                            // 扣房卡
                                            roomWithholdingCard(roomInfo.user_id0, roomInfo.num_of_turns < 10 ? 5 : 10)
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            })
        })
        socket.on("zipai_update_deck", data => {
            if (typeof data == "string")
                data = JSON.parse(data)
            // console.log("更新牌组", data);
            const gameid = data.gameid
            const position = data.position
            const deck = data.deck
            let updatesql = {}
            updatesql[`player${position}pai`] = JSON.stringify({ data: deck })
            updateGameInfo(updatesql, gameid)
        })
    })
}
// 更新游戏数据
const updateGameInfo = (update, gameid) => {
    // console.log(update);
    let sql = `UPDATE t_games_zipai SET ? WHERE zipaiid=?`
    db.query(sql, [update, gameid], (err, result) => {
        if (err) {
            // console.log(err);
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
// 修改用户信息
const updateUserRoomInfo = (update, userid) => {
    let sql = `UPDATE t_users SET ? WHERE userid=?`
    db.query(sql, [update, userid], (err, result) => {
        // console.log(err, result);
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
// 修改房间信息
const updateRoomInfo = (update, roomid) => {
    // console.log(update);
    if (update.roomid) delete update.roomid
    let sql = `UPDATE t_rooms SET ? WHERE id=?`
    db.query(sql, [update, roomid], (err, result) => {
        // console.log(err, result);
    })
}
// 添加战绩
const addUserRecord = (insert, gameid) => {
    let sql = `INSERT INTO t_user_record(userid,games_type,games_result,games_shoupai) VALUES ?`
    db.query(sql, [insert], (err, result) => {
        // console.log(err, result);
        if (!err) {
            let sql = `DELETE FROM t_games_zipai WHERE zipaiid=?`
            db.query(sql, [gameid], (err, result) => {
                // console.log(err, result);
            })
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
// 修改公会房间信息
const updateGuildRoomInfo = (update, roomid) => {
    if (update.id) delete update.id
    if (update.roomid) delete update.roomid
    let sql = `UPDATE t_rooms_guild SET ? WHERE id=?`
    db.query(sql, [update, roomid], (err, result) => {
    })
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