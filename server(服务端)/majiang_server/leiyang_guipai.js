/*
    0~8万
    9~17条
    18~26筒
    27红中
 */

// 手牌排序
function func(a, b) {
    return a - b;
}
// 洗牌
const xipai = (gui) => {
    // 麻将总量
    let mahjiangs = []
    // (0 ~ 8 表示万子
    var index = 0;
    for (var i = 0; i < 9; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjiangs[index] = i;
            index++;
        }
    }
    // 9 ~ 17表示条子
    for (var i = 9; i < 18; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjiangs[index] = i;
            index++;
        }
    }
    // 18 ~ 26表示筒
    for (var i = 18; i < 27; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjiangs[index] = i;
            index++;
        }
    }
    // 红中鬼
    if (gui == 27) {
        for (let i = 0; i < 4; i++) {
            mahjiangs[mahjiangs.length] = 27
        }
    }
    // console.log("洗牌", mahjiangs);
    // 打乱位置
    for (var i = 0; i < mahjiangs.length; ++i) {
        var lastIndex = mahjiangs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjiangs[index];
        mahjiangs[index] = mahjiangs[lastIndex];
        mahjiangs[lastIndex] = t;
    }
    return mahjiangs
}

// 初始化发牌
exports.initfapai = (peopleNumber, gui) => {
    const mahjiangsData = xipai(gui || 27)
    peopleNumber = parseInt(peopleNumber)
    let ininMaJIang = {
        unknownPai: [],// 牌堆
        moPaiid: "",// 摸牌id
        chuPaiid: "",// 出牌id
        positionIndex: "", // 当前位置
        guiPaiid: gui// 鬼牌id
    }
    for (let i = 0; i < peopleNumber; i++) {
        ininMaJIang[`playerid${i}`] = "" // 玩家id
        ininMaJIang[`playerShouPai${i}`] = [] // 手牌
        ininMaJIang[`playerMingGang${i}`] = [] // 杠牌
        ininMaJIang[`playerMingPeng${i}`] = [] // 碰牌
        ininMaJIang[`playerOutPai${i}`] = [] // 已打出牌
    }
    for (let i = 0; i < (peopleNumber * 13); i++) {
        let key = `playerShouPai${i % peopleNumber}`
        ininMaJIang[key].push(mahjiangsData[i])
        ininMaJIang[key] = ininMaJIang[key].sort(func)
    }
    ininMaJIang.unknownPai = mahjiangsData.splice(peopleNumber * 13, mahjiangsData.length)
    return ininMaJIang
}

