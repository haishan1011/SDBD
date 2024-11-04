const WebSocket = require('ws');
const Vehicle = require('./models/Vehicle');

function initWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('新的客户端连接');

        // 定时推送实时数据
        const interval = setInterval(async () => {
            try {
                // 获取最新车辆数据
                const vehicles = await Vehicle.find({}, {
                    plateNumber: 1,
                    location: 1,
                    status: 1,
                    alerts: {
                        $elemMatch: { status: '未处理' }
                    }
                });

                // 推送数据
                ws.send(JSON.stringify({
                    type: 'update',
                    data: vehicles
                }));
            } catch (error) {
                console.error('推送数据错误:', error);
            }
        }, 1000);

        ws.on('close', () => {
            clearInterval(interval);
            console.log('客户端断开连接');
        });
    });
}

module.exports = initWebSocket; 