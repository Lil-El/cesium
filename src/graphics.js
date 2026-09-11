import * as Cesium from "cesium";
import { AbilityEntity } from "./ability-entity.js";

import { MeasurementAbility } from "./entity-abilities/measurement-ability.js";
import { EditAbility } from "./entity-abilities/edit-ability.js";

/** @type {Cesium.Viewer} */
let viewer = null;

let drawMode = "polyline";
let pointEntities = [];

/** @type {AbilityEntity} */
let abilityEntity = null;

const drawModeSelect = document.getElementById("drawModeSelect");
const drawNewBtn = document.getElementById("drawNewBtn");
const drawCancelBtn = document.getElementById("drawCancelBtn");

const PolylineEntityAbilities = [
  {
    label: "编辑",
    ability: EditAbility.edit,
  },
  {
    label: "距离测量",
    ability: MeasurementAbility.distance,
  },
];

const PolygonEntityAbilities = [
  {
    label: "编辑",
    ability: EditAbility.edit,
  },
  {
    label: "测量",
    children: [
      {
        label: "距离测量",
        ability: MeasurementAbility.distance,
      },
      {
        label: "面积测量",
        ability: MeasurementAbility.area,
      },
    ],
  },
];

drawModeSelect.addEventListener("change", (e) => {
  drawMode = e.target.value;
  abilityEntity.stop();
  startDraw();
});

drawNewBtn.addEventListener("click", () => {
  abilityEntity.stop();
  startDraw();
});

drawCancelBtn.addEventListener("click", () => {
  abilityEntity.stop();
});

async function startDraw() {
  const drawn = drawMode === "polyline" ? await abilityEntity.drawPolyline() : await abilityEntity.drawPolygon();
}

/**
 *
 * @param {Cesium.Viewer} viewer
 * @description
 */
export function initDraw(viewer) {
  abilityEntity = new AbilityEntity({
    viewer,
    color: Cesium.Color.AQUA.withAlpha(0.5),
    abilityMap: {
      polyline: PolylineEntityAbilities,
      polygon: PolygonEntityAbilities,
    },
  });
}
