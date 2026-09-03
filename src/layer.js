import * as Cesium from "cesium";

const SERVICE_URL = "https://portal.beidouhj.com/server/rest/services/Geological_Hazards/MapServer";

let layer0 = null;
let layer1 = null;

/** @type {Cesium.Viewer | null} */
let _viewer = null;

/** @param {Cesium.Viewer} viewer */
export async function initLayers(viewer) {
  _viewer = viewer;

  if (layer0 || layer1) return;

  const provider0 = await Cesium.ArcGisMapServerImageryProvider.fromUrl(SERVICE_URL, {
    layers: "0",
    enablePickFeatures: true,
  });
  layer0 = new Cesium.ImageryLayer(provider0, {
    splitDirection: Cesium.SplitDirection.NONE,
  });
  _viewer.imageryLayers.add(layer0);

  const provider1 = await Cesium.ArcGisMapServerImageryProvider.fromUrl(SERVICE_URL, {
    layers: "1",
    enablePickFeatures: true,
  });
  layer1 = new Cesium.ImageryLayer(provider1, {
    splitDirection: Cesium.SplitDirection.NONE,
  });
  _viewer.imageryLayers.add(layer1);
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