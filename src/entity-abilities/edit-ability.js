import * as Cesium from "cesium";
import { AbilityEntity } from "../ability-entity.js";
import { Ability } from "./ability.js";

/**
 * @class
 * @implements {Ability}
 */
export class EditAbility extends Ability {
  /**
   * @member {string} name
   */
  name = "编辑";

  /**
   * @private
   * @member {Cesium.Color} color
   **/
  #color = Cesium.Color.GREEN;

  /**
   * @private
   * @member {number} editIndex
   **/
  #editIndex = -1;

  /**
   * @private
   * @member {Array<Cesium.Entity>} helperEntities
   **/
  #helperEntities = [];

  /**
   * @private
   * @member {Cesium.ScreenSpaceEventHandler} handler
   **/
  #handler = null;

  /**
   * @constructor
   * @param {AbilityEntity} operated 被操作的能力实体
   */
  constructor(operated) {
    super(operated);
  }

  /**
   * 设置事件处理函数
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   */
  #setupHandlers(viewer) {
    this.#handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    this.#handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (this.#containsEntity(picked?.id)) {
        this.editIndex = this.#indexOfEntity(picked.id);
        this.disableCamera();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    this.#handler.setInputAction((movement) => {
      if (this.editIndex === -1) return;

      const cartesian = viewer.scene.pickPosition(movement.endPosition);
      if (Cesium.defined(cartesian)) {
        this.operated.points[this.editIndex] = cartesian;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.#handler.setInputAction(() => {
      if (this.editIndex === -1) return;

      this.editIndex = -1;
      this.enableCamera();
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
  }

  #teardownHandlers() {
    this.#handler?.destroy();
    this.#handler = null;
  }

  /**
   * @override
   * @implements {Ability#execute}
   */
  execute() {
    super.execute();

    if (this.active) {
      this.name = "取消 - 编辑";
      this.#setupHandlers(this.operated.viewer);
      this.#edit(this.operated);
    }
  }

  /**
   * @override
   * @implements {Ability#cancel}
   */
  cancel() {
    super.cancel();

    const viewer = this.operated.viewer;
    const drawn = this.operated.drawnEntity;
    const points = this.operated.points;

    // 取消编辑
    this.name = "编辑";

    // 重置活动索引
    this.editIndex = -1;

    // 恢复绘制实体的点
    this.#constantDrawnEntity(drawn, points);

    // 移除相关所有实体
    this.#helperEntities.forEach((entity) => {
      this.operated.viewer.entities.remove(entity);
    });
    this.#helperEntities = [];

    // 销毁事件处理程序
    this.#teardownHandlers();

    // 恢复相机事件类型
    this.enableCamera();
  }

  /**
   * @param {AbilityEntity} abilityEntity
   */
  #edit(abilityEntity) {
    const points = abilityEntity.points;
    const viewer = abilityEntity.viewer;
    const drawn = abilityEntity.drawnEntity;

    this.#createEditablePoints(viewer, points);
    this.#variableDrawnEntity(drawn, points);
  }

  /**
   * 创建可编辑的点
   * @param {Cesium.Viewer} viewer Cesium 视图器
   * @param {Array<Cesium.Cartesian3>} points 点数组
   */
  #createEditablePoints(viewer, points) {
    points.forEach((_, index) => {
      const entity = viewer.entities.add({
        position: new Cesium.CallbackPositionProperty(() => points[index], false),
        point: {
          pixelSize: 6,
          color: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.AQUA,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        properties: {
          index,
        },
      });
      this.#helperEntities.push(entity);
    });
  }

  /**
   * 设置实体点
   * @param {Cesium.Entity} entity 实体
   * @param {Array<Cesium.Cartesian3>} points 点数组
   */
  #variableDrawnEntity(entity, points) {
    if (this.operated.mode === "polyline") {
      entity.polyline.positions = new Cesium.CallbackProperty(() => points, false);
    } else if (this.operated.mode === "polygon") {
      entity.polygon.hierarchy = new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(points), false);
    }
  }

  #constantDrawnEntity(entity, points) {
    if (this.operated.mode === "polyline") {
      entity.polyline.positions = [...points];
    } else if (this.operated.mode === "polygon") {
      entity.polygon.hierarchy = new Cesium.PolygonHierarchy(points);
    }
  }

  #containsEntity(entity) {
    if (!entity) return false;
    return this.#helperEntities.includes(entity);
  }

  #indexOfEntity(entity) {
    return this.#helperEntities.indexOf(entity);
  }
}