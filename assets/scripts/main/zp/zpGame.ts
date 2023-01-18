// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;
import Net from "../../common/net";

@ccclass
export default class NewClass extends cc.Component {

    gameNet: Net = new Net();
    gameData: {
        gameid: number,
        gameip: string,
        text: string,
        [propName: string]: any
    };
    seats:{
        [propName: string]:any
    }={};

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {
        let all_seats = cc.find("Canvas/seats").children;
        let now_pos = uglobal.room.position;
        for (let i of all_seats){
            if(now_pos >= uglobal.room.num_of_people)
                now_pos = 0;
            this.seats[now_pos] = i.name;
            now_pos++;
        }
    }

    test() {
        this.gameNet.close();
    }

    connectGame(gameData, onSucc?: Function, onFail?: Function) {
        const onSuccess = () => {
            this.initHandler()

            const data = {
                gameid: gameData.gameid,
                userid: uglobal.user.userid
            }

            this.gameData = gameData;
            this.gameNet.send("join_game", data);

            if (onSucc) {
                onSucc();
            }
        }
        const onFailed = () => {
            if (onFail) {
                onFail();
            }
        }
        this.gameNet.connect(gameData.gameip, onSuccess, onFailed);
    }

    game_update() {     //data = gameinfo
        console.debug("手牌更新");
        let holds = eval("uglobal.game.player" + uglobal.room.position + "Pai");
        if (uglobal.game.positionIndex == uglobal.room.position) {
            cc.find("Canvas/hit_tips").active = true;
        } else {
            cc.find("Canvas/hit_tips").active = false;
        }
        if (cc.find("Canvas/seats/me/holds/0").children.length > 0) {
            /* 判断从手牌哪个位置开始更新 */
            let holds_children = cc.find("Canvas/seats/me/holds").children;
            let start_index: number;
            for (let i=0; i < holds_children.length; i++) {
                if (holds_children[i].children.length > 0) {
                    start_index = i;
                    break;
                }
            }
            /* 清除所有手牌 */
            for(let i of holds_children){
                i.removeAllChildren();
            }
            /* 刷新手牌 */
            for(let i=0; i<holds.length;i++){
                cc.loader.loadRes("prefabs/card", cc.Prefab, (err, pf) => {
                    if (err) {
                        console.debug(err);
                        return;
                    }
                    for(let j in holds[i]){
                        let new_node = cc.instantiate(pf);
                        new_node.getComponent("card").cardId = holds[i][j];
                        new_node.parent = holds_children[start_index+i];
                        new_node.x = 0;
                        if (j == "0")
                            new_node.y = -85;
                        if (j == "1") {
                            new_node.y = 0;
                        }
                        if (j == "2") {
                            new_node.y = 85;
                        }
                        if (j == "3") {
                            new_node.y = 170;
                            new_node.parent.opacity = 150;
                            cc.find("Canvas/seats/me/holds/" + i).opacity = 150;
                        }
                    }
                });
            }

            return;
        }


        cc.loader.loadRes("prefabs/card", cc.Prefab, (err, pf) => {
            if (err) {
                console.debug(err);
                return;
            }
            for (let i in holds) {
                for (let j in holds[i]) {
                    let new_node = cc.instantiate(pf);
                    new_node.getComponent("card").cardId = holds[i][j];
                    new_node.parent = cc.find("Canvas/seats/me/holds/" + i);
                    new_node.x = 0;
                    if (j == "0")
                        new_node.y = -85;
                    if (j == "1") {
                        new_node.y = 0;
                    }
                    if (j == "2") {
                        new_node.y = 85;
                    }
                    if (j == "3") {
                        new_node.y = 170;
                        new_node.parent.opacity = 150;
                        cc.find("Canvas/seats/me/holds/" + i).opacity = 150;
                    }
                }
            }
        })
    }

    update_holds(deck) {
        console.debug(deck);
        const data = {
            deck,
            gameid:this.gameData.gameid,
            position:uglobal.room.position
        }
        this.gameNet.send("zipai_update_deck", data);
    }

    hit_out(cardId) {
        this.gameNet.send("zipai_chupai", { gameid: this.gameData.gameid, chupaiid: cardId });
    }
    zipai_operation(operationType: number, deck?: Array<Array<Number>>) {
        if (!deck) {
            this.gameNet.send("zipai_operation", {
                gameid: this.gameData.gameid,
                operationType
            });
            return;
        }
        this.gameNet.send("zipai_operation", {
            gameid: this.gameData.gameid,
            operationType,
            deck
        });
    }

