import * as Cesium from "cesium";
import { MeasurementAbility } from "./measurement-ability.js";

export class MeasureAreaAbility extends MeasurementAbility {
  name = "面积测量";

  execute() {
    super.execute("area");
  }
}
