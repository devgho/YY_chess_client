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

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

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

    game_update(data) {
        if(uglobal.game.positionIndex == uglobal.room.position){
            cc.find("Canvas/hit_tips").active = true;
        }else{
            cc.find("Canvas/hit_tips").active = false;
        }
        if(cc.find("Canvas/seats/me/holds/0").children.length>0)
            return;
        let holds = eval("data.player" + uglobal.room.position + "Pai");
        cc.loader.loadRes("prefabs/card", cc.Prefab, (err, pf) => {
            if (err) {
                console.debug(err);
                return;
            }
            for (let i in holds){
                for(let j in holds[i]){
                    let new_node = cc.instantiate(pf);
                    new_node.getComponent("card").cardId = holds[i][j];
                    new_node.parent = cc.find("Canvas/seats/me/holds/"+i);
                    new_node.x = 0;
                    if(j=="0")
                        new_node.y = -85;
                    if(j=="1"){
                        new_node.y = 0;
                    }
                    if(j=="2"){
                        new_node.y = 85;
                    }
                    if(j=="3"){
                        new_node.y = 170;
                        new_node.parent.opacity = 150;
                        cc.find("Canvas/seats/me/holds/"+i).opacity =150;
                    }
                }
            }
        })
    }

    hit_out(cardId){
        this.gameNet.send("zipai_chupai",{gameid:this.gameData.gameid,chupaiid:cardId});
    }
    zipai_operation(operationType:number, deck:Array<Array<Number>>){
        this.gameNet.send("zipai_operation",{
            gameid:this.gameData.gameid,
            operationType,
            deck
        });
    }
    


    initHandler() {
        this.gameNet.addHandler("err_game_result", (data) => {
            console.log("出错了" + data);
        });
        this.gameNet.addHandler("game_room_ok", data => {
            console.debug(data);
            cc.find("Canvas/seats/me/holds").active = true;
            for (let i of cc.find("Canvas/seats").children){ //隐藏准备
                i.getChildByName("Z_zhunbeizhuangt").active = false;
            }
            if (uglobal.room.landlord) {
                this.gameNet.send("zipai_fapai_init", this.gameData.gameid);
            }
        });
        this.gameNet.addHandler("action_animation", data => {
            console.debug("动画事件");
            console.debug(data);
        });
        this.gameNet.addHandler("zipai_update_data", data => {
            console.debug("更新字牌牌组");
            console.debug(data);
        });
        this.gameNet.addHandler("zipai_next_chupai", data => {
            uglobal.game = data.data;
            this.game_update(data.data);
        });
        this.gameNet.addHandler("zipai_operation_all", data => {
            cc.find("Canvas/hit_tips").active = false;
            uglobal.game.positionIndex = 1000;
            let operation = eval("data.data.operation.player"+uglobal.room.position);
            if(operation){
                console.debug(operation);
                cc.find("Canvas/operate").active = true;
                if(operation.hu)
                    cc.find("Canvas/operate/hu").active = true;
                if(operation.peng)
                    cc.find("Canvas/operate/peng").active = true;
                if(operation.chi)
                    cc.find("Canvas/operate/chi").active = true;
            }
        });
        
    }
    // update (dt) {}
}
