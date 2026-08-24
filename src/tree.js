import * as Cesium from "cesium";
import { getHeightByCartesian } from "./terrain.js";

let treeEnabled = false;
let isFirstClick = false;
let drawPoints = [];
let polylineEntity = null;
let polygonEntity = null;
let pointEntities = [];
let previewPointEntity = null;
let previewPolygonEntity = null;

const treeToggle = document.getElementById("treeToggle");
const treeControls = document.getElementById("treeControls");
const treeClearBtn = document.getElementById("treeClearBtn");

export function getTreePolygonPositions() {
  if (!polygonEntity) return null;
  return polygonEntity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
}

treeToggle.addEventListener("change", (e) => {
  treeEnabled = e.target.checked;
  treeControls.style.display = treeEnabled ? "block" : "none";

  const canvas = viewer ? viewer.scene.canvas : null;
  if (canvas) {
    canvas.style.cursor = treeEnabled ? "crosshair" : "default";
  }

  clearAll();
});

treeClearBtn.addEventListener("click", () => {
  clearDrawState();
});

function clearDrawState() {
  drawPoints = [];
  if (polylineEntity && viewer) {
    viewer.entities.remove(polylineEntity);
    polylineEntity = null;
  }
  if (viewer) {
    pointEntities.forEach((p) => viewer.entities.remove(p));
    pointEntities = [];
  }
}

function clearAll() {
  clearDrawState();
  if (polygonEntity && viewer) {
    viewer.entities.remove(polygonEntity);
    polygonEntity = null;
  }
}

function removePreviewEntities() {
  if (previewPointEntity && viewer) {
    viewer.entities.remove(previewPointEntity);
    previewPointEntity = null;
  }
  if (previewPolygonEntity && viewer) {
    viewer.entities.remove(previewPolygonEntity);
    previewPolygonEntity = null;
  }
}

let viewer = null;

export function initTreeMode(_viewer, handler) {
  viewer = _viewer;

  handler.setInputAction((click) => {
    if (!treeEnabled) return;
    if (drawPoints.length < 3) return;
    if (!isFirstClick) return false;

    isFirstClick = false;

    removePreviewEntities();

    if (polygonEntity) {
      viewer.entities.remove(polygonEntity);
    }

    polygonEntity = viewer.entities.add({
      name: "Tree Polygon",
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(drawPoints),
        material: Cesium.Color.GREEN.withAlpha(0.4),
        outline: true,
        outlineColor: Cesium.Color.LIME,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

   // 计算多边形面积（取绝对值，因为顶点顺序会影响符号）
    const area = Math.abs(Cesium.PolygonPipeline.computeArea2D(drawPoints));

    clearDrawState();

    treeEnabled = false;
    treeToggle.checked = false;
    treeControls.style.display = "none";
    viewer.scene.canvas.style.cursor = "default";
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
}

export function handleTreeLeftClick(click) {
  if (!treeEnabled) return false;
  if (!viewer) return false;

  // 笛卡尔坐标
  const cartesian = viewer.scene.pickPosition(click.position);
  if (!Cesium.defined(cartesian)) return false;

  // 经纬度坐标
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const h = cartographic.height;

  if (drawPoints.length === 0) {
    drawPoints.push(cartesian);

    previewPolygonEntity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          return new Cesium.PolygonHierarchy(drawPoints);
        }, false),
        material: Cesium.Color.GREEN.withAlpha(0.4),
        outline: true,
        outlineColor: Cesium.Color.LIME.withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });

    isFirstClick = true;
  }
  drawPoints.push(cartesian);

  const pointEntity = viewer.entities.add({
    // position: new Cesium.CallbackPositionProperty();
    position: Cesium.Cartesian3.fromDegrees(lon, lat, h), // 经纬度坐标 转 笛卡尔坐标
    point: {
      pixelSize: 8,
      color: Cesium.Color.LIME,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  pointEntities.push(pointEntity);

  return true;
}

export function handleTreeMouseMove(movement) {
  if (!treeEnabled) return false;
  if (!viewer) return false;
  if (!isFirstClick) return false;

  // 拾取建筑、地形等实体
  const cartesian = viewer.scene.pickPosition(movement.endPosition);

  // 拾取地形、地球表面
  // const ray = viewer.camera.getPickRay(movement.endPosition);
  // const cartesian = viewer.scene.globe.pick(ray, viewer.scene);

  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const h = cartographic.height;

  drawPoints.pop();
  drawPoints.push(cartesian);

  updatePreviewPoint(lon, lat, h);

  return true;
}

function updatePreviewPoint(lon, lat, h) {
  if (previewPointEntity && viewer) {
    previewPointEntity.position = Cesium.Cartesian3.fromDegrees(lon, lat, h);
  } else {
    previewPointEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, h),
      point: {
        pixelSize: 6,
        color: Cesium.Color.LIME.withAlpha(0.6),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

/**
 *
 * @param {Cesium.Viewer} viewer
 * @param {Cesium.Cartesian3} cartesian
 * @returns
 */
export async function createTreeModel(viewer, cartesian) {
  const model = await Cesium.Model.fromGltfAsync({
    url: "/models/tree.glb",
    modelMatrix: null,
    scale: 1.0,
    maximumPixelSize: 50,
  });

  const h = await getHeightByCartesian(viewer, cartesian);

  viewer.scene.primitives.add(model);

  model.readyEvent.addEventListener(() => {
    const boundingSphere = model.boundingSphere;
    const height = boundingSphere.radius / 2 + h + 0.07;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);

    model.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
  });

  return model;
}