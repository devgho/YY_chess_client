// 导入 express
const express = require('express')
// 创建路由对象
const router = express.Router()
// 导入用户路由处理函数对应的模块
const routers_handler = require("../routers_handler/room.handler")

// 创建房间
router.post("/create_room", routers_handler.createRoom);
// 加入房间
router.post("/join_room", routers_handler.joinRoom)

// 向外共享路由对象
module.exports = router