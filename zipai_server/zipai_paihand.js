/**
 * 小写“一”、“二”、“三”、“四”、“五”、“六”、“七”、“八”、“九”、“十”各四张
 * 0 1 2 3 4 5 6 7 8 9
 * 大写“壹”、“贰”、“叁”、“肆”、“伍”、“陆”、“柒”、“捌”、“玖”、“拾”各四张
 * 10 11 12 13 14 15 16 17 18 19
 */

// 手牌排序
function func(a, b) {
    return a - b;
}
const Specialdeck = [1, 6, 9]
const SpecialdeckDa = [11, 16, 19]
const SpecialdeckHoPai = [1, 6, 9, 11, 16, 19]
// 提
exports.tiHand = (data) => {
    let bol = false
    let paiid = ""
    const positionIndex = data.positionIndex
    let deck = data[`player${positionIndex}Pai`]
    deck.forEach((item, index) => {
        if (item.length == 4 && item[0] == item[1] && item[2] == item[1] && item[0] == item[2]) {
            data[`player${positionIndex}MingPai`].push(item)
            paiid = item
            bol = true
            deck.splice(index, 1)
        }
    })
    data[`player${positionIndex}Pai`] = deck
    const moPaiid = data.moPaiid
    if (moPaiid) {
        let mingDeck = data[`player${positionIndex}MingPai`]
        for (let i = 0; i < mingDeck.length; i++) {
            let item = mingDeck[i]
            if (item.length === 3 && item[0] == moPaiid && item[1] == moPaiid && item[2] == moPaiid) {
                mingDeck[i].push(moPaiid)
                paiid = moPaiid
                bol = true
                break
            }
        }
        data[`player${positionIndex}MingPai`] = mingDeck
    }
    return {
        data,
        return: bol,
        paiid
    }
}

