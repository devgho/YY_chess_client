// 导入 express
const express = require('express')
// 创建路由对象
const router = express.Router()
// 导入用户路由处理函数对应的模块
const routers_handler = require("../routers_handler/guild_handler")

router.get("/get_guild/:id", routers_handler.getGuild)

// 向外共享路由对象
module.exports = router