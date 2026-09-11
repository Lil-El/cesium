import * as Cesium from "cesium";
import { AbilityContextMenu } from "./entity-abilities/ability-context-menu.js";

/**
 * @typedef AbilityEntity.Mode
 *
 * @type {"polyline" | "polygon"} - 类型
 */

/**
 * @typedef AbilityEntity.Result
 *
 * @property {AbilityEntity.Mode} mode - 类型
 * @property {Cesium.Cartesian3[]} points - 顶点坐标
 * @property {Cesium.Entity} entity - 实体
 */

/**
 * @class
 * @description 绘制并授权实体的能力类
 */
export class AbilityEntity {
  static name = "Ability Entity";

  /** @type {Cesium.Viewer} viewer */
  #viewer = null;

  /** @type {Object<AbilityEntity.Mode, AbilityEntity.Ability[]>} abilityMap */
  #abilityMap = {};

  /** @type {boolean} drawing */
  #drawing = false;

  /** @type {AbilityEntity.Mode} */
  mode = "polyline";

  /** @type {Cesium.Cartesian3[]} points */
  points = [];

  /** @type {Cesium.Entity} drawnEntity */
  drawnEntity = null;

  /** @type {Cesium.Entity} previewEntity */
  #previewEntity = null;

  /** @type {Cesium.Entity[]} helperEntities */
  #helperEntities = [];

  /** @type {Cesium.Color} color */
  #color = 0;

  /** @type {Promise<AbilityEntity.Result>} promise */
  #promise = null;

  /** @type {function(result: AbilityEntity.Result)} void} resolve */
  #resolve = null;

  /** @type {function(error: Error)} void} reject */
  #reject = null;

  /** @type {number} lastClickTime */
  #lastClickTime = 0;

  /** @type {Cesium.ScreenSpaceEventHandler} eventHandler */
  static #eventHandler = null;

  /** @type {AbilityEntity} activeInstance */
  static activeInstance = null;

  /** @type {AbilityEntity[]} allInstances */
  static allInstances = [];

  /**
   * 构造函数
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   * @param {Cesium.Color} color - 绘制颜色，默认红色
   * @param {Object<AbilityEntity.Mode, AbilityEntity.Ability[]>} abilityMap - 能力映射表
   */
  constructor({ viewer, color = Cesium.Color.RED, abilityMap = {} }) {
    this.#viewer = viewer;
    this.#color = color;
    this.#abilityMap = abilityMap;

    AbilityEntity.#setupHandler(viewer);

    AbilityEntity.allInstances.forEach((i) => i.stop());

    AbilityEntity.allInstances.push(this);
  }

  static isDrawing() {
    return AbilityEntity.allInstances.some((i) => i.isDrawing());
  }

  get viewer() {
    return this.#viewer;
  }

  isDrawing() {
    return this.#drawing;
  }

  drawPolyline() {
    this.mode = "polyline";
    return this.#draw();
  }

  drawPolygon() {
    this.mode = "polygon";
    return this.#draw();
  }

  clear() {
    this.points = [];
    this.#removeDrawn();
    this.#removePreview();
    this.#removeHelper();
  }

  stop() {
    AbilityEntity.activeInstance = null;
    this.#drawing = false;

    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "default";
    }

