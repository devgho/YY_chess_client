// 导入 express
const express = require('express')
// 创建路由对象
const router = express.Router()
// 导入用户路由处理函数对应的模块
const routers_handler = require("../routers_handler/client_handler")

// 创建角色（用户名）
router.post('/create_name', routers_handler.createName);
// 获取用户信息
router.get("/getuser_info/:id",routers_handler.getUserInfo)
// 退出登陆
router.get("/exit_login/:id",routers_handler.exitLogin)
// 获取用户战绩
router.get("/get_record/:id",routers_handler.getRecord)

// 向外共享路由对象
module.exports = router