// 吃碰跑判断出牌其他-排除当前玩家
exports.operationDeckChupai = (data, excludeAll, paiid, wuhu, oneho) => {
    const peopleNumber = data.peopleNumber
    const positionIndex = data.positionIndex
    for (let i = 0; i < data[`player${positionIndex}Pai`].length; i++) {
        let arr = data[`player${positionIndex}Pai`][i];
        let index = arr.indexOf(paiid)
        if (index > -1) {
            data[`player${positionIndex}Pai`][i].splice(index, 1)
            if (data[`player${positionIndex}Pai`][i].length === 0) data[`player${positionIndex}Pai`].splice(i, 1)
            break
        }
    }
    let operation = {}
    for (let i = 0; i < peopleNumber; i++) {
        if (i == positionIndex) continue
        operation[`player${i}`] = {
            pao: false,
            hu: false,
            peng: [],
            chi: [],
        }
        let shouPai = data[`player${i}Pai`]
        let mingPai = data[`player${i}MingPai`]
        let exclude = excludeAll[`player${i}Exclude`]
        let deckconcat = [] // 总牌
        let deckconcatShouPai = [] // 手牌
        shouPai.forEach(item => {
            deckconcat = deckconcat.concat(item)
            deckconcatShouPai = deckconcatShouPai.concat(item)
        })
        let paoobj = {
            return: false,
            index: null
        }
        mingPai.forEach((item, index) => {
            // 跑-明牌排查
            if (item.length === 3 && item[0] == item[1] && item[1] == item[2] && item[0] == paiid) {
                paoobj.return = true
                paoobj.index = index
            }
            deckconcat = deckconcat.concat(item)
        })
        let paopengArr = deckconcatShouPai.filter(item => item == paiid) // 跑-手牌排查
        // 判断跑-有跑停止
        if (paopengArr.length === 3 || paoobj.return) {
            // console.log("跑");
            operation[`player${i}`].pao = true
            // 明牌组
            if (paoobj.return) {
                mingPai.splice(paoobj.index, 1)
            } else {
                // 手牌组
                let paosum = 0
                for (let j = 0; j < shouPai.length; j++) {
                    if (paosum == 3) break
                    const arr = shouPai[j];
                    let filter = arr.filter(fi => fi == paiid)
                    if (filter.length === 0) continue
                    if (filter.length === arr.length) {
                        shouPai.splice(j, 1)
                        paosum = paosum + filter.length
                    } else {
                        for (let h = 0; h < arr.length; h++) {
                            const item = arr[h]
                            if (item == paiid) {
                                shouPai[j].splice(h, 1)
                                paosum++
                            }
                        }
                    }
                }
            }
            mingPai.push([paiid, paiid, paiid, paiid])
            data[`player${i}Pai`] = shouPai
            data[`player${i}MingPai`] = mingPai
            break
        } else {
            // 判断胡
            let copyShoupai = JSON.parse(JSON.stringify(shouPai))
            copyShoupai.push([paiid])
            let huhand = judgeHu(copyShoupai, wuhu, oneho)
            if (huhand.return) {
                operation[`player${i}`].hu = true
                operation[`player${i}`].huOperation = huhand
            }
            // 碰吃
            if (exclude.indexOf(paiid) == -1) {
                // 判断碰
                if (paopengArr.length == 2) {
                    operation[`player${i}`].peng = [paiid, paiid, paiid]
                }
                // 吃
                // 小写2 7 10
                if (Specialdeck.indexOf(paiid) > -1) {
                    const two = deckconcatShouPai.indexOf(1)
                    const seven = deckconcatShouPai.indexOf(6)
                    const ten = deckconcatShouPai.indexOf(9)
                    if (paiid == 1 && seven > -1 && ten > -1) operation[`player${i}`].chi.push(Specialdeck)
                    if (paiid == 6 && two > -1 && ten > -1) operation[`player${i}`].chi.push(Specialdeck)
                    if (paiid == 9 && two > -1 && seven > -1) operation[`player${i}`].chi.push(Specialdeck)
                }
                // 大写贰 柒 十
                if (SpecialdeckDa.indexOf(paiid) > -1) {
                    const two = deckconcatShouPai.indexOf(11)
                    const seven = deckconcatShouPai.indexOf(16)
                    const ten = deckconcatShouPai.indexOf(19)
                    if (paiid == 1 && seven > -1 && ten > -1) operation[`player${i}`].chi.push(SpecialdeckDa)
                    if (paiid == 6 && two > -1 && ten > -1) operation[`player${i}`].chi.push(SpecialdeckDa)
                    if (paiid == 9 && two > -1 && seven > -1) operation[`player${i}`].chi.push(SpecialdeckDa)
                }
                // 普通吃
                let deckhand = []
                deckconcatShouPai.forEach(item => {
                    deckhand.push(item % 10)
                })
                // 大小顺子位置-4长 
                let paigroup = []
                for (let i = -2; i < 3; i++) {
                    if (i === 0) continue
                    // console.log(i + (paiid % 10), deckhand.indexOf(i + (paiid % 10)));
                    paigroup.push(deckhand.indexOf(i + (paiid % 10)))
                }
                let chideck = []
                // 0 0 1
                if (paigroup[0] > -1 && paigroup[1] > -1) {
                    let arr = [deckhand[paigroup[0]], deckhand[paigroup[1]]]
                    // console.log(arr);
                    let first = deckconcatShouPai.indexOf(arr[0])
                    let second = deckconcatShouPai.indexOf(arr[1])
                    let firstDa = deckconcatShouPai.indexOf(arr[0] + 10)
                    let secondDa = deckconcatShouPai.indexOf(arr[1] + 10)
                    // 小 大 混
                    if (first > -1 && second > -1) chideck.push([arr[0], arr[1], paiid])
                    if (firstDa > -1 && secondDa > -1) chideck.push([arr[0] + 10, arr[1] + 10, paiid])
                    if (first > -1 && secondDa > -1) chideck.push([arr[0], arr[1] + 10, paiid])
                    if (firstDa > -1 && second > -1) chideck.push([arr[0] + 10, arr[1], paiid])
                }
                // 0 1 0
                if (paigroup[1] > -1 && paigroup[2] > -1) {
                    let arr = [deckhand[paigroup[1]], deckhand[paigroup[2]]]
                    let first = deckconcatShouPai.indexOf(arr[0])
                    let second = deckconcatShouPai.indexOf(arr[1])
                    let firstDa = deckconcatShouPai.indexOf(arr[0] + 10)
                    let secondDa = deckconcatShouPai.indexOf(arr[1] + 10)
                    if (first > -1 && second > -1) chideck.push([arr[0], paiid, arr[1]])
                    if (firstDa > -1 && secondDa > -1) chideck.push([arr[0] + 10, paiid, arr[1] + 10])
                    if (first > -1 && secondDa > -1) chideck.push([arr[0], paiid, arr[1] + 10])
                    if (firstDa > -1 && second > -1) chideck.push([arr[0] + 10, paiid, arr[1]])
                }
                // 1 0 0
                if (paigroup[2] > -1 && paigroup[3] > -1) {
                    let arr = [deckhand[paigroup[2]], deckhand[paigroup[3]]]
                    let first = deckconcatShouPai.indexOf(arr[0])
                    let second = deckconcatShouPai.indexOf(arr[1])
                    let firstDa = deckconcatShouPai.indexOf(arr[0] + 10)
                    let secondDa = deckconcatShouPai.indexOf(arr[1] + 10)
                    if (first > -1 && second > -1) chideck.push([paiid, arr[0], arr[1]])
                    if (firstDa > -1 && secondDa > -1) chideck.push([paiid, arr[0] + 10, arr[1] + 10])
                    if (first > -1 && secondDa > -1) chideck.push([paiid, arr[0], arr[1] + 10])
                    if (firstDa > -1 && second > -1) chideck.push([paiid, arr[0] + 10, arr[1]])
                }
                // 平顺
                let copyShoupai = JSON.parse(JSON.stringify(deckconcatShouPai))
                if (paiid < 10) {
                    let first = copyShoupai.indexOf(paiid)
                    let second = copyShoupai.indexOf(paiid + 10)
                    copyShoupai.splice(second, 1)
                    let three = copyShoupai.indexOf(paiid + 10)
                    if (first > -1 && second > -1) chideck.push([paiid, paiid, paiid + 10])
                    if (three > -1 && second > -1) chideck.push([paiid, paiid + 10, paiid + 10])
                } else {
                    let first = copyShoupai.indexOf(paiid)
                    let second = copyShoupai.indexOf(paiid - 10)
                    copyShoupai.splice(second, 1)
                    let three = copyShoupai.indexOf(paiid - 10)
                    if (first > -1 && second > -1) chideck.push([paiid - 10, paiid, paiid])
                    if (three > -1 && second > -1) chideck.push([paiid - 10, paiid - 10, paiid])
                }
                operation[`player${i}`].chi = chideck
            }
        }
        // 去除没有存在的吃
        for (let c = 0; c < operation[`player${i}`].chi.length; c++) {
            const element = operation[`player${i}`].chi[c];
            // console.log(element, element.indexOf(paiid), paiid);
            if (element.indexOf(paiid) == -1) {
                operation[`player${i}`].chi.splice(c, 1)
                c--
            } else {
                if (!reasonable(JSON.parse(JSON.stringify(element)), paiid)) {
                    operation[`player${i}`].chi.splice(c, 1)
                    c--
                }
            }
        }
    }
    return { operation, data }
}
// 天胡
exports.judgeHu = (data, wuhu, oneho) => {
    let Jihu = 0
    let deckconcat = []
    let deckhand = []
    data.forEach(item => {
        deckconcat = deckconcat.concat(item)
        item.forEach(it => {
            deckhand.push(it % 10)
        })
    })
    let judgeconcat = JSON.parse(JSON.stringify(deckconcat))
    let judgehand = JSON.parse(JSON.stringify(deckhand))
    let countHo = 0
    judgeconcat.forEach(item => {
        if (SpecialdeckHoPai.indexOf(item) > -1) countHo++
        let duizi = judgeconcat.filter(fi => fi == item)
        // 排除对子
        if (duizi.length === 3) {
            Jihu = duizi < 10 ? Jihu + 1 : Jihu + 3
            judgeconcat = judgeconcat.filter(fi => fi !== item)
        } else {
            // 排除对顺
            let positionArr = []
            let duishun = judgehand.filter((fi, index) => {
                if (fi == item % 10) {
                    positionArr.push(index)
                    return true
                }
            })
            if (duishun.length === 3) {
                for (let i = 0; i < 3; i++) {
                    judgeconcat.splice(positionArr[i], 1)
                    judgehand.splice(positionArr[i], 1)
                }
            }
        }
    })
    judgeconcat.sort(func)
    judgehand = []
    judgeconcat.forEach(item => {
        judgehand.push(item % 10)
    })
    // 排除顺子
    for (let index = 0; index < judgehand.length; index++) {
        const item = judgehand[index]
        let nextIndex = judgehand.indexOf(item + 1)
        let nextTwoIndex = judgehand.indexOf(item + 2)
        if (nextIndex > -1 && nextTwoIndex > -1) {
            if (judgeconcat[index] == 1 && judgeconcat[index] == 6 && judgeconcat[index] == 9) {
                Jihu = Jihu + 3
            }
            if (judgeconcat[index] == 11 && judgeconcat[index] == 16 && judgeconcat[index] == 19) {
                Jihu = Jihu + 6
            }
            if (judgeconcat[index] == 0 && judgeconcat[index] == 1 && judgeconcat[index] == 2) {
                Jihu = Jihu + 3
            }
            if (judgeconcat[index] == 10 && judgeconcat[index] == 11 && judgeconcat[index] == 12) {
                Jihu = Jihu + 6
            }
            judgehand.splice(index, 1)
            judgehand.splice(nextIndex, 1)
            judgehand.splice(nextTwoIndex, 1)
            judgeconcat.splice(index, 1)
            judgeconcat.splice(nextIndex, 1)
            judgeconcat.splice(nextTwoIndex, 1)
        }
    }
    if ((judgeconcat.length === 2 && judgeconcat[0] == judgeconcat[1]) || judgeconcat.length === 0) {
        // 无胡
        if ((!wuhu || wuhu != 1) && Jihu < 10) {
            Jihu = 21
        }
        let special = {}
        // 一点红
        if (countHo == 1 && (!oneho || oneho != 1)) {
            Jihu = Jihu * 2
            special.oneho = true
        }
        // 红胡
        if (countHo >= 13) {
            Jihu = Jihu * 2
            special.hohu = true
        }
        // 黑胡
        if (countHo == 0) {
            Jihu = Jihu * 2
            special.heihu = true
        }
        return {
            return: Jihu >= 10,
            Jihu,
            special
        }
    }
    return {
        return: false
    }
}

