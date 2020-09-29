var express = require('express');
var app = express();
const exec = require('child_process').exec;

var serverIp = '192.168.200.112'
var localIp = 'localhost'
var websocketUri = 'http://' + localIp
var secret = 'live'
var websocketPort = 8081
var pushPort = 8082
var expressPort = 8085
var rtspWidth = 1280
var rtspHeight = 720

app.all('*', function(req, res, next) {
  //设为指定的域
  res.header('Access-Control-Allow-Origin', "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header('Access-Control-Allow-Credentials', true);
  res.header("X-Powered-By", ' 3.2.1');
  next();
});

//  POST 请求
app.post('/', function (req, res) {
	var rtspId = req.query.rtspId;
	var rtspUrl = req.query.rtspUrl;
	//var rtspWidth = req.query.rtspWidth;
	//var rtspHeight = req.query.rtspHeight;
	var pushUrl = websocketUri + ':' + websocketPort + '/' + secret + '/' + rtspId;
	
	//开启ffmpeg
	execQuery(rtspUrl, pushUrl, rtspWidth, rtspHeight);
	
	var wsUrl = 'ws://' + serverIp + ':' + pushPort + '/' + rtspId;
	res.send(wsUrl)
	
})

var server = app.listen(expressPort, function () {
  console.log("应用实例，访问地址为 http://" + localIp + ':' + expressPort)
  exeWebsocket()
})

//开启websocket
function exeWebsocket(){
	const startWebsocket = 'node realtime-video-websocket.js ' + secret + ' ' + websocketPort + ' ' + pushPort;
    console.log('[api] start websocket server:' + startWebsocket);
	
	exec(startWebsocket, function(err,stdout,stderr){
		if(err) {
			console.log('get weather api error:'+stderr);
		} else {
			console.log(stdout);
		}
	});
}

//开启推流
function execFFmpeg(rtspUrl, pushUrl, rtspWidth, rtspHeight){
    const pushFFmpeg = 'bash /home/tjtl/server/nodejs/nodejs_test/test/forward_mgr.sh --start_new --src_addr=\'' + rtspUrl + '\' --dst_addr=\'' +  pushUrl + '\' --video_w=' + rtspWidth + ' --video_h=' + rtspHeight;
    
    console.log('[api] start push rtsp sh:' + pushFFmpeg);
	
	exec(pushFFmpeg, function(err,stdout,stderr){
		if(err) {
			console.log('get weather api error:'+stderr);
		} else {
			console.log(stdout);
		}
	});
}

//查询rtsp流是否存在
function execQuery(rtspUrl, pushUrl, rtspWidth, rtspHeight){
    const queryShell = 'bash /home/tjtl/server/nodejs/nodejs_test/test/forward_mgr.sh --list --dst_pattern=\'' + pushUrl + '\'';

    console.log('[api] query rtsp sh:' + queryShell);
	
	exec(queryShell, 
		function(error,stdout,stderr){
			if(error) {
				console.log('get weather api error:'+stderr);
			} else {
				var data = JSON.parse(stdout);
				if(pushUrl == data.streams[0]){
					console.log('[api]rtsp push alive')
				} else {
					execFFmpeg(rtspUrl, pushUrl, rtspWidth, rtspHeight)
				}
			}
		}
	);
}

