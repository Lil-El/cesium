import * as Cesium from "cesium";
import { getTerrainHeightByCartesian, getHeightByCartesian } from "./geographic.js";

const tilesetToggle = document.getElementById("tilesetToggle");
const osmToggle = document.getElementById("osmToggle");

let viewer = null;

let tilesetVisible = true;
let tileset = null;

let osmVisible = false;
let osmBuildings = null;

tilesetToggle.addEventListener("change", (e) => {
  tilesetVisible = e.target.checked;
  if (tileset) {
    tileset.show = tilesetVisible;
    if (tilesetVisible) {
      flyToTileset();
    }
  }
});

osmToggle.addEventListener("change", (e) => {
  osmVisible = e.target.checked;
  if (osmBuildings) {
    osmBuildings.show = osmVisible;
  }
});

/**
 * // Adjust a tileset's height from the globe's surface.
    const heightOffset = 20.0;
    const boundingSphere = tileset.boundingSphere;
    const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
    const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
    const offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
    const translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
 */
/**
 *
 * @param {Cesium.Viewer} _viewer
 * @returns
 */
export async function initTileset(_viewer) {
  viewer = _viewer;

  const ts = await Cesium.Cesium3DTileset.fromIonAssetId(69380);

  tileset = _viewer.scene.primitives.add(ts);
  tileset.show = tilesetVisible;

  // show=true 时才能获取到正确的 terrain 高度
  const boundingSphere = tileset.boundingSphere;
  const cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
  const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
  const tilesetHeight = await getHeightByCartesian(_viewer, boundingSphere.center);
  const terrainHeight = await getTerrainHeightByCartesian(_viewer, boundingSphere.center);
  const offset = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    tilesetHeight - terrainHeight,
  );
  const translation = Cesium.Cartesian3.subtract(surface, offset, new Cesium.Cartesian3());
  // 调整 tileset 高度，使它在贴合在地形上
  // 调整高度可以避免测量label的 高度参考系 为 CLAMP_TO_GROUND 时，label 被遮挡的问题
  tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);

  // 中心定位点
  // viewer.entities.add({
  //   position: boundingSphere.center,
  //   name: "Tileset",
  //   point: {
  //     color: Cesium.Color.RED,
  //     pixelSize: 10,
  //   },
  // });

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
