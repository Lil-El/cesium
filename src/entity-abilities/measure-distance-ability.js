import * as Cesium from "cesium";
import { MeasurementAbility } from "./measurement-ability.js";

export class MeasureDistanceAbility extends MeasurementAbility {
  name = "距离测量";

  execute() {
    super.execute("distance");
  }
}
