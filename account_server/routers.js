// 导入 express
const express = require('express')
// 创建路由对象
const router = express.Router()
// 导入用户路由处理函数对应的模块
const routers_handler = require("./routers_handler")

// 配置导入
const configs = require(process.argv[2]);
const config = configs.account_server();

// 获取服务端版本
router.get('/get_version', function (req, res) {
    res.cc("版本信息", 0, { version: config.VERSION });
});

// 获取服务端信息
router.get('/get_serverinfo', function (req, res) {
    res.cc("服务器信息", 0, {
        version: config.VERSION,
        hall: config.CLIENT_IP,
        appweb: config.APP_WEB,
    });
});

// 游客登陆
// router.get("/guest", routers_handler.guest)

// 账号注册
router.post("/register", routers_handler.register)
// 账号登陆
router.post("/login", routers_handler.login)
// 微信登陆
router.get("/wechat_auth", routers_handler.wechat_auth)
// 账号登陆验证
router.get("/auth", routers_handler.auth)
// 主页公告
router.get("/notice", routers_handler.notice)
// 本地记录启动服务器
router.get("/register_gs", routers_handler.record)
// 请求服务器
router.get("/get_games_servers",routers_handler.getServers)

// 向外共享路由对象
module.exports = router