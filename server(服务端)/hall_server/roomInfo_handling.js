exports.roomInfoPeopleHand = (data, peopleNumber) => {
    let roomInfo = {
        roomid: data.id,
        type: data.type,
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