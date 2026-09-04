import * as Cesium from "cesium";
import { expandRectangle } from "./geometry.js";

const SERVICE_URL = "https://portal.beidouhj.com/server/rest/services/Geological_Hazards/MapServer";

let layer0 = null;
let layer1 = null;
let provider0 = null;
let provider1 = null;

/** @type {Cesium.Viewer | null} */
let _viewer = null;

/** @type {string | null} */
let currentKsbm = null;

/** @type {Map<string, Cesium.Rectangle>} */
const extentCache = new Map();

/**
 * 查询 ArcGIS 图层的 extent 范围，结果会被缓存
 * @param {string} layerId - 子图层 ID
 * @param {string | null} ksbm - 矿区 ksbm 过滤条件，传 null 则查询全部
 * @returns {Promise<Cesium.Rectangle | null>}
 */
async function queryLayerExtent(layerId, ksbm) {
  const cacheKey = `${layerId}:${ksbm || "__all__"}`;
  if (extentCache.has(cacheKey)) {
    return extentCache.get(cacheKey);
  }

  const where = ksbm ? `ksbm='${ksbm}'` : "1=1";

  try {
    const url = `${SERVICE_URL}/${layerId}/query`;
    const params = new URLSearchParams({
      where,
      returnExtentOnly: "true",
      f: "json",
    });
    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (data.extent) {
      const { xmin, ymin, xmax, ymax } = data.extent;
      const rectangle = Cesium.Rectangle.fromDegrees(xmin, ymin, xmax, ymax);
      extentCache.set(cacheKey, rectangle);
      return rectangle;
    }
  } catch (err) {
    console.error(`查询图层 ${layerId} 范围失败:`, err);
  }

  return null;
}

/**
 * 创建指定子图层的 provider 和 ImageryLayer
 * @param {string} layerId - 子图层 ID
 * @param {string | null} ksbm - 矿区 ksbm 过滤条件，传 null 则不过滤
 * @returns {Promise<{provider: Cesium.ArcGisMapServerImageryProvider, layer: Cesium.ImageryLayer}>}
 */
async function createProviderAndLayer(layerId, ksbm) {
  const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(SERVICE_URL, {
    layers: layerId,
    enablePickFeatures: true,
  });

  if (ksbm) {
    provider._resource.appendQueryParameters({
      layerDefs: JSON.stringify({
        [layerId]: `ksbm='${ksbm}'`,
      }),
    });
  }

  const rectangle = await queryLayerExtent(layerId, ksbm);

  const layer = new Cesium.ImageryLayer(provider, {
    splitDirection: Cesium.SplitDirection.NONE,
    show: false,
    rectangle: rectangle || undefined,
  });

  return { provider, layer };
}

/** @param {Cesium.Viewer} viewer */
export async function initLayers(viewer) {
  _viewer = viewer;

  if (layer0 || layer1) return;

  const result0 = await createProviderAndLayer("0", null);
  provider0 = result0.provider;
  layer0 = result0.layer;
  _viewer.imageryLayers.add(layer0);

  const result1 = await createProviderAndLayer("1", null);
  provider1 = result1.provider;
  layer1 = result1.layer;
  _viewer.imageryLayers.add(layer1);
}

/**
 * 设置矿区 ksbm 过滤条件，删除原有图层和 provider，重新创建并添加
 * @param {string | null} ksbm - 矿区 ksbm 值，传 null 或空字符串则清除过滤
 */
export async function setLayerKsbm(ksbm) {
  if (!_viewer) return;

  currentKsbm = ksbm;

  const wasVisible0 = layer0 ? layer0.show : false;
  const wasVisible1 = layer1 ? layer1.show : false;

  if (layer0) {
    _viewer.imageryLayers.remove(layer0, true);
    layer0 = null;
  }
  if (layer1) {
    _viewer.imageryLayers.remove(layer1, true);
    layer1 = null;
  }
  provider0 = null;
  provider1 = null;

  const result0 = await createProviderAndLayer("0", ksbm);
  provider0 = result0.provider;
  layer0 = result0.layer;
  _viewer.imageryLayers.add(layer0);

  const result1 = await createProviderAndLayer("1", ksbm);
  provider1 = result1.provider;
  layer1 = result1.layer;
  _viewer.imageryLayers.add(layer1);

  layer0.show = wasVisible0;
  layer1.show = wasVisible1;
}

export function getCurrentKsbm() {
  return currentKsbm;
}

export function setSplitMode(enabled) {
  if (!_viewer || !layer0 || !layer1) return;

  if (enabled) {
    layer0.splitDirection = Cesium.SplitDirection.LEFT;
    layer1.splitDirection = Cesium.SplitDirection.RIGHT;
    _viewer.scene.splitPosition = 0.5;
  } else {
    layer0.splitDirection = Cesium.SplitDirection.NONE;
    layer1.splitDirection = Cesium.SplitDirection.NONE;
    _viewer.scene.splitPosition = 0;
  }
}

export function getLayer0() {
  return layer0;
}

export function getLayer1() {
  return layer1;
}

export function setLayerVisible(index, visible) {
  const layer = index === 0 ? layer0 : layer1;
  if (layer) {
    layer.show = visible;
  }
}

export async function flyToLayer(index) {
  if (!_viewer) return;

  const layerId = String(index);
  const rectangle = await queryLayerExtent(layerId, currentKsbm);

  if (rectangle) {
    _viewer.camera.flyTo({
      destination: expandRectangle(rectangle, 0.1),
      duration: 1.5,
    });
    return;
  }
}