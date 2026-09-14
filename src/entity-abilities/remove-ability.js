import * as Cesium from "cesium";
import { Ability } from "./ability";

export class RemoveAbility extends Ability {
  name = "删除";

  execute() {
    super.execute();

    this.operated.destroy();
  }
}
