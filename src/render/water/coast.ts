// The coast texture: one RG16F texture over the registered shores at about 1 m a texel, baked once per shore revision
// from the providers' own bed functions (docs/game-design/water.md, "The sea").
//   R  the bed the sea is coloured by: the providers' bed in the shallows, then a shelf falling from the coast (shelfBed)
//   G  the providers' own bed height (m, SEA = 0), continued past their bounds by the terrain's offshore apron: what the
//      swell's fade, the clear shallows and the foam lip read
// The CPU keeps the bed, the drawn shelf and the signed waterline distance for the water field (swimming, floating
// things and the coast normal they drift along).
import * as THREE from 'three/webgpu';
import { SEA } from '../../constants.ts';
import { shoreApronHeight, shoreProviders, shoreRevision, type ShoreProvider } from './shore-providers.ts';
import { TSL, type N } from './tsl.ts';

const OPEN_BED = -60;
const MARGIN = 120; // m of open sea kept around the shores (the pier head reaches 92 m past the place grid)
const MAX_SIDE = 2048;
const SDF_CAP = 250;
const { texture, uniform } = TSL;

type Grid = { x0: number; z0: number; cell: number; nx: number; nz: number };
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Felzenszwalb & Huttenlocher's 1D squared distance transform, in place over a strided line.
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    if (f[q] === Infinity) continue;
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (k >= 0 && s <= z[k]!) {
      k--;
      if (k < 0) break;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = k === 0 ? -Infinity : s;
    z[k + 1] = Infinity;
  }
  if (f[v[0]!] === Infinity) {
    d.fill(Infinity, 0, n);
    return;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    d[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
  }
}
/** Distance in texels from each texel to the nearest texel where `seed` is true. */
function distanceTo(seed: (k: number) => boolean, nx: number, nz: number) {
  const out = new Float32Array(nx * nz);
  const n = Math.max(nx, nz);
  const f = new Float64Array(n),
    d = new Float64Array(n),
    v = new Int32Array(n),
    z = new Float64Array(n + 1);
  const grid = new Float64Array(nx * nz);
  for (let k = 0; k < nx * nz; k++) grid[k] = seed(k) ? 0 : Infinity;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) f[j] = grid[j * nx + i]!;
    edt1d(f, nz, d, v, z);
    for (let j = 0; j < nz; j++) grid[j * nx + i] = d[j]!;
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) f[i] = grid[j * nx + i]!;
    edt1d(f, nx, d, v, z);
    for (let i = 0; i < nx; i++) out[j * nx + i] = Math.sqrt(d[i]!);
  }
  return out;
}

/** Separable box blur of radius r texels (clamped at the edges), in a new array. */
function boxBlur(src: Float32Array, nx: number, nz: number, r: number) {
  const tmp = new Float32Array(nx * nz),
    out = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const row = j * nx;
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[row + Math.min(Math.max(i, 0), nx - 1)]!;
    for (let i = 0; i < nx; i++) {
      tmp[row + i] = sum;
      sum += src[row + Math.min(i + r + 1, nx - 1)]! - src[row + Math.max(i - r, 0)]!;
    }
  }
  for (let i = 0; i < nx; i++) {
    let sum = 0;
    for (let j = -r; j <= r; j++) sum += tmp[Math.min(Math.max(j, 0), nz - 1) * nx + i]!;
    for (let j = 0; j < nz; j++) {
      out[j * nx + i] = sum;
      sum += tmp[Math.min(j + r + 1, nz - 1) * nx + i]! - tmp[Math.max(j - r, 0) * nx + i]!;
    }
  }
  return out;
}

