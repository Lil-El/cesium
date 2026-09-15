import * as Cesium from "cesium";
import { getTerrainHeightByLonLat } from "./terrain.js";
import { showMapPopup, showModelPopup, showOSMPopup, hidePopup, showLayerPopup } from "./popup.js";
import { initOSMBuildings, initTileset, flyToTileset } from "./tiles.js";
import { addHighlightFromGeometry } from "./geometry.js";
import { initTreeMode, handleTreeLeftClick, handleTreeMouseMove, createTreeModel } from "./tree.js";
import { initLayers, setLayerVisible, flyToLayer, setLayerKsbm, getCurrentKsbm } from "./layer.js";
import { initSplit } from "./split.js";
import { initDraw } from "./graphics.js";
import { AbilityEntity } from "./ability-entity.js";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NGM4NmQ5ZS00NWJiLTQ3MmItOWY2NC1hYjI0YjExMjViMDQiLCJpZCI6MzE5OTMsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1OTYyODcyNzd9.OA9tQ5_-jqejQUoBlBWkigjfK_irKu8GH_lP88hQYCs";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestWaterMask: true,
    requestVertexNormals: true,
  }),
  /**
   *  name: "draw vertex",
      description: `
        <table class="cesium-infoBox-defaultTable">
          <tr><td>经度</td><td>${longitude}</td></tr>
          <tr><td>纬度</td><td>${latitude}</td></tr>
          <tr><td>高度</td><td>${height} m</td></tr>
        </table>
      `,
      properties: {
        经度: longitude,
        纬度: latitude,
        高度: `${height} m`,
        _noInfoBox: true
      },

  * 信息框: 设置 name/description/properties 时显示信息框
  * properties 设置自定义 _noInfoBox 关闭信息框
   */
  infoBox: true,
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

// 监听选择实体变化，关闭信息框
viewer.selectedEntityChanged.addEventListener((entity) => {
  if (entity && entity.properties?.getValue?.()?._noInfoBox) {
    viewer.selectedEntity = undefined;
  }
});

// 移除 Viewer 内部的默认双击focus行为（不走 trackedEntity）
viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

// 设置初始时间
const time = new Date("2026-08-21T12:00:00+10:00");
viewer.clock.currentTime = Cesium.JulianDate.fromDate(time);

// 开启光照
viewer.scene.globe.enableLighting = true;

// 相机控制器
const cameraController = viewer.scene.screenSpaceCameraController;
cameraController.tiltEventTypes = [Cesium.CameraEventType.RIGHT_DRAG];
cameraController.rotateEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
cameraController.zoomEventTypes = [Cesium.CameraEventType.WHEEL];

// 添加 3D Tiles 数据（由 tiles.js 管理显隐）
await initTileset(viewer);

// 监听地形 Provider 切换
viewer.scene.terrainProviderChanged.addEventListener(async (newProvider) => {
  // 加载自定义 glTF 建筑模型
  const h = await getTerrainHeightByLonLat(viewer, 108.87673452217288, 34.19290863238342);
});

// 添加 OSM 建筑（由 osm.js 管理显隐）
const osmBuildings = await initOSMBuildings(viewer);

// ==================== 矢量高亮 ====================
let highlightEntity = null;

function clearHighlight() {
  if (!highlightEntity) return;
  if (highlightEntity instanceof Cesium.Entity) {
    viewer.entities.remove(highlightEntity);
  } else {
    viewer.scene.primitives.remove(highlightEntity);
  }
  highlightEntity = null;
}

// 注册全局点击事件
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction((click) => {
  if (AbilityEntity.isDrawing()) return;
  if (handleTreeLeftClick(click)) return;

  // 获取点击位置处的场景元素（Primitive或Entity）
  const picked = viewer.scene.pick(click.position);

  const pickRay = viewer.camera.getPickRay(click.position);
  const promise = viewer.imageryLayers.pickImageryLayerFeatures(pickRay, viewer.scene);
  if (Cesium.defined(promise)) {
    promise.then((features) => {
      const feat = features?.[0];
      clearHighlight();

      if (feat) {
        console.log(feat);
        highlightEntity = addHighlightFromGeometry(viewer, feat.data);

        const attr = feat.data.attributes;
        const labels = Object.entries(attr).map(([key, value]) => `${key}：${value}`);
        showLayerPopup(click.position, feat.data.layerName, labels);
        return;
      } else {
        fallbackPick(click, picked);
      }
    });
    return;
  } else {
    fallbackPick(click, picked);
  }

  clearHighlight();

  function fallbackPick(click, picked) {
    const cartesian = viewer.scene.pickPosition(click.position);
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    console.log(picked, lon, lat);

    if (Cesium.defined(picked) && picked.primitive === osmBuildings) {
      // 点击到 OSM 建筑
      showOSMPopup(click.position, cartesian);
    } else if (Cesium.defined(picked) && picked.primitive instanceof Cesium.Model) {
      // 点击到了模型
      showModelPopup(click.position, picked.primitive.featureIdLabel);
    } else if (picked?.id?.name === "Tree Polygon") {
      // 点击到了生态修复区域
      createTreeModel(viewer, cartesian);
    } else if (picked?.id?.name === AbilityEntity.name) {
      return void 0;
    } else {
      // 点击到了地形/地图
      const cartesian = viewer.scene.pickPosition(click.position);
      if (Cesium.defined(cartesian)) {
        showMapPopup(click.position, cartesian);
      } else {
        hidePopup();
      }
    }
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// 鼠标移动时隐藏弹窗（点击空白处也隐藏）
handler.setInputAction((movement) => {
  if (AbilityEntity.isDrawing()) return;
  if (handleTreeMouseMove(movement)) return;
  clearHighlight();
  hidePopup();
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

handler.setInputAction((movement) => {
  if (AbilityEntity.isDrawing()) return;
}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

// 初始化实体绘制工具
initDraw(viewer);

// 初始化树绘制模式
initTreeMode(viewer, handler);

// 初始化图层（默认同时展示）
await initLayers(viewer);

document.getElementById("layer0Toggle").addEventListener("change", async (e) => {
  setLayerVisible(0, e.target.checked);
  if (e.target.checked) {
    await flyToLayer(0);
  }
});
document.getElementById("layer1Toggle").addEventListener("change", async (e) => {
  setLayerVisible(1, e.target.checked);
  if (e.target.checked) {
    await flyToLayer(1);
  }
});

document.getElementById("mineSelect").addEventListener("change", async (e) => {
  const ksbm = e.target.value || null;
  await setLayerKsbm(ksbm);

  if (document.getElementById("layer0Toggle").checked) {
    await flyToLayer(0);
  } else if (document.getElementById("layer1Toggle").checked) {
    await flyToLayer(1);
  }
});

// 初始化卷帘对比
initSplit(viewer);

// 飞行到瓦片集
flyToTileset(viewer);
