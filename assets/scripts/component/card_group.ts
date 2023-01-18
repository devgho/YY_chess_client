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

    group:Array<Number>;

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start () {
        if(this.group){
            if(this.group.length == 4){
                cc.loader.loadRes("textures/mix/zipai_short",cc.SpriteAtlas,(err,sa)=>{
                    if(err){
                        console.debug(err);
                        return;
                    }
                    this.node.children[0].getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.group[0]);    
                    this.node.children[1].getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.group[1]);    
                    this.node.children[2].getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.group[2]);    
                    this.node.children[3].getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.group[3]);    
                });    
                return;
            }
            cc.loader.loadRes("textures/mix/zipai_short",cc.SpriteAtlas,(err,sa)=>{
                if(err){
                    console.debug(err);
                    return;
                }
                this.node.children[0].getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.group[0]);    
                this.node.children[1].getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.group[1]);    
                this.node.children[2].getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.group[2]);    
            });
        }
    }

    chi(){
    }

    // update (dt) {}
}
