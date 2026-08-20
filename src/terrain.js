import * as Cesium from "cesium";

// https://blog.csdn.net/gusushantang/article/details/158462588
export async function getTerrainHeightByLonLat(viewer, lon, lat) {
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);

  const terrainProvider = viewer.terrainProvider;
  const sampledPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, [cartographic]);

  return sampledPositions[0].height;
}
