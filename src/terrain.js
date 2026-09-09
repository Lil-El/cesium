import * as Cesium from "cesium";

/**
 * 需要在 terrainProvider 加载地形后调用，否则会报错
 * https://blog.csdn.net/gusushantang/article/details/158462588
 *
 * @param {*} viewer
 * @param {*} lon
 * @param {*} lat
 * @returns
 */
export async function getTerrainHeightByLonLat(viewer, lon, lat) {
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);

  const terrainProvider = viewer.terrainProvider;
  const sampledPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, [cartographic]);

  return sampledPositions[0].height;
}

export async function getTerrainHeightByCartesian(viewer, cartesian) {
  const terrainProvider = viewer.terrainProvider;
  const sampledPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, [cartesian]);

  return sampledPositions[0].z;
}

export async function getHeightByLonLat(viewer, lon, lat) {
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);

  const sampledPositions = await viewer.scene.sampleHeightMostDetailed([cartographic]);

  return sampledPositions[0].height;
}

export async function getHeightByCartesian(viewer, cartesian) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);

  const sampledPositions = await viewer.scene.sampleHeightMostDetailed([cartographic]);

  return sampledPositions[0].height;
}