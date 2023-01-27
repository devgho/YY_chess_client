exports.handdatabaseInit = (data, paiData, makers) => {
    const peopleNumber = data.people_number
    let gameInfo = {
        unknownPai: paiData.unknownPai,
        chuPaiid: null,
        moPaiid: null,
        positionIndex: makers || 0,
        peopleNumber
    }
    for (let i = 0; i < peopleNumber; i++) {
        gameInfo[`playerid${i}`] = data[`player${i}id`]
        gameInfo[`player${i}Pai`] = paiData[`player${i}Pai`]
        gameInfo[`player${i}MingPai`] = []
        gameInfo[`player${i}OutPai`] = []
    }
    return gameInfo
}

// 保存
exports.databaseUpdatesql = (data, positionIndex) => {
    // console.log(data);
    const peopleNumber = data.peopleNumber
    let updatesql = {
        chupaiid: data.chuPaiid || null,
        mopaiid: data.moPaiid || null,
        position_index: positionIndex | data.positionIndex,
        unknownpai: JSON.stringify({ data: data.unknownPai })
    }
    for (let i = 0; i < peopleNumber; i++) {
        updatesql[`player${i}pai`] = JSON.stringify({ data: data[`player${i}Pai`] })
        updatesql[`player${i}mingpai`] = JSON.stringify({ data: data[`player${i}MingPai`] })
        updatesql[`player${i}outpai`] = JSON.stringify({ data: data[`player${i}OutPai`] })
    }
    // console.log(updatesql);
    return updatesql
}
// 字牌数据库info化
exports.databaseHand = (data) => {
    // console.log(data);
    let gameInfo = {
        unknownPai: JSON.parse(data.unknownpai).data,
        chuPaiid: data.chupaiid,
        moPaiid: data.mopaiid,
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
// 排除牌
exports.excludeHand = (data) => {
    let excludeAll = {}
    for (let i = 0; i < data.people_number; i++) {
        excludeAll[`player${i}Exclude`] = data[`player${i}exclude`] ? JSON.parse(data[`player${i}exclude`]).data : []
    }
    return excludeAll
}
// 排除牌数据库化
exports.excludeDatabaseHand = (data, peopleNumber) => {
    let obj = {}
    for (let i = 0; i < peopleNumber; i++) {
        obj[`player${i}exclude`] = JSON.stringify({ data: data[`player${i}Exclude`] })
    }
    return obj
}