// 数据库处理
exports.handleMaJiang = (data) => {
    let majiangData = {}
    let peopleNumber = data.people_number
    let positionIndex = data.position_index
    majiangData.unknownPai = JSON.parse(data.unknownpai).data
    majiangData.moPaiid = data.mopaiid
    majiangData.chuPaiid = data.chupaiid
    majiangData.positionIndex = positionIndex
    majiangData.guiPaiid = data.guipaiid
    for (let i = 0; i < peopleNumber; i++) {
        majiangData[`playerid${i}`] = data[`player${i}id`] // 玩家id
        let pai = JSON.parse(data[`player${i}pai`])
        majiangData[`playerShouPai${i}`] = pai[`playerShouPai${i}`] // 手牌
        majiangData[`playerMingGang${i}`] = pai[`playerMingGang${i}`] // 杠牌
        majiangData[`playerMingPeng${i}`] = pai[`playerMingPeng${i}`] // 碰牌
        majiangData[`playerOutPai${i}`] = pai[`playerOutPai${i}`] // 已打出牌
    }
    // console.log(majiangData);
    return majiangData
}
exports.updateBaseChu = (data, peopleNumber) => {
    let positionIndex = data.positionIndex
    let newPositionIndex = (data.positionIndex + 1) % peopleNumber
    let dataBase = {
        chupaiid: data.chuPaiid,
        position_index: newPositionIndex,
    }
    dataBase[`player${positionIndex}pai`] = {}
    dataBase[`player${positionIndex}pai`][`playerShouPai${positionIndex}`] = data[`playerShouPai${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerMingGang${positionIndex}`] = data[`playerMingGang${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerMingPeng${positionIndex}`] = data[`playerMingPeng${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerOutPai${positionIndex}`] = data[`playerOutPai${positionIndex}`]
    dataBase[`player${positionIndex}pai`] = JSON.stringify(dataBase[`player${positionIndex}pai`])
    // console.log(dataBase);
    return dataBase
}
exports.updateBaseChuOperation = (data) => {
    let positionIndex = data.positionIndex
    let dataBase = {
        chupaiid: data.chuPaiid,
    }
    dataBase[`player${positionIndex}pai`] = {}
    dataBase[`player${positionIndex}pai`][`playerShouPai${positionIndex}`] = data[`playerShouPai${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerMingGang${positionIndex}`] = data[`playerMingGang${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerMingPeng${positionIndex}`] = data[`playerMingPeng${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerOutPai${positionIndex}`] = data[`playerOutPai${positionIndex}`]
    dataBase[`player${positionIndex}pai`] = JSON.stringify(dataBase[`player${positionIndex}pai`])
    // console.log(dataBase);
    return dataBase
}
// 处理出牌
exports.chupai = (data, paiid) => {
    let positionIndex = data.positionIndex
    let shoupai = data[`playerShouPai${positionIndex}`]
    let index = shoupai.indexOf(paiid)
    if (index != -1) {
        data[`playerShouPai${positionIndex}`].splice(index, 1)
        data[`playerShouPai${positionIndex}`] = data[`playerShouPai${positionIndex}`].sort(func)
    }
    data[`playerOutPai${positionIndex}`].push(paiid)
    data.chuPaiid = paiid
    // console.log("-----------");
    // console.log(data);
    return data
}
const penghandOperable = (data, paiid) => {
    let count = 0
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item == paiid) count++
        if (count >= 2) { break }
    }
    return count >= 2
}

