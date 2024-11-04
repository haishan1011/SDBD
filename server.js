const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');
const multer = require('multer');

const app = express();

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('Express错误:', err);
    res.status(500).send('服务器错误');
});

// 静态文件服务
app.use(express.static(__dirname));
app.use(express.json());

// 系统设置配置文件路径
const CONFIG_PATH = path.join(__dirname, 'config.json');

// 默认配置
const DEFAULT_CONFIG = {
    mapCenter: [116.404, 39.915],
    defaultZoom: 12,
    refreshInterval: 3000,
    maxVehicles: 100,
    alertThreshold: 80,  // 速度报警阈值
    vehicleTypes: ['货车', '客车', '私家车'],
    displayOptions: {
        showSpeed: true,
        showDirection: true,
        showStatus: true,
        showType: true
    },
    logo: {
        path: '/images/default-logo.png',
        width: 200,
        height: 50,
        position: 'top-left' // top-left, top-right, bottom-left, bottom-right
    }
};

// 确保创建上传目录
const uploadDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 修改文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 确保上传目录存在
        const uploadDir = path.join(__dirname, 'public', 'images');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'logo' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 限制2MB
    },
    fileFilter: function (req, file, cb) {
        // 检查文件类型
        if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/)) {
            return cb(new Error('只允许上传 JPG、PNG 或 GIF 格式的图片'));
        }
        cb(null, true);
    }
});

// 修改 logo 上传路由
app.post('/api/upload-logo', upload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '未收到文件'
            });
        }

        // 读取当前配置
        const config = loadConfig();

        // 如果存在旧的 logo 文件，删除它
        if (config.logo && config.logo.path) {
            const oldPath = path.join(__dirname, 'public', config.logo.path);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // 更新配置中的 logo 路径
        const logoPath = '/images/' + req.file.filename;
        config.logo = {
            ...config.logo,
            path: logoPath
        };

        // 保存配置
        if (saveConfig(config)) {
            res.json({
                success: true,
                logo: {
                    path: logoPath
                }
            });
        } else {
            throw new Error('保存配置失败');
        }
    } catch (error) {
        console.error('Logo上传失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '上传失败'
        });
    }
});

// 修改 logo 设置路由
app.post('/api/logo-settings', (req, res) => {
    try {
        const config = loadConfig();
        
        // 更新 logo 设置
        config.logo = {
            ...config.logo,
            width: parseInt(req.body.width) || 200,
            height: parseInt(req.body.height) || 50,
            position: req.body.position || 'top-left'
        };

        // 保存配置
        if (saveConfig(config)) {
            res.json({
                success: true,
                logo: config.logo
            });
        } else {
            throw new Error('保存设置失败');
        }
    } catch (error) {
        console.error('保存Logo设置失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '保存失败'
        });
    }
});

// 读取配置
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            return { ...DEFAULT_CONFIG, ...config };
        }
    } catch (error) {
        console.error('读取配置文件失败:', error);
    }
    return DEFAULT_CONFIG;
}

// 修改配置保存函数
function saveConfig(config) {
    try {
        const configDir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('保存配置失败:', error);
        return false;
    }
}

// 路由处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 获取系统配置
app.get('/api/config', (req, res) => {
    res.json(loadConfig());
});

// 更新系统配置
app.post('/api/config', (req, res) => {
    const newConfig = req.body;
    if (saveConfig(newConfig)) {
        res.json({ success: true, config: newConfig });
    } else {
        res.status(500).json({ success: false, message: '保存配置失败' });
    }
});

// 添加用户管理路由
app.post('/api/users', async (req, res) => {
    try {
        const userData = req.body;
        // 这里应该添加到数据库，现在先模拟
        res.json({ success: true, message: '用户添加成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 添加权限设置路由
app.post('/api/permissions', async (req, res) => {
    try {
        const permissions = req.body;
        // 保存权限设置
        const config = loadConfig();
        config.permissions = permissions;
        if (saveConfig(config)) {
            res.json({ success: true, message: '权限设置保存成功' });
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 添加地图配置路由
app.post('/api/map-settings', async (req, res) => {
    try {
        const mapSettings = req.body;
        const config = loadConfig();
        config.mapSettings = mapSettings;
        if (saveConfig(config)) {
            res.json({ success: true, message: '地图配置保存成功' });
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 添加告警设置路由
app.post('/api/alarm-settings', async (req, res) => {
    try {
        const alarmSettings = req.body;
        const config = loadConfig();
        config.alarmSettings = alarmSettings;
        if (saveConfig(config)) {
            res.json({ success: true, message: '告警设置保存成功' });
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 添加数据备份路由
app.post('/api/backup', async (req, res) => {
    try {
        // 这里应该实现实际的备份逻辑
        res.json({ success: true, message: '份成功' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 添加系统日志路由
app.get('/api/logs', async (req, res) => {
    try {
        // 这里应该从数据获取日志，现在返回模拟数据
        const logs = [
            {
                time: new Date().toISOString(),
                user: 'admin',
                action: '系统登录',
                ip: '192.168.1.100'
            }
        ];
        res.json(logs);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// HTTP服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP服务器运行在 http://192.168.21.4:${PORT}`);
});

// WebSocket服务器配置
const wss = new WebSocket.Server({ server });

let config = loadConfig();

// 生成模拟车辆数据
function generateVehicles(count = 100) {
    return Array.from({ length: count }, (_, index) => ({
        _id: (index + 1).toString(),
        plateNumber: `京A${String(index + 1).padStart(5, '0')}`,
        location: {
            longitude: config.mapCenter[0] + (Math.random() - 0.5) * 0.1,
            latitude: config.mapCenter[1] + (Math.random() - 0.5) * 0.1,
            speed: Math.floor(30 + Math.random() * 50),
            direction: Math.floor(Math.random() * 360)
        },
        status: Math.random() > 0.1 ? '正常' : '警告',
        type: config.vehicleTypes[Math.floor(Math.random() * config.vehicleTypes.length)],
        lastUpdate: new Date().toISOString()
    }));
}

// 初始化模拟车辆数据（使用100辆车）
let mockVehicles = generateVehicles(100);

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新客户端连接');

    // 发送初始数据
    ws.send(JSON.stringify({
        type: 'init',
        data: {
            vehicles: mockVehicles,
            config: config
        }
    }));

    // 定期更新车辆位置
    const updateInterval = setInterval(() => {
        mockVehicles = mockVehicles.map(vehicle => {
            const speed = vehicle.location.speed / 3600;
            const direction = vehicle.location.direction * (Math.PI / 180);
            
            return {
                ...vehicle,
                location: {
                    longitude: vehicle.location.longitude + Math.cos(direction) * speed,
                    latitude: vehicle.location.latitude + Math.sin(direction) * speed,
                    speed: Math.floor(30 + Math.random() * 50),
                    direction: (vehicle.location.direction + (Math.random() - 0.5) * 20) % 360
                },
                status: Math.random() > 0.99 ? (vehicle.status === '正常' ? '警告' : '正常') : vehicle.status,
                lastUpdate: new Date().toISOString()
            };
        });

        ws.send(JSON.stringify({
            type: 'update',
            data: mockVehicles
        }));
    }, 3000);

    ws.on('close', () => {
        clearInterval(updateInterval);
        console.log('客户端断开连接');
    });
});

// 添加心跳检测
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// 服务器关闭时清理
wss.on('close', () => {
    clearInterval(interval);
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
}); 