const express = require('express')
const app = express()
const fibers = require('fibers');

const configs = require(process.argv[2]);
const config = configs.majiang_server();

const httpZHU = require("../utils/http")

const http = require("http")
const socketIo = require("socket.io")

const server = http.createServer(app)
const io = new socketIo(server)

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

server.listen(config.MAJIANG_PORT, () => {
    httpZHU.get(`${config.CLIENT_IP}`, `${config.CLIENT_PORT}`, "/register_gs", {
        ip: `${config.MAJIANG_IP}:${config.MAJIANG_PORT}`,
        type: 1,
        gameType:0
    }, function (ret, data) {
    })
    setInterval(() => {
        httpZHU.get(`${config.CLIENT_IP}`, `${config.CLIENT_PORT}`, "/register_gs", {
            ip: `${config.MAJIANG_IP}:${config.MAJIANG_PORT}`,
            type: 1,
            gameType:0
        }, function (ret, data) {
        })
        // console.log("发送",`${config.MAJIANG_IP}:${config.MAJIANG_PORT}`);
    }, config.HEARTBEAT)
    console.log(`majiang_server running at ws://${config.MAJIANG_IP}:${config.MAJIANG_PORT}`)
})

const socketService = require("./socket_service")
socketService.start(io)