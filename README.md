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