import * as Cesium from "cesium";

/**
 * 绘制工具类
 * @class
 * @description 绘制工具类，用于绘制折线和多边形
 */
export class DrawTool {
  /** @type {Cesium.Viewer} viewer */
  #viewer = null;

  /** @type {boolean} enabled */
  #enabled = false;

  /** @type {"polyline" | "polygon"} */
  #mode = "polyline";

  /** @type {Cesium.Cartesian3[]} points */
  #points = [];

  /** @type {Cesium.Entity} previewEntity */
  #previewEntity = null;

  /** @type {Cesium.Entity[]} helperEntities */
  #helperEntities = [];

  /** @type {Cesium.Entity} resultEntity */
  #resultEntity = null;

  /** @type {Cesium.ScreenSpaceEventHandler} handler */
  #handler = null;

  /** @type {Cesium.Color} color */
  #color = 0;

  /** @type {Promise<Cesium.Cartesian3[]>} promise */
  #promise = null;

  /** @type {function(points: Cesium.Cartesian3[])} void} resolve */
  #resolve = null;

  /** @type {function(error: Error)} void} reject */
  #reject = null;

  /** @type {number} lastClickTime */
  #lastClickTime = 0;

  /** @type {function} savedViewerLeftClick */
  #savedViewerLeftClick = null;

  /** @type {function} savedViewerLeftDoubleClick */
  #savedViewerLeftDoubleClick = null;

  /** @type {DrawTool[]} allInstances */
  static allInstances = [];

  /**
   * 构造函数
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   * @param {Cesium.Color} color - 绘制颜色，默认红色
   */
  constructor({ viewer, color = Cesium.Color.RED }) {
    this.#viewer = viewer;
    this.#color = color;

    // 初始化时停止所有实例，避免同时存在多个绘制工具
    DrawTool.allInstances.forEach((i) => i.stop());

    DrawTool.allInstances.push(this);
  }

  static isActive() {
    return DrawTool.allInstances.some((i) => i.isActive());
  }

  isActive() {
    return this.#enabled;
  }

  getResultEntity() {
    return this.#resultEntity;
  }

  drawPolyline(options = {}) {
    this.#mode = "polyline";
    return this.#draw();
  }

  drawPolygon(options = {}) {
    this.#mode = "polygon";
    return this.#draw();
  }

  clear() {
    this.#points = [];
    this.#removeResult();
    this.#removePreview();
    this.#removeHelper();
  }

  stop() {
    this.#enabled = false;
    this.#teardownHandler();
    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "default";
    }

