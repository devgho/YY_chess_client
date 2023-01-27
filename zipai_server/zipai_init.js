/**
 * 小写“一”、“二”、“三”、“四”、“五”、“六”、“七”、“八”、“九”、“十”各四张
 * 0 1 2 3 4 5 6 7 8 9
 * 大写“壹”、“贰”、“叁”、“肆”、“伍”、“陆”、“柒”、“捌”、“玖”、“拾”各四张
 * 10 11 12 13 14 15 16 17 18 19
 */
const zipaiMethods = require("./zipaiPublicmethods")
// 手牌排序
function func(a, b) {
    return a - b;
}
exports.initpai = () => {
    let paiData = []
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 20; j++) {
            paiData.push(j)
        }
    }
    for (var i = 0; i < paiData.length; ++i) {
        var lastIndex = paiData.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = paiData[index];
        paiData[index] = paiData[lastIndex];
        paiData[lastIndex] = t;
    }
    return paiData
}
exports.fapai = (data, peopleNumber, positionIndex) => {
    let paiNumber = peopleNumber * 20
    let paiData = {}
    for (let i = 0; i < peopleNumber; i++) {
        paiData[`player${i}Pai`] = []
    }
    for (let i = 0; i < paiNumber; i++) {
        paiData[`player${i % peopleNumber}Pai`].push(data[i])
        paiData[`player${i % peopleNumber}Pai`].sort(func)
    }
    paiData.unknownPai = data.slice(paiNumber)
    if (!positionIndex) positionIndex = 0
    paiData[`player${positionIndex}Pai`].push(paiData.unknownPai[0])
    paiData.unknownPai.splice(0, 1)
    let duizihand = {}
    // 一次对子
    for (const key in paiData) {
        if (key == "unknownPai") continue
        const paiarr = paiData[key];
        let position = []
        let handarr = []
        paiarr.forEach(item => {
            let index = position.indexOf(item)
            if (index > -1) {
                handarr[index].push(item)
            }
            else {
                position.push(item)
                handarr[position.length - 1] = [item]
            }
        })
        duizihand[key] = {
            position,
            handarr
        }
    }
    // 二次对子
    for (const key in duizihand) {
        const paiarr = duizihand[key];
        let position = paiarr.position
        let handarr = paiarr.handarr
        let newhandarr = JSON.parse(JSON.stringify(handarr))
        let deletearr = []
        let indexPosition = -1
        for (const key in handarr) {
            indexPosition++
            const arr = handarr[key]
            // 当前位置
            if (arr.length > 1) continue
            let item = arr[0]
            let index = position.indexOf(item % 10)
            if (index > -1 && index != indexPosition) {
                if (newhandarr[index].length > 2) continue
                newhandarr[index].push(item)
                deletearr.push(indexPosition)
            }
        }
        deletearr.forEach((item, index) => {
            newhandarr.splice((item - index), 1)
        })
        duizihand[key] = newhandarr
    }
    let deck = {}
    // 顺子
    for (const key in duizihand) {
        let paiarr = duizihand[key];
        let deletearr = []
        let indexPosition = -1
        let processed = []
        for (const key in paiarr) {
            indexPosition++
            const arr = paiarr[key]
            if (arr.length > 1) continue // 排除对子
            processed.push(arr[0])
            deletearr.push(indexPosition)
        }
        deletearr.forEach((item, index) => {
            paiarr.splice((item - index), 1)
        })
        processed = zipaiMethods.zipaiSort(processed)
        let shunziArr = []
        processed.forEach(item => {
            if (shunziArr.length === 0) {
                shunziArr.push([item])
            } else {
                let nowItem = item % 10
                let twoback = nowItem + 2
                let after = nowItem + 1
                let twofront = nowItem - 2
                let befor = nowItem - 1

                let bol = false
                for (let i = 0; i < shunziArr.length; i++) {
                    let it = shunziArr[i]
                    if (it.length === 1) {
                        let data = it[0] % 10
                        if (data == after || data == befor || data == twoback || data == twofront) {
                            shunziArr[i].push(item)
                            shunziArr[i] = zipaiMethods.zipaiSort(shunziArr[i])
                            bol = true
                        }
                    }
                    if (it.length === 2) {
                        let data = it[0] % 10
                        let data2 = it[1] % 10
                        if ((data == twofront && data2 == befor) || (data == after && data2 == twoback) || (data == befor && data2 == after)) {
                            shunziArr[i].push(item)
                            shunziArr[i] = zipaiMethods.zipaiSort(shunziArr[i])
                            bol = true
                        }
                    }
                }
                if (!bol) {
                    shunziArr.push([item])
                }
            }
        })
        deck[key] = paiarr.concat(shunziArr)
    }
    for (const key in deck) {
        paiData[key] = deck[key]
    }
    return paiData
}