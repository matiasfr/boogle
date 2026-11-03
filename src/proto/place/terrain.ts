// The land of ?proto=place as numbers: a height function baked onto one 2 m grid. No three.js, so dev/economy/place-level.ts
// can walk it in Node. ./land.ts draws it and makes it solid. The gorge's walls are near-vertical cells of the grid, so nothing
// here overhangs; footbridges and platforms are their own boxes. Local: nothing here reaches the sim.
import { smoothstep } from '../../math.ts';
import {
  ARMS,
  GORGE,
  GRID,
  HEAD,
  LINES,
  LINKS,
  LOBE,
  ORIGIN,
  PATHS,
  ROOM_PLOTS,
  SPIRE,
  TOWN,
  VILLAGE,
  lineAt,
  railY,
  YARD,
  type LinePoint,
} from './layout.ts';

export const CELL = GRID.cell,
  NX = (GRID.x1 - GRID.x0) / CELL + 1,
  NZ = (GRID.z1 - GRID.z0) / CELL + 1;
export const heights = new Float32Array(NX * NZ),
  pathMask = new Float32Array(NX * NZ),
  clearMask = new Float32Array(NX * NZ);
export const at = (i: number, j: number) => i + j * NX;
export const cellX = (i: number) => GRID.x0 + i * CELL;
export const cellZ = (j: number) => GRID.z0 + j * CELL;

// ---------------------------------------------------------------- the gorge
const rad = (d: number) => (d * Math.PI) / 180;
const ORG = { x: SPIRE.x, z: SPIRE.z };
function arm(bearing: number, phase: number) {
  const ax = Math.sin(rad(bearing)),
    az = -Math.cos(rad(bearing));
  const out: [number, number][] = [];
  for (let t = 0; t <= 330; t += 22) {
    const w = 5 * Math.sin(t * 0.035 + phase) * smoothstep(0, 40, t);
    out.push([ORG.x + ax * t - az * w, ORG.z + az * t + ax * w]);
  }
  return out;
}
const ARM_POLYS = [arm(ARMS.nw, 0.4), arm(ARMS.ne, 2.1), arm(ARMS.stem, 4)];
export function gorgeD(x: number, z: number) {
  let best = Infinity;
  for (const poly of ARM_POLYS)
    for (let k = 0; k < poly.length - 1; k++) {
      const [ax, az] = poly[k]!,
        [bx, bz] = poly[k + 1]!;
      const dx = bx - ax,
        dz = bz - az,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      const qx = ax + dx * t - x,
        qz = az + dz * t - z,
        d = qx * qx + qz * qz;
      if (d < best) best = d;
    }
  return Math.sqrt(best);
}

// ---------------------------------------------------------------- the lobes
function head(x: number, z: number) {
  const dx = x - HEAD.x,
    dz = z - HEAD.z,
    r = Math.hypot(dx, dz);
  if (r > HEAD.r + 40) return -6;
  const a = Math.atan2(dx, -dz);
  const R = HEAD.r + 8 * Math.sin(3 * a + 0.6) + 4 * Math.sin(7 * a + 2);
  const noise = 0.8 * Math.sin(x * 0.05 + 1) * Math.cos(z * 0.06) + 0.5 * Math.sin(x * 0.13 + z * 0.09);
  const shore = smoothstep(R, R - 30, r);
  return -6 + (HEAD.y + 6) * smoothstep(0, 1, shore) + noise * shore;
}
function ground(x: number, z: number) {
  const dx = x - ORG.x,
    dz = z - ORG.z,
    r = Math.hypot(dx, dz);
  const a = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const north = a > ARMS.nw && a < ARMS.ne,
    west = !north && a > ARMS.stem && a < ARMS.nw;
  const angle = Math.atan2(dx, -dz);
  const R = (north ? 238 : 226) + 13 * Math.sin(3 * angle + 1) + 7 * Math.sin(7 * angle + 2);
  const shore = smoothstep(R, R - 46, r);
  let top = west ? LOBE.west : north ? LOBE.north : LOBE.east;
  if (north) top += 25 * Math.exp(-((x + 20) ** 2 + (z + 188) ** 2) / (38 * 38));
  const noise =
    0.8 * Math.sin(x * 0.05 + 1) * Math.cos(z * 0.06) +
    0.5 * Math.sin(x * 0.13 + z * 0.09) +
    0.3 * Math.cos(x * 0.31 - z * 0.23);
  const beach = -5 + (top + 5) * smoothstep(0, 1, shore);
  let h = beach + noise * shore;
  // the gorge
  const w = 1 + 0.1 * Math.sin(x * 0.07 + z * 0.05);
  const d = gorgeD(x, z) / w;
  const floor = GORGE.bed + (GORGE.floor - GORGE.bed) * smoothstep(GORGE.river, GORGE.river + 3.5, d);
  const wall = smoothstep(GORGE.bank, GORGE.bank + GORGE.wall, d);
  h = Math.min(h, floor + (Math.max(h, floor) - floor) * wall);
  // the spire's islet
  const dc = Math.hypot(dx, dz);
  if (dc < 22) h = Math.max(h, 4 * smoothstep(22, 12, dc));
  return Math.max(h, head(x, z));
}

