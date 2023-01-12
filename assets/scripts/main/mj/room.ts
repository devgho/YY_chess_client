// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;
import Room from "../../common/Room";
import Game from "./game";

@ccclass
export default class NewClass extends cc.Component {

    room:Room = new Room();
    game:Game = new Game();
    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        if(!uglobal.room.roomip){
            uglobal.alert("您没有加入任何房间！",()=>{
                cc.director.loadScene("hall");
            })
        }
        cc.find("Canvas/roomid").getComponent(cc.Label).string += uglobal.room.roomid;
        this.room.connectRoom();
        if(uglobal.room.num_of_people == 2){
            cc.find("Canvas/seats/left").destroy();   
        }
        if(uglobal.room.landlord){
            cc.find("Canvas/btn_ready").destroy();
            cc.find("Canvas/btn_back_sala").destroy();
        }else{
            cc.find("Canvas/btn_dismiss_room").destroy();
        }
    }

    start () {
        cc.loader.loadRes("prefabs/0",cc.Prefab,(err,pf)=>{
            for (let i=0; i<9 ; i++){
                let new_node = cc.instantiate(pf);
                new_node.getComponent("card").cardId = i;
                new_node.parent = cc.find("Canvas/holds/"+i);
                new_node.y = -95;
                new_node.x = 0;
            }
        })
    }

    prepare(){
        this.room.prepare();
        cc.find("Canvas/btn_ready").destroy();
    }

    out_room(){
        uglobal.alert("确定离开房间吗?",()=>{
            console.log("已经离开房间");
            this.room.out_room();
        })
    }

    disband_room(){
        uglobal.alert("确定要解散房间吗?",()=>{
            console.log("正在解散房间");
            this.room.disband_room();
        })
    }

    game_start(data){
        console.log(data);
        this.game.connectGame(data);
    }

    // update (dt) {}
}
