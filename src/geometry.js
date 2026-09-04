import * as Cesium from "cesium";

/**
 * 扩展 Rectangle 四周按比例留出余量
 * @param {Cesium.Rectangle} rectangle - 原始矩形
 * @param {number} margin - 四边各扩展的比例，默认 0.1（10%）
 * @returns {Cesium.Rectangle}
 */
export function expandRectangle(rectangle, margin = 0.1) {
  const w = rectangle.width;
  const h = rectangle.height;
  return new Cesium.Rectangle(
    rectangle.west - w * margin,
    rectangle.south - h * margin,
    rectangle.east + w * margin,
    rectangle.north + h * margin,
  );
}

export function addHighlightFromGeometry(viewer, data) {
  const { geometry, geometryType } = data;
  if (!geometry) return;

  let highlightEntity = null;

  const highlightColor = Cesium.Color.AQUA.withAlpha(0.8);

  switch (geometryType) {
    case "esriGeometryPolygon": {
      const instances = [];
      for (const ring of geometry.rings) {
        instances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: new Cesium.PolygonHierarchy(
                ring.map(([x, y]) => Cesium.Cartesian3.fromDegrees(x, y)),
              ),
              height: 0,
            }),
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(highlightColor),
            },
          }),
        );
      }
      highlightEntity = viewer.scene.primitives.add(
        new Cesium.GroundPrimitive({
          geometryInstances: instances,
          appearance: new Cesium.PerInstanceColorAppearance({
            flat: true,
            translucent: true,
          }),
        }),
      );
      break;
    }

    case "esriGeometryPolyline": {
      const instances = [];
      for (const path of geometry.paths) {
        instances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.GroundPolylineGeometry({
              positions: path.map(([x, y]) => Cesium.Cartesian3.fromDegrees(x, y)),
              width: 4,
            }),
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(highlightColor),
            },
          }),
        );
      }
      highlightEntity = viewer.scene.primitives.add(
        new Cesium.GroundPolylinePrimitive({
          geometryInstances: instances,
          appearance: new Cesium.PolylineColorAppearance({
            translucent: true,
          }),
        }),
      );
      break;
    }

    case "esriGeometryPoint":
      highlightEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(geometry.x, geometry.y),
        point: {
          pixelSize: 12,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 2,
        },
      });
      break;

    default:
      break;
  }

  return highlightEntity;
}