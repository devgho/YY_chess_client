const configs = require("../../configs");
const config = configs.hall_server();
const db = require('../../db')

// 游戏规则JSON处理
function baseInfo(obj) {
    return JSON.parse(JSON.stringify(obj))
}

let roomId = ""
// 随机生成房间号
function generateRoomId() {
    var roomId = "";
    for (var i = 0; i < 6; ++i) {
        roomId += Math.floor(Math.random() * 10);
    }
    return roomId;
}
function fnCreate() {
    roomId = generateRoomId()
    let sql = `SELECT id FROM t_rooms WHERE id=?`
    db.query(sql, roomId, (err, results) => {
        if (err) fnCreate()
        if (results.length !== 0) fnCreate()
        return
    })
}

// 创建房间
exports.createRoom = (req, res) => {
    let body = req.body
    let sql = `SELECT userid,name,headimg,coins,roomid FROM t_users WHERE userid=?`
    db.query(sql, body.userid, (err, results) => {
        if (err) return res.cc(err.message)
        if (results.length !== 1) return res.cc("没有用户信息")
        let userInfo = results[0]
        if (userInfo.roomid) return res.cc("已在房间内！")
        fnCreate()
        let create_time = new Date().getTime()
        let insertBody = {
            id: roomId,
            type: body.type,
            base_info: body.base_info,
            create_time,
            num_of_turns: body.num_of_turns,
            next_button: body.num_of_turns,
            user_id0: userInfo.userid,
            user_icon0: userInfo.headimg,
            user_name0: userInfo.name,
            user_score0: 0,
            user_state0: 1,
            ip: config.HALL_IP,
            port: config.HALL_ROOM_PORT,
            makers: 0
        }
        let baseInfo = body.base_info //规则
        baseInfo = eval('(' + baseInfo + ')')
        let sql = `INSERT INTO t_rooms SET ?`
        db.query(sql, insertBody, (err, result) => {
            if (err) return res.cc(err.message);
            if (result.affectedRows !== 1) return res.cc('创建房间失败，请稍后再试！');
            let sql = `UPDATE t_users SET ? WHERE userid=?`
            db.query(sql, [{ roomid: roomId }, body.userid], (err, result) => {
                if (err) return res.cc(err.message);
                if (result.affectedRows !== 1) return res.cc('创建房间失败，请稍后再试！');
                res.cc("创建房间成功！", 0, {
                    roomid: roomId,
                    roomip: `${config.HALL_IP}:${config.HALL_ROOM_PORT}`,
                    landlord: true,
                    type: body.type,
                    position: 0,
                    num_of_people: baseInfo.num_of_people
                })
            })
        })
    })
}
// 修改用户roomid
const updateUserRoomId = (roomid, userid) => {
    let sql = `UPDATE t_users SET roomid=? WHERE userid=?`
    db.query(sql, [roomid, userid])
}
// 加入房间
exports.joinRoom = (req, res) => {
    let roomid = req.body.roomid
    let userid = req.body.userid
    let sql = `SELECT * FROM t_rooms WHERE id=?`
    db.query(sql, roomid, (err, results) => {
        if (err) return res.cc(err.message)
        if (results.length !== 1) return res.cc("没有该房间")
        const roomInfo = results[0]
        if (roomInfo.state !== 0) return res.cc("房间正在进行游戏")
        let number_people = 0
        let number_current = 0
        for (const key in roomInfo) {
            if (key.indexOf("user_id") > -1 && roomInfo[key]) {
                number_people++
                if (roomInfo[key] == userid)
                    number_current = number_people
            }
        }
        let sql = `SELECT name,headimg,fraction FROM t_users WHERE userid=?`
        let userInfo = {}
        db.query(sql, userid, (err, results) => {
            if (err) return res.cc(err.message)
            userInfo = results[0]
            if (!userInfo.roomid && number_current !== 0) {
                updateUserRoomId(roomid, userid)
                return res.cc("已在房间内", 0, {
                    roomid: roomid,
                    roomip: `${config.HALL_IP}:${config.HALL_ROOM_PORT}`,
                    lord: false,
                    type: roomInfo.type
                })
            } else {
                let baseInfo = roomInfo.base_info
                baseInfo = eval('(' + baseInfo + ')')
                // console.log(baseInfo);
                let maxNumber = baseInfo.num_of_people
                if (number_people >= maxNumber) { return res.cc("房间人数已到达上限") }
                let setBody = {}
                setBody[`user_id${number_people}`] = userid
                setBody[`user_icon${number_people}`] = userInfo.headimg
                setBody[`user_name${number_people}`] = userInfo.name
                setBody[`user_score${number_people}`] = 0
                setBody[`user_state${number_people}`] = 0
                let sql = `UPDATE t_rooms SET ? WHERE id=?`
                db.query(sql, [setBody, roomid], (err, result) => {
                    if (err) return res.cc(err.message)
                    updateUserRoomId(roomid, userid)
                    res.cc("房间加入成功", 0, {
                        roomid: roomid,
                        roomip: `${config.HALL_IP}:${config.HALL_ROOM_PORT}`,
                        type: roomInfo.type,
                        landlord: false,
                        position: number_people,
                        num_of_people:maxNumber
                    })
                })
            }
        })
    })
}