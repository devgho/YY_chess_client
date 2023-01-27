// 手牌排序
function func(a, b) {
    return a - b;
}
// 字牌三位排序
exports.zipaiSort = (data) => {
    let newData = []
    let dobule = []
    data.forEach(item => {
        if (item.toString().length == 2) dobule.push(item)
        newData.push(item % 10)
    })
    newData.sort(func)
    dobule.forEach(item => {
        let index = newData.indexOf(item % 10)
        newData[index] = item
    })
    return newData
}
// 字牌翻倍
exports.huziDouble = (data) => {
    let magnification = 1
    if (data == 10) return 3
    if (data == 20) return 5
    if (data >= 11 && data <= 15) magnification++
    else if (data >= 16 && data <= 19) magnification += 2
    else if(data>=21) magnification = parseInt((data - 21) / 3) + 4
    else return 1
    return magnification
}