/** Pulls the ground toward y within a soft disc. */
function pad(x0: number, z0: number, y: number, r: number, soft: number) {
  const i0 = Math.max(0, Math.floor((x0 - r - soft - GRID.x0) / CELL)),
    i1 = Math.min(NX - 1, Math.ceil((x0 + r + soft - GRID.x0) / CELL)),
    j0 = Math.max(0, Math.floor((z0 - r - soft - GRID.z0) / CELL)),
    j1 = Math.min(NZ - 1, Math.ceil((z0 + r + soft - GRID.z0) / CELL));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(cellX(i) - x0, cellZ(j) - z0);
      if (gorgeD(cellX(i), cellZ(j)) < GORGE.bank + GORGE.wall + 4) continue;
      const t = smoothstep(r + soft, r, d);
      heights[at(i, j)] = heights[at(i, j)]! + (y - heights[at(i, j)]!) * t;
      clearMask[at(i, j)] = Math.max(clearMask[at(i, j)]!, t);
    }
}

/** Rasterises a strip along samples [x, z, y]: within `inner` it is y, fading to the land by `outer`. */
function strip(
  samples: [number, number, number][],
  inner: number,
  outer: number,
  painted: boolean,
  skip?: (x: number, z: number) => boolean,
) {
  const best = new Map<number, [number, number]>();
  const cells = Math.ceil(outer / CELL) + 1;
  for (const [x, z, y] of samples) {
    const ci = Math.round((x - GRID.x0) / CELL),
      cj = Math.round((z - GRID.z0) / CELL);
    for (let j = Math.max(0, cj - cells); j <= Math.min(NZ - 1, cj + cells); j++)
      for (let i = Math.max(0, ci - cells); i <= Math.min(NX - 1, ci + cells); i++) {
        const d = Math.hypot(cellX(i) - x, cellZ(j) - z);
        if (d > outer) continue;
        const k = at(i, j),
          b = best.get(k);
        if (!b || d < b[0]) best.set(k, [d, y]);
      }
  }
  for (const [k, [d, y]] of best) {
    const i = k % NX,
      j = Math.floor(k / NX);
    if (skip?.(cellX(i), cellZ(j))) continue;
    const t = smoothstep(outer, inner, d);
    heights[k] = heights[k]! + (y - heights[k]!) * t;
    clearMask[k] = Math.max(clearMask[k]!, t);
    if (painted) pathMask[k] = Math.max(pathMask[k]!, smoothstep(inner + 1, inner - 0.5, d));
  }
}

/** One path's samples every metre, in order, with its total. Bridges are left out of the ground. */
export const PATH_SAMPLES: [number, number, number][][] = PATHS.map((p) => {
  const out: [number, number, number][] = [];
  p.pts.slice(0, -1).forEach((a, k) => {
    const b = p.pts[k + 1]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let n = 0; n < Math.ceil(len); n++) {
      const t = n / Math.ceil(len);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  });
  return out;
});

