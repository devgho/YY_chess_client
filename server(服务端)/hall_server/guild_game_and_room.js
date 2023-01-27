const guildRoomRuleInsert = () => {
    return {
        majiang: [
            { guild: 1, ghost: 1, guipaiid: 27 },
            { guild: 1, ghost: 1, guipaiid: Math.floor(Math.random() * 27) },
        ],
        paodeikuai: [
            { guild: 1, boom: 1, first_spade: 1, grab_bird: 1, four_b_three: 1, fifty: 0 },
            { guild: 1, boom: 1, first_spade: 1, grab_bird: 1, four_b_three: 1, fifty: 1 }
        ],
        zipai: [
            { guild: 1, wu_hu: 0, one_ho: 0 },
            { guild: 1, wu_hu: 1, one_ho: 0 },
        ]
    }
}
const guildRoomRule = () => {
    return {
        majiang: [
            { type: 0, num_of_turns: 8, title: "红中鬼麻将", tili: 10, threshold: 40, end: 20, brief_introduction: "10体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "红中鬼麻将", tili: 20, threshold: 80, end: 35, brief_introduction: "20体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "红中鬼麻将", tili: 30, threshold: 150, end: 65, brief_introduction: "30体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "红中鬼麻将", tili: 50, threshold: 200, end: 120, brief_introduction: "50体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "红中鬼麻将", tili: 100, threshold: 400, end: 200, brief_introduction: "100体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "鬼麻将", tili: 10, threshold: 40, end: 20, brief_introduction: "10体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "鬼麻将", tili: 20, threshold: 80, end: 35, brief_introduction: "20体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "鬼麻将", tili: 30, threshold: 150, end: 65, brief_introduction: "30体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "鬼麻将", tili: 50, threshold: 200, end: 120, brief_introduction: "50体力 8局", fixed_room: 0 },
            { type: 0, num_of_turns: 8, title: "鬼麻将", tili: 100, threshold: 400, end: 200, brief_introduction: "100体力 8局", fixed_room: 0 },
        ],
        paodeikuai: [
            { type: 1, num_of_turns: 10, title: "跑得快", tili: 10, threshold: 40, end: 20, brief_introduction: "10体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快", tili: 20, threshold: 80, end: 35, brief_introduction: "20体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快", tili: 30, threshold: 150, end: 65, brief_introduction: "30体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快", tili: 50, threshold: 200, end: 120, brief_introduction: "50体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快", tili: 100, threshold: 400, end: 200, brief_introduction: "100体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快(15张)", tili: 10, threshold: 40, end: 20, brief_introduction: "10体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快(15张)", tili: 20, threshold: 80, end: 35, brief_introduction: "20体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快(15张)", tili: 30, threshold: 150, end: 65, brief_introduction: "30体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快(15张)", tili: 50, threshold: 200, end: 120, brief_introduction: "50体力 8局", fixed_room: 0 },
            { type: 1, num_of_turns: 10, title: "跑得快(15张)", tili: 100, threshold: 400, end: 200, brief_introduction: "100体力 8局", fixed_room: 0 },
        ],
        zipai: [
            { type: 2, num_of_turns: 8, title: "字牌", tili: 10, threshold: 40, end: 20, brief_introduction: "10体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌", tili: 20, threshold: 80, end: 35, brief_introduction: "20体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌", tili: 30, threshold: 150, end: 65, brief_introduction: "30体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌", tili: 50, threshold: 200, end: 120, brief_introduction: "50体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌", tili: 100, threshold: 400, end: 200, brief_introduction: "100体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌(不带无胡)", tili: 10, threshold: 40, end: 20, brief_introduction: "10体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌(不带无胡)", tili: 20, threshold: 80, end: 35, brief_introduction: "20体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌(不带无胡)", tili: 30, threshold: 150, end: 65, brief_introduction: "30体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌(不带无胡)", tili: 50, threshold: 200, end: 120, brief_introduction: "50体力 8局", fixed_room: 0 },
            { type: 2, num_of_turns: 8, title: "字牌(不带无胡)", tili: 100, threshold: 400, end: 200, brief_introduction: "100体力 8局", fixed_room: 0 },
        ]
    }
}
exports.getGameInsertRule = (gameType, ruleType) => {
    gameType = parseInt(gameType)
    ruleType = parseInt(ruleType)
    let insertRule = null
    const guildRoomRuleInsertAll = guildRoomRuleInsert()
    switch (gameType) {
        case 0:
            guildRoomRule = guildRoomRuleInsertAll.majiang
            insertRule = ruleType < 5 ? guildRoomRule[0] : guildRoomRule[1]
            break;
        case 1:
            guildRoomRule = guildRoomRuleInsertAll.paodeikuai
            insertRule = ruleType < 5 ? guildRoomRule[0] : guildRoomRule[1]
            break;
        case 2:
            guildRoomRule = guildRoomRuleInsertAll.zipai
            insertRule = ruleType < 5 ? guildRoomRule[0] : guildRoomRule[1]
            break;
        default:
            break;
    }
    return insertRule
}

exports.getGuildRoomRule = (gameType, ruleType) => {
    gameType = parseInt(gameType)
    ruleType = parseInt(ruleType)
    let guildRoomAndRule = null
    const guildRoomRuleAll = guildRoomRule()
    switch (gameType) {
        case 0:
            guildRoomAndRule = guildRoomRuleAll.majiang[ruleType]
            break;
        case 1:
            guildRoomAndRule = guildRoomRuleAll.paodeikuai[ruleType]
            break;
        case 2:
            guildRoomAndRule = guildRoomRuleAll.zipai[ruleType]
            break;
        default:
            break;
    }
    return guildRoomAndRule
}

exports.mergeInsertCondition = (insertSql, rulesql) => {
    let obj = insertSql
    for (const key in rulesql) {
        const item = rulesql[key];
        obj[key] = item
    }
    return obj
}