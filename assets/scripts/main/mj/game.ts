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

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

    }

    connectGame(gameData,onSucc?: Function, onFail?: Function) {
        const onSuccess = () => {
            this.initHandler()
        
            const data = {
                gameid:gameData.gameid,
                userid:uglobal.user.userid
            }

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

    initHandler() {
        this.gameNet.addHandler("err_game_result",(data)=>{
            console.log("出错了"+data);
        });
        this.gameNet.addHandler("game_room_ok",data=>{
            console.log(data);
        })
    }
    // update (dt) {}
}
