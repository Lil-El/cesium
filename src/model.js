import * as Cesium from "cesium";

const model = await Cesium.Model.fromGltfAsync({
  url: "/models/tree.glb",
  modelMatrix: null,
  scale: 1.0,
  minimumPixelSize: 50,
});

export default model;