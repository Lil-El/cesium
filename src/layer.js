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
    show: false,
  });
  _viewer.imageryLayers.add(layer0);

  const provider1 = await Cesium.ArcGisMapServerImageryProvider.fromUrl(SERVICE_URL, {
    layers: "1",
    enablePickFeatures: true,
  });
  provider1._resource.appendQueryParameters({
    layerDefs: JSON.stringify({
      1: "ksbm='C123'",
    }),
  });
  layer1 = new Cesium.ImageryLayer(provider1, {
    splitDirection: Cesium.SplitDirection.NONE,
    show: false,
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

export function setLayerVisible(index, visible) {
  const layer = index === 0 ? layer0 : layer1;
  if (layer) {
    layer.show = visible;
  }
}

export function flyToLayer(index) {
  console.log(layer0);
  if (!_viewer) return;

  const destinations = {
    0: { lon: 109.79192254519624, lat: 38.53135670450269, height: 80000 },
    1: { lon: 109.85, lat: 38.55, height: 80000 },
  };

  const d = destinations[index];
  if (d) {
    _viewer.camera.flyTo({
      destination: layer0.getImageryRectangle(),
      duration: 1.5,
    });
  }
}