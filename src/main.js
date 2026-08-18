import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NGM4NmQ5ZS00NWJiLTQ3MmItOWY2NC1hYjI0YjExMjViMDQiLCJpZCI6MzE5OTMsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1OTYyODcyNzd9.OA9tQ5_-jqejQUoBlBWkigjfK_irKu8GH_lP88hQYCs";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestWaterMask: true,
    requestVertexNormals: true,
  }),
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  fullscreenButton: false,
  vrButton: false,
});

viewer.scene.globe.enableLighting = true;

// viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
//   url: Cesium.IonResource.fromAssetId(1),
//   requestWaterMask: true,
//   requestVertexNormals: true,
// });

// 添加 3D Tiles 数据
// const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
// const tileset = await Cesium.Cesium3DTileset.fromUrl('/tiles/tileset.json');
// viewer.scene.primitives.add(tileset);

// 加载自定义 glTF 建筑模型

setTimeout(async () => {
  const h = await getTerrainHeightByLonLat(viewer, 108.87722, 34.19241);

  const model = await Cesium.Model.fromGltfAsync({
    url: "/models/building.gltf",
    modelMatrix: null,
    scale: 1.0,
  });
  viewer.scene.primitives.add(model);

  model.readyEvent.addEventListener(() => {
    const boundingSphere = model.boundingSphere;
    const height = boundingSphere.radius * 2;

    model.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(108.87722, 34.19241, h + height / 2),
    );
  });
}, 5000);

// 飞向模型所在位置
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(108.87722, 34.188, 1200),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0,
  },
  duration: 2,
});

// 添加 OSM 建筑
const osmBuildings = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(osmBuildings);

// viewer.camera.flyTo({
//   destination: Cesium.Cartesian3.fromDegrees(108.87722, 34.188, 1200),
//   orientation: {
//     heading: Cesium.Math.toRadians(0),
//     pitch: Cesium.Math.toRadians(-60),
//     roll: 0
//   },
//   duration: 2
// });

async function getTerrainHeightByLonLat(viewer, lon, lat) {
  // 1. 转换为弧度（Cesium 内部计算用弧度）
  const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);

  // 2. 执行地形采样（使用最高精度）
  const terrainProvider = viewer.terrainProvider; // 初始是 undefined, 后续会赋值
  const sampledPositions = await Cesium.sampleTerrainMostDetailed(
    terrainProvider,
    [cartographic], // 传入数组，支持批量查询
  );

  // 3. 返回地形高度（米）
  return sampledPositions[0].height;
}