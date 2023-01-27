exports.majiang = (data) => {
    const peopleNumber = data.people_number
    let gameInfo = {
        unknownPai: JSON.parse(data.unknownpai).data,
        moPaiid: data.mopaiid,
        chuPaiid: data.chupaiid,
        positionIndex: data.position_index,
        guiPaiid: data.guipaiid
    }
    for (let i = 0; i < peopleNumber; i++) {
        gameInfo[`playerid${i}`] = data[`player${i}id`]
        let pai = JSON.parse(data[`player${i}pai`])
        gameInfo[`playerShouPai${i}`] = pai[`playerShouPai${i}`]
        gameInfo[`playerMingGang${i}`] = pai[`playerMingGang${i}`]
        gameInfo[`playerMingPeng${i}`] = pai[`playerMingPeng${i}`]
        gameInfo[`playerOutPai${i}`] = pai[`playerOutPai${i}`]
    }
    return gameInfo
}
exports.paodeikuai = (data) => {
    const peopleNumber = data.people_number
    let gameInfo = {
        peopleNumber: peopleNumber,
        chuPai: JSON.parse(data.chupaiid).data,
        unknownPai: JSON.parse(data.unknownpai).data,
        outPai: JSON.parse(data.outpai).data,
        positionIndex: data.position_index
    }
    for (let i = 0; i < peopleNumber; i++) {
        gameInfo[`player${i}Pai`] = JSON.parse(data[`player${i}pai`]).data
        gameInfo[`playerid${i}`] = data[`player${i}id`]
    }
    return gameInfo
}
exports.zipai = (data) => {
    let gameInfo = {
        unknownPai: JSON.parse(data.unknownpai).data,
        chuPaiid: data.chupaiid,
        positionIndex: data.position_index,
        peopleNumber: data.people_number
    }
    for (let i = 0; i < gameInfo.peopleNumber; i++) {
        gameInfo[`playerid${i}`] = data[`player${i}id`]
        gameInfo[`player${i}Pai`] = JSON.parse(data[`player${i}pai`]).data
        gameInfo[`player${i}MingPai`] = JSON.parse(data[`player${i}mingpai`]).data
        gameInfo[`player${i}OutPai`] = JSON.parse(data[`player${i}outpai`]).data
    }
    return gameInfo
}