// 胡判断
const judgeHu = (data, wuhu, oneho) => {
    let Jihu = 0
    let deckconcat = []
    let deckhand = []
    data.forEach(item => {
        deckconcat = deckconcat.concat(item)
        item.forEach(it => {
            deckhand.push(it % 10)
        })
    })
    let judgeconcat = JSON.parse(JSON.stringify(deckconcat))
    let judgehand = JSON.parse(JSON.stringify(deckhand))
    let countHo = 0
    judgeconcat.forEach(item => {
        if (SpecialdeckHoPai.indexOf(item) > -1) countHo++
        let duizi = judgeconcat.filter(fi => fi == item)
        // 排除对子
        if (duizi.length === 3) {
            Jihu = duizi < 10 ? Jihu + 1 : Jihu + 3
            judgeconcat = judgeconcat.filter(fi => fi !== item)
        } else {
            // 排除对顺
            let positionArr = []
            let duishun = judgehand.filter((fi, index) => {
                if (fi == item % 10) {
                    positionArr.push(index)
                    return true
                }
            })
            if (duishun.length === 3) {
                for (let i = 0; i < 3; i++) {
                    judgeconcat.splice(positionArr[i], 1)
                    judgehand.splice(positionArr[i], 1)
                }
            }
        }
    })
    judgeconcat.sort(func)
    judgehand = []
    judgeconcat.forEach(item => {
        judgehand.push(item % 10)
    })
    // 排除顺子
    for (let index = 0; index < judgehand.length; index++) {
        const item = judgehand[index]
        // console.log(judgehand.length - num,);
        // console.log(judgehand);
        // console.log(item, item + 1, item + 2);
        let nextIndex = judgehand.indexOf(item + 1)
        let nextTwoIndex = judgehand.indexOf(item + 2)
        if (nextIndex > -1 && nextTwoIndex > -1) {
            if (judgeconcat[index] == 1 && judgeconcat[index] == 6 && judgeconcat[index] == 9) {
                Jihu = Jihu + 3
            }
            if (judgeconcat[index] == 11 && judgeconcat[index] == 16 && judgeconcat[index] == 19) {
                Jihu = Jihu + 6
            }
            if (judgeconcat[index] == 0 && judgeconcat[index] == 1 && judgeconcat[index] == 2) {
                Jihu = Jihu + 3
            }
            if (judgeconcat[index] == 10 && judgeconcat[index] == 11 && judgeconcat[index] == 12) {
                Jihu = Jihu + 6
            }
            judgehand.splice(index, 1)
            judgehand.splice(nextIndex, 1)
            judgehand.splice(nextTwoIndex, 1)
            judgeconcat.splice(index, 1)
            judgeconcat.splice(nextIndex, 1)
            judgeconcat.splice(nextTwoIndex, 1)
        }
    }
    if ((judgeconcat.length === 2 && judgeconcat[0] == judgeconcat[1]) || judgeconcat.length === 0) {
        // 无胡
        if ((!wuhu || wuhu != 1) && Jihu < 10) {
            Jihu = 21
        }
        let special = {}
        // 一点红
        if (countHo == 1 && (!oneho || oneho != 1)) {
            Jihu = Jihu * 2
            special.oneho = true
        }
        // 红胡
        if (countHo >= 13) {
            Jihu = Jihu * 2
            special.hohu = true
        }
        // 黑胡
        if (countHo == 0) {
            Jihu = Jihu * 2
            special.heihu = true
        }
        return {
            return: Jihu >= 10,
            Jihu,
            special
        }
    }
    return {
        return: false
    }
}
// 判断有没有跑
exports.paoDoesItExist = (data) => {
    let bol = false
    let index = null
    for (const key in data) {
        const item = data[key];
        if (item.pao) {
            bol = true
            index = key.split("player")[1]
            break
        }
    }
    return { return: bol, index }
}
// 判断当前玩家有多少张牌
exports.surplusDeck = (data, index) => {
    if (!index) index = data.positionIndex
    let shouPai = data[`player${index}Pai`]
    let mingDeck = data[`player${index}MingPai`]
    let count = 0
    shouPai.forEach(deck => {
        count = count + deck.length
    })
    mingDeck.forEach(deck => {
        count = count + deck.length
    })
    console.log("-----");
    console.log("shouPai", shouPai);
    console.log("mingDeck", mingDeck);
    console.log(count);
    console.log("-----");
    return count
}
// 摸牌操作并进行其他操作判断
exports.mopaiAndOperation = (data, excludeAll, wuhu, oneho) => {
    data.moPaiid = data.unknownPai[0]
    data.chuPaiid = null
    data.unknownPai.shift()
    let operationAndData = operationDeckAll(data, data.moPaiid, excludeAll, wuhu, oneho)
    return operationAndData
}
// 判断全部
const operationDeckAll = (data, paiid, excludeAll, wuhu, oneho) => {
    const peopleNumber = data.peopleNumber
    const positionIndex = data.positionIndex
    let operation = {}
    // 当前玩家
    operation[`player${positionIndex}`] = {
        ti: false,
        wei: false,
        hu: false
    }
    let currentShoupai = data[`player${positionIndex}Pai`]
    let currentMingpai = data[`player${positionIndex}MingPai`]
    // 提
    for (let i = 0; i < currentMingpai.length; i++) {
        let deck = currentMingpai[i];
        if (deck.length === 3 && deck[0] == paiid && deck[0] == data[1] && data[1] == data[2]) {
            operation[`player${positionIndex}`].ti = true
            deck.push(paiid)
            currentMingpai[i] = deck
            break
        }
    }
    for (let i = 0; i < currentShoupai.length; i++) {
        const element = currentShoupai[i];
        if (element.length == 4 && element[0] == element[1] && element[1] == element[2] && element[2] == element[3]) {
            currentMingpai.push(element)
            currentShoupai.splice(i, 1)
            operation[`player${positionIndex}`].ti = true
            break
        }
    }
    // 其他
    if (!operation[`player${positionIndex}`].ti) {
        console.log("没有提");
        let currentShoupaiConcat = []
        currentShoupai.forEach(item => currentShoupaiConcat = currentShoupaiConcat.concat(item))
        let filterDeck = currentShoupai.filter(item => item == paiid)
        let count = 0
        if (filterDeck.length == 3) {
            console.log("手牌提处理");
            operation[`player${positionIndex}`].ti = true
            for (let i = 0; i < currentShoupai.length; i++) {
                if (count >= 3) break
                let deck = currentShoupai[i];
                let filterArr = deck.filter(item => item == paiid)
                if (filterArr.length == 0) continue
                for (let j = 0; j < filterArr.length; j++) {
                    if (count >= 3) break
                    let index = deck.indexOf(paiid)
                    if (index > -1) {
                        deck.splice(index, 1)
                        count++
                    }
                }
                currentShoupai[i] = deck
                if (currentShoupai[i].length == 0) currentShoupai.splice(i, 1)
            }
            data[`player${positionIndex}MingPai`].push([paiid, paiid, paiid, paiid])
        }
        if (!operation[`player${positionIndex}`].ti && filterDeck.length == 2) {
            console.log("手牌煨处理");
            operation[`player${positionIndex}`].wei = true
            for (let i = 0; i < currentShoupai.length; i++) {
                if (count >= 2) break
                let deck = currentShoupai[i];
                let filterArr = deck.filter(item => item == paiid)
                if (filterArr.length == 0) continue
                for (let j = 0; j < filterArr.length; j++) {
                    if (count >= 2) break
                    let index = deck.indexOf(paiid)
                    if (index > -1) {
                        deck.splice(index, 1)
                        count++
                    }
                }
                currentShoupai[i] = deck
                if (currentShoupai[i].length == 0) currentShoupai.splice(i, 1)
            }
            data[`player${positionIndex}MingPai`].push([paiid, paiid, paiid])
        }
    }
    data[`player${positionIndex}Pai`] = currentShoupai
    data[`player${positionIndex}MingPai`] = currentMingpai
    if (!operation[`player${positionIndex}`].ti && !operation[`player${positionIndex}`].wei) {
        // 判断胡
        let copyShoupai = JSON.parse(JSON.stringify(currentShoupai))
        copyShoupai.push([paiid])
        let huhand = judgeHu(copyShoupai, wuhu, oneho)
        if (huhand.return) {
            operation[`player${positionIndex}`].hu = true
            operation[`player${positionIndex}`].huOperation = huhand
        }
        // 其他玩家
        for (let i = 0; i < peopleNumber; i++) {
            if (i == positionIndex) continue
            operation[`player${i}`] = {
                pao: false,
                hu: false,
                peng: [],
                chi: [],
            }
            let shouPai = data[`player${i}Pai`]
            let mingPai = data[`player${i}MingPai`]
            let exclude = excludeAll[`player${i}Exclude`]
            let deckconcat = [] // 总牌
            let deckconcatShouPai = [] // 手牌
            shouPai.forEach(item => {
                deckconcat = deckconcat.concat(item)
                deckconcatShouPai = deckconcatShouPai.concat(item)
            })
            let paoobj = {
                return: false,
                index: null
            }
            mingPai.forEach((item, index) => {
                // 跑-明牌排查
                if (item.length === 3 && item[0] == item[1] && item[1] == item[2] && item[0] == paiid) {
                    paoobj.return = true
                    paoobj.index = index
                }
                deckconcat = deckconcat.concat(item)
            })
            let paopengArr = deckconcatShouPai.filter(item => item == paiid) // 跑-手牌排查
            // 判断跑-有跑停止
            if (paopengArr.length === 3 || paoobj.return) {
                operation[`player${i}`].pao = true
                // 明牌组
                if (paoobj.return) {
                    mingPai.splice(paoobj.index, 1)
                } else {
                    // 手牌组
                    let paosum = 0
                    for (let j = 0; j < shouPai.length; j++) {
                        if (paosum == 3) break
                        const arr = shouPai[j];
                        let filter = arr.filter(fi => fi == paiid)
                        if (filter.length === 0) continue
                        if (filter.length === arr.length) {
                            shouPai.splice(j, 1)
                            paosum = paosum + filter.length
                        } else {
                            for (let h = 0; h < arr.length; h++) {
                                const item = arr[h]
                                if (item == paiid) {
                                    shouPai[j].splice(h, 1)
                                    paosum++
                                }
                            }
                        }
                    }
                }
                mingPai.push([paiid, paiid, paiid, paiid])
                data[`player${i}Pai`] = shouPai
                data[`player${i}MingPai`] = mingPai
                break
            } else {
                // 判断胡
                let copyShoupai = JSON.parse(JSON.stringify(shouPai))
                copyShoupai.push([paiid])
                let huhand = judgeHu(copyShoupai, wuhu, oneho)
                if (huhand.return) {
                    operation[`player${i}`].hu = true
                    operation[`player${i}`].huOperation = huhand
                }
                // 碰吃
                if (exclude.indexOf(paiid) == -1) {
                    // 判断碰
                    if (paopengArr.length == 2) {
                        operation[`player${i}`].peng = [paiid, paiid, paiid]
                    }
                    // 吃
                    // 小写2 7 10
                    if (Specialdeck.indexOf(paiid) > -1) {
                        const two = deckconcatShouPai.indexOf(1)
                        const seven = deckconcatShouPai.indexOf(6)
                        const ten = deckconcatShouPai.indexOf(9)
                        if (paiid == 1 && seven > -1 && ten > -1) operation[`player${i}`].chi.push(Specialdeck)
                        if (paiid == 6 && two > -1 && ten > -1) operation[`player${i}`].chi.push(Specialdeck)
                        if (paiid == 9 && two > -1 && seven > -1) operation[`player${i}`].chi.push(Specialdeck)
                    }
                    // 大写贰 柒 十
                    if (SpecialdeckDa.indexOf(paiid) > -1) {
                        const two = deckconcatShouPai.indexOf(11)
                        const seven = deckconcatShouPai.indexOf(16)
                        const ten = deckconcatShouPai.indexOf(19)
                        if (paiid == 1 && seven > -1 && ten > -1) operation[`player${i}`].chi.push(SpecialdeckDa)
                        if (paiid == 6 && two > -1 && ten > -1) operation[`player${i}`].chi.push(SpecialdeckDa)
                        if (paiid == 9 && two > -1 && seven > -1) operation[`player${i}`].chi.push(SpecialdeckDa)
                    }
                    // 普通吃
                    let deckhand = []
                    deckconcatShouPai.forEach(item => {
                        deckhand.push(item % 10)
                    })
                    // 大小顺子位置-4长 
                    let paigroup = []
                    for (let i = -2; i < 3; i++) {
                        if (i === 0) continue
                        // console.log(i + (paiid % 10), deckhand.indexOf(i + (paiid % 10)));
                        paigroup.push(deckhand.indexOf(i + (paiid % 10)))
                    }
                    let chideck = []
                    // 0 0 1
                    if (paigroup[0] > -1 && paigroup[1] > -1) {
                        let arr = [deckhand[paigroup[0]], deckhand[paigroup[1]]]
                        let first = deckconcatShouPai.indexOf(arr[0])
                        let second = deckconcatShouPai.indexOf(arr[1])
                        let firstDa = deckconcatShouPai.indexOf(arr[0] + 10)
                        let secondDa = deckconcatShouPai.indexOf(arr[1] + 10)
                        // 小 大 混
                        if (first > -1 && second > -1) chideck.push([arr[0], arr[1], paiid])
                        if (firstDa > -1 && secondDa > -1) chideck.push([arr[0] + 10, arr[1] + 10, paiid])
                        if (first > -1 && secondDa > -1) chideck.push([arr[0], arr[1] + 10, paiid])
                        if (firstDa > -1 && second > -1) chideck.push([arr[0] + 10, arr[1], paiid])
                    }
                    // 0 1 0
                    if (paigroup[1] > -1 && paigroup[2] > -1) {
                        let arr = [deckhand[paigroup[1]], deckhand[paigroup[2]]]
                        let first = deckconcatShouPai.indexOf(arr[0])
                        let second = deckconcatShouPai.indexOf(arr[1])
                        let firstDa = deckconcatShouPai.indexOf(arr[0] + 10)
                        let secondDa = deckconcatShouPai.indexOf(arr[1] + 10)
                        if (first > -1 && second > -1) chideck.push([arr[0], paiid, arr[1]])
                        if (firstDa > -1 && secondDa > -1) chideck.push([arr[0] + 10, paiid, arr[1] + 10])
                        if (first > -1 && secondDa > -1) chideck.push([arr[0], paiid, arr[1] + 10])
                        if (firstDa > -1 && second > -1) chideck.push([arr[0] + 10, paiid, arr[1]])
                    }
                    // 1 0 0
                    if (paigroup[2] > -1 && paigroup[3] > -1) {
                        let arr = [deckhand[paigroup[2]], deckhand[paigroup[3]]]
                        let first = deckconcatShouPai.indexOf(arr[0])
                        let second = deckconcatShouPai.indexOf(arr[1])
                        let firstDa = deckconcatShouPai.indexOf(arr[0] + 10)
                        let secondDa = deckconcatShouPai.indexOf(arr[1] + 10)
                        if (first > -1 && second > -1) chideck.push([paiid, arr[0], arr[1]])
                        if (firstDa > -1 && secondDa > -1) chideck.push([paiid, arr[0] + 10, arr[1] + 10])
                        if (first > -1 && secondDa > -1) chideck.push([paiid, arr[0], arr[1] + 10])
                        if (firstDa > -1 && second > -1) chideck.push([paiid, arr[0] + 10, arr[1]])
                    }
                    // 平顺
                    let copyShoupai = JSON.parse(JSON.stringify(deckconcatShouPai))
                    if (paiid < 10) {
                        let first = copyShoupai.indexOf(paiid)
                        let second = copyShoupai.indexOf(paiid + 10)
                        copyShoupai.splice(second, 1)
                        let three = copyShoupai.indexOf(paiid + 10)
                        if (first > -1 && second > -1) chideck.push([paiid, paiid, paiid + 10])
                        if (three > -1 && second > -1) chideck.push([paiid, paiid + 10, paiid + 10])
                    } else {
                        let first = copyShoupai.indexOf(paiid)
                        let second = copyShoupai.indexOf(paiid - 10)
                        copyShoupai.splice(second, 1)
                        let three = copyShoupai.indexOf(paiid - 10)
                        if (first > -1 && second > -1) chideck.push([paiid - 10, paiid, paiid])
                        if (three > -1 && second > -1) chideck.push([paiid - 10, paiid - 10, paiid])
                    }
                    operation[`player${i}`].chi = chideck
                }
            }
        }
    }
    return { operation, data }
}
// 判断是否有操作
exports.judgeOperationHand = (data) => {
    let bol = false
    for (const key in data) {
        const item = data[key];
        if (item.hu.return) {
            bol = true
            break
        }
        if ((item.peng && item.peng.length > 0) || (item.chi && item.chi.length > 0)) {
            bol = true
            break
        }
    }
    return bol
}

