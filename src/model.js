import * as Cesium from "cesium";

const model = await Cesium.Model.fromGltfAsync({
  url: "/models/building.gltf",
  modelMatrix: null,
  scale: 1.0,
});

export default model;
