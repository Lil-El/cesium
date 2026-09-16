import * as Cesium from "cesium";
import { Ability } from "./ability.js";
import { AbilityEntity } from "../ability-entity.js";

// 飞线速度：飞线与波纹共用同一时间基准（speed + czm_frameNumber），保证联动同步
const FLOW_SPEED = 8.0;

export class LineEffectAbility extends Ability {
  name = "Polyline Effect";

  #linePrimitive = null;

  #pointPrimitive = null;

  #waveMaterial = null;

  #wavePoint = null;

  #lastWaveRadius = 0;

  #postRenderHandler = null;

  execute() {
    super.execute();

    if (this.active) {
      if (this.operated.mode === "polyline" && this.operated.points.length === 2) {
        this.name = "取消 - Polyline Effect";
        this.#setFlyLine(this.operated.points[0], this.operated.points[1]);
        this.#setWavePoint(this.operated.points[1]);
      }
    }
  }

  cancel() {
    super.cancel();

    this.name = "Polyline Effect";

    if (this.#linePrimitive) {
      this.operated.viewer.scene.primitives.remove(this.#linePrimitive);
      this.#linePrimitive = null;
    }

    if (this.#pointPrimitive) {
      this.operated.viewer.scene.primitives.remove(this.#pointPrimitive);
      this.#pointPrimitive = null;
    }

    if (this.#postRenderHandler) {
      this.operated.viewer.scene.postRender.removeEventListener(this.#postRenderHandler);
      this.#postRenderHandler = null;
    }

    this.#waveMaterial = null;
    this.#lastWaveRadius = 0;
    this.#wavePoint = null;
  }

  /**
   * 设置飞行线
   * @param {Cesium.Cartesian3} start 起始点
   * @param {Cesium.Cartesian3} end 终点
   */
  #setFlyLine(start, end) {
    // 生成空间弧线（高度插值，形成拱形飞线）
    const positions = this.#generateArcPoints(start, end, 0.1, 40);

    const flowMaterial = new Cesium.Material({
      fabric: {
        type: "PolylineFlow",
        uniforms: {
          color: Cesium.Color.CYAN,
          speed: FLOW_SPEED,
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            float time = fract(czm_frameNumber * speed / 1000.0);
            float alpha = smoothstep(time, time + 0.15, st.s) - smoothstep(time + 0.15, time + 0.17, st.s);
            material.diffuse = color.rgb;
            material.alpha = alpha;
            return material;
          }
        `,
      },
    });

    this.#linePrimitive = this.operated.viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolylineGeometry({
            positions,
            width: 3.0,
          }),
          allowPick: false,
        }),
        appearance: new Cesium.PolylineMaterialAppearance({
          material: flowMaterial,
        }),
      }),
    );
  }

  /**
   * 设置波点
   * @param {Cesium.Cartesian3} point 波点
   */
  #setWavePoint(point) {
    if (this.#postRenderHandler) {
      this.operated.viewer.scene.postRender.removeEventListener(this.#postRenderHandler);
    }

    this.#wavePoint = point;

    this.#waveMaterial = new Cesium.Material({
      fabric: {
        type: "WaveRipple",
        uniforms: {
          color: Cesium.Color.CYAN,
          speed: FLOW_SPEED,
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 uv = 2.0 * (materialInput.st - 0.5);
            float dist = length(uv);
            // 与飞线同频（speed 相同）：+0.17 相位偏移，使波纹在飞线亮点前沿
            // 抵达终点（波点）的瞬间从中心迸发，而非等飞线折返时才触发
            float time = fract(czm_frameNumber * speed / 1000.0 + 0.17);

            // 波纹环：time 控制扩散半径，前沿锐利、尾迹渐隐
            float wake = 0.45;                                     // 尾迹宽度（环宽主体）
            float edge = 0.10;                                     // 前沿宽度
            float ring = smoothstep(time - wake, time, dist)       // 尾迹：由内向外渐亮
                       * (1.0 - smoothstep(time, time + edge, dist)); // 前沿：锐利截止

            // 径向整体淡出，避免边缘硬边
            float fade = 1.0 - smoothstep(0.0, 1.0, dist);

            material.diffuse = color.rgb;
            material.alpha = ring * fade * 0.7;
            return material;
          }
        `,
      },
    });

    this.#rebuildWavePrimitive();

    this.#postRenderHandler = () => this.#onPostRender();
    this.operated.viewer.scene.postRender.addEventListener(this.#postRenderHandler);
  }

  #onPostRender() {
    const radius = this.#getWaveRadius();

    if (Math.abs(radius - this.#lastWaveRadius) / this.#lastWaveRadius > 0.2) {
      this.#rebuildWavePrimitive();
    }
  }

  /**
   * 根据相机距离计算波纹圆的半径（随距离缩放，贴近时保持最小尺寸）
   */
  #getWaveRadius() {
    const distance = Cesium.Cartesian3.distance(this.operated.viewer.camera.position, this.#wavePoint);
    return Math.max(5, distance * 0.015);
  }

  #rebuildWavePrimitive() {
    const radius = this.#getWaveRadius();
    this.#lastWaveRadius = radius;

    if (this.#pointPrimitive) {
      this.operated.viewer.scene.primitives.remove(this.#pointPrimitive);
    }

    this.#pointPrimitive = this.operated.viewer.scene.primitives.add(
      new Cesium.GroundPrimitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.CircleGeometry({
            center: this.#wavePoint,
            radius,
          }),
          allowPick: false,
        }),
        appearance: new Cesium.MaterialAppearance({
          material: this.#waveMaterial,
        }),
      }),
    );
  }

  #generateArcPoints(start, end, heightRatio = 0.3, segments = 50) {
    const points = [];
    const startC = Cesium.Cartographic.fromCartesian(start);
    const endC = Cesium.Cartographic.fromCartesian(end);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lon = Cesium.Math.lerp(startC.longitude, endC.longitude, t);
      const lat = Cesium.Math.lerp(startC.latitude, endC.latitude, t);
      // 拱形高度，中间最高
      const baseHeight = Cesium.Math.lerp(startC.height, endC.height, t);
      const arcHeight = Math.sin(t * Math.PI) * Cesium.Cartesian3.distance(start, end) * heightRatio;
      points.push(Cesium.Cartesian3.fromRadians(lon, lat, baseHeight + arcHeight));
    }
    return points;
  }
}
