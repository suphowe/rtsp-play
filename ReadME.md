# nodejs+express+ffmpeg+jsmpeg 实现rtsp转码网页播放

## nodejs安装
```
npm install ws -g
npm install express --save
```

## 文件说明
express-real-time-video.js express服务  
realtime-video-websocket.js websocket服务  
forward_mgr.sh ffmpeg管理脚本  

## 启动服务
```
node express-real-time-video.js
```