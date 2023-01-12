// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import Net from "../common/net";
const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;

    @property(cc.ProgressBar)
    jindutiao: cc.ProgressBar = null;

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        
    }

    start () {
        cc.director.preloadScene("hall");
        
        let callback = ()=>{
            this.jindutiao.progress += 0.05;
            if(this.jindutiao.progress >= 1){
                cc.find("Canvas/loading/text").getComponent(cc.Label).string = "加载完毕";
                setTimeout(()=>{
                    cc.find("Canvas/loading").active = false;
                    cc.find("Canvas/complete").active = true;
                    let token = cc.sys.localStorage.getItem("sign");
                    if(token)
                        this.login(null,token);
                },300);
            }
        }
        this.schedule(callback,.0005,19,0);
    }
    /* 登录start */
    loginArea(){  
        cc.find("Canvas/loginArea").active = true;
    }

    login(event,sign?:string){
        const handler = (ret)=>{
            uglobal.user = {
                account : ret.data.account,
                userid : ret.data.userid, 
                name : ret.data.name,
                headimg : ret.data.headimg,
                coins : ret.data.coins,
                gems : ret.data.gems,
                tili : ret.data.tili,
                hallServer : "http://"+ret.data.hallServer,
                sign : ret.data.sign
            };
            if(ret.data.roomData){
                uglobal.room = ret.data.roomData;
            }
            cc.sys.localStorage.setItem("sign",ret.data.sign);
            cc.director.loadScene("hall");
            setURL(uglobal.user.hallServer);
        }
        if(sign){
            get("/auth",{sign},handler);
            return;
        }
        let account:string = cc.find("Canvas/loginArea/account").getComponent(cc.EditBox).string;
        let password:string = cc.find("Canvas/loginArea/password").getComponent(cc.EditBox).string;
        const body = {
            account,
            password
        }
        post("/login",body,handler);
    }

    login_cancel(){
        cc.find("Canvas/loginArea").active = false;
    }
    /* 登录end */

    /* 注册start */
    registerArea(){  
        cc.find("Canvas/registerArea").active = true;
    }

    register(){
        let name:string = cc.find("Canvas/registerArea/name").getComponent(cc.EditBox).string;
        let account:string = cc.find("Canvas/registerArea/account").getComponent(cc.EditBox).string;
        let password:string = cc.find("Canvas/registerArea/password").getComponent(cc.EditBox).string;
        if((name&&account&&password) == ""){
            uglobal.alert("所有项均不能为空");
            return;
        }
        const body = {
            account,
            password,
            name
        }
        const handler = (ret)=>{
            console.log(ret);
            uglobal.alert("注册成功");
            cc.find("Canvas/registerArea").active = false;
        }
        post("/register",body,handler);
    }

    register_cancel(){
        cc.find("Canvas/registerArea").active = false;
    }
    /* 注册end */

    // update (dt) {}
}
