// 总服务器ip
const LOCAL_IP = '127.0.0.1';
const CLIENT_PORT = 9500
const ONLINE_TIME = 20000 // 心跳检查区间
const HEARTBEAT = 1000 // 心跳发送时间

// 大厅服务器配置
const HALL_IP = "127.0.0.1";
const HALL_PORT = 9501;
const HALL_ROOM_PORT = 9502;

// 加密配置
const ACCOUNT_PRI_KEY = "^&*#$%()@";
const ROOM_PRI_KEY = "~!@#$(*&^%$&";

// 数据库配置
exports.mysql = function () {
	return {
		HOST: '127.0.0.1',
		USER: 'root',
		PSWD: 'root',
		DB: 'db_babykylin',
		PORT: 3306,
	}
}

//账号服配置
exports.account_server = function () {
	return {
		CLIENT_IP: LOCAL_IP,
		CLIENT_PORT: CLIENT_PORT,
		HALL_IP: HALL_IP,
		HALL_PORT: HALL_PORT,
		ONLINE_TIME: ONLINE_TIME,
		HEARTBEAT: HEARTBEAT,
		ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
		VERSION: '20161227',
		APP_WEB: 'http://fir.im/2f17',
	};
};

//大厅服配置
exports.hall_server = function () {
	return {
		SERVER_ID: "001",
		// 登记服务器
		CLIENT_IP: LOCAL_IP,
		CLIENT_PORT: CLIENT_PORT,
		HEARTBEAT: HEARTBEAT, // 心跳时间
		HALL_IP: HALL_IP,
		HALL_PORT: HALL_PORT,
		HALL_ROOM_PORT: HALL_ROOM_PORT,
		ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
		ROOM_PRI_KEY: ROOM_PRI_KEY,
		HALL_ROOM_ONLINE: ONLINE_TIME
	};
};

// 麻将服务配置
exports.majiang_server = function () {
	return {
		SERVER_ID: "001",
		MAJIANG_IP: "127.0.0.1",
		MAJIANG_PORT: 9503,
		CLIENT_IP: LOCAL_IP,
		CLIENT_PORT: CLIENT_PORT,
		HEARTBEAT: HEARTBEAT, // 心跳时间
	}
}

// 跑得快服务配置
exports.paodeikuai_server = function () {
	return {
		SERVER_ID: "002",
		PAODEIKUAI_IP: "127.0.0.1",
		PAODEIKUAI_PORT: 9504,
		CLIENT_IP: LOCAL_IP,
		CLIENT_PORT: CLIENT_PORT,
		HEARTBEAT: HEARTBEAT, // 心跳时间
	}
}

// 字牌服务配置
exports.zipai_server = function () {
	return {
		SERVER_ID: "003",
		ZIPAI_IP: "127.0.0.1",
		ZIPAI_PORT: 9505,
		CLIENT_IP: LOCAL_IP,
		CLIENT_PORT: CLIENT_PORT,
		HEARTBEAT: HEARTBEAT, // 心跳时间
	}
}