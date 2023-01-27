const express = require('express')
const fibers = require('fibers');
const configs = require(process.argv[2]);
const bodyParser = require("body-parser")
const http = require("../utils/http")

const config = configs.hall_server();
const app = express()

const socketService = require("./socket_service")

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    fibers(function () {
        next();
    }).run();
});

// 设置中间件
// 解析 application/json
app.use(bodyParser.json());
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());
app.use((req, res, next) => {
    // status 默认值为 1，表示失败的情况
    // err 的值，可能是一个错误对象，也可能是一个错误的描述字符串
    res.cc = (err, status = 1, data) => {
        res.send({
            status,
            message: err instanceof Error ? err.message : err,
            data: data
        })
    }
    next()
})

// 引入路由
const clientRouter = require("./routers/client_service")
app.use("/client", clientRouter)
const roomRouter = require("./routers/room_service")
app.use("/room", roomRouter)
const guildRouter = require("./routers/guild_service")
app.use("/guild", guildRouter)

app.listen(config.HALL_PORT, () => {
    console.log(`${config.CLIENT_IP}`, `${config.CLIENT_PORT}`);
    http.get(`${config.CLIENT_IP}`, `${config.CLIENT_PORT}`, "/register_gs", {
        ip: `${config.HALL_IP}:${config.HALL_PORT}`,
        type: 0
    }, function (ret, data) {
        console.log(ret,data);
    })
    setInterval(() => {
        http.get(`${config.CLIENT_IP}`, `${config.CLIENT_PORT}`, "/register_gs", {
            ip: `${config.HALL_IP}:${config.HALL_PORT}`,
            type: 0
        }, function (ret, data) {
            console.log(ret,data);
        })
        // console.log("发送",`${config.HALL_IP}:${config.HALL_PORT}`);
    }, config.HEARTBEAT)
    console.log(`hall_server running at http://${config.HALL_IP}:${config.HALL_PORT}`)
});

socketService.start(config)