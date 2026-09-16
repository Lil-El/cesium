import * as Cesium from "cesium";
import { AbilitySupervisor } from "./entity-abilities/ability-supervisor.js";
import { Ability } from "./entity-abilities/ability.js";

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
 * @classdesc 绘制并授权实体的能力类
 */
export class AbilityEntity {
  static name = "Ability Entity";

  /**
   * @private
   * @member {Cesium.Viewer} viewer
   */
  #viewer;

  /**
   * @private
   * @member {*} rawAbilityMap
   */
  #rawAbilityMap = {};

  /**
   * @private
   * @member {boolean} drawing
   */
  #drawing = false;

  /**
   * @private
   * @member {AbilityEntity.Mode}
   */
  #mode = "polyline";

  /**
   * @private
   * @member {Cesium.Cartesian3[]}
   */
  #points = [];

  /**
   * @private
   * @member {Cesium.Entity} drawnEntity
   */
  #drawnEntity;

  /**
   * @private
   * @member {Cesium.Entity} previewEntity
   */
  #previewEntity;

  /**
   * @private
   * @member {Cesium.Entity[]} helperEntities
   */
  #helperEntities = [];

  /**
   * @private
   * @member {Cesium.Color} color
   */
  #color = Cesium.Color.AQUA;

  /**
   * @private
   * @member {Promise<AbilityEntity.Result>} promise
   */
  #promise = null;

  /**
   * @private
   * @member {function()} void} resolve
   */
  #resolve = null;

  /**
   * @private
   * @member {function(error: Error)} void} reject
   */
  #reject = null;

  /**
   * @private
   * @member {number} lastClickTime
   */
  #lastClickTime = 0;

  /**
   * @private
   * @member {AbilitySupervisor} supervisor
   */
  #supervisor = null;

  #listeners = {};

  /**
   * @private
   * @static
   * @member {Cesium.ScreenSpaceEventHandler} eventHandler
   */
  static #eventHandler = null;

  /**
   * @static
   * @member {AbilityEntity} activeInstance
   */
  static activeInstance = null;

  /**
   * @static
   * @member {AbilityEntity[]} allInstances
   */
  static allInstances = [];

  /**
   * @constructor
   *
   * @param {Object} options - 配置选项
   * @param {Cesium.Viewer} options.viewer - Cesium Viewer 实例
   * @param {*} [options.abilityMap={}] - 能力映射表，key 为绘制模式，value 为返回能力数组的工厂函数
   * @param {Cesium.Entity} [options.entity=null] - 绘制的实体，用于授权能力
   */
  constructor({ viewer, abilityMap = {}, entity = null }) {
    this.#viewer = viewer;
    this.#rawAbilityMap = abilityMap;

    if (entity && entity instanceof Cesium.Entity) {
      if (!this.#viewer.entities.contains(entity)) this.#viewer.entities.add(entity);

      this.#mode = !!entity.polyline ? "polyline" : "polygon";
      this.#drawnEntity = entity;

      if (this.#mode === "polygon") {
        this.#points = entity.polygon.hierarchy.getValue().positions;
      } else if (this.#mode === "polyline") {
        this.#points = entity.polyline.positions.getValue().positions;
      }

      this.#impower();
    }

    AbilityEntity.#setupHandlers(viewer);

    AbilityEntity.allInstances.forEach((i) => i.cancel());

    AbilityEntity.allInstances.push(this);
  }

  static isDrawing() {
    return AbilityEntity.allInstances.some((i) => i.isDrawing());
  }

  /**
   * @member {Cesium.Viewer} viewer
   * @returns {Cesium.Viewer} - Cesium Viewer 实例
   */
  get viewer() {
    return this.#viewer;
  }

  get mode() {
    return this.#mode;
  }

  /**
   * @member {Cesium.Cartesian3[]}
   * @returns {Cesium.Cartesian3[]} - 顶点坐标
   */
  get points() {
    return this.#points;
  }

  get supervisor() {
    return this.#supervisor;
  }

  get rawAbilityMap() {
    return this.#rawAbilityMap;
  }

  /**
   * @member {Cesium.Entity} drawnEntity
   * @returns {Cesium.Entity} - 绘制的实体
   */
  get drawnEntity() {
    return this.#drawnEntity;
  }

  isDrawing() {
    return this.#drawing;
  }

  cancel() {
    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "default";
    }

    AbilityEntity.activeInstance = null;
    this.#drawing = false;

    this.#removePreview();
    this.#removeHelper();
  }

  destroy() {
    if (this.#listeners.destroy) {
      this.#listeners.destroy.forEach((callback) => callback(this));
    }

    this.cancel();

    // 先移除能力
    this.#removeAbility();

    // 后移除绘制的实体
    this.#points = [];
    this.#removeDrawn();

    // 移除所有监听器
    this.#listeners = {};
  }

  #draw() {
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

  drawPolyline() {
    this.destroy();

    this.#mode = "polyline";
    return this.#draw();
  }

  drawPolygon() {
    this.destroy();

    this.#mode = "polygon";
    return this.#draw();
  }

  /**
   * 设置事件处理函数
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   */
  static #setupHandlers(viewer) {
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
   * 移除事件处理函数
   */
  static #teardownHandlers() {
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

    active.#points.push(cartesian);