    initHandler() {
        this.start();//初始化
        /* 通用错误事件 */
        this.gameNet.addHandler("err_game_result", (data) => {
            console.log("出错了" + data);
        });

        /* 所有人准备完毕 */
        this.gameNet.addHandler("game_room_ok", data => {
            console.debug(data);
            cc.find("Canvas/seats/me/holds").active = true;
            for (let i of cc.find("Canvas/seats").children) { //隐藏准备
                i.getChildByName("Z_zhunbeizhuangt").active = false;
            }
            if (uglobal.room.landlord) {
                this.gameNet.send("zipai_fapai_init", this.gameData.gameid);
            }
        });

        this.gameNet.addHandler("action_animation", data => {
            console.debug("动画事件");
            console.debug(data);
            if (data.type == 0)
                return;

            cc.loader.loadRes("textures/mix/zipai_mix", cc.SpriteAtlas, (err, sa) => {
                if (err) {
                    console.debug(err);
                    return;
                }

                if (uglobal.room.position == data.positionIndex) {    //如果是自己的话
                    cc.loader.loadRes("prefabs/out_group", cc.Prefab, (err, pf) => {
                        if (err) {
                            console.debug(err);
                            return;
                        }
                        let card_group_instant = cc.instantiate(pf);
                        card_group_instant.getComponent("card_group").group = data.deck;
                        card_group_instant.setParent(cc.find("Canvas/left_panel"));
                    })
                }


                /* 播放动画 */
                let anim_component = cc.find("Canvas/ope_action");
                switch (data.type) {
                    case 1:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("zti_room");
                        break;
                    case 2:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("")
                        break;
                    case 3:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("")
                        break;
                    case 4:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("zpeng_room")
                        break;
                    case 5:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("zchi_room");
                        break;
                    case 6:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("")
                        break;
                    case 7:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("")
                        break;
                    case 8:
                        anim_component.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame("")
                        break;
                }
                anim_component.active = true;
                anim_component.getComponent(cc.Animation).play();
                setTimeout(() => {            //0.5秒后关了动画
                    anim_component.active = false;
                }, 500);
            })
        });
        this.gameNet.addHandler("zipai_player_chupai", pai => {
            cc.loader.loadRes("textures/mix/zipai_long", cc.SpriteAtlas, (err, sa) => {
                if (err) {
                    console.debug(err);
                    return;
                }
                cc.find("Canvas/now").getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(pai);
                cc.find("Canvas/now").active = true;
                let action;
                console.debug(uglobal.game);
                console.debug(this.seats[uglobal.game.positionIndex]);
                if(this.seats[uglobal.game.positionIndex] == "me"){
                    action=cc.moveBy(.2,0,-80);
                }else if(this.seats[uglobal.game.positionIndex] == "left"){
                    action=cc.moveBy(.2,-80,0);
                }else if(this.seats[uglobal.game.positionIndex] == "right"){
                    action=cc.moveBy(.2,80,0);
                }
                cc.find("Canvas/now").runAction(action);
            })
        });
        this.gameNet.addHandler("zipai_update_data", data => {
            console.debug("更新字牌牌组");
            console.debug(data);
        });
        this.gameNet.addHandler("zipai_next_chupai", data => {
            console.debug("下一个出牌");
            console.debug(data);
            uglobal.game = data.data;
            this.game_update();
        });
        this.gameNet.addHandler("zipai_next_mopai", data => {
            console.debug(data);
            uglobal.game = data.data.gameInfo;
            this.game_update();
            cc.loader.loadRes("textures/mix/zipai_long",cc.SpriteAtlas,(err,sa)=>{
                if(err){
                    console.debug(err);
                    return;
                }
                cc.find("Canvas/now").getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(data.data.paiid);
            })
            this.gameNet.send("zipai_mopai",this.gameData.gameid);
        });
        
        this.gameNet.addHandler("zipai_operation_all", data => {
            console.debug(data);

            cc.find("Canvas/hit_tips").active = false;
            let operation = eval("data.data.operation.player" + uglobal.room.position);
            if (operation) {
                console.debug(operation);
                cc.find("Canvas/operate").active = true;
                if (operation.hu)
                    cc.find("Canvas/operate/hu").active = true;
                if (operation.peng)
                    cc.find("Canvas/operate/peng").active = true;
                if (operation.chi) {
                    cc.find("Canvas/operate/chi").active = true;
                    cc.loader.loadRes("prefabs/card_group", cc.Prefab, (err, pf) => {
                        if (err) {
                            console.debug(err);
                            return;
                        }
                        for (let i of operation.chi) {
                            let card_group_instant = cc.instantiate(pf);
                            card_group_instant.getComponent("card_group").group = i;
                            card_group_instant.parent = cc.find("Canvas/operate/chi/chi_frame/card_groups");

                            card_group_instant.on(cc.Node.EventType.TOUCH_END, () => {
                                console.debug("你点击了这个" + i);
                                this.zipai_operation(2, i);
                                card_group_instant.parent.removeAllChildren();//恢复初始状态
                                let ope_panel = cc.find("Canvas/operate");//开始隐藏
                                ope_panel.getChildByName("chi").getChildByName("chi_frame").active = false;
                                ope_panel.getChildByName("chi").active = false;
                                ope_panel.getChildByName("peng").active = false;
                                ope_panel.getChildByName("hu").active = false;
                                ope_panel.active = false;
                            });
                        }
                    })
                }
            }
        });

    }
    // update (dt) {}
}
