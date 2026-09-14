import * as Cesium from "cesium";

import { AbilityEntity } from "../ability-entity.js";

/**
 * @class
 * @classdesc 能力类，用于表示实体的能力实例
 */
export class Ability {
  /**
   * @member {string} name
   */
  name = "未命名能力";

  /**
   * @member {boolean} active
   */
  active = false;

  /**
   * @private
   * @member {AbilityEntity} operated
   **/
  operated;

  /**
   * @constructor
   * @param {AbilityEntity} operated 被操作的能力实体
   * @description 初始化能力实例，设置被操作的能力实体
   */
  constructor(operated) {
    this.operated = operated;
  }

  /**
   * @description 执行能力实例
   */
  execute() {
    this.active = !this.active;
    if (this.active) {
      this.operated.supervisor.setCurrentAbility(this);
    } else {
      this.cancel();
    }
  }

  /**
   * @description 取消能力实例
   */
  cancel() {
    this.active = false;
  }

  /**
   * @description 销毁能力实例
   */
  destroy() {
    this.cancel();
    this.operated = null;
  }

  disableCamera() {
    this.operated.viewer.scene.screenSpaceCameraController.rotateEventTypes = [];
  }

  enableCamera() {
    this.operated.viewer.scene.screenSpaceCameraController.rotateEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
  }
}
