import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import { Ability } from "./ability.js";
import { AbilityEntity } from "../ability-entity.js";
import {
  cartesianToLonLat,
  getHeightByCartesian,
  getHeightByLonLat,
  getTerrainHeightByCartesian,
} from "../geographic.js";

export class PlantingAbility extends Ability {
  name = "生态修复";

  #handler = null;

  #manual = false;

  #helperEntities = [];

  #helperPrimitives = new Cesium.PrimitiveCollection();

  #scale = 2.6; // 2.6 * 0.8 = 2.08 米

  #radius = 0.8; // 模型 radius 单位：米

  /**
   * @override
   */
  execute() {
    super.execute();

    if (this.active) {
      this.name = "取消 - 生态修复";
      if (this.#manual) {
        this.#setupHandlers(this.operated.viewer);
      } else {
        this.#planting(this.operated.points);
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

    this.operated.viewer.scene.primitives.remove(this.#helperPrimitives);
    if (this.#helperPrimitives.isDestroyed()) {
      console.log("helperPrimitives 已销毁");
    } else {
      this.#helperPrimitives.destroy();
    }
    this.#helperPrimitives = new Cesium.PrimitiveCollection();

    AbilityEntity.updateEntityProperties(this.operated.drawnEntity, "tree");
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

  async #plantingByManual(click) {
    const cartesian = this.operated.viewer.scene.pickPosition(click.position);
    const entity = await this.#createEntityTree(this.operated.viewer, cartesian);

    this.operated.viewer.entities.add(entity);

    this.#helperEntities.push(entity);

    AbilityEntity.updateEntityProperties(this.operated.drawnEntity, {
      tree: this.#helperEntities.length + " 棵树",
    });
  }

  /**
   * 用 Entity 创建树模型
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   * @param {Cesium.Cartesian3} cartesian - 点击位置的笛卡尔坐标
   * @returns
   */
  async #createEntityTree(viewer, cartesian) {
    const h = (this.#radius * this.#scale) / 2 + (await getHeightByCartesian(viewer, cartesian));

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);

    /**
     * RELATIVE_TO_TERRAIN RELATIVE_TO_GROUND 相对高度 h = 8 / 2
     * CLAMP_TO_GROUND CLAMP_TO_GROUND 固定在地面，position.height 无效
     */
    const entity = new Cesium.Entity({
      position: Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, h),
      model: {
        uri: "/models/tree.glb",
        scale: this.#scale,
        featureIdLabel: "🌳 一棵树",
      },
    });

    return entity;
  }

  /**
   * 用点网格创建树模型
   * @param {Cesium.Cartesian3[]} points - polygon 的顶点坐标
   */
  async #planting(points) {
    const viewer = this.operated.viewer;

    const offset = (this.#radius * this.#scale) / 2;

    const geoPoints = [...points, points[0]].map((p) => cartesianToLonLat(p));

    const geoPolygon = turf.polygon([geoPoints]);

    const bbox = turf.bbox(geoPolygon);

    const featArr = turf.pointGrid(bbox, Math.ceil(this.#radius * this.#scale), { units: "meters" });

    const coords = turf.coordAll(featArr);

    // 弧度
    const cartographics = coords.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat, 0));

    // 弧度
    const sampledPositions = await viewer.scene.sampleHeightMostDetailed(cartographics);

    const matrixes = sampledPositions.map((cartographic, i) => {
      const [lon, lat] = coords[i];
      const transformed = Cesium.Cartesian3.fromDegrees(lon, lat, cartographic.height + offset);
      return Cesium.Transforms.eastNorthUpToFixedFrame(transformed);
    });

    for (const modelMatrix of matrixes) {
      const model = await this.#createPrimitiveTree(this.operated.viewer, modelMatrix);
      this.#helperPrimitives.add(model);
    }

    // collection 可以当做 primitive 直接添加到 viewer.scene.primitives 中
    viewer.scene.primitives.add(this.#helperPrimitives);

    AbilityEntity.updateEntityProperties(this.operated.drawnEntity, {
      tree: this.#helperPrimitives.length + " 棵树",
    });
  }

  // 是用 Primitive 创建树模型
  async #createPrimitiveTree(viewer, modelMatrix) {
    // 第 1 棵：下载 + 解析 glTF（几百 ms）
    // 第 2~N 棵：直接从缓存克隆（几 ms），只需设置不同的 modelMatrix
    const model = await Cesium.Model.fromGltfAsync({
      url: "/models/tree.glb",
      modelMatrix,
      scale: this.#scale,
      featureIdLabel: "🌳 一棵树",
    });

    // model.readyEvent.addEventListener(() => {
    //   console.log("ready");
    //   const boundingSphere = model.boundingSphere;
    //   const height = h + boundingSphere.radius / 2;

    //   const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    //   const lon = Cesium.Math.toDegrees(cartographic.longitude);
    //   const lat = Cesium.Math.toDegrees(cartographic.latitude);

    //   const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);

    //   model.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    // });

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
