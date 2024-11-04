const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');

const app = express();

// 静态文件服务
app.use(express.static(__dirname));

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(8000, '0.0.0.0', () => {
    console.log('HTTPS服务器运行在 https://192.168.21.4:8000');
}); 