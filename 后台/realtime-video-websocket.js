var fs = require('fs'), http = require('http'), WebSocket = require('ws');
const exec = require('child_process').exec;

if (process.argv.length < 3) {
	console.log('输入正确参数');
	process.exit();
}

var stream_secret = process.argv[2];//密码
var stream_port = process.argv[3] || 8081;//ffpeng推送端口
var websocket_port = process.argv[4] || 8082;//前端websocket端口 ，比如：8082
var record_stream = false;
var totalSize = 0;

function initWebSocket(websocket_port) {
	var clientMap = new Map();//缓存，实现多个视频流同时播放的问题
	
	var socketServer = new WebSocket.Server({
		port : websocket_port,
		perMessageDeflate : false
	});
	socketServer.on('connection', function(socket, upgradeReq) {
		var url = upgradeReq.socket.remoteAddress + upgradeReq.url;
		
		var params = url.substr(1).split('/');
		printData('initWebSocket', params)
		
		var key = params[1];//key就是通过url传递过来的标识比如:(ws://127.0.0.1:8082/live3)其中live3就是这个标识，其他的流可随机生成其他的字符串
		var ips = params[0].split(':');
		console.log('IP:' + ips[ips.length-1] + '已连接')

		var clients = clientMap.get(key);
		if(!clients){
			clients = new Set();
			clientMap.set(key,clients);
		}
		clients.add(socket);
		totalSize++;
		process.stdout.write("[INFO]:a new connection, the current number of connections: " + totalSize + ".\r");
		
		socket.on('close', function(code, message) {
			var clientSet = clientMap.get(key);
			if(clientSet){
				clientSet.delete(socket);
				totalSize--;
				if(clientSet.size == 0){
					clientMap.delete(key);
					//关闭ffmpeg
					closeFFmpeg(key);
				}
			}
			process.stdout.write("[INFO]:close a connection, the current number of connections:" + totalSize + ".\r");
		});

		socket.on("error",function(err){
			// 出错触发 //
			console.log("header err")
			console.log(err)
		})
	});

	//广播
	socketServer.broadcast = function(data, theme) {
		var clients = clientMap.get(theme);
		if (clients) {
			clients.forEach(function (client, set) {
				if(client.readyState === WebSocket.OPEN){
					client.send(data);
				}
			});
		}
	};
	return socketServer;
}

function initHttp(stream_port, stream_secret, record_stream, socketServer) {
	var streamServer = http.createServer(
			function(request, response) {
				var params = request.url.substr(1).split('/');
				
				console.log("params--->" + params);
				console.log("stream_secret--->" + stream_secret);
				printData('initHttp', params)
				
				if (params.length != 2) {
					process.stdout.write("\n[ERROR]:Incorrect parameters, enter password and push theme");
					response.end();
				}
				
				if (params[0] !== stream_secret) {
					process.stdout.write("\n[ERROR]:Password error: "+request.socket.remoteAddress+":"+request.socket.remotePort+"");
					response.end();
				}
				
				response.connection.setTimeout(0);
				request.on('data', function(data) {
					socketServer.broadcast(data, params[1]);
					if (request.socket.recording) {
						request.socket.recording.write(data);
					}
				});
				request.on('end', function() {
					process.stdout.write("\n[INFO]:close request");
					if (request.socket.recording) {
						request.socket.recording.close();
					}
				});
				if (record_stream) {
					var path = 'recordings/' + Date.now() + '.ts';
					request.socket.recording = fs.createWriteStream(path);
				}
			}).listen(stream_port);
			console.log('started rtsp WebSocket service in secret is [%s], service port is [%s], ws port is [%s].',stream_secret,stream_port,websocket_port);
}


function closeFFmpeg(key){
	var pushUrl = 'http://localhost:8081/live/' + key;
	const closeShell = 'bash /home/tjtl/server/nodejs/nodejs_test/test/forward_mgr.sh --stop --dst_pattern=\'' + pushUrl + '\'';

	console.log('[socket] close push');
    console.log('[socket] close push sh:' + closeShell);
	exec(closeShell, 
		function(error,stdout,stderr){
			if(error) {
				console.log('get weather api error:'+stderr);
			} else {
				console.log('[socket]close push result:' + stdout);
			}
		}
	);
}

function printData(mark, params){
	console.log('============' + mark + '================ \n')
	for (var i =0;i<params.length;i++){
		console.log(mark + '--------->' + params[i])
	}
}


initHttp(stream_port, stream_secret, record_stream, initWebSocket(websocket_port));
console.log("start success\n")