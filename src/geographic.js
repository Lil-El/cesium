import * as Cesium from "cesium";

/**
 * 需要在 terrainProvider 加载地形后调用，否则会报错
 * https://blog.csdn.net/gusushantang/article/details/158462588
 *
 * @param {Cesium.Viewer} viewer
 * @param {number} lon - 经度
 * @param {number} lat - 纬度
 * @returns
 */
export async function getTerrainHeightByLonLat(viewer, lon, lat) {
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);

  const terrainProvider = viewer.terrainProvider;
  const sampledPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, [cartographic]);

  return sampledPositions[0].height;
}

/**
 * 获取指定位置的地形高度
 *
 * @param {Cesium.Viewer} viewer
 * @param {Cesium.Cartesian3} cartesian
 * @returns
 */
export async function getTerrainHeightByCartesian(viewer, cartesian) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);

  const terrainProvider = viewer.terrainProvider;
  const sampledPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, [cartographic]);

  return sampledPositions[0].height;
}

/**
 * 获取指定位置的地形高度
 *
 * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
 * @param {number} lon - 经度
 * @param {number} lat - 纬度
 * @returns
 */
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

/**
 * 将笛卡尔坐标转换为 [lon, lat]
 * @param {Cesium.Cartesian3} cartesian
 * @returns {[number, number]}
 */
export function cartesianToLonLat(cartesian) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];
}
