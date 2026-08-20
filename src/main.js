import * as Cesium from "cesium";
import { getTerrainHeightByLonLat } from "./terrain.js";
import { showMapPopup, showModelPopup, showOSMPopup, hidePopup } from "./popup.js";
import model from "./model.js";
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

// 监听地形 Provider 切换
viewer.scene.terrainProviderChanged.addEventListener(async (newProvider) => {
  // console.log("地形 Provider 已切换:", newProvider);

  // 加载自定义 glTF 建筑模型
  const h = await getTerrainHeightByLonLat(viewer, 108.87722, 34.19241);

  viewer.scene.primitives.add(model);

  model.readyEvent.addEventListener(() => {
    const boundingSphere = model.boundingSphere;
    const height = boundingSphere.radius * 2;

    model.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(108.87722, 34.19241, h + height / 2),
    );
  });
});

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

// ==================== 滑动条控制 ====================
let myNumericVariable = 1.0;

const slider = document.getElementById("mySlider");
const sliderValueDisplay = document.getElementById("sliderValue");

slider.addEventListener("input", (e) => {
  myNumericVariable = parseFloat(e.target.value);
  sliderValueDisplay.textContent = myNumericVariable.toFixed(2);
  console.log("当前变量值:", myNumericVariable);
});

// 注册全局点击事件
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((click) => {
  // 获取点击位置处的场景元素（Primitive或Entity）
  const picked = viewer.scene.pick(click.position);
  console.log(picked);

  if (Cesium.defined(picked) && picked.primitive === model) {
    // 点击到了建筑模型
    showModelPopup(click.position);
  } else if (Cesium.defined(picked) && picked.primitive === osmBuildings) {
    // 获取点击位置对应的三维世界坐标（Cartesian3）
    // 点击到 OSM 建筑，也显示模型弹窗（占位）
    const cartesian = viewer.scene.pickPosition(click.position);
    if (Cesium.defined(cartesian)) {
      showOSMPopup(click.position, cartesian);
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
