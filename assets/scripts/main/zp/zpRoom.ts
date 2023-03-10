// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;
import Room from "../../common/Room";
import Game from "./zpGame";

@ccclass
export default class NewClass extends cc.Component {

    room: Room = new Room();
    game: Game = new Game();

    // LIFE-CYCLE CALLBACKS:

    onLoad() {
        if (!uglobal.room.roomip) {
            uglobal.alert("您没有加入任何房间！", () => {
                cc.director.loadScene("hall");
            })
        }
    }
    
    test(){
        this.room.test();
    }

    start() {
        // cc.loader.loadRes("prefabs/0",cc.Prefab,(err,pf)=>{
        //     for (let i=0; i<9 ; i++){
        //         let new_node = cc.instantiate(pf);
        //         new_node.getComponent("card").cardId = i;
        //         new_node.parent = cc.find("Canvas/holds/"+i);
        //         new_node.y = -95;
        //         new_node.x = 0;
        //     }
        // })
        cc.find("Canvas/roomid").getComponent(cc.Label).string += uglobal.room.roomid;
        this.room.connectRoom();
        if (uglobal.room.num_of_people == 2) {
            cc.find("Canvas/seats/left").destroy();
        }
        if (uglobal.room.landlord) {
            cc.find("Canvas/btn_ready").destroy();
            cc.find("Canvas/btn_back_sala").destroy();
        } else {
            cc.find("Canvas/btn_dismiss_room").destroy();
        }
    }

    hit_out(cardId) {
        console.debug("当前玩家出牌" + cardId);
        this.game.hit_out(cardId);
    }

    prepare() {
        this.room.prepare();
        cc.find("Canvas/btn_ready").destroy();
    }

    operate(event: cc.Event, type: number) {    //0过 1碰 2吃 3胡
        let operate_cpnt = cc.find("Canvas/operate");
        if (type == 2) {
            operate_cpnt.getChildByName("chi").getChildByName("chi_frame").active = true;
            return;
        }
        this.game.zipai_operation(type);
        operate_cpnt.getChildByName("chi").getChildByName("chi_frame").active = false;
        operate_cpnt.getChildByName("peng").active = false;
        operate_cpnt.getChildByName("hu").active = false;
        operate_cpnt.active = false;
    }

    update_holds() {
        let holds_col = cc.find("Canvas/seats/me/holds").children;
        let all_holds = [];
        for (let item of holds_col) {
            if (item.children.length <= 0)
                continue;
            let temp_card_arr = [];
            for (let card of item.children) {
                temp_card_arr.push(card.getComponent("card").cardId);
            }
            all_holds.push(temp_card_arr);
        }
        this.game.update_holds(all_holds);
    }

    out_room() {
        uglobal.alert("确定离开房间吗?", () => {
            console.log("已经离开房间");
            this.room.out_room();
        })
    }

    disband_room() {
        uglobal.alert("确定要解散房间吗?", () => {
            console.log("正在解散房间");
            this.room.disband_room();
        })
    }

    game_start(data) {
        this.game.connectGame(data);
    }

    // update (dt) {}
}