const ganghandOperable = (data, paiid) => {
    let count = 0
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item == paiid) count++
        if (count >= 3) { break }
    }
    return count >= 3
}
const huhandOperable = (data, paiid, guipai) => {
    console.log("胡他人");
    let guipaiNumber = 0
    let shoupai = JSON.parse(JSON.stringify(data))
    shoupai.push(paiid)
    shoupai = shoupai.filter(item => {
        if (item == guipai) guipaiNumber++
        return item != guipai
    })
    let copyShoupai = JSON.parse(JSON.stringify(shoupai))
    shoupai = shoupai.filter(item => {
        let arr = copyShoupai.filter(it => item == it)
        return arr.length === 1
    })
    shoupai = shoupai.sort(func)
    let sonlength = shoupai.length + guipaiNumber
    console.log("当前长度,huhandOperable", sonlength);
    if (sonlength == 0) return true
    if (shoupai.length == 0) return true
    if (shoupai.length == 1 && (guipaiNumber == 1 || guipaiNumber == 2)) return true
    if (shoupai.length == 2 && guipaiNumber == 2) return true
    if (sonlength % 3 == 0) {
        if (sonlength == 3) return thresShun(shoupai, guipaiNumber)
        else if (sonlength == 6) return sixShun(shoupai, guipaiNumber)
        else if (sonlength == 9) return nineShun(shoupai, guipaiNumber)
        else return false
    }
    if (shoupai == 5) return fiveShun(shoupai, guipaiNumber)
    if (shoupai == 8) return eightShun(shoupai, guipaiNumber)
    return false
}
exports.penghand = (data, position) => {
    // console.log(data);
    let paiid = data.chuPaiid
    let shoupai = data[`playerShouPai${position}`]
    let index = shoupai.indexOf(paiid)
    shoupai.splice(index, 1)
    index = shoupai.indexOf(paiid)
    shoupai.splice(index, 1)
    data[`playerMingPeng${position}`].push(paiid, paiid, paiid)

    data[`playerShouPai${position}`] = shoupai.sort(func)
    data.positionIndex = position
    return data
}
exports.penggangDataBase = (data) => {
    let positionIndex = data.positionIndex
    let dataBase = {
        position_index: positionIndex,
    }
    dataBase[`player${positionIndex}pai`] = {}
    dataBase[`player${positionIndex}pai`][`playerShouPai${positionIndex}`] = data[`playerShouPai${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerMingGang${positionIndex}`] = data[`playerMingGang${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerMingPeng${positionIndex}`] = data[`playerMingPeng${positionIndex}`]
    dataBase[`player${positionIndex}pai`][`playerOutPai${positionIndex}`] = data[`playerOutPai${positionIndex}`]
    dataBase[`player${positionIndex}pai`] = JSON.stringify(dataBase[`player${positionIndex}pai`])
    // console.log(dataBase);
    return dataBase
}
exports.ganghand = (data, position) => {
    // console.log(data);
    // console.log(playerPostition);
    let paiid = data.chuPaiid
    let shoupai = data[`playerShouPai${position}`]
    let pengpai = data[`playerMingPeng${position}`]
    let pengindex = pengpai.indexOf(paiid)
    if (pengindex != -1)
        pengpai.splice(pengindex, 3)
    else {
        let shouindex = shoupai.indexOf(paiid)
        if (shouindex != -1)
            shoupai.splice(shouindex, 3)
    }
    data[`playerShouPai${position}`] = shoupai.sort(func)
    data[`playerMingGang${position}`].push(paiid, paiid, paiid, paiid)
    data.positionIndex = position
    return data
}
exports.anganghand = (data, position) => {
    let paiid = data.moPaiid
    let shoupai = data[`playerShouPai${position}`]
    let pengpai = data[`playerMingPeng${position}`]
    let pengindex = pengpai.indexOf(paiid)
    if (pengindex > -1) {
        pengpai.splice(pengindex, 3)
        shoupai.splice(shoupai.indexOf(paiid), 1)
    } else {
        shoupai = shoupai.sort(func)
        let shouindex = shoupai.indexOf(paiid)
        if (shouindex != -1)
            shoupai.splice(shouindex, 4)
    }
    shoupai = shoupai.sort(func)
    for (let i = 0; i < shoupai.length; i++) {
        const item = shoupai[i];
        let filter = shoupai.filter(fi => fi == item)
        if (filter.length === 4) shoupai.splice(i, 4)
    }
    data[`playerShouPai${position}`] = shoupai.sort(func)
    data[`playerMingGang${position}`].push(paiid, paiid, paiid, paiid)
    data.positionIndex = position
    return data
}

exports.bugang = (data, position) => {
    let paiid = data.moPaiid
    let pengpai = data[`playerMingPeng${position}`]
    console.log("补杠", paiid, data[`playerMingPeng${position}`]);
    if (pengpai.indexOf(paiid) > -1) return true
    return false
}

