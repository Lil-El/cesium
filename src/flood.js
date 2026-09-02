import * as Cesium from "cesium";

// ==================== 淹没分析开关 ====================
const floodToggle = document.getElementById("floodToggle");
const sliderControls = document.getElementById("sliderControls");

let floodVisible = false;
let _viewer = null;

floodToggle.addEventListener("change", (e) => {
  floodVisible = e.target.checked;
  sliderControls.style.display = floodVisible ? "block" : "none";

  if (floodEntity) {
    floodEntity.show = floodVisible;
  }

  floodVisible && flyToPolygon();
});

// ==================== 滑动条控制 ====================
let myNumericVariable = 0;

const slider = document.getElementById("mySlider");
const sliderValueDisplay = document.getElementById("sliderValue");

let floodEntity = null;

slider.addEventListener("input", (e) => {
  myNumericVariable = parseFloat(e.target.value);
  sliderValueDisplay.textContent = myNumericVariable;
});

export function createFloodPolygon(viewer, positions) {
  _viewer = viewer;

  if (floodEntity) {
    viewer.entities.remove(floodEntity);
    floodEntity = null;
  }

  floodEntity = viewer.entities.add({
    show: floodVisible,
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        positions.map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat))
      ),
      height: 0,
      extrudedHeight: new Cesium.CallbackProperty(() => {
        if (myNumericVariable <= 0) {
          return 0;
        }
        return myNumericVariable;
      }, false),
      perPositionHeight: false,
      material: new Cesium.ImageMaterialProperty({
        image: Cesium.buildModuleUrl("Assets/Textures/waterNormals.jpg"),
        repeat: new Cesium.Cartesian2(10, 10),
        color: Cesium.Color.fromBytes(110, 195, 255, 195),
        transparent: true,
      }),
    },
  });

  return floodEntity;
}

export function flyToPolygon() {
  _viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(144.94544315861853, -37.81556, 300),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-60),
      roll: 0,
    },
    duration: 1,
  });
}