function bake() {
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) heights[at(i, j)] = ground(cellX(i), cellZ(j));
  pad(VILLAGE.x, VILLAGE.z, VILLAGE.y, VILLAGE.r, 18);
  for (const l of LINKS) pad(l.camp.x, l.camp.z, l.camp.y, 34, 22);
  pad(-82, 2, VILLAGE.y, 26, 10);
  pad(YARD.x, YARD.z, VILLAGE.y, 14, 8);
  pad(HEAD.x, HEAD.z + 10, HEAD.y, 42, 14);
  // Every plot sits on a level pad, which also keeps the random trees out of it.
  const plots = [TOWN.start, ...TOWN.wood, ...TOWN.stone, Object.values(ROOM_PLOTS)].flat();
  for (const p of plots) pad(p.x, p.z, VILLAGE.y, Math.max(p.w ?? 6, p.d ?? 6) * 0.7 + 1.5, 5);
  TOWN.camps.forEach((c, k) => {
    for (const p of [...c.asleep, ...c.awake])
      pad(p.x, p.z, LINKS[k]!.camp.y, Math.max(p.w ?? 6, p.d ?? 6) * 0.7 + 1.5, 5);
  });
  // Rail on the land: a cutting or low bank along it, none in the gorge or over the sea (that's what the trestle's for).
  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  for (const line of Object.values(LINES)) {
    const samples: [number, number, number][] = [];
    for (let s = -12; s <= line.len + 8; s += 1) {
      lineAt(line, s, P);
      samples.push([P.x, P.z, railY(line, s) - 0.08]);
    }
    const y = railY(line, line.len);
    strip(
      samples,
      4,
      8,
      false,
      (x, z) =>
        gorgeD(x, z) < GORGE.bank + GORGE.wall + 2 ||
        heights[at(Math.round((x - GRID.x0) / CELL), Math.round((z - GRID.z0) / CELL))]! < y - 9,
    );
  }
  // Paths last: they cut their ramps into the walls and fill across whatever they meet.
  PATHS.forEach((p) => {
    const samples: [number, number, number][] = [];
    p.pts.slice(0, -1).forEach((a, k) => {
      if (k === p.bridgeAt) return;
      const b = p.pts[k + 1]!;
      const len = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (let m = 0; m <= len; m++) {
        const t = m / len;
        samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    });
    strip(samples, p.bold ? 3.6 : 2.4, p.bold ? 6.5 : 4.8, true);
  });
}
bake();

// Local A/B only: the owner's measured Ultra Water bearing-95 profile, in metres over sea level.
// Apply once to the finished grid so mesh, Owner collision, H and the shore provider all see the same bed.
// No shared state or saved terrain changes. The unflagged grid and its facets/colour rules are unchanged.
const shelfQuery = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
if (shelfQuery.get('proto') === 'place' && shelfQuery.get('shelf') === 'demo') {
  const distances = [-10, -5, 0, 5, 10, 20, 40, 60];
  const profile = [1.15, 0.48, -0.04, -0.31, -0.12, 0.32, -0.41, -0.16];
  const ux = Math.sin((95 * Math.PI) / 180),
    uz = -Math.cos((95 * Math.PI) / 180);
  // Original grid's waterline on the 95-degree ray from the spire, in place-local coordinates.
  const cx = 219.5125994885,
    cz = 8.5049546481;
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const dx = cellX(i) - cx,
        dz = cellZ(j) - cz,
        d = dx * ux + dz * uz,
        along = Math.abs(-dx * uz + dz * ux);
      // Exact profile across 70 m of beach; blend back by 110 m. Fade inland and beyond the measured shelf.
      const weight = smoothstep(55, 35, along) * smoothstep(-30, -10, d) * smoothstep(90, 60, d);
      if (weight === 0) continue;
      let segment = 0;
      while (segment < distances.length - 2 && d > distances[segment + 1]!) segment++;
      const t = Math.max(0, Math.min(1, (d - distances[segment]!) / (distances[segment + 1]! - distances[segment]!)));
      const target = profile[segment]! + (profile[segment + 1]! - profile[segment]!) * t;
      const k = at(i, j);
      heights[k] = heights[k]! + (target - heights[k]!) * weight;
    }
}

/** The land's height at a world point. */
export function H(wx: number, wz: number) {
  const fx = (wx - ORIGIN.x - GRID.x0) / CELL,
    fz = (wz - ORIGIN.z - GRID.z0) / CELL;
  if (fx < 0 || fz < 0 || fx >= NX - 1 || fz >= NZ - 1) return -6;
  const i = Math.floor(fx),
    j = Math.floor(fz),
    u = fx - i,
    v = fz - j;
  const a = heights[at(i, j)]!,
    b = heights[at(i + 1, j)]!,
    c = heights[at(i, j + 1)]!,
    d = heights[at(i + 1, j + 1)]!;
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
export const insidePlace = (wx: number, wz: number) =>
  wx - ORIGIN.x > GRID.x0 + 4 &&
  wx - ORIGIN.x < GRID.x1 - 4 &&
  wz - ORIGIN.z > GRID.z0 + 4 &&
  wz - ORIGIN.z < GRID.z1 - 4;
