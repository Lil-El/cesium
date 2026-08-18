import { writeFileSync, mkdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';

// ========== 生成一个简单的建筑模型（GLB格式） ==========

const halfW = 5;   // 半宽
const halfD = 5;   // 半深
const halfH = 15;  // 半高

// 8个顶点：位置 (x, y, z) + 颜色 (r, g, b)
// y-up 坐标系
const vertices = new Float32Array([
  // 底部 (y = -halfH)
  -halfW, -halfH, -halfD,  1.0, 0.8, 0.6,  // 0: 底-后-左
   halfW, -halfH, -halfD,  1.0, 0.8, 0.6,  // 1: 底-后-右
   halfW, -halfH,  halfD,  1.0, 0.8, 0.6,  // 2: 底-前-右
  -halfW, -halfH,  halfD,  1.0, 0.8, 0.6,  // 3: 底-前-左
  // 顶部 (y = +halfH)
  -halfW,  halfH, -halfD,  0.8, 0.9, 1.0,  // 4: 顶-后-左
   halfW,  halfH, -halfD,  0.8, 0.9, 1.0,  // 5: 顶-后-右
   halfW,  halfH,  halfD,  0.8, 0.9, 1.0,  // 6: 顶-前-右
  -halfW,  halfH,  halfD,  0.8, 0.9, 1.0,  // 7: 顶-前-左
]);

// 索引（三角形，逆时针）
const indices = new Uint16Array([
  // 底面
  0, 2, 1,  0, 3, 2,
  // 顶面
  4, 5, 6,  4, 6, 7,
  // 后面
  0, 1, 5,  0, 5, 4,
  // 前面
  3, 6, 2,  3, 7, 6,
  // 左面
  0, 4, 7,  0, 7, 3,
  // 右面
  1, 2, 6,  1, 6, 5,
]);

// 对齐到4字节
function padTo4(offset) {
  const remainder = offset % 4;
  return remainder === 0 ? offset : offset + (4 - remainder);
}

// 顶点数据布局：position(3 floats) + color(3 floats) = 6 floats = 24 bytes per vertex
const vertexByteLength = vertices.byteLength;
const indexByteLength = indices.byteLength;

// 对齐
const vertexAligned = vertexByteLength;  // already aligned (8 * 24 = 192, divisible by 4)
const indexAligned = padTo4(vertexAligned + indexByteLength);

// bufferView 偏移
const posBufferViewOffset = 0;
const posBufferViewLength = 8 * 3 * 4;  // 8 vertices * 3 floats * 4 bytes
const colorBufferViewOffset = posBufferViewLength;
const colorBufferViewLength = 8 * 3 * 4;
const indexBufferViewOffset = vertexAligned;  // 192
const indexBufferViewLength = 36 * 2;  // 36 indices * 2 bytes

// 总 buffer 长度
const totalBufferLength = indexBufferViewOffset + indexBufferViewLength;

// 合并 buffer 数据
const bufferData = Buffer.alloc(totalBufferLength);
// 拷贝顶点数据
Buffer.from(vertices.buffer).copy(bufferData, 0, 0, vertexByteLength);
// 拷贝索引数据
Buffer.from(indices.buffer).copy(bufferData, indexBufferViewOffset, 0, indexByteLength);

const gltf = {
  asset: { version: '2.0', generator: 'manual' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{
    primitives: [{
      attributes: {
        POSITION: 0,
        COLOR_0: 1,
      },
      indices: 2,
      mode: 4,  // TRIANGLES
    }],
  }],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,  // FLOAT
      count: 8,
      type: 'VEC3',
      max: [halfW, halfH, halfD],
      min: [-halfW, -halfH, -halfD],
    },
    {
      bufferView: 1,
      componentType: 5126,  // FLOAT
      count: 8,
      type: 'VEC3',
    },
    {
      bufferView: 2,
      componentType: 5123,  // UNSIGNED_SHORT
      count: 36,
      type: 'SCALAR',
    },
  ],
  bufferViews: [
    {
      buffer: 0,
      byteOffset: posBufferViewOffset,
      byteLength: posBufferViewLength,
      target: 34962,  // ARRAY_BUFFER
    },
    {
      buffer: 0,
      byteOffset: colorBufferViewOffset,
      byteLength: colorBufferViewLength,
      target: 34962,
    },
    {
      buffer: 0,
      byteOffset: indexBufferViewOffset,
      byteLength: indexBufferViewLength,
      target: 34963,  // ELEMENT_ARRAY_BUFFER
    },
  ],
  buffers: [{
    byteLength: totalBufferLength,
    uri: 'building.bin',
  }],
};

// 写入文件
const outDir = 'public/models';
mkdirSync(outDir, { recursive: true });

writeFileSync(`${outDir}/building.gltf`, JSON.stringify(gltf, null, 2));
writeFileSync(`${outDir}/building.bin`, bufferData);

console.log('✅ 模型文件已生成:');
console.log(`   public/models/building.gltf`);
console.log(`   public/models/building.bin`);
console.log(`   顶点数: 8, 三角形数: 12, 尺寸: ${halfW * 2} x ${halfD * 2} x ${halfH * 2}`);