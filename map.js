let map;

// 初始化地图
function initMap() {
    map = new AMap.Map('map', {
        zoom: 11,
        center: [116.397428, 39.90923]
    });

    // 添加一些测试标记
    addTestMarkers();
}

// 添加测试标记
function addTestMarkers() {
    // 添加一个标记
    const marker = new AMap.Marker({
        position: [116.397428, 39.90923],
        title: '测试车辆'
    });

    marker.setMap(map);

    // 添加到列表
    const list = document.getElementById('vehicleList');
    list.innerHTML = `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <h3>测试车辆</h3>
            <p>位置: 北京市</p>
        </div>
    `;
}

// 等待页面加载完成
window.onload = function() {
    console.log('页面加载完成');
    initMap();
};