# Cesium

## primitives 和 entities 的区别

### 一句话总结

| 维度 | Primitive | Entity |
|------|-----------|--------|
| 定位 | 底层图形 API，直接操作 GPU 几何体 | 高层抽象 API，面向"事物"建模 |
| 类比 | 像 OpenGL 的 draw call | 像数据库中的一条记录 |
| 性能 | 高，适合海量数据 | 一般，适合少量交互对象 |
| 易用性 | 需手动管理几何体、外观 | 开箱即用，声明式配置 |

### 架构层次

```
Entity API（高层）
    ↓ 自动转换
Primitive API（底层）
    ↓ 调用
WebGL / GPU
```

- **Entity**：Cesium 帮你管理，只管"有什么"，不管"怎么画"
- **Primitive**：直接操作显卡要画的几何体，需自己构建 `Geometry` + `Appearance`

### 详细对比

| 对比项 | Entity | Primitive |
|--------|--------|-----------|
| 添加方式 | `viewer.entities.add()` | `viewer.scene.primitives.add()` |
| 大数据量（>10000） | 卡顿 | 流畅 |
| 内置拾取（pick） | 自动支持 `picked.id` | 需手动比对 `picked.primitive` |
| 属性动画（插值） | 内置 Property 系统 | 手动在 `preUpdate` 中更新 |
| 数据源加载 | 天然支持 GeoJSON/CZML/KML | 需手动解析构建 |
| 样式修改 | 直接赋值即可生效 | 需重建或更新 Appearance |
| 内存占用 | 每个 Entity 都有开销 | 可批量合并，开销低 |

### 使用场景选择

| 场景 | 推荐 |
|------|------|
| 少量标注点（< 500） | Entity |
| 弹窗、点击交互 | Entity |
| 动态属性（颜色、大小随时间变） | Entity |
| CZML / GeoJSON 数据加载 | Entity |
| 海量点云（> 10000） | Primitive |
| 3D Tiles / glTF 模型 | Primitive |
| 自定义几何体（洪水水面等） | Primitive |
| 需要极致性能的场景 | Primitive |

### 代码示例

```javascript
// Entity 方式 — 声明式，简单直观
viewer.entities.add({
  name: "建筑模型",
  position: Cesium.Cartesian3.fromDegrees(108.87722, 34.19241, 400),
  model: {
    uri: "/models/building.gltf",
    scale: 1.0,
  },
});

// 点击拾取
const picked = viewer.scene.pick(click.position);
if (picked?.id instanceof Cesium.Entity) {
  console.log(picked.id.name); // 直接拿到 Entity 信息
}
```

```javascript
// Primitive 方式 — 手动控制，高性能
const model = await Cesium.Model.fromGltfAsync({
  url: "/models/building.gltf",
  modelMatrix: null,
  scale: 1.0,
});
viewer.scene.primitives.add(model);

// 动态更新：手动在每帧前更新
viewer.scene.preUpdate.addEventListener(() => {
  model.modelMatrix = /* 手动计算新矩阵 */;
});

// 点击拾取
const picked = viewer.scene.pick(click.position);
if (picked?.primitive === model) {
  console.log("点击到了模型");
}
```

### 经验法则

> **能用 Entity 就用 Entity，卡了再换 Primitive。**
>
> Entity 开发效率高，Primitive 运行效率高。先快速出原型，遇到性能瓶颈再针对性优化。

## scene.pick() 和 pickImageryLayerFeatures() 的区别

### 一句话总结

| 维度 | scene.pick() | pickImageryLayerFeatures() |
|------|-------------|---------------------------|
| 拾取对象 | 3D 物体（Entity / Model / Primitive） | 影像图层要素（栅格瓦片中的要素） |
| 返回类型 | 同步，直接返回 picked 对象 | 异步，返回 Promise |
| 能否用于栅格瓦片 | ❌ 永远返回 undefined | ✅ 正确用法 |
| 能获取什么 | Entity 引用、primitive 引用 | 要素名、属性、所属图层 |

### 架构层次

```
scene.pick()                    pickImageryLayerFeatures()
    ↓                                ↓
3D 物体（Entity/Primitive/Model）    影像图层（ImageryLayer）
    ↓                                ↓
GPU 渲染的几何体                   服务器端渲染的瓦片图片
```

### 代码示例

```javascript
// scene.pick() — 同步，拾取 3D 物体
const picked = viewer.scene.pick(click.position);
if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
  console.log("点击了 Entity:", picked.id.name);
  console.log("所属图层:", picked.id.entityCollection?.owner?.name);
}
```

```javascript
// pickImageryLayerFeatures() — 异步，拾取影像图层要素
const promise = viewer.imageryLayers.pickImageryLayerFeatures(
  click.position,
  viewer.scene
);
if (Cesium.defined(promise)) {
  promise.then((features) => {
    features.forEach((f) => {
      console.log("要素名:", f.name);
      console.log("所属图层:", f.imageryLayer);
      console.log("属性:", f.properties);
    });
  });
}
```

### 使用场景选择

| 场景 | 推荐 |
|------|------|
| 点击 GeoJSON / Entity 要素 | scene.pick() |
| 点击 3D 模型 / glTF | scene.pick() |
| 点击 OSM 建筑 | scene.pick() |
| 点击 ArcGIS 栅格瓦片图层 | pickImageryLayerFeatures() |
| 点击 WMS / WMTS 图层 | pickImageryLayerFeatures() |
| 需要修改要素样式/颜色 | 必须用 Entity（scene.pick()） |

## TODO

- ✅ 添加3D tiles
- ✅ 模型
- ✅ 点击弹窗
- ✅ 卷帘对比

- 🙅 矢量和栅格的添加、剖析（where）
- 🙅 动效
- 🙅‍♀️ 三维分析
- 🙅‍♀️ 挖填方计算
- 🙅‍♀️ 边坡挡土墙设计
- 🙅‍♀️ 生态修复的种树
- 🙅‍♀️ 飞行路线标定等等