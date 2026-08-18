import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'tiles');

function createB3dm(glbBuffer, batchTableJson) {
  const batchTableJsonBuffer = Buffer.from(JSON.stringify(batchTableJson), 'utf-8');
  const batchTableByteLength = batchTableJsonBuffer.length;

  const featureTableJSONByteLength = 0;
  const featureTableBinaryByteLength = 0;
  const batchTableBinaryByteLength = 0;

  const headerByteLength = 28;
  const totalByteLength = headerByteLength + batchTableByteLength + glbBuffer.length;

  const header = Buffer.alloc(28);
  header.write('b3dm', 0, 'utf-8');
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(totalByteLength, 8);
  header.writeUInt32LE(featureTableJSONByteLength, 12);
  header.writeUInt32LE(featureTableBinaryByteLength, 16);
  header.writeUInt32LE(batchTableByteLength, 20);
  header.writeUInt32LE(batchTableBinaryByteLength, 24);

  return Buffer.concat([header, batchTableJsonBuffer, glbBuffer]);
}

function createGlbCube(width, height, depth, r, g, b) {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  const vertices = new Float32Array([
    // +X face (right)
    hw, hh, hd,   1, 0, 0,   hw, -hh, hd,   1, 0, 0,   hw, -hh, -hd,  1, 0, 0,
    hw, hh, hd,   1, 0, 0,   hw, -hh, -hd,  1, 0, 0,   hw, hh, -hd,   1, 0, 0,
    // -X face (left)
    -hw, hh, -hd,  -1, 0, 0,  -hw, -hh, -hd,  -1, 0, 0,  -hw, -hh, hd,  -1, 0, 0,
    -hw, hh, -hd,  -1, 0, 0,  -hw, -hh, hd,  -1, 0, 0,  -hw, hh, hd,   -1, 0, 0,
    // +Y face (top)
    hw, hh, -hd,   0, 1, 0,   hw, hh, hd,    0, 1, 0,   -hw, hh, hd,   0, 1, 0,
    hw, hh, -hd,   0, 1, 0,   -hw, hh, hd,   0, 1, 0,   -hw, hh, -hd,  0, 1, 0,
    // -Y face (bottom)
    hw, -hh, hd,   0, -1, 0,  hw, -hh, -hd,   0, -1, 0,  -hw, -hh, -hd,  0, -1, 0,
    hw, -hh, hd,   0, -1, 0,  -hw, -hh, -hd,  0, -1, 0,  -hw, -hh, hd,   0, -1, 0,
    // +Z face (front)
    hw, hh, hd,    0, 0, 1,   -hw, hh, hd,    0, 0, 1,   -hw, -hh, hd,   0, 0, 1,
    hw, hh, hd,    0, 0, 1,   -hw, -hh, hd,   0, 0, 1,   hw, -hh, hd,    0, 0, 1,
    // -Z face (back)
    -hw, hh, -hd,  0, 0, -1,  hw, hh, -hd,    0, 0, -1,  hw, -hh, -hd,   0, 0, -1,
    -hw, hh, -hd,  0, 0, -1,  hw, -hh, -hd,   0, 0, -1,  -hw, -hh, -hd,  0, 0, -1,
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
  ]);

  const positionMin = [-hw, -hh, -hd];
  const positionMax = [hw, hh, hd];

  const vertexBuffer = Buffer.from(vertices.buffer);
  const indexBuffer = Buffer.from(indices.buffer);

  const gltfJson = {
    asset: { version: '2.0', generator: 'cesium-demo' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{
      mesh: 0,
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    }],
    meshes: [{
      primitives: [{
        attributes: {
          POSITION: 0,
          NORMAL: 1
        },
        indices: 2,
        material: 0
      }]
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [r, g, b, 1],
        metallicFactor: 0.3,
        roughnessFactor: 0.7
      },
      doubleSided: false
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 36, type: 'VEC3', max: positionMax, min: positionMin },
      { bufferView: 1, componentType: 5126, count: 36, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: vertexBuffer.length, target: 34962 },
      { buffer: 0, byteOffset: 0, byteLength: vertexBuffer.length, byteStride: 24, target: 34962 },
      { buffer: 0, byteOffset: vertexBuffer.length, byteLength: indexBuffer.length, target: 34963 }
    ],
    buffers: [{ byteLength: vertexBuffer.length + indexBuffer.length }]
  };

  const jsonStr = JSON.stringify(gltfJson);
  let jsonStrAligned = jsonStr;
  while ((jsonStrAligned.length + 1) % 4 !== 0) jsonStrAligned += ' ';
  const jsonChunkLength = jsonStrAligned.length + 1; // +1 for padding space becomes 0x20

  const binData = Buffer.concat([vertexBuffer, indexBuffer]);
  let binPadding = Buffer.alloc(0);
  while ((binData.length + binPadding.length) % 4 !== 0) binPadding = Buffer.concat([binPadding, Buffer.alloc(1)]);

  const glbHeaderSize = 12;
  const jsonChunkHeaderSize = 8;
  const binChunkHeaderSize = 8;
  const totalGlbLength = glbHeaderSize + jsonChunkHeaderSize + jsonChunkLength + binChunkHeaderSize + binData.length + binPadding.length;

  const glbHeader = Buffer.alloc(12);
  glbHeader.writeUInt32LE(0x46546C67, 0);
  glbHeader.writeUInt32LE(2, 4);
  glbHeader.writeUInt32LE(totalGlbLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonChunkLength, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4);
  const jsonChunk = Buffer.from(jsonStrAligned + '\x20', 'utf-8');

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binData.length + binPadding.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4);

  return Buffer.concat([glbHeader, jsonChunkHeader, jsonChunk, binChunkHeader, binData, binPadding]);
}

