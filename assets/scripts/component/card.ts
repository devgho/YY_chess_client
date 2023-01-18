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

    @property
    cardId: number = 0;

    hit_out: boolean;

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start() {
        cc.loader.loadRes("textures/mix/zipai_short", cc.SpriteAtlas, (err, sa) => {
            this.node.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.cardId);
        });
        let old_position: cc.Vec3;
        this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
            if (uglobal.room.position == uglobal.game.positionIndex) {
                cc.find("Canvas/indicate_line").active = true;
            }
            if (this.node.parent.children.length >= 4) {
                console.debug("你不能出牌");
                return;
            }
            old_position = this.node.position;
            this.node.zIndex = 1;
            this.node.height = 220;
            this.node.width = 100;
            cc.loader.loadRes("textures/mix/zipai_long", cc.SpriteAtlas, (err, sa) => {
                this.node.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.cardId);
            });
        }, this.node);

        this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
            if (this.node.parent.children.length >= 4)
                return;
            let delta = event.touch.getDelta();
            this.node.x += delta.x;
            this.node.y += delta.y;

            let indicate_line_position = cc.find("Canvas/indicate_line").convertToWorldSpaceAR(cc.v3(0, 0, 0));
            let this_position = this.node.convertToWorldSpaceAR(cc.v3(0, 0, 0));
            if ((indicate_line_position.y - this_position.y) < 0) {
                this.hit_out = true;
                cc.find("Canvas/indicate_line").color = cc.color(255, 0, 0);
            } else {
                this.hit_out = false;
                cc.find("Canvas/indicate_line").color = cc.color(255, 224, 200);
            }
        }, this.node);

        this.node.on(cc.Node.EventType.TOUCH_END, (event) => {
            if (this.hit_out) {
                if (uglobal.room.position == uglobal.game.positionIndex) {
                    cc.find("Canvas").getComponent("zpRoom").hit_out(this.cardId);
                    let parent = this.node.parent;
                    this.node.removeFromParent(false);
                    this.node.destroy();
                    cc.find("Canvas/indicate_line").active = false;
                    this.refresh_items(parent);
                    return;
                }
            }

            cc.find("Canvas/indicate_line").active = false;
            if (this.node.parent.children.length >= 4)
                return;

            this.node.zIndex = 0;
            this.node.height = 95;
            this.node.width = 90;


            let now_cv_position = this.node.convertToWorldSpaceAR(cc.v3(0, 0));

            let all_holds = cc.find("Canvas/seats/me/holds").children;
            big:
            for (let index in all_holds) {
                let then_index = parseInt(index) + 1;
                if (all_holds[then_index]) {
                    if (all_holds[then_index].children.length == 0)
                        continue;
                }
                if (all_holds[index].children.length >= 4)
                    continue;
                let item_cv_position = all_holds[index].convertToWorldSpaceAR(cc.v3(0, 0));
                let distance = now_cv_position.sub(item_cv_position).mag();
                let x_distance = Math.abs(now_cv_position.x - item_cv_position.x);
                if (distance < 150 && x_distance < 50) {
                    for (let item_child of all_holds[index].children) {
                        let item_child_cv_position = item_child.convertToWorldSpaceAR(cc.v3(0, 0));
                        let child_distance = item_child_cv_position.sub(now_cv_position).mag();
                        if (child_distance < 20 && item_child != this.node) {
                            let old_parent = this.node.parent;

                            this.node.parent = all_holds[index];
                            this.node.position = item_child.position;

                            item_child.parent = old_parent;
                            item_child.position = old_position;
                            break big;
                        }
                    }
                    if (all_holds[index] != this.node.parent && all_holds[index].children.length < 3) {
                        let old_parent = this.node.parent;
                        this.node.parent = all_holds[index];
                        if (all_holds[index].children.length == 2) {
                            this.node.y = 0;
                        } else if (all_holds[index].children.length == 3) {
                            this.node.y = 85;
                        } else {
                            this.node.y = -85;
                            console.log("只有一个" + this.node.position);
                        }
                        this.node.x = 0;
                        this.refresh_items(old_parent);
                        break;
                    }
                }
                this.node.position = old_position;
            }
            cc.find("Canvas").getComponent("zpRoom").update_holds();

            cc.loader.loadRes("textures/mix/zipai_short", cc.SpriteAtlas, (err, sa) => {
                this.node.getComponent(cc.Sprite).spriteFrame = sa.getSpriteFrame(this.cardId);
            });
        }, this.node);
    }

    refresh_items(parent: cc.Node) {
        // let height = -85;
        // for (let i of parent.children){
        //     i.y=height;
        //     height += 85;
        // }
        if (parent.children.length == 0) {
            console.debug("this column have not anything");
            parent.setSiblingIndex(0);
        }
        if (parent.children.length == 1) {
            parent.children[0].y = -85;
            return;
        }
        if (parent.children.length == 2) {
            let is_first: boolean = false;
            let third: cc.Node;
            for (let i of parent.children) {
                if (i.y == -85)
                    is_first = true;
                if (i.y == 85)
                    third = i;
            }
            if (!is_first) {
                for (let i of parent.children)
                    i.y -= 85;
            } else if (is_first && third) {
                third.y -= 85;
            }

        }
    }

    // update (dt) {}
}