// The bed the sea is coloured by. Terrain grids end in a flat floor (Place's is 5 m down) and a square edge, which read as
// a cyan box from any height; so past the shallows the drawn bed instead falls away from the shaped coast, gently off
// low shores and fast under high ones, and eases into open sea. Only the colour uses it: swimming, floating, the swell's
// fade, the clear shallows and the foam lip keep the providers' own bed.
export const SHELF = {
  shaped: 4.5, // m: the providers' bed is used as it is while shallower than this
  beach: 0.1, // m of depth gained per m off a low shore (about 5 m at 60 m out)
  cliff: 0.7, // and off a shore whose land stands `high` or more above the sea
  low: 1, // m: land this high or lower is a beach
  high: 10, // m: and this high or higher a cliff
  open: 30, // m: the depth the fall eases towards
  band: 6, // m of land behind the waterline whose height says beach or cliff
  reach: 30, // m over which that height is averaged along the coast
};
function shelfBed(bed: Float32Array, covered: Uint8Array, toWater: Float32Array, nx: number, nz: number, cell: number) {
  const n = nx * nz;
  // How high the land stands just behind the waterline, averaged along the coast and carried out to sea.
  const height = new Float32Array(n),
    weight = new Float32Array(n);
  for (let k = 0; k < n; k++)
    if (bed[k]! >= SEA && toWater[k]! * cell <= SHELF.band) {
      height[k] = Math.min(bed[k]! - SEA, 25);
      weight[k] = 1;
    }
  const r = Math.max(1, Math.round(SHELF.reach / cell));
  const h = boxBlur(boxBlur(height, nx, nz, r), nx, nz, r),
    w = boxBlur(boxBlur(weight, nx, nz, r), nx, nz, r);
  const shaped = distanceTo((k) => covered[k] === 1 && bed[k]! >= SEA - SHELF.shaped, nx, nz);
  const shade = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    if (bed[k]! >= SEA || (covered[k] && bed[k]! >= SEA - SHELF.shaped)) {
      shade[k] = bed[k]!;
      continue;
    }
    const land = w[k]! > 1e-3 ? h[k]! / w[k]! : 0;
    const slope = SHELF.beach + (SHELF.cliff - SHELF.beach) * smooth(SHELF.low, SHELF.high, land);
    const fall = SHELF.open * (1 - Math.exp((-shaped[k]! * cell * slope) / SHELF.open));
    const shelf = SEA - SHELF.shaped - fall;
    // Terrain genuinely deeper than the shelf (a channel, a deep grid) stays; a flat floor is replaced.
    shade[k] = covered[k] ? Math.min(bed[k]!, shelf) : shelf;
  }
  return shade;
}

const within = (p: ShoreProvider, x: number, z: number) =>
  x >= p.bounds.minX && x <= p.bounds.maxX && z >= p.bounds.minZ && z <= p.bounds.maxZ;
let covered = false; // whether the last bedAt came from a provider's own bed
function bedAt(providers: ShoreProvider[], x: number, z: number) {
  let nearest: ShoreProvider | null = null,
    gap = Infinity;
  covered = false;
  for (const p of providers) {
    if (within(p, x, z)) {
      const s = p.bedAt(x, z);
      covered = s.valid;
      if (s.valid) return s.height - p.seaLevel + SEA;
    }
    const b = p.bounds;
    const g = Math.hypot(Math.max(b.minX - x, 0, x - b.maxX), Math.max(b.minZ - z, 0, z - b.maxZ));
    if (g < gap) {
      gap = g;
      nearest = p;
    }
  }
  if (!nearest) return OPEN_BED;
  const b = nearest.bounds;
  const edge = nearest.bedAt(Math.min(Math.max(x, b.minX), b.maxX), Math.min(Math.max(z, b.minZ), b.maxZ));
  if (!edge.valid) return OPEN_BED;
  // The terrain's own offshore apron (proto/place/land.ts draws it from the same function), kept under the surface so
  // no open water reads as dry land where a grid's edge meets its shore.
  return Math.min(SEA + shoreApronHeight(edge.height - nearest.seaLevel, gap, nearest.extent), SEA - 0.5);
}

