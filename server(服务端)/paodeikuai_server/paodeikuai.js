/*
梅花    A 3 4 5 6 7 8 9 10 J Q K
0       0 1 2 3 4 5 6 7 8 9 10 11
方块    A 3 4 5 6 7 8 9 10 J Q K
1       12 13 14 15 16 17 18 19 20 21 22 23
红桃    A 3 4 5 6 7 8 9 10 J Q K
2       24 25 26 27 28 29 30 31 32 33 34 35
黑桃    2 3 4 5 6 7 8 9 10 J Q K
3       36 37 38 39 40 41 42 43 44 45 46 47
12n
48
*/
const meihua = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const fangkuai = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
const hotao = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
const heitao = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]
// const pukepai = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
// const pukepaihand = [0, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
// 0 -1 1 2 3 4 5 6 7 8  9 10 11
// A  2 3 4 5 6 7 8 9 10 J  Q  K

// 手牌排序
function func(a, b) {
    return a - b;
}
const sortPuke = (data) => {
    let newData = []
    let newDataPosition = []
    data = data.sort(func)
    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        let meihuaIndex = meihua.indexOf(item)
        let fangkuaiIndex = fangkuai.indexOf(item)
        let hotaoIndex = hotao.indexOf(item)
        let heitaoIndex = heitao.indexOf(item)
        if (meihuaIndex > -1) {
            if (meihuaIndex != 0) {
                meihuaIndex++
            }
            newDataPosition.push(meihuaIndex)
            newDataPosition = newDataPosition.sort(func)
            newData.splice(newDataPosition.indexOf(meihuaIndex), 0, item)
        } else if (fangkuaiIndex > -1) {
            if (fangkuaiIndex != 0) {
                fangkuaiIndex++
            }
            newDataPosition.push(fangkuaiIndex)
            newDataPosition = newDataPosition.sort(func)
            newData.splice(newDataPosition.indexOf(fangkuaiIndex), 0, item)
        } else if (hotaoIndex > -1) {
            if (hotaoIndex != 0) {
                hotaoIndex++
            }
            newDataPosition.push(hotaoIndex)
            newDataPosition = newDataPosition.sort(func)
            newData.splice(newDataPosition.indexOf(hotaoIndex), 0, item)
        } else if (heitaoIndex > -1) {
            heitaoIndex++
            newDataPosition.push(heitaoIndex)
            newDataPosition = newDataPosition.sort(func)
            newData.splice(newDataPosition.indexOf(heitaoIndex), 0, item)
        }
    }
    return newData
}
// 洗牌
const xipai = () => {
    let paiData = []
    for (let i = 0; i < 48; i++) {
        paiData.push(i)
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
// 初始化
exports.initpai = (peopleNumber, gameInfo) => {
    let paiDataXI = xipai()
    let data = {
        peopleNumber,
        chuPai: [],
        unknownPai: [],
        boom: gameInfo.boom,
        four_b_three: gameInfo.four_b_three
    }
    for (let i = 0; i < peopleNumber; i++) {
        data[`playerid${i}`] = gameInfo[`player${i}id`]
        data[`player${i}Pai`] = []
        data[`player${i}outPai`] = []
    }
    // let paiNumber = 16
    if (gameInfo.fifty && gameInfo.fifty == 1) {
        // 15张牌
        for (let i = 0; i < 15 * peopleNumber; i++) {
            data[`player${i % peopleNumber}Pai`].push(paiDataXI[i])
        }
        data.unknownPai = paiDataXI.slice(15 * peopleNumber, paiDataXI.length)
    } else {
        for (let i = 0; i < 16 * peopleNumber; i++) {
            data[`player${i % peopleNumber}Pai`].push(paiDataXI[i])
        }
        data.unknownPai = paiDataXI.slice(16 * peopleNumber, paiDataXI.length)
    }
    let positionIndex = 0
    let first = gameInfo.first_spade && gameInfo.first_spade == 1 ? 37 : 25
    for (let i = 0; i < peopleNumber; i++) {
        if (data[`player${i}Pai`].indexOf(first) > -1) {
            positionIndex = i
            break
        }
    }
    data.positionIndex = positionIndex
    // 排序
    for (let i = 0; i < peopleNumber; i++) {
        data[`player${i}Pai`] = sortPuke(data[`player${i}Pai`])
    }
    return data
}

// 处理出牌
exports.removeChupaiDeck = (data, chupaiDeck) => {
    data.chuPai = chupaiDeck
    const positionIndex = data.positionIndex
    let playerDeck = data[`player${positionIndex}Pai`]
    data[`player${positionIndex}outPai`] = data[`player${positionIndex}outPai`].concat(chupaiDeck)
    chupaiDeck.forEach(item => {
        let index = playerDeck.indexOf(item)
        if (index > -1) {
            playerDeck.splice(index, 1)
        }
    })
    data[`player${positionIndex}Pai`] = playerDeck
    return data
}
// 判断其他玩家是否可以出牌
exports.nextPlayer = (data) => {
    const peopleNumber = data.peopleNumber
    const currentPositionIndex = data.positionIndex
    const boom = data.boom
    let gameType = 0
    let chupaiType = chuPaiType(data.chuPai, boom)
    if (chupaiType == 1) {
        // 单个
        let paiid = data.chuPai[0]
        // 出牌不是2
        if (paiid != 36) {
            let paiidhand = paiid % 12
            if (paiidhand == 0) {
                // 出牌等于A
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    if (data[`player${i}Pai`].indexOf(36) > -1) {
                        data.positionIndex = i
                        break
                    }
                }
            } else {
                // 当前出牌为其他
                let other = []
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = data[`player${i}Pai`]
                    for (let j = 0; j < playerDeck.length; j++) {
                        const item = playerDeck[j] % 12
                        if (item == 0 || item > paiidhand) {
                            // 0代表A 2
                            other.push(i)
                            break
                        }
                    }
                }
                if (other.length == 1) {
                    let side = (currentPositionIndex + 1) % peopleNumber
                    if (peopleNumber == 3 && side != other[0]) {
                        // 判断另外一个是否有炸弹
                        let playerDeck = pukepaiHand(data[`player${side}Pai`])
                        for (let i = 0; i < playerDeck.length; i++) {
                            const item = playerDeck[i]
                            let arr = playerDeck.filter(item)
                            if (arr.length >= 4 || (item == 1 && boom && boom == 1 && arr.length >= 3)) {
                                data.positionIndex = side
                                break
                            }
                        }
                        data.positionIndex = data.positionIndex != side ? other[0] : side
                    } else data.positionIndex = other[0]
                } else data.positionIndex = other.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            }
        }
        // 判断其他玩家有没有炸弹
        if (data.positionIndex == currentPositionIndex) {
            let bomb = []
            for (let i = 0; i < peopleNumber; i++) {
                if (i == data.positionIndex) continue
                let playerDeck = pukepaiHand(data[`player${i}Pai`])
                for (let j = 0; j < playerDeck.length; i++) {
                    const item = playerDeck[j]
                    let arr = playerDeck.filter(item)
                    if (arr.length >= 4 || (item == 1 && boom && boom == 1 && arr.length >= 3)) {
                        bomb.push(i)
                        break
                    }
                }
            }
            data.positionIndex = bomb.length == 1 ? bomb[0] :
                bomb.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
        }
    } else if (chuPaiType == 2) {
        gameType = 1
        // 对子
        let duizi = data.chuPai[0]
        let duizihand = duizi % 12
        let duiziOther = []
        // 不是对A
        if (duizihand != 0) {
            for (let i = 0; i < peopleNumber; i++) {
                if (i == data.positionIndex) continue
                let playerDeck = data[`player${i}Pai`]
                let newRepeat = []
                for (let j = 0; j < playerDeck.length; j++) {
                    const item = playerDeck[j] % 12
                    if (playerDeck[j] != 36) {
                        let arr = playerDeck.filter(fi => {
                            return fi % 12 == item
                        })
                        if (arr.length >= 2) newRepeat.push(item)
                    }
                }
                // 使用2个以上牌组
                newRepeat = Array.from(new Set(newRepeat))
                for (let j = 0; j < newRepeat.length; j++) {
                    const item = newRepeat[j];
                    if (item == 0 || item > duizihand) {
                        duiziOther.push(i)
                        break
                    }
                }
                if (duiziOther.length == 1) {
                    if (peopleNumber == 3 && (currentPositionIndex + 1) % peopleNumber != duiziOther[0]) {
                        // 判断另外一个是否有炸弹
                        let side = (currentPositionIndex + 1) % peopleNumber
                        let playerDeck = pukepaiHand(data[`player${side}Pai`])
                        for (let i = 0; i < playerDeck.length; i++) {
                            const item = playerDeck[i]
                            let arr = playerDeck.filter(item)
                            if (arr.length >= 4 || (item == 1 && boom && boom == 1 && arr.length >= 3)) {
                                data.positionIndex = side
                                break
                            }
                        }
                        data.positionIndex = data.positionIndex != side ? duiziOther[0] : side
                    } else data.positionIndex = duiziOther[0]
                } else duiziOther.length == 2 ?
                    (data.positionIndex + 1) % peopleNumber : data.positionIndex
            }
        }
        // 判断其他玩家有没有炸弹
        if (data.positionIndex == currentPositionIndex) {
            let bomb = []
            for (let i = 0; i < peopleNumber; i++) {
                if (i == data.positionIndex) continue
                let playerDeck = pukepaiHand(data[`player${i}Pai`])
                for (let j = 0; j < playerDeck.length; i++) {
                    const item = playerDeck[j]
                    let arr = playerDeck.filter(fi => fi == item)
                    if (arr.length >= 4 || (item == 1 && boom && boom == 1 && arr.length >= 3)) {
                        bomb.push(i)
                        break
                    }

                }
            }
            data.positionIndex = bomb.length == 1 ? bomb[0] :
                bomb.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
        }
    } else if (chuPaiType == 3) {
        gameType = 2
    } else if (chuPaiType == 4) {
        gameType = 2
        // 炸弹
        let zd = data.chuPai[0]
        let zdhand = zd % 12
        let zdOther = []
        for (let i = 0; i < peopleNumber; i++) {
            if (i == data.positionIndex) continue
            let playerDeck = data[`player${i}Pai`]
            let newRepeat = []
            for (let j = 0; j < playerDeck.length; j++) {
                if (playerDeck[j] == 36) continue
                const item = playerDeck[j] % 12
                let arr = playerDeck.filter(fi => {
                    return fi % 12 == item
                })
                if (arr.length >= 4 || (item == 0 && boom && boom == 1 && arr.length >= 3)) newRepeat.push(item)
            }
            // 炸弹
            newRepeat = Array.from(new Set(newRepeat))
            for (let j = 0; j < newRepeat.length; j++) {
                const item = newRepeat[j];
                if (item == 0 || item > zdhand) {
                    zdOther.push(i)
                    break
                }
            }
        }
        data.positionIndex = zdOther.length == 1 ? zdOther[0] :
            zdOther.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex

    } else {
        // 其他牌组情况
        let chupaiDeck = data.chuPai
        let newChuPaiDeck = pukepaiHand(chupaiDeck)
        if (chupaiDeck.length === 5) {
            let threeBeltTwoData = threeBeltTwo(newChuPaiDeck)
            if (threeBeltTwoData.return) {
                // 3带2
                gameType = 3
                let threeAndTwo = []
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    for (let j = 0; j < playerDeck.length; j++) {
                        if (playerDeck[j] == 36) continue
                        const item = playerDeck[j]
                        let arr = playerDeck.filter(fi => fi == item)
                        if ((arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) || // 炸弹
                            (arr.length >= 3 && threeBeltTwoData.paiid != 1 && (item == 1 || item > threeBeltTwoData.paiid) && playerDeck.length >= 5) // 3带2
                        ) {
                            threeAndTwo.push(i)
                            break
                        }
                    }
                }
                data.positionIndex = threeAndTwo.length == 1 ? threeAndTwo[0] :
                    threeAndTwo.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            } else {
                // 顺子
                gameType = 4
                let shunzi = []
                let maxAndMinShunzi = shunziMaxAndMin(newChuPaiDeck)
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    if (maxAndMinShunzi.max == 2) {
                        // 判断用户有炸弹没有
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) {
                                shunzi.push(i)
                                break
                            }
                        }
                    } else {
                        // 判断顺子和炸弹
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if ((arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) ||
                                (item > maxAndMinShunzi.min && shunziReasonable(playerDeck, 5, item))
                            ) {
                                shunzi.push(i)
                                break
                            }
                        }
                    }
                }
                data.positionIndex = shunzi.length == 1 ? shunzi[0] :
                    shunzi.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            }
        } else if (data.four_b_three && data.four_b_three == 1 && chupaiDeck.length == 7) {
            let fourBeltThreeData = fourBeltThree(newChuPaiDeck)
            if (fourBeltThreeData.return) {
                // 4带3
                gameType = 5
                let fourAndThree = []
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    for (let j = 0; j < playerDeck.length; j++) {
                        if (playerDeck[j] == 36) continue
                        const item = playerDeck[j]
                        let arr = playerDeck.filter(fi => fi == item)
                        if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1) ||
                            (arr.length >= 4 && item > fourBeltThreeData.paiid && playerDeck.length >= 7)
                        ) {
                            fourAndThree.push(i)
                            break
                        }
                    }
                }
                data.positionIndex = fourAndThree.length == 1 ? fourAndThree[0] :
                    fourAndThree.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            } else {
                // 顺子
                gameType = 4
                let shunzi = []
                let maxAndMinShunzi = shunziMaxAndMin(newChuPaiDeck)
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    if (maxAndMinShunzi.max == 2) {
                        // 判断用户有炸弹没有
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) {
                                shunzi.push(i)
                                break
                            }
                        }
                    } else {
                        // 判断顺子和炸弹
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if ((arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) ||
                                (item > maxAndMinShunzi.min && shunziReasonable(playerDeck, 7, item))
                            ) {
                                shunzi.push(i)
                                break
                            }
                        }
                    }
                }
            }
        } else if (chupaiDeck.length === 4) {
            // 连对
            gameType = 6
            newChuPaiDeck = newChuPaiDeck.sort(func)
            let liandui = []
            for (let i = 0; i < peopleNumber; i++) {
                if (i == data.positionIndex) continue
                let playerDeck = pukepaiHand(data[`player${i}Pai`])
                if (newChuPaiDeck[0] == 1) {
                    // 判断用户有炸弹没有-连对有对A
                    for (let j = 0; j < playerDeck.length; j++) {
                        const item = playerDeck[j]
                        let arr = playerDeck.filter(fi => fi == item)
                        if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) {
                            liandui.push(i)
                            break
                        }
                    }
                } else {
                    for (let j = 0; j < playerDeck.length; j++) {
                        const item = playerDeck[j]
                        let arr = playerDeck.filter(fi => fi == item)
                        if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1) ||
                            (item > newChuPaiDeck[0] && lianDuiWhetherItIsEstablished(playerDeck, 2, item))
                        ) {
                            liandui.push(i)
                            break
                        }
                    }
                }
            }
            data.positionIndex = liandui.length == 1 ? liandui[0] :
                liandui.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
        } else {
            // 判断飞机
            let specialJudgment = lianPaiAndAircraftAndShunzi(newChuPaiDeck)
            if (specialJudgment.return === 1) {
                // 普通飞机
                gameType = 7
                let feiji = []
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    if (specialJudgment.deck[0] == 1) {
                        // 判断用户有炸弹没有-连对有对A
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) {
                                feiji.push(i)
                                break
                            }
                        }
                    } else {
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1) ||
                                (item > specialJudgment[0] && feiJiWhetherItIsEstablished(playerDeck, specialJudgment.length, item))
                            ) {
                                feiji.push(i)
                                break
                            }
                        }
                    }
                }
                data.positionIndex = feiji.length == 1 ? feiji[0] :
                    feiji.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            } else if (specialJudgment.return === 2) {
                // 连对
                gameType = 6
                let liandui = []
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    if (specialJudgment.deck[0] == 1) {
                        // 判断用户有炸弹没有-连对有对A
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) {
                                liandui.push(i)
                                break
                            }
                        }
                    } else {
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1) ||
                                (item > specialJudgment[0] && lianDuiWhetherItIsEstablished(playerDeck, specialJudgment.length, item))
                            ) {
                                liandui.push(i)
                                break
                            }
                        }
                    }
                }
                data.positionIndex = liandui.length == 1 ? liandui[0] :
                    liandui.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            } else if (specialJudgment.return === 3) {
                // 判断飞机4带3飞机
                gameType = 7
                let feijiFour = []
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    if (specialJudgment.deck[0] == 1) {
                        // 判断用户有炸弹没有-连对有对A
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) {
                                feijiFour.push(i)
                                break
                            }
                        }
                    } else {
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1) ||
                                (item > specialJudgment[0] && feiJiFourWhetherItIsEstablished(playerDeck, specialJudgment.length, item))
                            ) {
                                feijiFour.push(i)
                                break
                            }
                        }
                    }
                }
                data.positionIndex = feijiFour.length == 1 ? feijiFour[0] :
                    feijiFour.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            } else {
                // 顺子
                gameType = 4
                let shunzi = []
                let maxAndMinShunzi = shunziMaxAndMin(newChuPaiDeck)
                for (let i = 0; i < peopleNumber; i++) {
                    if (i == data.positionIndex) continue
                    let playerDeck = pukepaiHand(data[`player${i}Pai`])
                    if (maxAndMinShunzi.max == 2) {
                        // 判断用户有炸弹没有
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if (arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) {
                                shunzi.push(i)
                                break
                            }
                        }
                    } else {
                        // 判断顺子和炸弹
                        for (let j = 0; j < playerDeck.length; j++) {
                            const item = playerDeck[j]
                            let arr = playerDeck.filter(fi => fi == item)
                            if ((arr.length >= 4 || (arr.length >= 3 && item == 1 && boom && boom == 1)) ||
                                (item > maxAndMinShunzi.min && shunziReasonable(playerDeck, newChuPaiDeck.length, item))
                            ) {
                                shunzi.push(i)
                                break
                            }
                        }
                    }
                }
                data.positionIndex = shunzi.length == 1 ? shunzi[0] :
                    shunzi.length == 2 ? (data.positionIndex + 1) % peopleNumber : data.positionIndex
            }
        }
    }
    return { gameInfo: data, type: gameType }
}
// 当前玩家出牌类型
const chuPaiType = (data, boom) => {
    // 1-单牌 2-对子 3-3A炸弹 4普通炸弹
    let length = data.length
    if (length === 1) return 1
    if (length === 2) return 2
    if (length === 3 && boom && boom == 1) return 3
    if (length === 4 && data[0] % 12 == data[1] % 12 && data[1] % 12 == data[2] % 12 && data[2] % 12 == data[3] % 12) return 4
    return 5
}
// 转换为扑克类型
const pukepaiHand = (data) => {
    // return 1
    let newdeck = []
    data.forEach(item => {
        if (item == 36) newdeck.push(2)
        else {
            let hand = item % 12
            newdeck.push(hand == 0 ? 1 : hand + 2)
        }
    })
    return newdeck.sort(func)
}
// 判断是否是3带2
const threeBeltTwo = (data) => {
    let returnData = {
        return: false,
        paiid: null
    }
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        let filter = data.filter(fi => fi == item)
        if (filter.length >= 3) {
            returnData.return = true
            returnData.paiid = item
            break
        }
    }
    return returnData
}
// 顺子最高值和最低值
const shunziMaxAndMin = (data) => {
    let max, min = null
    if (data.find(item => item == 1)) {
        max = data.find(item => item == 2) ? 2 : 1
    }
    data = data.sort(func)
    min = max ? data[max] : max[0]
    max = max || data[data.length - 1]
    return { max, min }
}
// 判断有没有其他顺子成立
const shunziReasonable = (data, number, first) => {
    let arr = []
    for (let i = 1; i <= number; i++) {
        arr.push(first + i)
    }
    // 超出扑克限制
    if (arr.indexOf(16) > -1) return false
    // 转换1 2
    let one = arr.indexOf(14)
    let two = arr.indexOf(15)
    if (one > -1) arr.splice(one, 1, 1)
    if (two > -1) arr.splice(two, 1, 2)
    let find = getInclude(data, arr)
    return find.length == arr.length
}
const getInclude = (arr1, arr2) => {
    let temp = []
    for (const item of arr2) {
        arr1.find(i => i === item) ? temp.push(item) : ''
    }
    return temp
}
// 是否是4带3
const fourBeltThree = (data) => {
    let returnData = {
        return: false,
        paiid: null
    }
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        let filter = data.filter(fi => fi == item)
        if (filter.length >= 4) {
            returnData.return = true
            returnData.paiid = item
            break
        }
    }
    return returnData
}
// 判断连对、飞机、顺子
const lianPaiAndAircraftAndShunzi = (data, four_b_three) => {
    const length = data.length
    // 默认顺子
    let returnData = {
        return: 0,// 0顺子 1普通飞机 2连对 3特殊飞机
        deck: []// 牌组
    }
    if (length % 5 == 0) {
        // 判断飞机3带2
        data.forEach(item => {
            let arr = data.filter(fi => fi == item)
            if (arr.length === 3 && returnData.deck.indexOf(item) == -1) {
                returnData.deck.push(item)
            }
        })
        if (returnData.deck.length > 0) {
            returnData.deck = returnData.deck.sort(func)
            returnData.return = 1
        }
    } else if (length % 2 == 0) {
        // 判断连对
        data.forEach(item => {
            let arr = data.filter(fi => fi == item)
            if (arr.length === 2 && returnData.deck.indexOf(item) == -1) {
                returnData.deck.push(item)
            }
        })
        if (returnData.deck.length > 0) {
            returnData.deck = returnData.deck.sort(func)
            returnData.return = 2
        }
    } else if (four_b_three && four_b_three == 1 && length % 7 == 0) {
        // 判断飞机4带3
        data.forEach(item => {
            let arr = data.filter(fi => fi == item)
            if (arr.length === 4 && returnData.deck.indexOf(item) == -1) {
                returnData.deck.push(item)
            }
        })
        if (returnData.deck.length > 0) {
            returnData.deck = returnData.deck.sort(func)
            returnData.return = 3
        }
    }
    return returnData
}
// 判断有没有其他连对成立
const lianDuiWhetherItIsEstablished = (data, length, item) => {
    let arr = []
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < length; j++) {
            let number = item + j
            arr.push(number == 14 ? 1 : number)
        }
    }
    arr = arr.sort(func)
    if (arr.indexOf(15) > -1) return false
    return arr.length === getInclude(data, arr).length
}
// 判断有没有其他飞机成立-3带2
const feiJiWhetherItIsEstablished = (data, length, item) => {
    let arr = []
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < length; j++) {
            let number = item + j
            arr.push(number == 14 ? 1 : number)
        }
    }
    arr = arr.sort(func)
    if (arr.indexOf(15) > -1) return false
    return arr.length === getInclude(data, arr).length && data.length >= (arr.length + length * 2)
}
// 判断有没有其他飞机成立-4带3
const feiJiFourWhetherItIsEstablished = (data, length, item) => {
    let arr = []
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < length; j++) {
            let number = item + j
            arr.push(number == 14 ? 1 : number)
        }
    }
    arr = arr.sort(func)
    if (arr.indexOf(15) > -1) return false
    return arr.length === getInclude(data, arr).length && data.length >= (arr.length + length * 3)
}

// 抓鸟判断翻倍
exports.grabBird = (shoupai, outpai) => {
    // 黑桃10-44
    let arr = shoupai.concat(outpai)
    return arr.indexOf(44) > -1
}