exports.gameOverGuild = (data) => {
    let leaveRoom = []
    for (let i = 0; i < 2; i++) {
        if (data[`user_next_button${i}`] - 1 <= 0) {
            leaveRoom.push(data[`user_id${i}`])
            data[`user_id${i}`] = null
            data[`user_icon${i}`] = null
            data[`user_name${i}`] = null
            data[`user_tili${i}`] = null
            data[`user_state${i}`] = null
            data[`user_next_button${i}`] = null
        } else {
            data[`user_state${i}`] = 0
            data[`user_next_button${i}`] = data[`user_next_button${i}`] - 1
        }
    }
    return { data, leaveRoom }
}
exports.roomInfoGuildHand = (data) => {
    let roomInfo = {
        roomid: data.id,
        type: data.type,
        num_of_turns: data.num_of_turns,
        title: data.title,
        tili: data.tili,
        brief_introduction: data.brief_introduction
    }
    for (let i = 0; i < 2; i++) {
        roomInfo[`user_id${i}`] = data[`user_id${i}`]
        roomInfo[`user_icon${i}`] = data[`user_icon${i}`]
        roomInfo[`user_name${i}`] = data[`user_name${i}`]
        roomInfo[`user_tili${i}`] = data[`user_tili${i}`]
        roomInfo[`user_state${i}`] = data[`user_state${i}`]
        roomInfo[`user_next_button${i}`] = data[`user_next_button${i}`]
    }
    return roomInfo
}