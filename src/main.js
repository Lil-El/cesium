import * as Cesium from "cesium";
import { getTerrainHeightByLonLat } from "./terrain.js";
import { showMapPopup, showModelPopup, showOSMPopup, hidePopup } from "./popup.js";
import { createFloodPolygon, flyToPolygon } from "./flood.js";
import { initOSMBuildings } from "./osm.js";
import { initTileset } from "./tiles.js";
import { initTreeMode, handleTreeLeftClick, handleTreeMouseMove } from "./tree.js";
import model from "./model.js";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NGM4NmQ5ZS00NWJiLTQ3MmItOWY2NC1hYjI0YjExMjViMDQiLCJpZCI6MzE5OTMsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1OTYyODcyNzd9.OA9tQ5_-jqejQUoBlBWkigjfK_irKu8GH_lP88hQYCs";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestWaterMask: true,
    requestVertexNormals: true,
  }),
  infoBox: false, // 关闭信息框
  selectionIndicator: false, // 关闭选择指示器
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

// 设置初始时间
const time = new Date("2026-08-21T12:00:00+10:00");
viewer.clock.currentTime = Cesium.JulianDate.fromDate(time);

// 开启光照
viewer.scene.globe.enableLighting = true;

// 添加 3D Tiles 数据（由 tiles.js 管理显隐）
await initTileset(viewer);

// 监听地形 Provider 切换
viewer.scene.terrainProviderChanged.addEventListener(async (newProvider) => {
  // 加载自定义 glTF 建筑模型
  const h = await getTerrainHeightByLonLat(viewer, 108.87673452217288, 34.19290863238342);

  viewer.scene.primitives.add(model);

  model.readyEvent.addEventListener(() => {
    const boundingSphere = model.boundingSphere;
    const height = boundingSphere.radius * 2;

    model.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(108.87673452217288, 34.19290863238342, h),
    );
  });
});

// 添加 OSM 建筑（由 osm.js 管理显隐）
const osmBuildings = await initOSMBuildings(viewer);

// 注册全局点击事件
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((click) => {
  if (handleTreeLeftClick(click)) return;

  // 获取点击位置处的场景元素（Primitive或Entity）
  const picked = viewer.scene.pick(click.position);

  const cartesian = viewer.scene.pickPosition(click.position);
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  console.log(lon, lat);

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
handler.setInputAction((movement) => {
  if (handleTreeMouseMove(movement)) return;
  hidePopup();
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// 初始化树绘制模式
initTreeMode(viewer, handler);

// 创建洪水多边形
createFloodPolygon(viewer, [
  [144.94352876928014, -37.81285165622311],
  [144.9450432173468, -37.81508521790105],
  [144.9477601314824, -37.81425124529352],
  [144.94497871325956, -37.81215792998704],
]);

// 飞向洪水多边形
flyToPolygon();