// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class Net extends cc.Component {
    sio: Socket;
    handlers = {};
    url: string;

    addHandler(event, fn) {
        if (this.handlers[event]) {
            console.log("event:" + event + "handler has been registered");
            return;
        }

        function handler(data) {
            if (event != "disconnect" && typeof (data) == "string") {
                data = JSON.parse(data);
            }
            fn(data);
        }

        this.handlers[event] = handler;
        if (this.sio) {
            console.log("register:function" + event);
            this.sio.on(event, handler);
        }
    }

    connect(url, onSuccess?: Function, onFailed?: Function) {
        this.url = url;
        var opts = {
            'reconnection': true,
            'force new connection': true,
            'transports': ['websocket', 'polling']
        }
        this.sio = io.connect(url, opts);

        this.sio.on("connect", (data) => {
            console.debug("初始连接成功");
            this.sio.connected = true;
            onSuccess();
        });

        this.sio.on('disconnect', (data) => {
            this.sio.connected = false;
            this.sio.disconnect();
            this.handlers = {};
            if (this.url) {
                cc.loader.loadRes("prefabs/loading", cc.Prefab, (err, pf) => {
                    if (err) {
                        console.debug(err);
                        return;
                    }
                    const loading = cc.instantiate(pf);
                    loading.setParent(cc.find("Canvas"));
                    const Success = ()=>{
                        onSuccess();
                        loading.destroy();
                    }
                    this.connect(this.url, Success, onFailed);
                })
            }
        });

        setTimeout(() => {
            if (!this.sio.connected) {
                onFailed();
            }
        }, 5000)
    }

    send(event, data) {
        if (this.sio.connected) {
            if (data != null && (typeof (data) == "object")) {
                data = JSON.stringify(data);
            }
            if (data == null) {
                data = '';
            }
            if (typeof (data) == "undefined") {
                data = "";
            }
            this.sio.emit(event, data);
        }
    }

    close() {
        this.url = null;
        this.sio.disconnect();
    }
}
