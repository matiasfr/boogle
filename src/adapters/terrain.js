import * as THREE from 'three';
import { GRID_RES, CELL, HALF, SEABED, COURT } from '../constants.js';
import { lerp, smoothstep, valueNoise } from '../math.js';
import { scene } from '../render/scene.js';
import { PATCH } from '../sim/mushrooms.js';
import { island, baseCm } from '../island/index.js';

// heights[i][j] sits at world x = i*CELL - HALF, z = HALF - j*CELL (the heightfield body's frame). It starts as the
// island's base ground (src/island/ground.js: natural shape plus every POI's stamps, court levelled), in whole
// centimetres like the shared sim. Nothing edits it.
export const heights = [];
for (let i = 0; i < GRID_RES; i++) {
  const col = new Array(GRID_RES);
  for (let j = 0; j < GRID_RES; j++) col[j] = baseCm[i * GRID_RES + j] / 100;
  heights.push(col);
}

export function groundHeight(x, z) {
  const fi = (x + HALF) / CELL,
    fj = (HALF - z) / CELL;
  if (fi < 0 || fj < 0 || fi >= GRID_RES - 1 || fj >= GRID_RES - 1) return SEABED;
  const i = Math.floor(fi),
    j = Math.floor(fj),
    u = fi - i,
    v = fj - j;
  return lerp(lerp(heights[i][j], heights[i + 1][j], u), lerp(heights[i][j + 1], heights[i + 1][j + 1], u), v);
}

const WET = new THREE.Color('#c9ad78'),
  SAND = new THREE.Color('#efd89d'),
  GRASS = new THREE.Color('#7cc650');
const GRASS_DK = new THREE.Color('#4e9a3d'),
  ROCK = new THREE.Color('#9d978c'),
  DIRT = new THREE.Color('#7a5534');
const tmpC = new THREE.Color(),
  tmpG = new THREE.Color(),
  tmpP = new THREE.Color();
// POI paint per vertex (index j*GRID_RES+i): sRGB colour and amount, from the site stamps (src/island/stamps.js).
const poiPaint = new Float32Array(GRID_RES * GRID_RES * 4);
for (let j = 0; j < GRID_RES; j++)
  for (let i = 0; i < GRID_RES; i++) {
    const p = island.paintAt(i * CELL - HALF, HALF - j * CELL);
    if (p) poiPaint.set(p, (j * GRID_RES + i) * 4);
  }
// The mesh is split into TILE x TILE-cell tiles so the camera and the shadow pass only draw the ones in view.
const TILE = 51;
const tiles = []; // { i0, j0, w, h, geo } (w, h in vertices); deep-sea tiles are skipped
const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });

// Writes the colour of grid vertex k (j*GRID_RES+i) into out[o*3..]. x/z/h are world coords, ny the normal's y.
function paintVertex(out, o, k, x, h, z, ny) {
  const nse = valueNoise(x * 0.3, z * 0.3);
  const c = tmpC,
    g = tmpG;
  c.copy(WET).lerp(SAND, smoothstep(-1.5, 0.4, h));
  const grassy = smoothstep(1.35, 1.75, h + nse * 0.25);
  g.copy(GRASS).lerp(GRASS_DK, smoothstep(-0.2, 0.6, nse) * 0.7 + smoothstep(4, 8, h) * 0.3);
  c.lerp(g, grassy);
  c.lerp(ROCK, smoothstep(0.86, 0.72, ny) * grassy);
  c.lerp(ROCK, smoothstep(11, 22, h) * 0.55 * grassy); // the massif turns stony towards the top
  c.lerp(SAND, 1 - smoothstep(COURT.r - 1, COURT.r + 0.5, Math.hypot(x - COURT.x, z - COURT.z)));
  const pa = poiPaint[k * 4 + 3];
  if (pa > 0) c.lerp(tmpP.setRGB(poiPaint[k * 4], poiPaint[k * 4 + 1], poiPaint[k * 4 + 2], THREE.SRGBColorSpace), pa);
  const i = k % GRID_RES,
    j = (k - i) / GRID_RES;
  if (i >= PATCH.i0 - 1 && i <= PATCH.i0 + PATCH.w && j >= PATCH.j0 - 1 && j <= PATCH.j0 + PATCH.h)
    c.copy(DIRT).offsetHSL(0, 0, nse * 0.04);
  out[o * 3] = c.r;
  out[o * 3 + 1] = c.g;
  out[o * 3 + 2] = c.b;
}

