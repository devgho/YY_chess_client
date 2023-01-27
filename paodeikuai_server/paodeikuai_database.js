exports.handdatabase = (data) => {
    let updatesql = {}
    const peopleNumber = data.peopleNumber
    for (let i = 0; i < peopleNumber; i++) {
        updatesql[`player${i}pai`] = JSON.stringify({ data: data[`player${i}Pai`] })
        updatesql[`player${i}outpai`] = JSON.stringify({ data: data[`player${i}outPai`] })
    }
    updatesql.unknownpai = JSON.stringify({ data: data.unknownPai })
    updatesql.chupai_deck = JSON.stringify({ data: data.chuPai })
    updatesql.position_index = data.positionIndex
    return updatesql
}
exports.databasedemand = (data) => {
    const peopleNumber = data.people_number
    let sendInfo = {
        peopleNumber,
        chuPai: [],
        unknownPai: [],
        boom: data.boom,
        four_b_three: data.four_b_three
    }
    for (let i = 0; i < peopleNumber; i++) {
        sendInfo[`player${i}Pai`] = JSON.parse(data[`player${i}pai`]).data
        sendInfo[`player${i}outPai`] = JSON.parse(data[`player${i}outpai`]).data
    }
    sendInfo.unknownPai = JSON.parse(data.unknownpai).data
    sendInfo.chuPai = JSON.parse(data.chupai_deck).data
    sendInfo.positionIndex = data.position_index
    return sendInfo
}