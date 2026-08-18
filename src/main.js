import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NGM4NmQ5ZS00NWJiLTQ3MmItOWY2NC1hYjI0YjExMjViMDQiLCJpZCI6MzE5OTMsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1OTYyODcyNzd9.OA9tQ5_-jqejQUoBlBWkigjfK_irKu8GH_lP88hQYCs";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestWaterMask: true,
    requestVertexNormals: true,
  }),
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  fullscreenButton: false,
  vrButton: false,
});

viewer.scene.globe.enableLighting = true;

// 添加 3D Tiles 数据
// const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
// const tileset = await Cesium.Cesium3DTileset.fromUrl('/tiles/tileset.json');
// viewer.scene.primitives.add(tileset);

// 加载自定义 glTF 建筑模型
setTimeout(async () => {
  const h = await getTerrainHeightByLonLat(viewer, 108.87722, 34.19241);

  const model = await Cesium.Model.fromGltfAsync({
    url: "/models/building.gltf",
    modelMatrix: null,
    scale: 1.0,
  });
  viewer.scene.primitives.add(model);
  modelRef = model;

  model.readyEvent.addEventListener(() => {
    const boundingSphere = model.boundingSphere;
    const height = boundingSphere.radius * 2;

    model.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(108.87722, 34.19241, h + height / 2),
    );
  });
}, 5000);

// 飞向模型所在位置
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(108.87722, 34.188, 1200),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0,
  },
  duration: 2,
});

// 添加 OSM 建筑
const osmBuildings = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(osmBuildings);

// ==================== 点击弹窗逻辑 ====================
const popup = document.getElementById("infoPopup");

let modelRef = null;

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

// 注册全局点击事件
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((click) => {
  // 获取点击位置处的场景元素（Primitive或Entity）
  const picked = viewer.scene.pick(click.position);
  console.log(picked);

  if (Cesium.defined(picked) && picked.primitive === modelRef) {
    // 点击到了建筑模型
    showModelPopup(click.position);
  } else if (Cesium.defined(picked) && picked.primitive === osmBuildings) {
    // 获取点击位置对应的三维世界坐标（Cartesian3）
    // 点击到 OSM 建筑，也显示模型弹窗（占位）
    const cartesian = viewer.scene.pickPosition(click.position);
    if (Cesium.defined(cartesian)) {
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
      showPopup(click.position.x, click.position.y, content);
    }
  } else {
    // 点击到了地形/地图
    const cartesian = viewer.scene.pickPosition(click.position);
    if (Cesium.defined(cartesian)) {
      showMapPopup(click.position, cartesian);
    } else {
      hidePopup();
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// 鼠标移动时隐藏弹窗（点击空白处也隐藏）
handler.setInputAction(() => {
  hidePopup();
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// https://blog.csdn.net/gusushantang/article/details/158462588
async function getTerrainHeightByLonLat(viewer, lon, lat) {
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);

  const terrainProvider = viewer.terrainProvider;
  const sampledPositions = await Cesium.sampleTerrainMostDetailed(
    terrainProvider,
    [cartographic],
  );

  return sampledPositions[0].height;
}