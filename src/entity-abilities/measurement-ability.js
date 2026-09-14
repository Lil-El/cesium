import * as Cesium from "cesium";
import { AbilityEntity } from "../ability-entity.js";
import { Ability } from "./ability.js";

export class MeasurementAbility extends Ability {
  #distance = "";

  #area = "";

  #helperEntities = [];

  execute(type) {
    super.execute();

    const props = this.operated.drawnEntity.properties;
    if (props.hasProperty(type)) props.removeProperty(type);

    if (type === "distance") {
      this.#helperEntities = this.distance();
      props.addProperty(type, `${this.#distance}`);
    } else if (type === "area") {
      this.#helperEntities = this.area();
      props.addProperty(type, `${this.#area}`);
    }

    AbilityEntity.rebuildDescription(this.operated.drawnEntity);
  }

  cancel() {
    super.cancel();

    this.#helperEntities.forEach((entity) => {
      this.operated.viewer.entities.remove(entity);
    });
    this.#helperEntities = [];
  }

  distance() {
    let points = [];
    if (this.operated.mode === "polyline") {
      points = this.operated.points;
    } else if (this.operated.mode === "polygon") {
      points = [...this.operated.points, this.operated.points[0]];
    }

    const viewer = this.operated.viewer;

    const labels = [];
    if (points.length < 2) {
      return labels;
    }

    for (let i = 1; i < points.length; i++) {
      labels.push(this.addSegmentLabel(viewer, points[i - 1], points[i]));
    }

    const total = this.getTotalDistance(points);
    labels.push(this.addTotalLabel(viewer, points[points.length - 1], total));

    this.#distance = this.formatDistance(total);

    return labels;
  }

  area() {
    const points = this.operated.points;
    const viewer = this.operated.viewer;

    if (points.length < 3) {
      return [];
    }

    const area = Math.abs(Cesium.PolygonPipeline.computeArea2D(points));
    const center = Cesium.BoundingSphere.fromPoints(points).center;

    this.#area = this.formatArea(area);

    return [this.addAreaLabel(viewer, center, area)];
  }

  formatArea(squareMeters) {
    if (squareMeters >= 1000000) {
      return `${(squareMeters / 1000000).toFixed(2)} km²`;
    }
    return `${squareMeters.toFixed(2)} m²`;
  }

  getTotalDistance(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Cesium.Cartesian3.distance(points[i - 1], points[i]);
    }
    return total;
  }

  addSegmentLabel(viewer, start, end) {
    const mid = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());
    const distance = Cesium.Cartesian3.distance(start, end);
    const label = this.formatDistance(distance);

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

  addTotalLabel(viewer, cartesian, totalDistance) {
    return viewer.entities.add({
      position: cartesian,
      label: {
        text: `总长: ${this.formatDistance(totalDistance)}`,
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

  addAreaLabel(viewer, cartesian, area) {
    return viewer.entities.add({
      position: cartesian,
      label: {
        text: `面积: ${this.formatArea(area)}`,
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

  formatDistance(meters) {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(2)} m`;
  }

  formatArea(squareMeters) {
    if (squareMeters >= 1000000) {
      return `${(squareMeters / 1000000).toFixed(2)} km²`;
    }
    return `${squareMeters.toFixed(2)} m²`;
  }
}
