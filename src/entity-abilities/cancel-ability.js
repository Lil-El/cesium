import * as Cesium from "cesium";
import { Ability } from "./ability.js";

export class CancelAbility extends Ability {
  name = "取消";

  execute() {
    super.execute();

    this.operated.destroy();
  }
}
