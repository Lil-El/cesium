import * as Cesium from "cesium";
import { AbilityEntity } from "../ability-entity.js";
import { Ability } from "./ability.js";

export class FloodAnalyzeAbility extends Ability {
  name = "淹没分析";

  #helperEntities = [];

  #sliderInputHandler = null;

  #value = 0;

  execute() {
    super.execute();

    if (this.active) {
      this.name = "取消 - 淹没分析";
      this.#buildHelperEntities();
      this.#buildController();
    } else {
      this.name = "淹没分析";
    }
  }

  cancel() {
    super.cancel();

    this.name = "淹没分析";

    this.#teardownController();

    this.#helperEntities.forEach((entity) => {
      entity.remove();
    });
    this.#helperEntities = [];
  }

  #buildHelperEntities() {
    const hierarchy = this.operated.drawnEntity.polygon.hierarchy;

    this.#helperEntities.push(
      this.operated.viewer.entities.add({
        polygon: {
          hierarchy,
          height: 0,
          extrudedHeight: new Cesium.CallbackProperty(() => {
            if (this.#value <= 0) {
              return 0;
            }
            return this.#value;
          }, false),
          perPositionHeight: false,
          material: new Cesium.ImageMaterialProperty({
            image: Cesium.buildModuleUrl("Assets/Textures/waterNormals.jpg"),
            repeat: new Cesium.Cartesian2(10, 10),
            color: Cesium.Color.fromBytes(110, 195, 255, 195),
            transparent: true,
          }),
        },
      })
    );
  }

  #buildController() {
    const panel = document.getElementById("floodAnalyzeSection");
    const slider = document.getElementById("floodHeightSlider");
    const valueDisplay = document.getElementById("floodHeightValue");

    if (panel) {
      panel.style.display = "block";
    }

    if (slider && valueDisplay) {
      slider.value = 0;
      this.#value = 0;
      valueDisplay.textContent = "0m";

      this.#sliderInputHandler = () => {
        this.#value = parseFloat(slider.value);
        valueDisplay.textContent = this.#value + "m";
      };
      slider.addEventListener("input", this.#sliderInputHandler);
    }
  }

  #teardownController() {
    const panel = document.getElementById("floodAnalyzeSection");
    const slider = document.getElementById("floodHeightSlider");
    const valueDisplay = document.getElementById("floodHeightValue");

    if (panel) {
      panel.style.display = "none";
    }

    if (slider && this.#sliderInputHandler) {
      slider.removeEventListener("input", this.#sliderInputHandler);
      this.#sliderInputHandler = null;
    }

    if (slider && valueDisplay) {
      slider.value = 0;
      this.#value = 0;
      valueDisplay.textContent = "0m";
    }
  }
}