// 获取操作玩家
exports.getoperationPlayer = (data) => {
    let bol = false
    let player = []
    let nextOperationPosition = null
    for (const key in data) {
        if (key == nextOperationPosition) continue
        let position = parseInt(key.split("player")[1])
        const item = data[key]
        if (item.peng && item.peng.length !== 0) {
            nextOperationPosition = position
            bol = true
        } else player.push(position)
    }
    return { player, return: bol, nextOperationPosition }
}

// 玩家碰处理
exports.pengHand = (data, operation) => {
    const nextOperationPosition = operation.nextOperationPosition
    data[`player${nextOperationPosition}MingPai`].push(operation[`player${nextOperationPosition}`].peng)
    const paiid = data.chuPaiid || data.moPaiid
    let shoupai = data[`player${nextOperationPosition}Pai`]
    let count = 0
    for (let i = 0; i < shoupai.length; i++) {
        if (count == 2) break
        let arr = shoupai[i];
        let index = arr.indexOf(paiid)
        if (index > -1) {
            arr.splice(index, 1)
            count++
        }
        index = arr.indexOf(paiid)
        if (index > -1) {
            arr.splice(index, 1)
            count++
        }
        shoupai[i] = arr
        if (shoupai[i].length == 0) shoupai.splice(i, 1)
    }
    data[`player${nextOperationPosition}Pai`] = shoupai
    data.positionIndex = nextOperationPosition
    data.chuPaiid = null
    data.moPaiid = null
    return data
}
// 吃
exports.chiDeckHand = (data, deck, position, paiid) => {
    let concatDeck = []
    deck.forEach(item => concatDeck = concatDeck.concat(item))
    concatDeck = concatDeck.filter(item => item != paiid)
    console.log(concatDeck);
    let shoupai = data[`player${position}Pai`]
    let count = 0
    let concatLength = concatDeck.length
    for (let i = 0; i < shoupai.length; i++) {
        if (count >= concatLength) break
        let array = shoupai[i];
        for (let j = 0; j < array.length; j++) {
            if (count >= concatLength) break
            let item = array[j];
            let index = concatDeck.indexOf(item)
            if (index > -1) {
                array.splice(j, 1)
                concatDeck.splice(index, 1)
                count++
            }

        }
        shoupai[i] = array
        if (array.length == 0) {
            shoupai.splice(i, 1)
        }
    }
    data[`player${position}Pai`] = shoupai
    data[`player${position}MingPai`] = data[`player${position}MingPai`].concat(deck)
    data.positionIndex = position
    data.chuPaiid = null
    data.moPaiid = null
    return data
}
exports.removeUnwantedOperations = (data) => {
    for (const key in data) {
        if (data.nextOperationPosition) continue
        let item = data[key]
        if (!item.hu && (!item.peng || item.peng.length == 0)
            && (!item.chi || item.chi.length == 0)) {
            delete data[key]
        }
    }
    return data
}
// 去除不合理吃
const reasonable = (data, paiid) => {
    data.splice(data.indexOf(paiid), 1)
    if (data[0] >= 10 && data[1] >= 10) return true
    if (data[0] < 10 && data[1] < 10) return true
    if (data[0] == data[1]) return true
    return false
}