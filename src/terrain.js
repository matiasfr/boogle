import * as THREE from 'three';
import { ISLAND_R, GRID_RES, CELL, HALF, SEABED, COURT } from './constants.js';
import { lerp, smoothstep, fbm, valueNoise } from './math.js';
import { scene } from './scene.js';

function naturalHeight(x, z) {
  const d = Math.hypot(x, z * 1.12) / ISLAND_R + fbm(x * 0.03 + 11, z * 0.03 - 7) * 0.16;
  const hill = 6.5 * Math.exp(-((x + 12) ** 2 + (z + 6) ** 2) / (2 * 13 * 13));
  const bumps = fbm(x * 0.08, z * 0.08) * 1.1 * (1 - smoothstep(0.55, 0.85, d));
  const inland = 1.3 + hill + bumps + 0.9 * (1 - smoothstep(0.3, 0.8, d));
  return lerp(inland, SEABED, smoothstep(0.8, 1.12, d));
}
const COURT_H = naturalHeight(COURT.x, COURT.z);
const courtWeight = (x, z) => 1 - smoothstep(COURT.r, COURT.r + 6, Math.hypot(x - COURT.x, z - COURT.z));
function islandHeight(x, z) {
  return lerp(naturalHeight(x, z), COURT_H, courtWeight(x, z));
}

// heights[i][j] sits at world x = i*CELL - HALF, z = HALF - j*CELL (the heightfield body's frame).
export const heights = [];
for (let i = 0; i < GRID_RES; i++) {
  const col = new Array(GRID_RES);
  for (let j = 0; j < GRID_RES; j++) col[j] = islandHeight(i * CELL - HALF, HALF - j * CELL);
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
  DUG = new THREE.Color('#9a7f52');
const tmpC = new THREE.Color(),
  tmpG = new THREE.Color();
// Metres of player edits per vertex (index j*GRID_RES+i, the mesh order); drives colour only.
const editDelta = new Float32Array(GRID_RES * GRID_RES);
let terrainGeo = null;

// Writes the vertex colour for mesh vertex k into out[k*3..]. x/z/h are world coords, ny the normal's y.
function paintVertex(out, k, x, h, z, ny) {
  const d = editDelta[k];
  const nse = valueNoise(x * 0.3, z * 0.3);
  const c = tmpC,
    g = tmpG;
  c.copy(WET).lerp(SAND, smoothstep(-1.5, 0.4, h));
  // Moved sand buries or uncovers the grass; dug sand is darker and wetter.
  const grassy = smoothstep(1.35, 1.75, h - d + nse * 0.25) * (1 - Math.min(1, Math.abs(d) / 0.3));
  g.copy(GRASS).lerp(GRASS_DK, smoothstep(-0.2, 0.6, nse) * 0.7 + smoothstep(4, 8, h) * 0.3);
  c.lerp(g, grassy);
  c.lerp(ROCK, smoothstep(0.86, 0.72, ny) * grassy);
  c.lerp(SAND, 1 - smoothstep(COURT.r - 1, COURT.r + 0.5, Math.hypot(x - COURT.x, z - COURT.z)));
  if (d < 0) c.lerp(DUG, Math.min(1, -d / 0.4) * 0.9);
  else if (d > 0) c.lerp(SAND, Math.min(1, d / 0.6) * 0.5);
  out[k * 3] = c.r;
  out[k * 3 + 1] = c.g;
  out[k * 3 + 2] = c.b;
}

// Set one grid cell's height (metres) in place, plus how far it is from the base terrain (metres, colour only).
// Call refreshRegion afterwards to push the change into the mesh.
export function setCellHeight(i, j, h, deltaM = 0) {
  heights[i][j] = h;
  editDelta[j * GRID_RES + i] = deltaM;
}

// Rebuild mesh positions, normals and colours for cells i0..i1, j0..j1 (inclusive) and their neighbours.
export function refreshRegion(i0, j0, i1, j1) {
  if (!terrainGeo) return;
  const n = GRID_RES;
  const a = Math.max(0, i0 - 1),
    b = Math.min(n - 1, i1 + 1),
    c0 = Math.max(0, j0 - 1),
    d0 = Math.min(n - 1, j1 + 1);
  const pos = terrainGeo.attributes.position.array,
    nrm = terrainGeo.attributes.normal.array,
    col = terrainGeo.attributes.color.array;
  for (let j = c0; j <= d0; j++)
    for (let i = a; i <= b; i++) {
      const k = j * n + i;
      const h = heights[i][j];
      pos[k * 3 + 1] = h;
      const dx = (heights[Math.min(n - 1, i + 1)][j] - heights[Math.max(0, i - 1)][j]) / (2 * CELL);
      const dz = (heights[i][Math.max(0, j - 1)] - heights[i][Math.min(n - 1, j + 1)]) / (2 * CELL);
      const il = 1 / Math.hypot(dx, 1, dz);
      nrm[k * 3] = -dx * il;
      nrm[k * 3 + 1] = il;
      nrm[k * 3 + 2] = -dz * il;
      paintVertex(col, k, pos[k * 3], h, pos[k * 3 + 2], nrm[k * 3 + 1]);
    }
  terrainGeo.attributes.position.needsUpdate = true;
  terrainGeo.attributes.normal.needsUpdate = true;
  terrainGeo.attributes.color.needsUpdate = true;
}

export function createTerrainMesh() {
  const n = GRID_RES;
  const pos = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 3;
      pos[k] = i * CELL - HALF;
      pos[k + 1] = heights[i][j];
      pos[k + 2] = HALF - j * CELL;
    }
  const idx = [];
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i,
        b = a + 1,
        c = a + n,
        d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal.array;
  const col = new Float32Array(n * n * 3);
  for (let k = 0; k < n * n; k++) paintVertex(col, k, pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2], nrm[k * 3 + 1]);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  terrainGeo = geo;
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}
