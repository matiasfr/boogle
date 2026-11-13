// The coast texture: one RG16F texture over the registered shores at about 1 m a texel, baked once per shore revision
// from the providers' own bed functions (docs/game-design/water.md, "The sea"). Shores far apart bake as separate
// regions, each with its own margin of open sea, packed as rows of the one texture; a lookup picks the region by
// position and reads once (docs/plans/ring-island-build1.md, R2a).
//   R  the bed the sea is coloured by: the providers' bed in the shallows, then a shelf falling from the coast (shelfBed)
//   G  the providers' own bed height (m, SEA = 0), continued past their bounds by the terrain's offshore apron: what the
//      swell's fade, the clear shallows and the foam lip read
// The CPU keeps the bed, the drawn shelf and the signed waterline distance for the water field (swimming, floating
// things and the coast normal they drift along).
import * as THREE from 'three/webgpu';
import { SEA } from '../../constants.ts';
import { smoothstep } from '../../math-pure.ts';
import { shoreApronHeight, shoreProviders, shoreRevision, type ShoreProvider } from './shore-providers.ts';
import { TSL, type N } from './tsl.ts';

const OPEN_BED = -60;
const MARGIN = 120; // m of open sea kept around the shores (the pier head reaches 92 m past the place grid)
const MAX_SIDE = 2048; // texels: a region's longest side at 1 m, and the packed texture's cap
const MAX_REGIONS = 4; // the shader picks among this many; more regions merge the nearest pair
// Near shores share a region when one rect over both costs at most this many times their texels apart: Home and Place
// (485 m apart, 1.16x) stay one region as they were; an island 1.5 km off (1.7x) bakes on its own.
const JOIN = 1.5;
const SDF_CAP = 250;
const { texture, uniform, vec2, max, clamp, select } = TSL;

type Grid = { x0: number; z0: number; cell: number; nx: number; nz: number };
type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
// One region: shores whose bounds, grown by MARGIN, overlap, baked together into rows `row`.. of the packed texture.
type Region = {
  ids: string[];
  grid: Grid;
  rect: Rect; // rectOf(grid), kept for the per-sample pick
  row: number;
  bed: Float32Array;
  shade: Float32Array;
  sdf: Float32Array;
  bakeMs: number;
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
    const slope = SHELF.beach + (SHELF.cliff - SHELF.beach) * smoothstep(SHELF.low, SHELF.high, land);
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
    const g = rectGap(p.bounds, x, z);
    if (g < gap) {
      gap = g;
      nearest = p;
    }
  }
  if (!nearest) return OPEN_BED;
  const b = nearest.bounds;
  const edge = nearest.bedAt(Math.min(Math.max(x, b.minX), b.maxX), Math.min(Math.max(z, b.minZ), b.maxZ));
  if (!edge.valid) return OPEN_BED;
  // The terrain's own offshore apron (place/land.ts draws it from the same function), kept under the surface so
  // no open water reads as dry land where a grid's edge meets its shore.
  return Math.min(SEA + shoreApronHeight(edge.height - nearest.seaLevel, gap, nearest.extent), SEA - 0.5);
}

function rectGap(a: Rect, x: number, z: number) {
  return Math.hypot(Math.max(a.minX - x, 0, x - a.maxX), Math.max(a.minZ - z, 0, z - a.maxZ));
}
const overlaps = (a: Rect, b: Rect) => a.minX <= b.maxX && b.minX <= a.maxX && a.minZ <= b.maxZ && b.minZ <= a.maxZ;
const union = (a: Rect, b: Rect): Rect => ({
  minX: Math.min(a.minX, b.minX),
  maxX: Math.max(a.maxX, b.maxX),
  minZ: Math.min(a.minZ, b.minZ),
  maxZ: Math.max(a.maxZ, b.maxZ),
});
const gapBetween = (a: Rect, b: Rect) =>
  Math.hypot(Math.max(a.minX - b.maxX, 0, b.minX - a.maxX), Math.max(a.minZ - b.maxZ, 0, b.minZ - a.maxZ));

const area = (r: Rect) => (r.maxX - r.minX) * (r.maxZ - r.minZ);
const joins = (a: Rect, b: Rect) => overlaps(a, b) || area(union(a, b)) <= JOIN * (area(a) + area(b));
/** Shores grouped into regions: a provider whose bounds grown by MARGIN overlap another's (or lie near enough, JOIN)
 *  joins its region, until the regions are apart (then the nearest pair merges, past MAX_REGIONS). Members keep the
 *  given order. */
