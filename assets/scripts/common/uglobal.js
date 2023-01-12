var uglobal;
(function (uglobal) {
    function alert(message, callback) {
        cc.loader.loadRes("prefabs/alert", cc.Prefab, function (err, pf) {
            if (err) {
                console.log("alert error");
                console.log(err);
                return;
            }
            var new_node = cc.instantiate(pf);
            var parent_node = cc.director.getScene().getChildByName("Canvas");
            new_node.setParent(parent_node);
            new_node.setPosition(0, 0);
            new_node.getChildByName("frame").getChildByName("label").getComponent(cc.Label).string = message;
            if (callback) {
                new_node.getComponent("alert").then = callback;
            }
        });
    }
    uglobal.alert = alert;
})(uglobal || (uglobal = {}));