    this.clear();
  }

  #draw() {
    this.stop();
    this.#enabled = true;
    this.#setupHandler();
    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "crosshair";
    }
    const { promise, resolve, reject } = Promise.withResolvers();
    this.#promise = promise;
    this.#resolve = resolve;
    this.#reject = reject;
    return promise;
  }

  #setupHandler() {
    if (this.#handler) return;
    if (!this.#viewer) return;

    /**
     * 保存默认的左键点击事件处理函数（包含Entity 拾取选中、InfoBox 弹出、相机飞行等核心行为）
     * 避免双击触发 helper 点的相机聚焦行为
     */
    // this.#savedViewerLeftClick = this.#viewer.screenSpaceEventHandler.getInputAction(
    //   Cesium.ScreenSpaceEventType.LEFT_CLICK
    // );
    // this.#savedViewerLeftDoubleClick = this.#viewer.screenSpaceEventHandler.getInputAction(
    //   Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    // );
    // this.#viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    // this.#viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // 设置新的点击事件处理函数
    this.#handler = new Cesium.ScreenSpaceEventHandler(this.#viewer.scene.canvas);

    this.#handler.setInputAction((click) => {
      this.#handleLeftClick(click);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.#handler.setInputAction(() => {
      this.#handleDbClick();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    this.#handler.setInputAction((movement) => {
      this.#handleMouseMove(movement);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  #teardownHandler() {
    if (this.#handler) {
      this.#handler.destroy();
      this.#handler = null;
    }

    if (this.#savedViewerLeftClick) {
      this.#viewer.screenSpaceEventHandler.setInputAction(
        this.#savedViewerLeftClick,
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      );
      this.#savedViewerLeftClick = null;
    }
    if (this.#savedViewerLeftDoubleClick) {
      this.#viewer.screenSpaceEventHandler.setInputAction(
        this.#savedViewerLeftDoubleClick,
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
      );
      this.#savedViewerLeftDoubleClick = null;
    }
  }

  #handleLeftClick(click) {
    if (!this.#enabled) return false;
    if (!this.#viewer) return false;

    const cartesian = this.#viewer.scene.pickPosition(click.position);
    if (!Cesium.defined(cartesian)) return false;

    if (Date.now() - this.#lastClickTime < 300) return false; // 防止双击重复添加 point

    this.#lastClickTime = Date.now();

    this.#points.push(cartesian);

    if (this.#points.length === 1) {
      if (this.#mode === "polyline") {
        this.#createPolylinePreview();
      } else {
        this.#createPolygonPreview();
      }
    }

    this.#createHelper();

    return true;
  }

  #handleDbClick() {
    if (!this.#enabled) return false;
    if (this.#points.length === 0) return false;

    // 取消相机聚焦
    this.#viewer.trackedEntity = undefined;

    if (this.#mode === "polyline") {
      this.#finishPolyline();
    } else {
      this.#finishPolygon();
    }

    return true;
  }

  #handleMouseMove(movement) {
    if (!this.#enabled) return false;
    if (!this.#viewer) return false;
    if (this.#points.length === 0) return false;

    const cartesian = this.#viewer.scene.pickPosition(movement.endPosition);
    if (!Cesium.defined(cartesian)) return false;

    this.#points.pop();
    this.#points.push(cartesian);

    return true;
  }

  #removePreview() {
    if (this.#previewEntity) {
      this.#viewer.entities.remove(this.#previewEntity);
      this.#previewEntity = null;
    }
  }

  #removeHelper() {
    this.#helperEntities.forEach((i) => this.#viewer.entities.remove(i));
    this.#helperEntities = [];
  }

  #removeResult() {
    if (this.#resultEntity) {
      this.#viewer.entities.remove(this.#resultEntity);
      this.#resultEntity = null;
    }
  }

  #finish() {
    this.#enabled = false;
    this.#teardownHandler();
    if (this.#viewer) {
      this.#viewer.scene.canvas.style.cursor = "default";
    }

    this.#resultEntity = this.#previewEntity;
    this.#previewEntity = null;

    this.#resolve(this.#points);
  }

  #finishPolyline() {
    if (this.#points.length < 2) {
      this.#removePreview();
      this.#reject("至少需要两个点");
      return;
    }

    this.#previewEntity.polyline.positions = [...this.#points];

    this.#finish();
  }

  #finishPolygon() {
    if (this.#points.length < 3) {
      this.#removePreview();
      this.#reject("至少需要三个点");
      return;
    }

    this.#previewEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(this.#points);

    const polylineHelper = this.#viewer.entities.getById("PolylineHelper");
    if (polylineHelper) {
      polylineHelper.polyline.positions = [...this.#points, this.#points.at(0)];
    }

    this.#finish();
  }

  #createHelper() {
    const point = this.#viewer.entities.add({
      /**
       * CallbackPositionProperty 动态更新点的位置
       * https://sandcastle.cesium.com/index.html?id=callback-position-property
       */
      position: this.#points.at(-1),
      point: {
        pixelSize: 6,
        color: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.AQUA,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
    this.#helperEntities.push(point);

    if (this.#mode === "polyline" || this.#viewer.entities.getById("PolylineHelper")) return;

    const polyline = this.#viewer.entities.add({
      id: "PolylineHelper",
      polyline: {
        positions: new Cesium.CallbackProperty(() => [...this.#points, this.#points.at(0)], false),
        width: 2,
        material: Cesium.Color.AQUA.withAlpha(0.8),
        clampToGround: true,
      },
    });
    this.#helperEntities.push(polyline);
  }

  #createPolylinePreview() {
    this.#removePreview();

    this.#points.push(this.#points[0]);

    if (this.#points.length < 2) return;

    this.#previewEntity = this.#viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => this.#points, false),
        width: 2,
        material: this.#color.withAlpha(0.5),
        clampToGround: true,
      },
    });
  }

  #createPolygonPreview() {
    this.#removePreview();

    this.#points.push(this.#points[0]);

    this.#previewEntity = this.#viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(this.#points), false),
        material: this.#color.withAlpha(0.2),
        outline: true,
        outlineColor: this.#color.withAlpha(0.5),
        outlineWidth: 1,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}
