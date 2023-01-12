// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;

    @property
    text: string = 'hello';

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start () {
        if(uglobal.room){
                if(uglobal.room.type == 0){
                    cc.director.loadScene("mj_room");
                }
                if(uglobal.room.type == 1){
                    cc.director.loadScene("pdk_room");
                }
                if(uglobal.room.type == 2){
                    cc.director.loadScene("zp_room");
                }
        }
        this.refresh_info();
    }

    refresh_info(){
        cc.loader.load(uglobal.user.headimg,function(err,sp){
            if(err){
                uglobal.alert(err);
                return;
            }
            cc.find("Canvas/head/frame_head/img").getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(sp);
        });
        cc.find("Canvas/head/info/name").getComponent(cc.Label).string = uglobal.user.name;
        cc.find("Canvas/head/info/id/value").getComponent(cc.Label).string = uglobal.user.userid.toString();
    }

    join_game(){
        cc.find("Canvas/JoinGame").active = true;
    }

    logOut(){
        uglobal.alert("确定要离开吗?",()=>{
            uglobal.room = null;
            uglobal.user = null;
            cc.sys.localStorage.removeItem("sign");
            setURL();
            cc.director.loadScene("login");
        })
    }
    update (dt) {
    }
}