    this.clear();
  }

  #draw() {
    this.stop();

    AbilityEntity.activeInstance = this;
    this.#drawing = true;

    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "crosshair";
    }
    const { promise, resolve, reject } = Promise.withResolvers();
    this.#promise = promise;
    this.#resolve = resolve;
    this.#reject = reject;
    return this.#promise;
  }

  /**
   * 设置事件处理函数
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   */
  static #setupHandler(viewer) {
    if (AbilityEntity.#eventHandler) return;

    AbilityEntity.#eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    AbilityEntity.#eventHandler.setInputAction((click) => {
      AbilityEntity.#handleLeftClick(click);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    AbilityEntity.#eventHandler.setInputAction(() => {
      AbilityEntity.#handleDbClick();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    AbilityEntity.#eventHandler.setInputAction((movement) => {
      AbilityEntity.#handleMouseMove(movement);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    AbilityEntity.#eventHandler.setInputAction((click) => {
      AbilityEntity.#handleRightClick(click);
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  /**
   * 移除绘制事件处理函数
   */
  static #teardownDrawHandler() {
    if (AbilityEntity.#eventHandler) {
      AbilityEntity.#eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      AbilityEntity.#eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      AbilityEntity.#eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
  }

  /**
   * 移除事件处理函数
   */
  static #teardownHandler() {
    if (AbilityEntity.#eventHandler) {
      AbilityEntity.#eventHandler.destroy();
      AbilityEntity.#eventHandler = null;
    }
  }

  static #handleLeftClick(click) {
    const active = AbilityEntity.activeInstance;

    if (!active) return false;
    if (!active.isDrawing()) return false;
    if (!active.#viewer) return false;

    const cartesian = active.#viewer.scene.pickPosition(click.position);
    if (!Cesium.defined(cartesian)) return false;

    if (Date.now() - active.#lastClickTime < 300) return false; // 防止双击重复添加 point

    active.#lastClickTime = Date.now();

    active.points.push(cartesian);

    if (active.points.length === 1) {
      active.points.push(cartesian);

      if (active.mode === "polyline") {
        active.#createPolylinePreview();
      } else {
        active.#createPolygonPreview();
      }
    }

    active.#createHelper();
  }

  static #handleRightClick(click) {
    if (AbilityEntity.allInstances.length === 0) return false;

    const viewer = AbilityEntity.allInstances[0].viewer;
    const picked = viewer.scene.pick(click.position);
    if (!Cesium.defined(picked)) return void AbilityContextMenu.hideMenu();

    const drawnEntity = picked.id;
    const activeInstance = drawnEntity?.properties?.getValue()?.["parent"];

    if (drawnEntity instanceof Cesium.Entity && activeInstance instanceof AbilityEntity) {
      AbilityEntity.activeInstance = activeInstance;
      if (activeInstance.isDrawing()) return false;

      AbilityContextMenu.build(viewer, drawnEntity);
      AbilityContextMenu.showMenu(click.position);
    } else {
      AbilityContextMenu.hideMenu();
    }
  }

  static #handleDbClick() {
    const active = AbilityEntity.activeInstance;

    if (!active) return false;
    if (!active.isDrawing()) return false;
    if (active.points.length === 0) return false;

    if (active.mode === "polyline") {
      active.#finishPolyline();
    } else {
      active.#finishPolygon();
    }
  }

  static #handleMouseMove(movement) {
    const active = AbilityEntity.activeInstance;

    if (!active) return false;
    if (!active.isDrawing()) return false;
    if (!active.#viewer) return false;
    if (active.points.length === 0) return false;

    const cartesian = active.#viewer.scene.pickPosition(movement.endPosition);
    if (!Cesium.defined(cartesian)) return false;

    active.points.pop();
    active.points.push(cartesian);
  }

  #removePreview() {
    if (this.#previewEntity) {
      this.#viewer.entities.remove(this.#previewEntity);
      this.#previewEntity = null;
    }
  }

  #removeHelper() {
    this.#helperEntities.forEach((i) => this.#viewer.entities.remove(i));
    this.#helperEntities = [];
  }

  #removeDrawn() {
    if (this.drawnEntity) {
      this.#viewer.entities.remove(this.drawnEntity);
      this.drawnEntity = null;
    }
  }

  #finish() {
    AbilityEntity.activeInstance = null;
    this.#drawing = false;

    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "default";
    }

    this.#helperEntities.forEach((i) => (i.show = false));

    this.drawnEntity = this.#previewEntity;
    this.#previewEntity = null;

    const abilities = this.#abilityMap[this.mode] || [];
    this.drawnEntity.properties.addProperty("abilities", abilities);
    this.drawnEntity.properties.addProperty("parent", this);

    this.#resolve({ mode: this.mode, points: this.points, entity: this.drawnEntity });
  }

  #finishPolyline() {
    if (this.points.length < 2) {
      this.#removePreview();
      this.#reject("至少需要两个点");
      return;
    }

    this.#previewEntity.polyline.positions = [...this.points];

    this.#finish();
  }

  #finishPolygon() {
    if (this.points.length < 3) {
      this.#removePreview();
      this.#reject("至少需要三个点");
      return;
    }

    this.#previewEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(this.points);

    const polylineHelper = this.#viewer.entities.getById("PolylineHelper");
    if (polylineHelper) {
      polylineHelper.polyline.positions = [...this.points, this.points.at(0)];
    }

    this.#finish();
  }

  #createHelper() {
    const point = this.#viewer.entities.add({
      /**
       * CallbackPositionProperty 动态更新点的位置
       * https://sandcastle.cesium.com/index.html?id=callback-position-property
       */
      position: this.points.at(-1),
      point: {
        pixelSize: 6,
        color: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.AQUA,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
    this.#helperEntities.push(point);

    if (this.mode === "polyline" || this.#viewer.entities.getById("PolylineHelper")) return;

    const polyline = this.#viewer.entities.add({
      id: "PolylineHelper",
      polyline: {
        positions: new Cesium.CallbackProperty(() => [...this.points, this.points.at(0)], false),
        width: 2,
        material: Cesium.Color.AQUA.withAlpha(0.8),
        clampToGround: true,
      },
    });
    this.#helperEntities.push(polyline);
  }

  #createPolylinePreview() {
    const id = crypto.randomUUID();

    this.#previewEntity = this.#viewer.entities.add({
      id, // unique
      name: AbilityEntity.name, // not unique
      description: `
        <table class="cesium-infoBox-defaultTable">
        <tr><td>id</td><td>${id}</td></tr>
          <tr><td>name</td><td>${AbilityEntity.name}</td></tr>
          <tr><td>mode</td><td>${this.mode}</td></tr>
        </table>
      `,
      properties: {},
      polyline: {
        positions: new Cesium.CallbackProperty(() => this.points, false),
        width: 2,
        material: this.#color.withAlpha(0.5),
        clampToGround: true,
      },
    });
  }

  #createPolygonPreview() {
    const id = crypto.randomUUID();

    this.#previewEntity = this.#viewer.entities.add({
      id, // unique
      name: AbilityEntity.name, // not unique
      description: `
        <table class="cesium-infoBox-defaultTable">
          <tr><td>id</td><td>${id}</td></tr>
          <tr><td>name</td><td>${AbilityEntity.name}</td></tr>
          <tr><td>mode</td><td>${this.mode}</td></tr>
        </table>
      `,
      properties: {},
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(this.points), false),
        material: this.#color.withAlpha(0.2),
        outline: true,
        outlineColor: this.#color.withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}
