import { DrawTool } from "./draw.js";
import { finishDistance, finishArea } from "./entity-funcs/measurement.js";

let viewer = null;

let drawMode = "distance";
let pointEntities = [];
let labelEntities = [];
let draw = null;

const drawModeSelect = document.getElementById("drawModeSelect");
const drawNewBtn = document.getElementById("drawNewBtn");
const drawCancelBtn = document.getElementById("drawCancelBtn");

drawModeSelect.addEventListener("change", (e) => {
  drawMode = e.target.value;
  clearAll();
  startDraw();
});

drawNewBtn.addEventListener("click", () => {
  clearAll();
  startDraw();
});

drawCancelBtn.addEventListener("click", () => {
  draw.stop();
  clearAll();
});

async function startDraw() {
  if (drawMode === "distance") {
    const points = await draw.drawPolyline(viewer);
    labelEntities = labelEntities.concat(finishDistance(viewer, points));
  } else {
    const points = await draw.drawPolygon(viewer);
    labelEntities = labelEntities.concat(finishArea(viewer, points));
  }
}

function clearAll() {
  draw.stop();

  pointEntities.forEach((p) => viewer.entities.remove(p));
  pointEntities = [];

  labelEntities.forEach((l) => viewer.entities.remove(l));
  labelEntities = [];
}

export function initEntityDraw(_viewer) {
  viewer = _viewer;
  draw = new DrawTool({ viewer });
}