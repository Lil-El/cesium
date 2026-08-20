import * as Cesium from "cesium";

// ==================== 点击弹窗逻辑 ====================
const popup = document.getElementById("infoPopup");

function showPopup(screenX, screenY, content) {
  popup.innerHTML = content;
  popup.style.display = "block";
  popup.style.left = screenX + 15 + "px";
  popup.style.top = screenY - 15 + "px";
}

function hidePopup() {
  popup.style.display = "none";
}

// 地图点击弹窗：显示经纬度、海拔等占位信息
function showMapPopup(clickPosition, cartesian) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const height = cartographic.height;

  const content = `
    <div class="popup-title">📍 地图位置</div>
    <div class="popup-row">经度：<span>${lon.toFixed(6)}°</span></div>
    <div class="popup-row">纬度：<span>${lat.toFixed(6)}°</span></div>
    <div class="popup-row">海拔：<span>${height.toFixed(2)} m</span></div>
    <div class="popup-row">地形：<span>世界地形</span></div>
  `;
  showPopup(clickPosition.x, clickPosition.y, content);
}

// 模型点击弹窗：展示建筑模型占位信息
function showModelPopup(clickPosition) {
  const content = `
    <div class="popup-title">🏢 建筑模型</div>
    <div class="popup-row">名称：<span>示例建筑</span></div>
    <div class="popup-row">类型：<span>glTF 模型</span></div>
    <div class="popup-row">高度：<span>-- m</span></div>
    <div class="popup-row">面积：<span>-- m²</span></div>
    <div class="popup-row">描述：<span>占位信息，待接入真实数据</span></div>
  `;
  showPopup(clickPosition.x, clickPosition.y, content);
}

function showOSMPopup(clickPosition, cartesian) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6);
  const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
  const content = `
        <div class="popup-title">🏗️ OSM 建筑</div>
        <div class="popup-row">经度：<span>${lon}°</span></div>
        <div class="popup-row">纬度：<span>${lat}°</span></div>
        <div class="popup-row">数据源：<span>OpenStreetMap</span></div>
        <div class="popup-row">描述：<span>占位信息，待接入真实数据</span></div>
      `;
  showPopup(clickPosition.x, clickPosition.y, content);
}

export { showPopup, hidePopup, showMapPopup, showModelPopup, showOSMPopup };