function createTileset(buildings) {
  const rootChildren = buildings.map((b, i) => ({
    boundingVolume: {
      region: b.region
    },
    geometricError: 0,
    content: { uri: b.filename },
    refine: 'ADD'
  }));

  const tileset = {
    asset: { version: '1.1' },
    geometricError: 200,
    root: {
      boundingVolume: {
        region: [
          1.896, 0.595, 1.899, 0.597,
          -100, 200
        ]
      },
      geometricError: 200,
      refine: 'ADD',
      children: rootChildren
    }
  };

  return JSON.stringify(tileset, null, 2);
}

const buildings = [
  { lon: 108.8765, lat: 34.1875, w: 80, h: 50, d: 60, r: 0.8, g: 0.3, b: 0.3 },
  { lon: 108.8775, lat: 34.1875, w: 60, h: 80, d: 50, r: 0.3, g: 0.6, b: 0.8 },
  { lon: 108.8785, lat: 34.1875, w: 70, h: 100, d: 70, r: 0.3, g: 0.8, b: 0.4 },
  { lon: 108.8765, lat: 34.1885, w: 90, h: 60, d: 80, r: 0.9, g: 0.7, b: 0.2 },
  { lon: 108.8775, lat: 34.1885, w: 50, h: 120, d: 55, r: 0.7, g: 0.3, b: 0.7 },
  { lon: 108.8785, lat: 34.1885, w: 100, h: 70, d: 90, r: 0.2, g: 0.5, b: 0.9 },
];

mkdirSync(outDir, { recursive: true });

const degToRad = Math.PI / 180;
const buildingsData = buildings.map((b, i) => {
  const w = b.w / 100000;
  const h_d = b.h / 100000;
  const d = b.d / 100000;

  const glb = createGlbCube(w, h_d, d, b.r, b.g, b.b);
  const b3dm = createB3dm(glb, { name: `building_${i}`, height: b.h });

  const halfW = w / 2;
  const halfD = d / 2;
  const region = [
    (b.lon - halfW) * degToRad,
    (b.lat - halfD) * degToRad,
    (b.lon + halfW) * degToRad,
    (b.lat + halfD) * degToRad,
    0,
    b.h
  ];

  const filename = `${i}.b3dm`;
  writeFileSync(join(outDir, filename), b3dm);
  console.log(`已生成: ${filename} (${b.h}m 高)`);

  return { region, filename };
});

const tilesetJson = createTileset(buildingsData);
writeFileSync(join(outDir, 'tileset.json'), tilesetJson);
console.log('已生成: tileset.json');
console.log(`\n共生成 ${buildings.length} 栋建筑，存放于 public/tiles/`);