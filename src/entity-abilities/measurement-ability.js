import * as Cesium from "cesium";
import { AbilityEntity } from "../ability-entity.js";

export class MeasurementAbility {
  /**
   * @param {AbilityEntity} abilityEntity
   */
  static distance(abilityEntity) {
    const points = abilityEntity.points;
    const viewer = abilityEntity.viewer;

    const labels = [];
    if (points.length < 2) {
      return labels;
    }

    for (let i = 1; i < points.length; i++) {
      labels.push(MeasurementAbility.#addSegmentLabel(viewer, points[i - 1], points[i]));
    }

    const total = MeasurementAbility.#getTotalDistance(points);
    labels.push(MeasurementAbility.#addTotalLabel(viewer, points[points.length - 1], total));

    return labels;
  }

  /**
   * @param {AbilityEntity} abilityEntity
   */
  static area(abilityEntity) {
    const points = abilityEntity.points;
    const viewer = abilityEntity.viewer;

    if (points.length < 3) {
      return [];
    }

    const area = Math.abs(Cesium.PolygonPipeline.computeArea2D(points));
    const center = Cesium.BoundingSphere.fromPoints(points).center;
    return [MeasurementAbility.#addAreaLabel(viewer, center, area)];
  }

  static #formatDistance(meters) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(2)} m`;
  }

  static #formatArea(squareMeters) {
    if (squareMeters >= 1000000) {
      return `${(squareMeters / 1000000).toFixed(2)} km²`;
    }
    return `${squareMeters.toFixed(2)} m²`;
  }

  static #getTotalDistance(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Cesium.Cartesian3.distance(points[i - 1], points[i]);
    }
    return total;
  }

  static #addSegmentLabel(viewer, start, end) {
    const mid = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());
    const distance = Cesium.Cartesian3.distance(start, end);
    const label = MeasurementAbility.#formatDistance(distance);

    return viewer.entities.add({
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
  }

  static #addTotalLabel(viewer, cartesian, totalDistance) {
    return viewer.entities.add({
      position: cartesian,
      label: {
        text: `总长: ${MeasurementAbility.#formatDistance(totalDistance)}`,
        font: "14px sans-serif",
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -24),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }

  static #addAreaLabel(viewer, cartesian, area) {
    return viewer.entities.add({
      position: cartesian,
      label: {
        text: `面积: ${MeasurementAbility.#formatArea(area)}`,
        font: "14px sans-serif",
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -24),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}
