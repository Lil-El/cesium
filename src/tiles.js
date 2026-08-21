import * as Cesium from "cesium";

const tilesetToggle = document.getElementById("tilesetToggle");

let tilesetVisible = true;
let tileset = null;

tilesetToggle.addEventListener("change", (e) => {
  tilesetVisible = e.target.checked;
  if (tileset) {
    tileset.show = tilesetVisible;
  }
});

export async function initTileset(viewer) {
  tileset = viewer.scene.primitives.add(
    await Cesium.Cesium3DTileset.fromIonAssetId(69380),
  );
  tileset.show = tilesetVisible;
  return tileset;
}

// viewer.zoomTo(tileset);