function groupShores(providers: ShoreProvider[]) {
  let groups = providers.map((p, i) => ({
    members: [i],
    rect: {
      minX: p.bounds.minX - MARGIN,
      maxX: p.bounds.maxX + MARGIN,
      minZ: p.bounds.minZ - MARGIN,
      maxZ: p.bounds.maxZ + MARGIN,
    },
  }));
  const merge = (a: number, b: number) => {
    const g = {
      members: [...groups[a]!.members, ...groups[b]!.members].sort((x, y) => x - y),
      rect: union(groups[a]!.rect, groups[b]!.rect),
    };
    groups = groups.filter((_, k) => k !== a && k !== b);
    groups.splice(a, 0, g);
  };
  for (;;) {
    let pair: [number, number] | null = null,
      best = Infinity;
    for (let a = 0; a < groups.length && !pair; a++)
      for (let b = a + 1; b < groups.length; b++)
        if (joins(groups[a]!.rect, groups[b]!.rect)) {
          pair = [a, b];
          break;
        }
    if (!pair && groups.length > MAX_REGIONS)
      for (let a = 0; a < groups.length; a++)
        for (let b = a + 1; b < groups.length; b++) {
          const gap = gapBetween(groups[a]!.rect, groups[b]!.rect);
          if (gap < best) {
            best = gap;
            pair = [a, b];
          }
        }
    if (!pair) break;
    merge(pair[0], pair[1]);
  }
  return groups.sort((a, b) => a.members[0]! - b.members[0]!);
}

/** One region's bed, drawn shelf and signed waterline distance, as the single union bake did for every shore. */
function bakeRegion(providers: ShoreProvider[], grid: Grid) {
  const { x0: minX, z0: minZ, cell, nx, nz } = grid;
  const bed = new Float32Array(nx * nz);
  const inside = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      bed[j * nx + i] = bedAt(providers, minX + (i + 0.5) * cell, minZ + (j + 0.5) * cell);
      inside[j * nx + i] = covered ? 1 : 0;
    }
  const toLand = distanceTo((k) => bed[k]! >= SEA, nx, nz),
    toWater = distanceTo((k) => bed[k]! < SEA, nx, nz);
  const sdf = new Float32Array(nx * nz);
  for (let k = 0; k < nx * nz; k++)
    sdf[k] = Math.max(-SDF_CAP, Math.min(SDF_CAP, (bed[k]! < SEA ? toLand[k]! - 0.5 : 0.5 - toWater[k]!) * cell));
  return { bed, shade: shelfBed(bed, inside, toWater, nx, nz, cell), sdf };
}

const rectOf = ({ x0, z0, cell, nx, nz }: Grid): Rect => ({
  minX: x0,
  minZ: z0,
  maxX: x0 + nx * cell,
  maxZ: z0 + nz * cell,
});
/** The region whose rect holds (x, z), else the nearest; the shader's `at` makes the same pick. */
function pick(regions: Region[], x: number, z: number) {
  let best = regions[0]!,
    gap = Infinity;
  for (const r of regions) {
    const g = rectGap(r.rect, x, z);
    if (g < gap) {
      gap = g;
      best = r;
    }
  }
  return best;
}

