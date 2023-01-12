var INIT_URL = "http://192.168.6.202:9000";
var URL = "http://192.168.6.202:9000";

function post(path,data,handler){
    var xhr = cc.loader.getXMLHttpRequest();
    xhr.timeout = 5000;


    if (data == null){
        data = {};
    }

    //组装完整URL以及格式化请求参数
    var body = "";
    for(var i in data){
        body += i + "=" + data[i] + "&"
    }
    var requestURL =URL +path;
    //发送请求
    console.log(path);
    console.log("RequestURL:"+requestURL);
    xhr.open("POST",requestURL, true);
    xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');

    if (cc.sys.isNative) {
        xhr.setRequestHeader("Accept-Encoding", "gzip,deflate", "text/html;charset=UTF-8");
    }

    var timer = setTimeout(function () {
        xhr.hasRetried = true;
        xhr.abort();
        console.log('http timeout');
        retryFunc();
    }, 5000);

    var retryFunc = function () {
        post(path, data, handler);
    };

    xhr.onreadystatechange = function () {
        console.log("onreadystatechange");
        clearTimeout(timer);
        if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)) {
            var respText = xhr.responseText;

            var ret = null;
            try {
                ret = JSON.parse(respText);
                console.log("服务端返回的结果为", ret);
                if(ret.status != 0){
                    throw ret.message;
                }
                if (handler) {
                    handler(ret);
                }
            } catch (e) {
                uglobal.alert(e)
            }

            handler = null;
        } else if (xhr.readyState === 4) {
            if (xhr.hasRetried) {
                return;
            }

            console.log('other readystate == 4' + ', status:' + xhr.status);
            setTimeout(function () {
                retryFunc();
            }, 5000);
        } else {
            console.log('other readystate:' + xhr.readyState + ', status:' + xhr.status);
        }
    };

    try {
        xhr.send(body);
    }catch(e){
        setTimeout(retryFunc, 200);
        retryFunc();
    }
    return xhr;
}

function get(path, data, handler) {
    var xhr = cc.loader.getXMLHttpRequest();
    xhr.timeout = 5000;

    if (data == null) {
        data = {};
    }

    //解析请求路由以及格式化请求参数
    var sendtext = '?';
    for (var k in data) {
        if (sendtext != "?") {
            sendtext += "&";
        }
        sendtext += (k + "=" + data[k]);
    }

    //组装完整的URL
    var requestURL = URL + path + encodeURI(sendtext);

    //发送请求
    console.log("RequestURL:" + requestURL);
    xhr.open("GET", requestURL, true);

    if (cc.sys.isNative) {
        xhr.setRequestHeader("Accept-Encoding", "gzip,deflate", "text/html;charset=UTF-8");
    }

    var timer = setTimeout(function () {
        xhr.hasRetried = true;
        xhr.abort();
        console.log('http timeout');
        retryFunc();
    }, 5000);

    var retryFunc = function () {
        get(path, data, handler);
    };

    xhr.onreadystatechange = function () {
        console.log("onreadystatechange");
        clearTimeout(timer);
        if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)) {
            var respText = xhr.responseText;

            var ret = null;
            try {
                ret = JSON.parse(respText);
                console.log("服务端返回的结果为", ret);
                if(ret.status != 0){
                    throw ret.message;
                }
                if (handler) {
                    handler(ret);
                }
            } catch (e) {
                uglobal.alert(e)
            }

            handler = null;
        } else if (xhr.readyState === 4) {
            if (xhr.hasRetried) {
                return;
            }

            console.log('other readystate == 4' + ', status:' + xhr.status);
            setTimeout(function () {
                retryFunc();
            }, 5000);
        } else {
            console.log('other readystate:' + xhr.readyState + ', status:' + xhr.status);
        }
    };

    try {
        xhr.send();
    } catch (e) {
        retryFunc();
    }

    return xhr;
}

function setURL(url){
    if(url)
        URL = url;
    else
        URL = INIT_URL;
}

globalThis.get = get;
globalThis.post = post;
globalThis.setURL = setURL;