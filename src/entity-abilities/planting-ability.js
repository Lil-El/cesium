import * as Cesium from "cesium";
import { Ability } from "./ability.js";
import { getHeightByCartesian, getTerrainHeightByCartesian } from "../geographic.js";

export class PlantingAbility extends Ability {
  name = "生态修复";

  #handler = null;

  #manual = !true;

  #helperEntities = [];

  #scale = 2.6; // 2.6 * 0.8 = 2.08 米

  #radius = 0.8; // 模型 radius 单位：米

  /**
   * @override
   */
  execute() {
    super.execute();

    if (this.active) {
      if (this.#manual) {
        this.name = "取消 - 生态修复";
        this.#setupHandlers(this.operated.viewer);
      } else {
        this.#planting();
      }
    }
  }

  /**
   * @override
   */
  cancel() {
    super.cancel();

    this.name = "生态修复";

    this.#teardownHandlers();

    this.#helperEntities.forEach((entity) => {
      this.operated.viewer.entities.remove(entity);
    });
    this.#helperEntities = [];
  }

  /**
   * 设置事件处理函数
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   */
  #setupHandlers(viewer) {
    this.#handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    this.#handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (picked?.id === this.operated.drawnEntity) {
        // const cartesian = viewer.scene.pickPosition(click.position);

        // const pixelSize = this.#getPixelSize(viewer, cartesian);
        // console.log(pixelSize);

        // const drillPicked = viewer.scene.drillPick(cartesian);
        // console.log(drillPicked);

        this.#plantingByManual(click);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  #teardownHandlers() {
    this.#handler?.destroy();
    this.#handler = null;
  }

  #plantingByManual(click) {
    const cartesian = this.operated.viewer.scene.pickPosition(click.position);
    this.#createEntityTree(this.operated.viewer, cartesian);
  }

  #planting() {

  }

  /**
   * 用 Entity 创建树模型
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   * @param {Cesium.Cartesian3} cartesian - 点击位置的笛卡尔坐标
   * @returns
   */
  async #createEntityTree(viewer, cartesian) {
    const scale = this.#scale; // 1 => radius 0.8m

    const h = scale / 2 + (await getHeightByCartesian(viewer, cartesian));

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);

    /**
     * RELATIVE_TO_TERRAIN RELATIVE_TO_GROUND 相对高度 h = 8 / 2
     * CLAMP_TO_GROUND CLAMP_TO_GROUND 固定在地面，position.height 无效
     */
    // 模型添加到 viewer.scene.primitives 中，可以获取到模型的 radius
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, h),
      model: {
        uri: "/models/tree.glb",
        scale,
        featureIdLabel: "🌳 一棵树",
      },
    });

    this.#helperEntities.push(entity);

    return entity;
  }

  // 是用 Primitive 创建树模型
  async #createPrimitiveTree(viewer, cartesian) {
    const scale = 8.0;

    const model = await Cesium.Model.fromGltfAsync({
      url: "/models/tree.glb",
      modelMatrix: null,
      scale,
      featureIdLabel: "🌳 一棵树",
    });

    const h = await getHeightByCartesian(viewer, cartesian);

    viewer.scene.primitives.add(model);

    model.readyEvent.addEventListener(() => {
      const boundingSphere = model.boundingSphere;
      const height = boundingSphere.radius / 2 + h + 0.07 * scale;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);

      const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);

      model.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    });

    return model;
  }

  /**
   * 获取像素大小的长度
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   * @param {Cesium.Cartesian3} worldPosition - 世界坐标
   * @returns
   */
  #getPixelSize(viewer, worldPosition) {
    const distance = Cesium.Cartesian3.distance(viewer.camera.position, worldPosition);
    const fovY = viewer.camera.frustum.fov; // 垂直视场角（弧度）
    const canvasHeight = viewer.canvas.clientHeight; // 画布像素高度

    return (2 * distance * Math.tan(fovY / 2)) / canvasHeight;
  }
}
