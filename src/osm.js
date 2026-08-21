import * as Cesium from "cesium";

const osmToggle = document.getElementById("osmToggle");

let osmVisible = true;
let osmBuildings = null;

osmToggle.addEventListener("change", (e) => {
  osmVisible = e.target.checked;
  if (osmBuildings) {
    osmBuildings.show = osmVisible;
  }
});

export async function initOSMBuildings(viewer) {
  osmBuildings = await Cesium.createOsmBuildingsAsync();
  osmBuildings.show = osmVisible;
  viewer.scene.primitives.add(osmBuildings);
  return osmBuildings;
}