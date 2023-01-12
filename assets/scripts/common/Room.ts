// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;
import Net from "./net";

@ccclass
export default class NewClass extends cc.Component {

    roomNet: Net = new Net();

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

    }

    connectRoom(onSucc?: Function, onFail?: Function) {
        const onSuccess = () => {
            this.initHandler()

            this.roomNet.send("reconnection_room", uglobal.room.roomid);

            if (onSucc) {
                onSucc();
            }
        }
        const onFailed = () => {
            if (onFail) {
                onFail();
            }
        }
        this.roomNet.connect(uglobal.room.roomip, onSuccess, onFailed);
    }

    prepare() {
        this.roomNet.send("prepare_player", { userid: uglobal.user.userid, roomid: uglobal.room.roomid, prepare: 1 });
    }

    disband_room() {
        this.roomNet.send("disband_room", uglobal.room.roomid);
    }

    out_room() {
        this.roomNet.send("out_room", { roomid: uglobal.room.roomid, userid: uglobal.user.userid });
    }

    initHandler() {
        this.roomNet.addHandler("room_result", (data) => {
            console.debug(data);
            uglobal.room.data = data.data;
            const all_seat = cc.find("Canvas/seats").children;
            let position = uglobal.room.position;
            for (let i of all_seat) {
                let name = eval("data.data.user_name" + position);
                if (name) { //判断有无此人
                    let score = eval("data.data.user_score" + position);
                    let head_url = eval("data.data.user_icon" + position);
                    let label = i.getComponentsInChildren(cc.Label);
                    label[0].string = name;
                    label[1].string = score;
                    cc.loader.load(head_url, (err, sp) => {
                        if (err) {
                            console.log(err);
                            return
                        }
                        i.getComponentInChildren(cc.Sprite).spriteFrame = new cc.SpriteFrame(sp);
                    })
                    let state = eval("data.data.user_state" + position);
                    if (state == 1) {
                        i.getChildByName("Z_zhunbeizhuangt").active = true;
                        if (position == uglobal.room.position)
                            if (cc.find("Canvas/btn_ready"))
                                cc.find("Canvas/btn_ready").destroy();
                    }
                } else {
                    let label = i.getComponentsInChildren(cc.Label);
                    label[0].string = "";
                    label[1].string = "";
                    i.getChildByName("Z_zhunbeizhuangt").active = false;
                    cc.loader.loadRes("textures/png/Z_nobody", (err, sp) => {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        i.getComponentInChildren(cc.Sprite).spriteFrame = new cc.SpriteFrame(sp);
                    });
                }
                position++;
                if (position == uglobal.room.num_of_people)
                    position = 0;
            }
        });

        this.roomNet.addHandler("playing_result", (data) => {
            console.log(data);
        });

        this.roomNet.addHandler("game_start", (data) => {
            if (cc.find("Canvas/btn_dismiss_room"))
                cc.find("Canvas/btn_dismiss_room").destroy();
            if (cc.find("Canvas/btn_back_sala")) {
                cc.find("Canvas/btn_back_sala").destroy();
            }
            console.log(uglobal.room.type);
            if (uglobal.room.type == 1) {
                cc.find("Canvas").getComponent("mjRoom").game_start(data.data);
            } else if (uglobal.room.type == 2) {
                cc.find("Canvas").getComponent("zpRoom").game_start(data.data);
            } else if (uglobal.room.type == 3) {
                cc.find("Canvas").getComponent("pdkRoom").game_start(data.data);
            }
        });

        this.roomNet.addHandler("leave_room", (data) => {
            if (data.status == 0) {
                uglobal.room = null;
                this.roomNet.close();
                cc.director.loadScene("hall");
            }else{
                uglobal.alert(data.message);
            }
        });
    }


    // update (dt) {}
}
