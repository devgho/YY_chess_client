// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

    @property(cc.Label)
    label: cc.Label = null;

    @property
    text: string = 'hello';

    @property(cc.Node)
    chosen: cc.Node = null;

    chosen_id: number = 1;


    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {

    }

    close() {
        this.node.active = false;
    }

    open() {
        this.node.active = true;
    }

    chose(event, id) {
        if (event.target == this.chosen) {
            return;
        }
        console.log(event)
        let tmp_sp = event.target.getChildByName("button").getComponent(cc.Sprite).spriteFrame;
        event.target.getChildByName("button").getComponent(cc.Sprite).spriteFrame = this.chosen.getChildByName("button").getComponent(cc.Sprite).spriteFrame;
        this.chosen.getChildByName("button").getComponent(cc.Sprite).spriteFrame = tmp_sp;
        this.chosen = event.target;

        if (id == 1) {
            this.node.getChildByName("mj_panel").active = true;
            this.node.children[this.chosen_id].active = false;
        }
        if (id == 2) {
            this.node.getChildByName("zp_panel").active = true;
            this.node.children[this.chosen_id].active = false;
        }
        if (id == 3) {
            this.node.getChildByName("pdk_panel").active = true;
            this.node.children[this.chosen_id].active = false;
        }
        this.chosen_id = id;
    }

    create() {
        interface MjConfigs {
            num_of_turns: number,   //局数 0:8局房卡x5 1:16局房卡x10
            num_of_people: number,  //人数  0:4人 1:3人 2:2人
            ghost_card: number,    //鬼牌  0:随机翻鬼 1:红中做鬼
            kill_ghost: number,     //杀鬼  0:不杀鬼 1:杀鬼翻倍 2:杀鬼三分
            cheat_prevent: number, //防作弊 0:关闭 1:开启
            shuffle: number,       //洗牌   0:关 1:开
            double: number,        //翻倍   0:关 1:开
            shot_bird: number      //打鸟   0:关 1:开 
        }
        interface ZpConfigs {
            num_of_turns: number,  //局数 0:8局房卡x5 1:16局房卡x10
            num_of_people: number, //人数 0:3人 1:2人
            without_wh: number,     //不带无胡 0:off 1:on
            without_ydh: number,     //不带一点红 0:off 1:on
            cheat_prevent: number,   //防作弊  0:off 1:on
            shuffle: number,   //洗牌  0:off 1:on
            shot_bird: number  //打鸟  0:off 1:on
        }
        interface PdkConfigs {
            num_of_turns: number,  //局数 0:10局房卡x5 1:20局房卡x10
            num_of_people: number, //人数 0:3人 1:2人
            boom: number //3A当炸弹 0:off 1:on
            fourBthree: number //可四带三 0:off 1:on
            first_spade: number //黑桃3先出 0:off 1:on
            grab_bird: number //抓鸟 0:off 1:on
            fifty: number //十五张 0:off 1:on
            cheat_prevent: number,   //防作弊  0:off 1:on
            shuffle: number,   //洗牌  0:off 1:on
            shot_bird: number  //打鸟  0:off 1:on
            double: number,        //翻倍   0:关 1:开
        }
        let configs = this.configure();
        let data = {
            userid:uglobal.user.userid,
            num_of_turns:configs.num_of_turns,
            type:configs.type,
            base_info:JSON.stringify(configs)
        }
        const handler = (ret)=>{
            console.log(ret);
            uglobal.room = ret.data;
            if(ret.data.type == 0){
                cc.director.loadScene("mj_room");
            }else if(ret.data.type == 1){
                cc.director.loadScene("pdk_room");
            }else{
                cc.director.loadScene("zp_room");
            }
        }
        post("/room/create_room",data,handler);
    }
    configure() {
        /* 通用配置 */
        interface Configs {
            num_of_turns: number,
            num_of_people: number,
            [propName: string]: any
        }
        let node = this.node.children[this.chosen_id]
        console.log(this.chosen_id);
        const configs: Configs = {
            num_of_people: null,
            num_of_turns: null
        }
        /* 局数start */
        let not_node = node.getChildByName("num_of_turns").getChildByName("toggleContainer").children;
        if (not_node[0].getComponent(cc.Toggle).isChecked)
            configs.num_of_turns = 8
        else
            configs.num_of_turns = 16
        /* 局数end */
        /* 人数start */
        let nop_node = node.getChildByName("num_of_people").getChildByName("toggleContainer").children;
        if (nop_node[0].getComponent(cc.Toggle).isChecked)
            configs.num_of_people = 4
        else if (nop_node[1].getComponent(cc.Toggle).isChecked)
            configs.num_of_people = 3
        else
            configs.num_of_people = 2
        /* 人数end */
        /* 设置start */
        let st_node = node.getChildByName("setting").children;
        if (st_node[0].getComponent(cc.Toggle).isChecked)
            configs.cheat_prevent = 1
        else
            configs.cheat_prevent = 0

        if (st_node[1].getComponent(cc.Toggle).isChecked)
            configs.shuffle = 1
        else
            configs.shuffle = 0
        /* 设置end */

        /* 翻倍start */
        let db_node = node.getChildByName("double").getChildByName("toggleContainer").children;
        if (db_node[0].getComponent(cc.Toggle).isChecked)
            configs.double = 0
        else
            configs.double = 1
        /* 翻倍end */
        /* 打鸟start */
        let sb_node = node.getChildByName("shot_bird").getChildByName("toggleContainer").children;
        if (sb_node[0].getComponent(cc.Toggle).isChecked)
            configs.shot_bird = 0
        else
            configs.shot_bird = 1
        /* 打鸟end */
        /* 通用配置 */


        if (this.chosen_id == 1) {  //麻将配置
            configs.type = 0;
            /* 鬼牌start */
            let gc_node = node.getChildByName("ghost_card").getChildByName("toggleContainer").children;
            if (gc_node[0].getComponent(cc.Toggle).isChecked)
                configs.ghost_card = 0
            else
                configs.ghost_card = 1
            /* 鬼牌end */

            /* 杀鬼start */
            let kg_node = node.getChildByName("kill_ghost").getChildByName("toggleContainer").children;
            if (kg_node[0].getComponent(cc.Toggle).isChecked)
                configs.kill_ghost = 0
            else if (kg_node[1].getComponent(cc.Toggle).isChecked)
                configs.kill_ghost = 1
            else
                configs.kill_ghost = 2
            /* 杀鬼end */
        } else if (this.chosen_id == 2) {  //字牌配置
            configs.type = 2;
            /* 玩法start */
            let st_node = node.getChildByName("play_role").children;
            if (st_node[0].getComponent(cc.Toggle).isChecked)
                configs.without_wuhu = 1
            else
                configs.without_wuhu = 0

            if (st_node[1].getComponent(cc.Toggle).isChecked)
                configs.without_ydh = 1
            else
                configs.without_ydh = 0
            /* 玩法end */
        } else if (this.chosen_id == 3) {  //跑的快配置
            configs.type = 1;
            /* 玩法start */
            let st_node = node.getChildByName("play_role").children;
            if (st_node[0].getComponent(cc.Toggle).isChecked)
                configs.boom = 1
            else
                configs.boom = 0

            if (st_node[1].getComponent(cc.Toggle).isChecked)
                configs.fourBthree = 1
            else
                configs.fourBthree = 0

            if (st_node[2].getComponent(cc.Toggle).isChecked)
                configs.first_spade = 1
            else
                configs.first_spade = 0

            if (st_node[3].getComponent(cc.Toggle).isChecked)
                configs.grab_bird = 1
            else
                configs.grab_bird = 0

            if (st_node[4].getComponent(cc.Toggle).isChecked)
                configs.fifty = 1
            else
                configs.fifty = 0
            /* 玩法end */
        }
        return configs
    }

    // update (dt) {}
}
