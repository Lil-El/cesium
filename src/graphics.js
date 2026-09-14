import * as Cesium from "cesium";
import { AbilityEntity } from "./ability-entity.js";

import { MeasureDistanceAbility } from "./entity-abilities/measure-distance-ability.js";
import { MeasureAreaAbility } from "./entity-abilities/measure-area-ability.js";
import { EditAbility } from "./entity-abilities/edit-ability.js";
import { FloodAnalyzeAbility } from "./entity-abilities/flood-analyze-ability.js";

/** @type {Cesium.Viewer} */
let viewer = null;

let drawMode = "polyline";
let pointEntities = [];

/** @type {AbilityEntity} */
let abilityEntity = null;

const drawModeSelect = document.getElementById("drawModeSelect");
const drawNewBtn = document.getElementById("drawNewBtn");
const drawCancelBtn = document.getElementById("drawCancelBtn");

const PolylineEntityAbilities = [EditAbility, MeasureDistanceAbility];

const PolygonEntityAbilities = [
  EditAbility,
  {
    name: "测量",
    children: [MeasureDistanceAbility, MeasureAreaAbility],
  },
  FloodAnalyzeAbility,
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
    abilityMap: {
      polyline: () => PolylineEntityAbilities,
      polygon: () => PolygonEntityAbilities,
    },
  });
}
