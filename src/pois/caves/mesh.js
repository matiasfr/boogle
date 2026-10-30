// The cave surface: the network's signed distance (network.js) roughened with rock noise, turned into triangles by
// marching cubes. One seamless shell for tunnels and chambers alike, used for both the look and the collider.
// Returns plain typed arrays (no three.js objects), so it can be timed and checked in Node.
//
// Floors stay flat (no noise near them), noise fades out near the mouths (so they meet the terrain's openings) and the
// cellar is left smooth (it gets brickwork instead).
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';
import { networkSd, ZONE, MOUTHS, SEGMENTS, NODES, FLOOR_CUT } from './network.js';

const VOXEL = 0.62;
const NOISE = 0.55; // metres of roughness on walls and ceilings

function hash3(x, y, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const fade = (t) => t * t * (3 - 2 * t);
function vnoise(x, y, z) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  const fx = fade(x - ix),
    fy = fade(y - iy),
    fz = fade(z - iz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
  return (
    l(
      l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
      l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
      fz,
    ) *
      2 -
    1
  );
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Signed distance to open cave (negative inside), with the rock noise. out gets zone and floor (see networkSd).
const scratch = { zone: 0, floor: 0 };
export function caveSd(x, y, z, out = scratch) {
  const d = networkSd(x, y, z, out);
  if (d > NOISE * 1.6 || out.zone === ZONE.CELLAR) return d;
  let w = smooth(out.floor + 0.3, out.floor + 1.4, y);
  for (const m of MOUTHS) {
    const dm = Math.sqrt((x - m.x) ** 2 + (z - m.z) ** 2);
    if (dm < 10) w *= smooth(3.5, 10, dm);
  }
  if (w <= 0) return d;
  const n = vnoise(x * 0.33, y * 0.33, z * 0.33) * 0.75 + vnoise(x * 0.9 + 7.1, y * 0.9, z * 0.9 - 3.3) * 0.25;
  return d + n * NOISE * w;
}

// Grid bounds around everything, with room for the tunnel radius and noise.
function bounds() {
  const pts = [];
  for (const s of SEGMENTS) for (const p of s.pts) pts.push([p.x, p.y, p.z, 3.5]);
  for (const n of Object.values(NODES)) {
    if (n.kind === 'mouth') continue;
    const r = n.kind === 'cellar' ? Math.max(...n.half) + 1 : Math.max(...n.r) + 1;
    pts.push([n.x, n.y, n.z, r]);
  }
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (const [x, y, z, r] of pts) {
    lo[0] = Math.min(lo[0], x - r);
    hi[0] = Math.max(hi[0], x + r);
    lo[1] = Math.min(lo[1], y - 1.5);
    hi[1] = Math.max(hi[1], y + r + 6);
    lo[2] = Math.min(lo[2], z - r);
    hi[2] = Math.max(hi[2], z + r);
  }
  return { lo, hi };
}

// Corner offsets and edge endpoints in the standard (Bourke / three.js MarchingCubes) order.
const CORNER = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const EDGE = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

// Marching cubes over field (dims [nx, ny, nz], voxel size, origin lo; inside = negative), sharing vertices along grid
// edges. onVertex(x, y, z) runs once per new vertex. Generator (yields per slice); returns { pos, idx } as plain arrays.
function* polygonize(field, [nx, ny, nz], lo, voxel, onVertex = null) {
  const at = (i, j, k) => (k * ny + j) * nx + i;
  const pos = [],
    idx = [];
  const edgeVert = new Map();
  const vert = (i, j, k, e) => {
    const [a, b] = EDGE[e];
    const A = CORNER[a],
      Bc = CORNER[b];
    const ia = at(i + A[0], j + A[1], k + A[2]),
      ib = at(i + Bc[0], j + Bc[1], k + Bc[2]);
    const key =
      ia < ib
        ? ia * 3 + (ib - ia === 1 ? 0 : ib - ia === nx ? 1 : 2)
        : ib * 3 + (ia - ib === 1 ? 0 : ia - ib === nx ? 1 : 2);
    let v = edgeVert.get(key);
    if (v !== undefined) return v;
    const va = field[ia],
      vb = field[ib];
    const t = va / (va - vb);
    const x = lo[0] + (i + A[0] + (Bc[0] - A[0]) * t) * voxel,
      y = lo[1] + (j + A[1] + (Bc[1] - A[1]) * t) * voxel,
      z = lo[2] + (k + A[2] + (Bc[2] - A[2]) * t) * voxel;
    v = pos.length / 3;
    pos.push(x, y, z);
    onVertex?.(x, y, z);
    edgeVert.set(key, v);
    return v;
  };
  for (let k = 0; k < nz - 1; k++) {
    yield;
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let cube = 0;
        for (let c = 0; c < 8; c++)
          if (field[at(i + CORNER[c][0], j + CORNER[c][1], k + CORNER[c][2])] < 0) cube |= 1 << c;
        if (!edgeTable[cube]) continue;
        for (let n = cube * 16; triTable[n] !== -1; n += 3)
          idx.push(vert(i, j, k, triTable[n]), vert(i, j, k, triTable[n + 1]), vert(i, j, k, triTable[n + 2]));
      }
  }
  return { pos, idx };
}

// Winds every triangle so its front faces down sd's gradient (toward = -1) or up it (toward = 1).
function* orient(pos, idx, sd, toward) {
  const g = 0.08;
  for (let n = 0; n < idx.length; n += 3) {
    if (n % 3000 === 0) yield;
    const a = idx[n] * 3,
      b = idx[n + 1] * 3,
      c = idx[n + 2] * 3;
    const ux = pos[b] - pos[a],
      uy = pos[b + 1] - pos[a + 1],
      uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a],
      vy = pos[c + 1] - pos[a + 1],
      vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy,
      fy = uz * vx - ux * vz,
      fz = ux * vy - uy * vx;
    const mx = (pos[a] + pos[b] + pos[c]) / 3,
      my = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3,
      mz = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
    const gx = sd(mx + g, my, mz) - sd(mx - g, my, mz),
      gy = sd(mx, my + g, mz) - sd(mx, my - g, mz),
      gz = sd(mx, my, mz + g) - sd(mx, my, mz - g);
    if ((fx * gx + fy * gy + fz * gz) * toward < 0) [idx[n + 1], idx[n + 2]] = [idx[n + 2], idx[n + 1]];
  }
}