exports.gangMopai = (data) => {
    // data.unknownPai
    let position = data.positionIndex
    let shoupai = data[`playerShouPai${position}`]
    let unknownpai = data.unknownPai
    shoupai.push(unknownpai[unknownpai.length - 1])
    data.moPaiid = shoupai[shoupai.length - 1]
    unknownpai.pop()
    data[`playerShouPai${position}`] = shoupai
    data.unknownPai = unknownpai
    return data
}
exports.mopaiDataBase = (data, peopleNumber) => {
    let dataBase = {}
    for (let i = 0; i < peopleNumber; i++) {
        dataBase[`player${i}pai`] = {}
        dataBase[`player${i}pai`][`playerShouPai${i}`] = data[`playerShouPai${i}`]
        dataBase[`player${i}pai`][`playerMingGang${i}`] = data[`playerMingGang${i}`]
        dataBase[`player${i}pai`][`playerMingPeng${i}`] = data[`playerMingPeng${i}`]
        dataBase[`player${i}pai`][`playerOutPai${i}`] = data[`playerOutPai${i}`]
        dataBase[`player${i}pai`] = JSON.stringify(dataBase[`player${i}pai`])
    }
    // let positionIndex = data.positionIndex
    dataBase[`unknownPai`] = JSON.stringify({ data: data.unknownPai })
    dataBase.mopaiid = data.moPaiid
    dataBase.position_index = data.positionIndex
    return dataBase
}
exports.mopai = (data) => {
    let position = data.positionIndex
    let shoupai = data[`playerShouPai${position}`]
    let unknownpai = data.unknownPai
    shoupai.push(unknownpai[0])
    data.moPaiid = unknownpai[0]
    unknownpai.shift()
    data[`playerShouPai${position}`] = shoupai
    data.unknownPai = unknownpai
    return data
}
exports.mopaigang = (data) => {
    let position = data.positionIndex
    let paiid = data.moPaiid
    let shoupai = data[`playerShouPai${position}`]
    let pengpai = data[`playerMingPeng${position}`]
    let pengindex = pengpai.indexOf(paiid)
    if (pengindex > -1) {
        return true
    }
    let count = 0
    for (let i = 0; i < shoupai.length; i++) {
        const item = shoupai[i];
        if (item == paiid) count++
    }
    if (count >= 4) return true
    return false
}
exports.initgang = (data) => {
    let position = data.positionIndex
    let shoupai = data[`playerShouPai${position}`]
    let bol = false
    shoupai.forEach(item => {
        let filter = shoupai.filter(fi => fi == item)
        if (filter.length === 4) bol = true
    })
    return bol
}

exports.mopaihu = (data) => {
    let guipai = data.guiPaiid
    let shoupai = data[`playerShouPai${data.positionIndex}`]
    let guipaiNumber = 0
    shoupai = shoupai.filter(item => {
        if (item == guipai) guipaiNumber++
        return item != guipai
    })
    let copyShoupai = JSON.parse(JSON.stringify(shoupai))
    shoupai = shoupai.filter(item => {
        let arr = copyShoupai.filter(it => item == it)
        return arr.length === 1
    })
    shoupai = shoupai.sort(func)
    let sonlength = shoupai.length + guipaiNumber
    console.log("摸牌胡", sonlength, shoupai.length, guipaiNumber);
    if (sonlength == 0) return true
    if (shoupai.length == 0) return true
    if (shoupai.length == 1 && (guipaiNumber == 1 || guipaiNumber == 2)) return true
    if (shoupai.length == 2 && guipaiNumber == 2) return true
    if (sonlength % 3 == 0) {
        if (sonlength == 3) return thresShun(shoupai, guipaiNumber)
        else if (sonlength == 6) return sixShun(shoupai, guipaiNumber)
        else if (sonlength == 9) return nineShun(shoupai, guipaiNumber)
        else return false
    }
    if (shoupai == 5) return fiveShun(shoupai, guipaiNumber)
    if (shoupai == 8) return eightShun(shoupai, guipaiNumber)
    return false
}