export function createCoast() {
  const transform = uniform(new THREE.Vector4(0, 0, 1, 1)); // x0, z0, 1/width, 1/depth (m)
  let grid: Grid = { x0: 0, z0: 0, cell: 1, nx: 2, nz: 2 };
  let bed = new Float32Array(4),
    shade = new Float32Array(4),
    sdf = new Float32Array(4);
  const blank = () => {
    const t = new THREE.DataTexture(new Uint16Array(8), 2, 2, THREE.RGFormat, THREE.HalfFloatType);
    t.needsUpdate = true;
    return t;
  };
  const node = texture(blank());
  let seenShore = -1,
    bakeMs = 0;

  const pack = () => {
    const tex = node.value as THREE.DataTexture;
    const data = tex.image.data as Uint16Array;
    const { nx, nz } = grid;
    for (let k = 0; k < nx * nz; k++) {
      // The sampler clamps beyond the texture, repeating its outermost texels across the whole sea: those are open
      // water whatever the bake found there.
      const i = k % nx,
        j = (k - i) / nx;
      const border = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      data[k * 2] = THREE.DataUtils.toHalfFloat(border ? SEA - SHELF.shaped - SHELF.open : shade[k]!);
      data[k * 2 + 1] = THREE.DataUtils.toHalfFloat(border ? OPEN_BED : bed[k]!);
    }
    tex.needsUpdate = true;
  };
  function bake() {
    const start = performance.now();
    const providers = shoreProviders();
    if (!providers.length) return;
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const p of providers) {
      minX = Math.min(minX, p.bounds.minX);
      maxX = Math.max(maxX, p.bounds.maxX);
      minZ = Math.min(minZ, p.bounds.minZ);
      maxZ = Math.max(maxZ, p.bounds.maxZ);
    }
    minX -= MARGIN;
    minZ -= MARGIN;
    maxX += MARGIN;
    maxZ += MARGIN;
    const cell = Math.max(1, Math.max(maxX - minX, maxZ - minZ) / MAX_SIDE);
    const nx = Math.ceil((maxX - minX) / cell),
      nz = Math.ceil((maxZ - minZ) / cell);
    grid = { x0: minX, z0: minZ, cell, nx, nz };
    bed = new Float32Array(nx * nz);
    const inside = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        bed[j * nx + i] = bedAt(providers, minX + (i + 0.5) * cell, minZ + (j + 0.5) * cell);
        inside[j * nx + i] = covered ? 1 : 0;
      }
    const toLand = distanceTo((k) => bed[k]! >= SEA, nx, nz),
      toWater = distanceTo((k) => bed[k]! < SEA, nx, nz);
    sdf = new Float32Array(nx * nz);
    for (let k = 0; k < nx * nz; k++)
      sdf[k] = Math.max(-SDF_CAP, Math.min(SDF_CAP, (bed[k]! < SEA ? toLand[k]! - 0.5 : 0.5 - toWater[k]!) * cell));
    shade = shelfBed(bed, inside, toWater, nx, nz, cell);
    const previous = node.value as THREE.Texture;
    const tex = new THREE.DataTexture(new Uint16Array(nx * nz * 2), nx, nz, THREE.RGFormat, THREE.HalfFloatType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    node.value = tex;
    pack();
    previous.dispose();
    transform.value.set(minX, minZ, 1 / (nx * cell), 1 / (nz * cell));
    bakeMs = performance.now() - start;
  }
  function sync() {
    const shore = shoreRevision();
    if (shore === seenShore) return;
    seenShore = shore;
    bake();
  }

  /** The coast texel at world xz, explicit LOD so it may sit in branches and the vertex stage. */
  const at = (xz: N) => node.sample(xz.sub(transform.xy).mul(transform.zw)).level(0);
  const read = (data: Float32Array, x: number, z: number) => {
    const { x0, z0, cell, nx, nz } = grid;
    const u = Math.min(Math.max((x - x0) / cell - 0.5, 0), nx - 1),
      v = Math.min(Math.max((z - z0) / cell - 0.5, 0), nz - 1);
    const i = Math.min(nx - 2, Math.floor(u)),
      j = Math.min(nz - 2, Math.floor(v));
    const a = u - i,
      b = v - j,
      k = j * nx + i;
    return (data[k]! * (1 - a) + data[k + 1]! * a) * (1 - b) + (data[k + nx]! * (1 - a) + data[k + nx + 1]! * a) * b;
  };
  /** CPU lookups for the water field: bed height and the outward coast normal. */
  function sampleAt(x: number, z: number) {
    sync();
    const h = grid.cell;
    const gx = read(sdf, x + h, z) - read(sdf, x - h, z),
      gz = read(sdf, x, z + h) - read(sdf, x, z - h);
    const l = Math.hypot(gx, gz);
    return {
      bed: read(bed, x, z),
      shade: read(shade, x, z), // the drawn shelf (R), for checks; nothing in the game reads it on the CPU
      normal: l > 1e-6 ? ([gx / l, gz / l] as const) : ([0, 0] as const),
    };
  }
  return {
    at,
    sync,
    sampleAt,
    inspect: () => ({ coast: { ...grid, bakeMs, textureBytes: grid.nx * grid.nz * 4 } }),
    dispose() {
      (node.value as THREE.Texture).dispose();
    },
  };
}
export type Coast = ReturnType<typeof createCoast>;