// Generator: yields now and then so the game can spread the work over frames; returns
// { positions: Float32Array, indices: Uint32Array, zones: Uint8Array (per vertex), grid, ms }.
export function* buildCaveMeshSteps() {
  const t0 = performance.now();
  const { lo, hi } = bounds();
  const nx = Math.ceil((hi[0] - lo[0]) / VOXEL) + 1,
    ny = Math.ceil((hi[1] - lo[1]) / VOXEL) + 1,
    nz = Math.ceil((hi[2] - lo[2]) / VOXEL) + 1;
  const at = (i, j, k) => (k * ny + j) * nx + i;
  const field = new Float32Array(nx * ny * nz);

  // Coarse pass: blocks whose corners are all far inside rock are filled without evaluating every voxel.
  const B = 4,
    far = B * VOXEL * 0.9 + NOISE + 0.2;
  const cx = Math.ceil(nx / B) + 1,
    cy = Math.ceil(ny / B) + 1,
    cz = Math.ceil(nz / B) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++)
        coarse[(k * cy + j) * cx + i] = networkSd(lo[0] + i * B * VOXEL, lo[1] + j * B * VOXEL, lo[2] + k * B * VOXEL);
  for (let k = 0; k < nz; k++) {
    yield;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const bi = Math.floor(i / B),
          bj = Math.floor(j / B),
          bk = Math.floor(k / B);
        let solid = true;
        for (let c = 0; c < 8 && solid; c++)
          if (coarse[((bk + (c >> 2)) * cy + bj + ((c >> 1) & 1)) * cx + bi + (c & 1)] < far) solid = false;
        field[at(i, j, k)] = solid ? far : caveSd(lo[0] + i * VOXEL, lo[1] + j * VOXEL, lo[2] + k * VOXEL);
      }
  }

  const zones = [];
  const zinfo = { zone: 0, floor: 0 };
  const { pos, idx } = yield* polygonize(field, [nx, ny, nz], lo, VOXEL, (x, y, z) => {
    networkSd(x, y, z, zinfo);
    zones.push(zinfo.zone);
  });
  yield* orient(pos, idx, caveSd, -1); // every triangle faces the open cave (front faces are what you see from inside)
  return {
    positions: new Float32Array(pos),
    indices: new Uint32Array(idx),
    zones: new Uint8Array(zones),
    grid: [nx, ny, nz],
    ms: performance.now() - t0,
  };
}

// ---------------------------------------------------------------- mouth collars
// A ring of rock round each mouth, overlapping both the hillside and the tunnel, so the seam where the heightfield's
// hole meets the cave mesh (the tube's trimmed end, gaps at the floor corners) is behind solid rock. Inside = rock.
const COLLAR = { inner: 2.16, outer: 3.5, back: -1.6, front: 1.1, below: 0.9, voxel: 0.5, noise: 0.35 };
function collarSd(x, y, z, m) {
  const ay = m.y + FLOOR_CUT; // tunnel axis height at the mouth
  const along = (x - m.x) * m.ox + (z - m.z) * m.oz;
  const sx = x - m.x - along * m.ox,
    sy = y - ay,
    sz = z - m.z - along * m.oz;
  const r = Math.sqrt(sx * sx + sy * sy + sz * sz);
  const n = vnoise(x * 0.8, y * 0.8, z * 0.8) * COLLAR.noise;
  return Math.max(
    COLLAR.inner - r,
    r - COLLAR.outer + n,
    along - COLLAR.front + n * 0.6,
    COLLAR.back - along,
    m.y - COLLAR.below - y,
  );
}

// One mesh for all four collars: { positions: Float32Array, indices: Uint32Array }, fronts facing out of the rock.
// Generator, like buildCaveMeshSteps: yields per slice so the build stays inside the caves' per-frame budget.
export function* buildCollarMeshSteps() {
  const pos = [],
    idx = [];
  for (const m of MOUTHS) {
    const pad = COLLAR.outer + 1,
      v = COLLAR.voxel;
    const lo = [m.x - pad, m.y - COLLAR.below - 0.5, m.z - pad];
    const dims = [Math.ceil((2 * pad) / v) + 1, Math.ceil((FLOOR_CUT + pad + COLLAR.below + 0.5) / v) + 1, 0];
    dims[2] = dims[0];
    const field = new Float32Array(dims[0] * dims[1] * dims[2]);
    for (let k = 0, f = 0; k < dims[2]; k++) {
      yield;
      for (let j = 0; j < dims[1]; j++)
        for (let i = 0; i < dims[0]; i++) field[f++] = collarSd(lo[0] + i * v, lo[1] + j * v, lo[2] + k * v, m);
    }
    const sd = (x, y, z) => collarSd(x, y, z, m);
    const part = yield* polygonize(field, dims, lo, v);
    yield* orient(part.pos, part.idx, sd, 1);
    const base = pos.length / 3;
    pos.push(...part.pos);
    for (const i of part.idx) idx.push(base + i);
  }
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
}