const thresShun = (data, guiNumber) => {
    if (guiNumber >= 2) return true
    if (guiNumber == 1) {
        return (data[0] + 1 == data[1] || data[0] + 2 == data[1]) && intervalJudgement(data[0], data[1])
    }
    return data[0] + 1 == data[1] && data[0] + 2 == data[2] && intervalJudgement(data[0], data[2])
}
const sixShun = (data, guiNumber) => {
    if (guiNumber >= 3) return true
    if (guiNumber == 2) return (data[0] + 1 == data[1] && data[0] + 2 == data[2] && intervalJudgement(data[0], data[2])) ||
        (data[1] + 1 == data[2] && data[1] + 2 == data[3] && intervalJudgement(data[1], data[3]))

    if (guiNumber == 1) {
        if (data[0] + 1 == data[1] && data[0] + 2 == data[2] && intervalJudgement(data[0], data[2])) {
            return (data[3] + 1 == data[4] || data[3] + 2 == data[4]) && intervalJudgement(data[3], data[4])
        }
        if (data[2] + 1 == data[3] && data[2] + 2 == data[4] && intervalJudgement(data[2], data[4])) {
            return (data[0] + 1 == data[1] || data[0] + 2 == data[1]) && intervalJudgement(data[0], data[1])
        }
        return false
    }
    return (data[0] + 1 == data[1] && data[0] + 2 == data[2] && intervalJudgement(data[0], data[2])) &&
        (data[3] + 1 == data[4] && data[3] + 2 == data[5] && intervalJudgement(data[3], data[5]))
}
const nineShun = (data, guiNumber) => {
    if (guiNumber == 4) {
        let bol = false
        for (let i = 0; i < 5; i++) {
            const item = data[i];
            if ((data.indexOf(item + 1) > -1 && intervalJudgement(item, item + 1)) || (data.indexOf(item + 2) > -1 && intervalJudgement(item, item + 2))) {
                bol = true
                break
            }
        }
        return bol
    }
    if (guiNumber == 3) {
        let bol = false
        for (let i = 0; i < 4; i++) {
            const item = data[i];
            const item2 = data[i + 1];
            const item3 = data[i + 2];
            if (item + 1 == item2 && item + 2 == item3 && intervalJudgement(item, item3)) {
                bol = true
                break
            }
        }
        return bol
    }
    if (guiNumber == 2) {
        let copyData = JSON.parse(JSON.stringify(data))
        for (let i = 0; i < copyData.length - 2; i++) {
            const item = copyData[i];
            const item2 = copyData[i + 1];
            const item3 = copyData[i + 2];
            if (item + 1 == item2 && item + 2 == item3 && intervalJudgement(item, item3)) {
                copyData.splice(i, 3)
                break
            }
        }
        if (copyData.length === 4) {
            copyData = copyData.sort(func)
            return (copyData[0] + 1 == copyData[1] && copyData[0] + 2 == copyData[2] && intervalJudgement(copyData[0], copyData[2])) ||
                (copyData[1] + 1 == copyData[2] && copyData[1] + 2 == copyData[3] && intervalJudgement(copyData[1], copyData[3])) ||
                (((copyData[0] + 1 == copyData[1] || copyData[0] + 2 == copyData[1]) && intervalJudgement(copyData[0], copyData[1])) &&
                    ((copyData[2] + 1 == copyData[3] || copyData[2] + 2 == copyData[3]) && intervalJudgement(copyData[2], copyData[3]))
                )
        }
        return false
    }
    if (guiNumber == 1) {
        let copyData = JSON.parse(JSON.stringify(data))
        for (let i = 0; i < copyData.length - 2; i++) {
            const item = copyData[i];
            const item2 = copyData[i + 1];
            const item3 = copyData[i + 2];
            if (item + 1 == item2 && item + 2 == item3 && intervalJudgement(item, item3)) copyData.splice(i, 3)
        }
        if (copyData.length === 2) {
            copyData = copyData.sort(func)
            return (copyData[0] + 1 == copyData[1] || copyData[0] + 2 == copyData[1]) && intervalJudgement(copyData[0], copyData[1])
        }
        return false
    }
    return (data[0] + 1 == data[1] && data[0] + 2 == data[2] && intervalJudgement(data[0], data[2])) &&
        (data[3] + 1 == data[4] && data[3] + 2 == data[5] && intervalJudgement(data[3], data[5])) &&
        (data[6] + 1 == data[7] && data[6] + 2 == data[8] && intervalJudgement(data[6], data[8]))
}
const fiveShun = (data, guiNumber) => {
    if (guiNumber >= 3) return true
    if (guiNumber == 2 && data[0] + 1 == data[1] && data[0] + 2 == data[2] && intervalJudgement(data[0], data[2])) return true
    if (guiNumber == 1) {
        if ((data[0] + 1 == data[1] && data[0] + 2 == data[2] && intervalJudgement(data[0], data[2])) ||
            (data[1] + 1 == data[2] && data[1] + 2 == data[3] && intervalJudgement(data[1], data[3]))) return true
    }
    return false
}
const eightShun = (data, guiNumber) => {
    if (guiNumber == 4) return true
    if (guiNumber == 3) {
        for (let i = 0; i < 3; i++) {
            if (data[i] + 1 == data[i + 1] && data[i] + 2 == data[i + 2] && intervalJudgement(data[i], data[i + 2])) {
                return true
            }
        }
    }
    if (guiNumber == 2) {
        console.log("八张牌", data);
        let copyData = JSON.parse(JSON.stringify(data))
        let bol = false
        for (let i = 0; i < 4; i++) {
            let item1 = copyData[i]
            let item2 = copyData[i + 1]
            let item3 = copyData[i + 2]
            if (item1 + 1 == item2 && item1 + 2 == item3 && intervalJudgement(item1, item3)) {
                copyData.splice(i, 3)
                bol = true
                break
            }
        }
        if (bol) {
            if ((copyData[0] + 1 == copyData[1] || copyData[0] + 2 == copyData[1] && intervalJudgement(copyData[0], copyData[1])) ||
                (copyData[1] + 1 == copyData[2] || copyData[1] + 2 == copyData[2] && intervalJudgement(copyData[1], copyData[2]))) return true
        } else {
            console.log((data[0] + data[1] + data[2]) % 3 == 0, intervalJudgement(data[0], data[2]));
            console.log((data[3] + data[4] + data[5]) % 3 == 0, intervalJudgement(data[3], data[5]));
            if ((data[0] + data[1] + data[2]) % 3 == 0 && data[0] + 1 == data[1] && data[0] + 2 == data[2] &&
                (data[3] + data[4] + data[5]) % 3 == 0 && data[3] + 1 == data[4] && data[3] + 2 == data[5]
                && intervalJudgement(data[0], data[2]) && intervalJudgement(data[3], data[5])) return true
        }
    }
    return false
}
exports.zimoHandDataBase = (peopleNumber) => {
    let update = {}
    for (let i = 0; i < peopleNumber; i++) {
        update[`player${i}result`] = 2
    }
    return update
}
exports.operationHandPlayer = (data, number) => {
    // 判断操作
    let playerOperable = {}
    const paiid = data.chuPaiid
    const guipai = data.guiPaiid
    // 当前出牌玩家data.positionIndex
    for (let i = 0; i < number; i++) {
        if (i == data.positionIndex) continue
        playerOperable[`player${i}`] = {
            peng: false,
            gang: false,
            hu: false
        }
        let playerShouPai = data[`playerShouPai${i}`]
        playerOperable[`player${i}`].peng = penghandOperable(playerShouPai, paiid)
        playerOperable[`player${i}`].gang = ganghandOperable(playerShouPai, paiid)
        playerOperable[`player${i}`].hu = huhandOperable(playerShouPai, paiid, guipai)
    }
    console.log("结果", playerOperable);
    return playerOperable
}
exports.operationHand = (data) => {
    let bol = false
    for (const key in data) {
        let operable = data[key]
        if (operable.peng || operable.gang || operable.hu) {
            bol = true
            break
        }
    }
    return bol
}
// 判断是不是在同一区间内
const intervalJudgement = (data1, data3) => {
    if (data1 < 9 && data3 < 9) return true
    if (data1 < 18 && data3 < 18 && data1 > 8 && data3 > 8) return true
    if (data1 < 27 && data3 < 27 && data1 > 17 && data3 > 17) return true
    return false
}
// 移除操作为空的玩家
exports.removeOperationHand = (data) => {
    let player = []
    for (const key in data) {
        let item = data[key]
        if (!item.peng && !item.gang && !item.hu) delete data[key]
        else player.push(parseInt(key.split("player")[1]))
    }
    return { player, data }
}
// 杀鬼翻倍
exports.killGhost = (data, guipai) => {
    let kill = true
    for (let i = 0; i < data.length; i++) {
        if (data[i] == guipai) {
            kill = false
            break
        }
    }
    return kill
}