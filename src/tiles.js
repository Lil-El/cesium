import * as Cesium from "cesium";

const tilesetToggle = document.getElementById("tilesetToggle");
const osmToggle = document.getElementById("osmToggle");

let viewer = null;

let tilesetVisible = false;
let tileset = null;

let osmVisible = false;
let osmBuildings = null;

tilesetToggle.addEventListener("change", (e) => {
  tilesetVisible = e.target.checked;
  if (tileset) {
    tileset.show = tilesetVisible;
    flyToTileset();
  }
});

osmToggle.addEventListener("change", (e) => {
  osmVisible = e.target.checked;
  if (osmBuildings) {
    osmBuildings.show = osmVisible;
  }
});

export async function initTileset(_viewer) {
  viewer = _viewer;

  tileset = _viewer.scene.primitives.add(await Cesium.Cesium3DTileset.fromIonAssetId(69380));
  tileset.show = tilesetVisible;
  return tileset;
}

export async function initOSMBuildings(_viewer) {
  viewer = _viewer;

  osmBuildings = await Cesium.createOsmBuildingsAsync();
  osmBuildings.show = osmVisible;
  _viewer.scene.primitives.add(osmBuildings);
  return osmBuildings;
}

export function getTileset() {
  return tileset;
}

export function getOSMBuildings() {
  return osmBuildings;
}

export function set3DSplitMode(enabled) {
  if (tileset) {
    tileset.splitDirection = enabled ? Cesium.SplitDirection.LEFT : Cesium.SplitDirection.NONE;
  }
  if (osmBuildings) {
    osmBuildings.splitDirection = enabled ? Cesium.SplitDirection.RIGHT : Cesium.SplitDirection.NONE;
  }
}

export function flyToTileset() {
  viewer.flyTo(tileset, {
    duration: 1,
    offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(0), Cesium.Math.toRadians(-90), 0),
  });
}