// Writes position, normal and colour of grid vertex (i, j) into a tile's arrays at local index o.
function writeVertex(t, o, i, j) {
  const n = GRID_RES;
  const k = j * n + i;
  const pos = t.geo.attributes.position.array,
    nrm = t.geo.attributes.normal.array,
    col = t.geo.attributes.color.array;
  const h = heights[i][j];
  pos[o * 3] = i * CELL - HALF;
  pos[o * 3 + 1] = h;
  pos[o * 3 + 2] = HALF - j * CELL;
  const ie = Math.min(n - 1, i + 1),
    iw = Math.max(0, i - 1),
    jn = Math.max(0, j - 1),
    js = Math.min(n - 1, j + 1);
  const dx = (heights[ie][j] - heights[iw][j]) / (2 * CELL);
  const dz = (heights[i][jn] - heights[i][js]) / (2 * CELL);
  const il = 1 / Math.hypot(dx, 1, dz);
  nrm[o * 3] = -dx * il;
  nrm[o * 3 + 1] = il;
  nrm[o * 3 + 2] = -dz * il;
  paintVertex(col, o, k, pos[o * 3], h, pos[o * 3 + 2], il);
}

export function createTerrainMesh() {
  const n = GRID_RES;
  const group = new THREE.Group();
  for (let ti = 0; ti < n - 1; ti += TILE)
    for (let tj = 0; tj < n - 1; tj += TILE) {
      const w = Math.min(TILE, n - 1 - ti) + 1,
        h = Math.min(TILE, n - 1 - tj) + 1;
      let top = -Infinity;
      for (let i = ti; i < ti + w; i++) for (let j = tj; j < tj + h; j++) top = Math.max(top, heights[i][j]);
      if (top < SEABED + 1.2) continue; // open sea floor: the sea draws over it, never edited
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(w * h * 3), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(w * h * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(w * h * 3), 3));
      const idx = [];
      for (let j = 0; j < h - 1; j++)
        for (let i = 0; i < w - 1; i++) {
          const a = j * w + i,
            b = a + 1,
            c = a + w,
            d = c + 1;
          idx.push(a, b, c, b, d, c);
        }
      geo.setIndex(idx);
      const t = { i0: ti, j0: tj, w, h, geo };
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) writeVertex(t, j * w + i, ti + i, tj + j);
      geo.computeBoundingSphere();
      tiles.push(t);
      const mesh = new THREE.Mesh(geo, terrainMat);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      group.add(mesh);
    }
  scene.add(group);
  return group;
}

// ---------------------------------------------------------------- holes (cave mouths)
// Up to MAX_HOLES capsules, each { a: [x, y, z], b: [x, y, z], r, floor }: the ground is not drawn inside a capsule
// above its floor height, so a tunnel can open out of a hillside (src/pois/caves/). Visual only; physics is separate.
const MAX_HOLES = 6;
const holeA = Array.from({ length: MAX_HOLES }, () => new THREE.Vector4(0, 0, 0, 0)),
  holeB = Array.from({ length: MAX_HOLES }, () => new THREE.Vector4(0, 0, 0, 0));
export function setTerrainHoles(list) {
  holeA.forEach((v, k) => {
    const h = list[k];
    v.set(...(h ? h.a : [0, 0, 0]), h ? h.r : 0);
    holeB[k].set(...(h ? h.b : [0, 0, 0]), h ? h.floor : 0);
  });
}
terrainMat.onBeforeCompile = (shader) => {
  shader.uniforms.uHoleA = { value: holeA };
  shader.uniforms.uHoleB = { value: holeB };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vGround;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = position;');
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      varying vec3 vGround; uniform vec4 uHoleA[${MAX_HOLES}]; uniform vec4 uHoleB[${MAX_HOLES}];`,
    )
    .replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      for (int k = 0; k < ${MAX_HOLES}; k++) {
        if (uHoleA[k].w <= 0.0) continue;
        vec3 pa = vGround - uHoleA[k].xyz, ba = uHoleB[k].xyz - uHoleA[k].xyz;
        float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        if (length(pa - ba * t) < uHoleA[k].w && vGround.y > uHoleB[k].w) discard;
      }`,
    );
};
