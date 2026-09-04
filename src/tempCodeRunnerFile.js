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