    if (active.#points.length === 1) {
      active.#points.push(cartesian);

      if (active.#mode === "polyline") {
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
    const drillPicked = viewer.scene.drillPick(click.position, 10, 10);

    if (drillPicked.length === 0) return void 0;

    const picked = drillPicked.find((i) => i.id instanceof Cesium.Entity);
    if (!picked) return void 0;

    const drawnEntity = picked.id;
    const activeInstance = drawnEntity?.properties?.getValue()?.["_parent"];

    if (!activeInstance) return false;

    if (drawnEntity instanceof Cesium.Entity && activeInstance instanceof AbilityEntity) {
      AbilityEntity.activeInstance = activeInstance;
      if (activeInstance.isDrawing()) return false;

      activeInstance.supervisor.showContextMenu(click.position);
    } else {
      activeInstance.supervisor.hideContextMenu();
    }
  }

  static #handleDbClick() {
    const active = AbilityEntity.activeInstance;

    if (!active) return false;
    if (!active.isDrawing()) return false;
    if (active.#points.length === 0) return false;

    active.#points.pop();

    if (active.#mode === "polyline") {
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
    if (active.#points.length === 0) return false;

    const cartesian = active.#viewer.scene.pickPosition(movement.endPosition);
    if (!Cesium.defined(cartesian)) return false;

    active.#points.pop();
    active.#points.push(cartesian);
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
    if (this.#drawnEntity) {
      this.#viewer.entities.remove(this.#drawnEntity);
      this.#drawnEntity = null;
    }
  }

  #removeAbility() {
    if (this.#supervisor) {
      this.#supervisor.destroy();
      this.#supervisor = null;
    }
  }

  #finish() {
    AbilityEntity.activeInstance = null;
    this.#drawing = false;

    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "default";
    }

    this.#removeHelper();

    this.#drawnEntity = this.#previewEntity;
    this.#previewEntity = null;

    this.#impower();

    this.#resolve();
  }

  #impower() {
    if (!this.#drawnEntity) return;

    this.#supervisor = new AbilitySupervisor(this);

    AbilityEntity.updateEntityProperties(this.#drawnEntity, {
      _abilities: this.#supervisor.abilities,
      _parent: this,
    });
  }

  #finishPolyline() {
    if (this.#points.length < 2) {
      this.#removePreview();
      this.#reject("至少需要两个点");
      return;
    }

    this.#previewEntity.polyline.positions = [...this.#points];

    this.#finish();
  }

  #finishPolygon() {
    if (this.#points.length < 3) {
      this.#removePreview();
      this.#reject("至少需要三个点");
      return;
    }

    this.#previewEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(this.#points);

    const polylineHelper = this.#viewer.entities.getById("PolylineHelper");
    if (polylineHelper) {
      polylineHelper.polyline.positions = [...this.#points, this.#points.at(0)];
    }

    this.#finish();
  }

  #createHelper() {
    const point = this.#viewer.entities.add({
      /**
       * CallbackPositionProperty 动态更新点的位置
       * https://sandcastle.cesium.com/index.html?id=callback-position-property
       */
      position: this.#points.at(-1),
      point: {
        pixelSize: 6,
        color: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.AQUA,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
    this.#helperEntities.push(point);

    if (this.#mode === "polyline" || this.#viewer.entities.getById("PolylineHelper")) return;

    const polyline = this.#viewer.entities.add({
      id: "PolylineHelper",
      polyline: {
        positions: new Cesium.CallbackProperty(() => [...this.#points, this.#points.at(0)], false),
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
      properties: {
        id,
        name: AbilityEntity.name,
        mode: this.#mode,
      },
      polyline: {
        positions: new Cesium.CallbackProperty(() => this.#points, false),
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
      properties: {
        id,
        name: AbilityEntity.name,
        mode: this.#mode,
      },
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(this.#points), false),
        material: this.#color.withAlpha(0.2),
        outline: true,
        outlineColor: this.#color.withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }

  /**
   * 更新实体属性
   * @param {Cesium.Entity} entity - 实体
   * @param {string | object} prop - 合并的属性 或 删除的属性
   */
  static updateEntityProperties(entity, prop) {
    const props = entity.properties;

    if (!entity.properties) entity.properties = new Cesium.PropertyBag();

    if (typeof prop === "string") {
      if (props.hasProperty(prop)) props.removeProperty(prop);
    } else if (typeof prop === "object") {
      for (const key in prop) {
        if (props.hasProperty(key)) props.removeProperty(key);
        props.addProperty(key, prop[key]);
      }
    }

    AbilityEntity.rebuildDescription(entity);
  }

  /**
   * 重建实体的描述
   * @param {Cesium.Entity} entity
   */
  static rebuildDescription(entity) {
    let description = `<table class="cesium-infoBox-defaultTable">`;

    const props = entity.properties?.getValue() || {};
    for (const key in props) {
      if (!key.startsWith("_")) {
        const val = props[key];
        description += `<tr><td>${key}</td><td>${val}</td></tr>`;
      }
    }
    description += "</table>";

    entity.description = description;
  }

  on(event, callback) {
    if (!["destroy"].includes(event)) return;

    if (!this.#listeners[event]) this.#listeners[event] = [];

    this.#listeners[event].push(callback);
  }

  un(event, callback) {
    if (!["destroy"].includes(event)) return;

    if (!this.#listeners[event]) return;

    this.#listeners[event] = this.#listeners[event].filter((c) => c !== callback);
  }
}
