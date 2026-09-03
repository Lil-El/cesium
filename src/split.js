import * as Cesium from "cesium";
import { setSplitMode } from "./layer.js";

// ==================== 卷帘对比 ====================
const splitToggle = document.getElementById("splitToggle");
const splitSubItems = document.getElementById("splitSubItems");
const splitImageryToggle = document.getElementById("splitImageryToggle");
const split3DToggle = document.getElementById("split3DToggle");

/** @type {Cesium.Viewer | null} */
let _viewer = null;

// ==================== 拖拽轴 ====================
let splitAxisEl = null;
let isDragging = false;

function createSplitAxis() {
  if (splitAxisEl) return;

  splitAxisEl = document.createElement("div");
  splitAxisEl.id = "splitAxis";
  splitAxisEl.innerHTML = `
    <div class="split-axis-line"></div>
    <div class="split-axis-handle">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
        <path d="M8 5v14l-4-4 4-4m8 10V5l4 4-4 4"/>
      </svg>
    </div>
  `;
  document.body.appendChild(splitAxisEl);

  const handle = splitAxisEl.querySelector(".split-axis-handle");

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    splitAxisEl.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging || !_viewer) return;

    const container = document.getElementById("cesiumContainer");
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.max(0, Math.min(1, x / rect.width));

    _viewer.scene.splitPosition = position;
    updateAxisPosition(position);
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (splitAxisEl) {
        splitAxisEl.classList.remove("dragging");
      }
    }
  });
}

function removeSplitAxis() {
  if (splitAxisEl) {
    splitAxisEl.remove();
    splitAxisEl = null;
  }
  isDragging = false;
}

function updateAxisPosition(position) {
  if (!splitAxisEl) return;
  splitAxisEl.style.left = (position * 100).toFixed(1) + "%";
}

// ==================== 样式注入 ====================
function injectAxisStyles() {
  if (document.getElementById("splitAxisStyles")) return;

  const style = document.createElement("style");
  style.id = "splitAxisStyles";
  style.textContent = `
    #splitAxis {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 0;
      z-index: 200;
      pointer-events: none;
      transform: translateX(-50%);
    }
    #splitAxis .split-axis-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 2px;
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
      transform: translateX(-50%);
    }
    #splitAxis .split-axis-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 32px;
      height: 32px;
      background: rgba(79, 195, 247, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: ew-resize;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.6);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    #splitAxis .split-axis-handle:hover {
      transform: translate(-50%, -50%) scale(1.15);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
    }
    #splitAxis.dragging .split-axis-handle {
      transform: translate(-50%, -50%) scale(1.2);
      box-shadow: 0 4px 18px rgba(79, 195, 247, 0.6);
      background: rgba(79, 195, 247, 1);
    }
  `;
  document.head.appendChild(style);
}

// ==================== 事件绑定 ====================
splitToggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    splitSubItems.style.display = "block";
  } else {
    splitSubItems.style.display = "none";
    splitImageryToggle.checked = false;
    split3DToggle.checked = false;
    disableSplit();
  }
});

splitImageryToggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    enableImagerySplit();
  } else {
    disableSplit();
  }
});

split3DToggle.addEventListener("change", (e) => {
  if (e.target.checked) {
    enable3DSplit();
  } else {
    disableSplit();
  }
});

function enableImagerySplit() {
  injectAxisStyles();
  createSplitAxis();
  setSplitMode(true);
  updateAxisPosition(0.5);

  _viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(109.79192254519624, 38.53135670450269, 80000),
    duration: 1.5,
  });
}

function enable3DSplit() {
  injectAxisStyles();
  createSplitAxis();
  setSplitMode(false);
  updateAxisPosition(0.5);
  _viewer.scene.splitPosition = 0.5;

  _viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(109.79192254519624, 38.53135670450269, 80000),
    duration: 1.5,
  });
}

function disableSplit() {
  setSplitMode(false);
  removeSplitAxis();
}

/**
 * @param {Cesium.Viewer} viewer
 */
export function initSplit(viewer) {
  _viewer = viewer;
}