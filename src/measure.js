import * as Cesium from "cesium";
import { DrawTool } from "./draw.js";

let viewer = null;

let measureEnabled = false;
let measureMode = "distance";
let pointEntities = [];
let lineEntity = null;
let polygonEntity = null;
let labelEntities = [];
let draw = null;

const measureToggle = document.getElementById("measureToggle");
const measureControls = document.getElementById("measureControls");
const measureModeSelect = document.getElementById("measureModeSelect");
const measureClearBtn = document.getElementById("measureClearBtn");

measureToggle.addEventListener("change", (e) => {
  measureEnabled = e.target.checked;
  measureControls.style.display = measureEnabled ? "block" : "none";

  if (!measureEnabled) {
    clearAll();
  } else {
    startMeasure();
  }
});

measureModeSelect.addEventListener("change", (e) => {
  measureMode = e.target.value;
  clearAll();
  if (measureEnabled) {
    startMeasure();
  }
});

measureNewBtn.addEventListener("click", () => {
  clearAll();
  if (measureEnabled) {
    startMeasure();
  }
});

async function startMeasure() {
  if (measureMode === "distance") {
    const points = await draw.drawPolyline(viewer);
    finishDistance(points);
  } else {
    const points = await draw.drawPolygon(viewer);
    finishArea(points);
  }
}

function clearAll() {
  draw.stop();

  pointEntities.forEach((p) => viewer.entities.remove(p));
  pointEntities = [];

  labelEntities.forEach((l) => viewer.entities.remove(l));
  labelEntities = [];
}

function addSegmentLabel(start, end) {
  const mid = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());
  const distance = Cesium.Cartesian3.distance(start, end);
  const label = formatDistance(distance);

  const entity = viewer.entities.add({
    position: mid,
    label: {
      text: label,
      font: "12px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -12),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  labelEntities.push(entity);
}

function addTotalLabel(cartesian, totalDistance) {
  const entity = viewer.entities.add({
    position: cartesian,
    label: {
      text: `总长: ${formatDistance(totalDistance)}`,
      font: "14px sans-serif",
      fillColor: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -24),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  labelEntities.push(entity);
}

function addAreaLabel(cartesian, area) {
  const entity = viewer.entities.add({
    position: cartesian,
    label: {
      text: `面积: ${formatArea(area)}`,
      font: "14px sans-serif",
      fillColor: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -24),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  labelEntities.push(entity);
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(2)} m`;
}

function formatArea(squareMeters) {
  if (squareMeters >= 1000000) {
    return `${(squareMeters / 1000000).toFixed(2)} km²`;
  }
  return `${squareMeters.toFixed(2)} m²`;
}

function getTotalDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Cesium.Cartesian3.distance(points[i - 1], points[i]);
  }
  return total;
}

function finishDistance(points) {
  if (points.length < 2) {
    clearAll();
    return;
  }

  for (let i = 1; i < points.length; i++) {
    addSegmentLabel(points[i - 1], points[i]);
  }

  const total = getTotalDistance(points);
  addTotalLabel(points[points.length - 1], total);
}

function finishArea(points) {
  if (points.length < 3) {
    clearAll();
    return;
  }

  const area = Math.abs(Cesium.PolygonPipeline.computeArea2D(points));
  const center = Cesium.BoundingSphere.fromPoints(points).center;
  addAreaLabel(center, area);
}

export function initMeasure(_viewer) {
  viewer = _viewer;
  draw = new DrawTool({ viewer });
}
