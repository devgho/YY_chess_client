const express = require('express')
const fibers = require('fibers');
const configs = require(process.argv[2]);
const bodyParser = require("body-parser")

const config = configs.account_server();
const app = express()

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
const userRouter = require("./routers")
app.use(userRouter)

app.listen(config.CLIENT_PORT, () => {
    console.log(`api server running at http://${config.CLIENT_IP}:${config.CLIENT_PORT}`)
});