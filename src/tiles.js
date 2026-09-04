import * as Cesium from "cesium";

const tilesetToggle = document.getElementById("tilesetToggle");
const osmToggle = document.getElementById("osmToggle");

let tilesetVisible = true;
let tileset = null;

let osmVisible = false;
let osmBuildings = null;

tilesetToggle.addEventListener("change", (e) => {
  tilesetVisible = e.target.checked;
  if (tileset) {
    tileset.show = tilesetVisible;
  }
});

osmToggle.addEventListener("change", (e) => {
  osmVisible = e.target.checked;
  if (osmBuildings) {
    osmBuildings.show = osmVisible;
  }
});

export async function initTileset(viewer) {
  tileset = viewer.scene.primitives.add(
    await Cesium.Cesium3DTileset.fromIonAssetId(69380),
  );
  tileset.show = tilesetVisible;
  return tileset;
}

export async function initOSMBuildings(viewer) {
  osmBuildings = await Cesium.createOsmBuildingsAsync();
  osmBuildings.show = osmVisible;
  viewer.scene.primitives.add(osmBuildings);
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
    tileset.splitDirection = enabled
      ? Cesium.SplitDirection.LEFT
      : Cesium.SplitDirection.NONE;
  }
  if (osmBuildings) {
    osmBuildings.splitDirection = enabled
      ? Cesium.SplitDirection.RIGHT
      : Cesium.SplitDirection.NONE;
  }
}