export function createCoast() {
  // Per region: (x0, z0, 1/cell, first row) and (nx, nz, -, -); an unused slot sits far away and is never the nearest.
  const slots = Array.from({ length: MAX_REGIONS }, () => ({
    origin: uniform(new THREE.Vector4(1e9, 1e9, 1, 0)),
    size: uniform(new THREE.Vector4(0, 0, 0, 0)),
  }));
  const texel = uniform(new THREE.Vector2(0.5, 0.5)); // 1/width, 1/height of the packed texture
  let regions: Region[] = [
    {
      ids: [],
      grid: { x0: 0, z0: 0, cell: 1, nx: 2, nz: 2 },
      rect: rectOf({ x0: 0, z0: 0, cell: 1, nx: 2, nz: 2 }),
      row: 0,
      bed: new Float32Array(4),
      shade: new Float32Array(4),
      sdf: new Float32Array(4),
      bakeMs: 0,
    },
  ];
  slots[0]!.origin.value.set(0, 0, 1, 0);
  slots[0]!.size.value.set(2, 2, 0, 0);
  const blank = () => {
    const t = new THREE.DataTexture(new Uint16Array(8), 2, 2, THREE.RGFormat, THREE.HalfFloatType);
    t.needsUpdate = true;
    return t;
  };
  const node = texture(blank());
  let seenShore = -1,
    bakeMs = 0;

  const OPEN_SHADE = THREE.DataUtils.toHalfFloat(SEA - SHELF.shaped - SHELF.open),
    OPEN_G = THREE.DataUtils.toHalfFloat(OPEN_BED);
  const pack = () => {
    const tex = node.value as THREE.DataTexture;
    const data = tex.image.data as Uint16Array;
    const width = tex.image.width;
    for (let k = 0; k < data.length; k += 2) {
      data[k] = OPEN_SHADE;
      data[k + 1] = OPEN_G;
    }
    for (const { grid, row, bed, shade } of regions) {
      const { nx, nz } = grid;
      for (let k = 0; k < nx * nz; k++) {
        // The shader clamps to each region's outermost texels, repeating them across the sea beyond it: those are open
        // water whatever the bake found there.
        const i = k % nx,
          j = (k - i) / nx;
        if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) continue;
        const t = ((row + j) * width + i) * 2;
        data[t] = THREE.DataUtils.toHalfFloat(shade[k]!);
        data[t + 1] = THREE.DataUtils.toHalfFloat(bed[k]!);
      }
    }
    tex.needsUpdate = true;
  };
  function bake() {
    const start = performance.now();
    const providers = shoreProviders();
    if (!providers.length) return;
    const groups = groupShores(providers);
    // Each region at max(1, side / MAX_SIDE) m a texel; if the rows overflow the cap, every region coarsens together.
    const sides = groups.map((g) => Math.max(g.rect.maxX - g.rect.minX, g.rect.maxZ - g.rect.minZ));
    const grids = (scale: number) =>
      groups.map((g, k): Grid => {
        const cell = Math.max(1, sides[k]! / MAX_SIDE) * scale;
        return {
          x0: g.rect.minX,
          z0: g.rect.minZ,
          cell,
          nx: Math.ceil((g.rect.maxX - g.rect.minX) / cell),
          nz: Math.ceil((g.rect.maxZ - g.rect.minZ) / cell),
        };
      });
    let scale = 1,
      layout = grids(scale);
    while (layout.reduce((h, g) => h + g.nz, 0) > MAX_SIDE) layout = grids((scale *= 1.125));
    let row = 0;
    regions = groups.map((g, k) => {
      const t = performance.now();
      const grid = layout[k]!;
      const baked = bakeRegion(
        g.members.map((m) => providers[m]!),
        grid,
      );
      const region = {
        ids: g.members.map((m) => providers[m]!.id),
        grid,
        rect: rectOf(grid),
        row,
        ...baked,
        bakeMs: performance.now() - t,
      };
      row += grid.nz;
      return region;
    });
    const width = Math.max(...layout.map((g) => g.nx));
    const previous = node.value as THREE.Texture;
    const tex = new THREE.DataTexture(
      new Uint16Array(width * row * 2),
      width,
      row,
      THREE.RGFormat,
      THREE.HalfFloatType,
    );
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    node.value = tex;
    pack();
    previous.dispose();
    texel.value.set(1 / width, 1 / row);
    slots.forEach((s, k) => {
      const r = regions[k];
      s.origin.value.set(r?.grid.x0 ?? 1e9, r?.grid.z0 ?? 1e9, r ? 1 / r.grid.cell : 1, r?.row ?? 0);
      s.size.value.set(r?.grid.nx ?? 0, r?.grid.nz ?? 0, 0, 0);
    });
    bakeMs = performance.now() - start;
  }
  function sync() {
    const shore = shoreRevision();
    if (shore === seenShore) return;
    seenShore = shore;
    bake();
  }

  /** The coast texel at world xz, explicit LOD so it may sit in branches and the vertex stage: the region whose rect
   *  holds xz (else the nearest, whose clamped border is open sea), then one read. */
  const at = (xz: N) => {
    let uv: N = null,
      gap: N = null;
    for (const { origin, size } of slots) {
      const p = xz.sub(origin.xy).mul(origin.z); // texels into the region
      const g = max(max(p.negate(), p.sub(size.xy)), 0)
        .length()
        .div(origin.z); // m outside its rect
      const q = clamp(p, vec2(0.5), size.xy.sub(0.5)).add(vec2(0, origin.w)).mul(texel);
      if (uv === null) {
        uv = q;
        gap = g;
        continue;
      }
      const nearer = g.lessThan(gap);
      uv = select(nearer, q, uv);
      gap = select(nearer, g, gap);
    }
    return node.sample(uv).level(0);
  };
  const read = (grid: Grid, data: Float32Array, x: number, z: number) => {
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
    const { grid, sdf, bed, shade } = pick(regions, x, z);
    const h = grid.cell;
    const gx = read(grid, sdf, x + h, z) - read(grid, sdf, x - h, z),
      gz = read(grid, sdf, x, z + h) - read(grid, sdf, x, z - h);
    const l = Math.hypot(gx, gz);
    return {
      bed: read(grid, bed, x, z),
      shade: read(grid, shade, x, z), // the drawn shelf (R), for checks; nothing in the game reads it on the CPU
      normal: l > 1e-6 ? ([gx / l, gz / l] as const) : ([0, 0] as const),
    };
  }
  return {
    at,
    sync,
    sampleAt,
    inspect: () => {
      const { width, height } = (node.value as THREE.DataTexture).image;
      return {
        coast: {
          width,
          height,
          cell: Math.max(...regions.map((r) => r.grid.cell)),
          bakeMs,
          textureBytes: width * height * 4,
          regions: regions.map(({ ids, grid, row, bakeMs }) => ({
            ids,
            rect: rectOf(grid),
            cell: grid.cell,
            nx: grid.nx,
            nz: grid.nz,
            row,
            bakeMs,
            // world xz to the region's own uv, as the single union's transform was: x0, z0, 1/width, 1/depth (m)
            transform: [grid.x0, grid.z0, 1 / (grid.nx * grid.cell), 1 / (grid.nz * grid.cell)],
          })),
        },
      };
    },
    /** The packed texture, for checks. */
    texture: () => node.value as THREE.DataTexture,
    dispose() {
      (node.value as THREE.Texture).dispose();
    },
  };
}
export type Coast = ReturnType<typeof createCoast>;
