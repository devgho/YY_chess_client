namespace uglobal{
    export let user: {
        userid:number,
        account:string,
        name:string,
        headimg:string,
        coins:number,
        gems:number,
        tili:number,
        sign:string,
        hallServer:string
    }
    export let room: {
        roomid:number,
        roomip:string,
        landlord:boolean,
        num_of_people:number,
        position:number,
        type:number,
        data:{
            roomid:number,
            type:number,
            num_of_turns:number,
            [propName: string]:any
        }
        [propName: string]:any
    }
    export let game:{
        chuPaiid:number,
        moPaiid:number,
        peopleNumber:number,
        unknownPai:Array<number>,
        positionIndex:number,
        [propname:string]:any
    }
    export function alert(message:string,callback?:Function){
        cc.loader.loadRes("prefabs/alert",cc.Prefab,function(err,pf){
            if(err){
                console.log("alert error");
                console.log(err);  
                return;
            }
            const new_node:cc.Node = cc.instantiate(pf);
            const parent_node:cc.Node = cc.director.getScene().getChildByName("Canvas");
        
            new_node.setParent(parent_node);
            new_node.setPosition(0,0);
            new_node.getChildByName("frame").getChildByName("label").getComponent(cc.Label).string = message;
            if(callback){
                new_node.getComponent("alert").then=callback;
            }
        });
    }
}