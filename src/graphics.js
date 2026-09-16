import * as Cesium from "cesium";
import { AbilityEntity } from "./ability-entity.js";

import { MeasureDistanceAbility } from "./entity-abilities/measure-distance-ability.js";
import { MeasureAreaAbility } from "./entity-abilities/measure-area-ability.js";
import { EditAbility } from "./entity-abilities/edit-ability.js";
import { FloodAnalyzeAbility } from "./entity-abilities/flood-analyze-ability.js";
import { RemoveAbility } from "./entity-abilities/remove-ability.js";
import { PlantingAbility } from "./entity-abilities/planting-ability.js";
import { LineEffectAbility } from "./entity-abilities/line-effect-ability.js";

/** @type {Cesium.Viewer} */
let viewer = null;

let drawMode = "polyline";
let pointEntities = [];

/** @type {AbilityEntity} */
let abilityEntity = null;

const drawModeSelect = document.getElementById("drawModeSelect");
const drawNewBtn = document.getElementById("drawNewBtn");
const drawCancelBtn = document.getElementById("drawCancelBtn");

const PolylineEntityAbilities = [EditAbility, MeasureDistanceAbility, LineEffectAbility, RemoveAbility];

const PolygonEntityAbilities = [
  EditAbility,
  {
    name: "测量",
    children: [MeasureDistanceAbility, MeasureAreaAbility],
  },
  FloodAnalyzeAbility,
  PlantingAbility,
  RemoveAbility,
];

drawModeSelect.addEventListener("change", (e) => {
  drawMode = e.target.value;
  abilityEntity.cancel();
  startDraw();
});

drawNewBtn.addEventListener("click", () => {
  abilityEntity.cancel();
  startDraw();
});

drawCancelBtn.addEventListener("click", () => {
  abilityEntity.cancel();
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
    abilityMap: {
      polyline: () => PolylineEntityAbilities,
      polygon: () => PolygonEntityAbilities,
    },
  });
}
