// The land of ?proto=place as numbers: a height function baked onto one 2 m grid. No three.js, so dev/economy/place-level.ts
// can walk it in Node. ./land.ts draws it and makes it solid. The gorge's walls are near-vertical cells of the grid, so nothing
// here overhangs; footbridges and platforms are their own boxes. Local: nothing here reaches the sim.
import { smoothstep } from '../math.ts';
import { frameBesideLine, FRAME_D, FRAME_W, SPAN } from './spatial-station.ts';
import { coveFront, coveGround, coveSurface, coveWeight, fitCoveBacking } from './cove.ts';
import { SHORE_COAST, SHORE_HOP, SHORE_LANDING, SHORE_PATH } from './shore-layout.ts';
import { TOWN_CENTRE, TOWN_GROUND, TOWN_RING, TOWN_SLOTS, TOWN_STREETS, townBuilding } from './town-plan.ts';
import {
  ARMS,
  BANK_CART,
  GORGE,
  GRID,
  HEAD,
  FORMATION,
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
  upLat,
  YARD,
  type LinePoint,
  type Pt,
} from './layout.ts';

export const CELL = GRID.cell,
  NX = (GRID.x1 - GRID.x0) / CELL + 1,
  NZ = (GRID.z1 - GRID.z0) / CELL + 1;
export const heights = new Float32Array(NX * NZ),
  pathMask = new Float32Array(NX * NZ),
  clearMask = new Float32Array(NX * NZ);
// The rail bed wins where a later support pad overlaps it, including cells beside a trestle transition.
const railBedCeilings = new Map<number, number>();
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

/** Every footprint this file grades the ground for (a pad's disc, each metre of a strip, a support's box as its
 * circle), Place-local, in the order graded. A record only: no height reads it. Whatever stands on Home's ground gets its
 * level ground from one of these three functions, so the terrain pass keeps its drawn ground on the collider under each
 * (src/proto/terrain-pass/island.ts), including where a pad skipped cells beside the gorge. */
export const GRADED: { kind: 'pad' | 'strip' | 'support'; x: number; z: number; r: number }[] = [];

/** Pulls the ground toward y within a soft disc. */
function pad(x0: number, z0: number, y: number, r: number, soft: number) {
  GRADED.push({ kind: 'pad', x: x0, z: z0, r });
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

/** One-metre ground-strip samples, including each segment's endpoints. */
function samplePath(pts: Pt[]): Pt[] {
  const samples: Pt[] = [];
  pts.slice(0, -1).forEach((a, k) => {
    const b = pts[k + 1]!,
      n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let m = 0; m <= n; m++) {
      const t = m / n;
      samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  });
  return samples;
}

/** Rasterises a strip along samples [x, z, y]: within `inner` it is y, fading to the land by `outer`. */
function strip(
  samples: [number, number, number][],
  inner: number,
  outer: number,
  painted: boolean,
  /** Leave this cell as it is; `y` is the strip's height there and `k` the cell. */
  skip?: (x: number, z: number, y: number, k: number) => boolean,
  /** false: leave `clearMask` as it was. The tree catalog reads it, and `heights` too (its h < 4 filter), so a strip
   * that must keep the catalog also has to skip every cell whose height could cross that filter. */
  clears = true,
) {
  const best = new Map<number, [number, number]>();
  const cells = Math.ceil(outer / CELL) + 1;
  for (const [x, z, y] of samples) {
    GRADED.push({ kind: 'strip', x, z, r: inner });
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
    if (skip?.(cellX(i), cellZ(j), y, k)) continue;
    const t = smoothstep(outer, inner, d);
    heights[k] = heights[k]! + (y - heights[k]!) * t;
    if (clears) clearMask[k] = Math.max(clearMask[k]!, t);
    if (painted) pathMask[k] = Math.max(pathMask[k]!, smoothstep(inner + 1, inner - 0.5, d));
  }
  return best;
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
export const SHORE_SAMPLES = SHORE_COAST ? samplePath(SHORE_PATH) : [];

function bake() {
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) heights[at(i, j)] = ground(cellX(i), cellZ(j));
  pad(VILLAGE.x, VILLAGE.z, VILLAGE.y, VILLAGE.r, 18);
  pad(TOWN_CENTRE.x, TOWN_CENTRE.z, VILLAGE.y, TOWN_GROUND.r, TOWN_GROUND.soft);
  for (const l of LINKS) pad(l.camp.x, l.camp.z, l.camp.y, 34, 22);
  pad(-82, 2, VILLAGE.y, 26, 10);
  pad(YARD.x, YARD.z, VILLAGE.y, 14, 8);
  pad(HEAD.x, HEAD.z + 10, HEAD.y, 42, 14);
  // Every plot sits on a level pad, which also keeps the random trees out of it.
  const plots = [
    TOWN.start,
    ...TOWN.wood,
    ...TOWN.stone,
    Object.values(ROOM_PLOTS),
    TOWN_SLOTS.map((s) => townBuilding(s.id)),
  ].flat();
  for (const p of plots) pad(p.x, p.z, VILLAGE.y, Math.max(p.w ?? 6, p.d ?? 6) * 0.7 + 1.5, 5);
  pad(
    TOWN_CENTRE.x,
    TOWN_CENTRE.z,
    VILLAGE.y - TOWN_GROUND.green.drop,
    TOWN_GROUND.green.flat,
    TOWN_RING.inner - TOWN_GROUND.green.flat,
  );
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
    const bed = strip(
      samples,
      4,
      8,
      false,
      (x, z) =>
        gorgeD(x, z) < GORGE.bank + GORGE.wall + 2 ||
        heights[at(Math.round((x - GRID.x0) / CELL), Math.round((z - GRID.z0) / CELL))]! < y - 9,
    );
    // Four metres covers sleeper ends plus the vertices of their 2 m terrain triangles.
    // Include skipped cliff cells: a prop pad must not fill up through the trestle either.
    for (const [k, [distance, height]] of bed)
      if (distance <= 4) railBedCeilings.set(k, Math.min(railBedCeilings.get(k) ?? Infinity, heights[k]!, height));
  }
  // The up track (generic-lines step 2) gets the same cutting or bank along its own centre, so its bed meets the ground
  // as today's does and nobody has to jump onto it from the side (orchestrator, 10 November: it stood about 0.36 m
  // over the unbanked ground). Where it runs within 0.6 m of today's track (the turnouts' ends) today's strip covers it.
  // The starter trees are a shared catalog (test/railway.test.ts pins them) planted on this grid before the snapshot
  // below, and they read both `clearMask` and the heights (tree-catalog.ts drops cells under 4 m). So this strip clears
  // nothing and leaves every cell under 4.5 m alone; since it blends toward the rail (never under 4.5 m), a cell it
  // touches can't cross the 4 m line. It also never fills more than 3 m under the rail: beside a trestle's abutment
  // that would raise single cells into thin pillars, and there the deck is on legs anyway.
  const upSkip = (x: number, z: number, y: number, k: number) =>
    gorgeD(x, z) < GORGE.bank + GORGE.wall + 2 || heights[k]! < 4.5 || heights[k]! < y - 3;
  for (const link of LINKS) {
    const formation = FORMATION[link.id],
      line = link.line;
    const samples: [number, number, number][] = [];
    for (let s = formation.from; s <= formation.to; s += 1) {
      const lat = upLat(formation, s);
      if (lat === null || lat > -0.6) continue;
      lineAt(line, s, P);
      samples.push([P.x - P.uz * lat, P.z + P.ux * lat, railY(line, s) - 0.08]);
    }
    const graded = new Set<number>();
    const bed = strip(
      samples,
      4,
      8,
      false,
      (x, z, y, k) => {
        const skipped = upSkip(x, z, y, k);
        if (!skipped) graded.add(k);
        return skipped;
      },
      false,
    );
    // Ceilings only where this strip graded: a skipped cell keeps whatever later pads give it, as before step 2.
    for (const [k, [distance, height]] of bed)
      if (distance <= 4 && graded.has(k))
        railBedCeilings.set(k, Math.min(railBedCeilings.get(k) ?? Infinity, heights[k]!, height));
  }
  // Paths last: they cut their ramps into the walls and fill across whatever they meet.
  PATHS.forEach((p) => {
    const samples = [...samplePath(p.pts.slice(0, p.bridgeAt + 1)), ...samplePath(p.pts.slice(p.bridgeAt + 1))];
    strip(samples, p.bold ? 3.6 : 2.4, p.bold ? 6.5 : 4.8, true);
  });
  // Paint only: the ring follows the existing terrain, including the hall's gentle apron.
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const d = Math.hypot(cellX(i) - TOWN_CENTRE.x, cellZ(j) - TOWN_CENTRE.z);
      const paint =
        smoothstep(TOWN_RING.inner - 1, TOWN_RING.inner, d) * smoothstep(TOWN_RING.outer + 1, TOWN_RING.outer, d);
      pathMask[at(i, j)] = Math.max(pathMask[at(i, j)]!, paint);
    }
  const dock = TOWN_STREETS.dock.line.map((p): Pt => [p.x, p.z, VILLAGE.y]);
  strip(samplePath(dock), 4, 6, true, undefined, false);
}
bake();

// Harvest IDs were planted on this grid. Put later terrain edits after this snapshot to keep tree IDs stable.
export const catalogHeights = SHORE_COAST ? heights.slice() : heights;
export const catalogClearMask = SHORE_COAST ? clearMask.slice() : clearMask;

if (SHORE_COAST) {
  // A shallow way back from the water beside the level landing. Blend into the original coast beyond
  // the cove; this modifies the finished grid shared by the mesh, heightfield and water shore provider.
  const i0 = Math.max(0, Math.ceil((-238 - GRID.x0) / CELL)),
    i1 = Math.min(NX - 1, Math.floor((-176 - GRID.x0) / CELL));
  for (let j = 0; j < NZ; j++)
    for (let i = i0; i <= i1; i++) {
      const x = cellX(i),
        z = cellZ(j),
        k = at(i, j),
        weight = smoothstep(-238, -226, x) * smoothstep(-182, -190, x) * smoothstep(38, 18, Math.abs(z - 10));
      if (weight) {
        const y = -2 + 5 * smoothstep(-224, -208, x);
        heights[k] = heights[k]! + (y - heights[k]!) * weight;
        clearMask[k] = Math.max(clearMask[k]!, weight);
      }
      // Wrap the cove around the clearing's right side. Both passes read only this cell,
      // so retain their order here; the path and level landing are restored below.
      const side = 10 + 1.8 * Math.max(0, Math.min(10, x + 187));
      if (z - side <= 6) continue;
      const around = smoothstep(-238, -226, x) * smoothstep(-176, -187, x) * smoothstep(78, 58, z);
      if (!around) continue;
      const target = -2 + 5 * (1 - smoothstep(6, 20, z - side));
      heights[k] = heights[k]! + (Math.min(heights[k]!, target) - heights[k]!) * around;
      clearMask[k] = Math.max(clearMask[k]!, around);
    }
  // The climb must not cut back into the Round's level pad at its west edge.
  const inTown = (x: number, z: number) => Math.hypot(x - TOWN_CENTRE.x, z - TOWN_CENTRE.z) <= TOWN_GROUND.r;
  // Grade a broad grass shoulder first; paint with the ordinary bold-path widths on top.
  strip(
    SHORE_SAMPLES.filter(([x]) => x < -150),
    6,
    14,
    false,
    inTown,
  );
  strip(SHORE_SAMPLES, 3.6, 6.5, true, inTown);
  pad(SHORE_HOP.x, SHORE_HOP.z, SHORE_HOP.y, 2.5, 3);
  // Last: an 18 m disc (16 m clear after grid interpolation), including the steering funnel.
  pad(SHORE_LANDING.x, SHORE_LANDING.z, 3, 9, 5);
}

// Grade the bearing areas, with one cell of margin so drawn triangles are flat through the footprint.
function gradeSupport(wx: number, wz: number, y: number, w: number, d: number, yaw = 0) {
  const x = wx - ORIGIN.x,
    z = wz - ORIGIN.z,
    c = Math.cos(yaw),
    s = Math.sin(yaw),
    r = Math.hypot(w, d) / 2 + CELL + 4;
  GRADED.push({ kind: 'support', x, z, r: Math.hypot(w, d) / 2 });
  for (
    let j = Math.max(0, Math.floor((z - r - GRID.z0) / CELL));
    j <= Math.min(NZ - 1, Math.ceil((z + r - GRID.z0) / CELL));
    j++
  )
    for (
      let i = Math.max(0, Math.floor((x - r - GRID.x0) / CELL));
      i <= Math.min(NX - 1, Math.ceil((x + r - GRID.x0) / CELL));
      i++
    ) {
      const dx = cellX(i) - x,
        dz = cellZ(j) - z;
      const outside = Math.max(Math.abs(dx * c - dz * s) - w / 2, Math.abs(dx * s + dz * c) - d / 2);
      const weight = smoothstep(CELL + 3, CELL, outside),
        k = at(i, j);
      const ceiling = railBedCeilings.get(k);
      // At a skipped cliff edge, the adjacent terrain triangle can enter the deck just beyond the pad blend.
      // Protect that extra metre here, not unrelated path/rail crossings elsewhere on the island.
      if (ceiling !== undefined && outside <= CELL + 4 && gorgeD(cellX(i), cellZ(j)) < GORGE.bank + GORGE.wall + 2)
        heights[k] = Math.min(heights[k]!, ceiling);
      if (weight > 0) heights[k] = Math.min(heights[k]! + (y - heights[k]!) * weight, ceiling ?? Infinity);
    }
}
gradeSupport(BANK_CART.x + ORIGIN.x, BANK_CART.z, BANK_CART.y, 3, 4, BANK_CART.yaw);
if (SHORE_COAST)
  gradeSupport(
    SHORE_HOP.x + ORIGIN.x,
    SHORE_HOP.z + 7,
    coarseHeight(SHORE_HOP.x + ORIGIN.x, SHORE_HOP.z + 7),
    SHORE_HOP.bottom * 2,
    SHORE_HOP.bottom * 2,
  );
const stationPads = LINKS.flatMap((link) =>
  link.stations.map((spec) => {
    const f = frameBesideLine(spec, link.line, link.dir);
    // Lower a hillside frame/feeder to its rail bed; already lower assemblies keep their existing datum.
    return { ...f, y: Math.min(coarseHeight(f.x, f.z), railY(link.line, spec.s - link.dir * 1.5) - 0.08) };
  }),
);
for (const path of PATHS) {
  const a = path.pts[path.bridgeAt]!,
    b = path.pts[path.bridgeAt + 1]!;
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  for (const p of [a, b]) gradeSupport(p[0] + ORIGIN.x, p[1] + ORIGIN.z, p[2], 3, 0.25, yaw);
}
for (const f of stationPads) {
  gradeSupport(f.x, f.z, f.y, FRAME_D + 0.4, FRAME_W + 0.4, f.yaw);
  gradeSupport(
    f.x - f.lx * (FRAME_D / 2 + SPAN / 2),
    f.z - f.lz * (FRAME_D / 2 + SPAN / 2),
    f.y,
    SPAN,
    1,
    f.yaw + Math.PI / 2,
  );
}

// Support grading runs before cove refinement. Its datums retain the original coarse bilinear sample.
function coarseHeight(x: number, z: number, triangles = false) {
  const fx = (x - ORIGIN.x - GRID.x0) / CELL,
    fz = (z - ORIGIN.z - GRID.z0) / CELL;
  const i = Math.floor(fx),
    j = Math.floor(fz),
    u = fx - i,
    v = fz - j;
  if (i < 0 || j < 0 || i >= NX - 1 || j >= NZ - 1) return -6;
  const a = heights[at(i, j)]!,
    b = heights[at(i + 1, j)]!,
    c = heights[at(i, j + 1)]!,
    d = heights[at(i + 1, j + 1)]!;
  return triangles
    ? u + v <= 1
      ? a + (b - a) * u + (c - a) * v
      : d + (c - d) * (1 - u) + (b - d) * (1 - v)
    : a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

// The cove composes after catalog capture and shore grading. Preserve complete route shoulders,
// the landing fade and rail formation, including a 2 m cell margin.
export function coveProtection(x: number, z: number) {
  let clearance = Math.hypot(x - SHORE_LANDING.x, z - SHORE_LANDING.z) - 16;
  for (const [px, pz] of SHORE_SAMPLES) clearance = Math.min(clearance, Math.hypot(x - px, z - pz) - 16);
  PATH_SAMPLES.forEach((samples, n) => {
    for (const [px, pz] of samples)
      clearance = Math.min(clearance, Math.hypot(x - px, z - pz) - (PATHS[n]!.bold ? 8.5 : 6.8));
  });
  const p: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  for (const line of Object.values(LINES))
    for (let s = -12; s <= line.len + 8; s += 2) {
      lineAt(line, s, p);
      clearance = Math.min(clearance, Math.hypot(x - p.x, z - p.z) - 11);
    }
  return smoothstep(0, 3, clearance);
}
for (let j = 0; j < NZ; j++)
  for (let i = 0; i < NX; i++) {
    const x = cellX(i),
      z = cellZ(j),
      k = at(i, j);
    const weight = coveWeight(x, z);
    if (!weight) continue;
    const protectedWeight = weight * coveProtection(x, z);
    const shaped = coveGround(x, z);
    const raised = Math.max(heights[k]!, shaped);
    // Only the bounded beach pocket and its kit backing may carve before the main cove carve.
    // Route/rail/landing protection still gates the complete change, including this lowering.
    const across = x - coveFront(z);
    const beachCarve =
      smoothstep(-18, -13, across) *
      (1 - smoothstep(-4, -1, across)) *
      smoothstep(32, 38, z) *
      (1 - smoothstep(44, 50, z));
    const backingCarve =
      smoothstep(-1, 2, across) * (1 - smoothstep(6, 10, across)) * smoothstep(32, 38, z) * (1 - smoothstep(46, 52, z));
    const target = raised + (shaped - raised) * Math.max(smoothstep(42, 54, z), beachCarve, backingCarve);
    heights[k] = heights[k]! + (target - heights[k]!) * protectedWeight;
    clearMask[k] = Math.max(clearMask[k]!, protectedWeight);
  }

/** Exact anti-diagonal triangles shared by the cove renderer and heightfields. */
function triangleHeight(a: number, b: number, c: number, d: number, u: number, v: number) {
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

const fineBounds = { x0: -212, x1: -160, z0: 16, z1: 78, cell: 1, nx: 53, nz: 63 };

function coarseTriangleHeight(x: number, z: number) {
  const fx = (x - GRID.x0) / CELL,
    fz = (z - GRID.z0) / CELL;
  const i = Math.floor(fx),
    j = Math.floor(fz);
  return triangleHeight(
    heights[at(i, j)]!,
    heights[at(i + 1, j)]!,
    heights[at(i, j + 1)]!,
    heights[at(i + 1, j + 1)]!,
    fx - i,
    fz - j,
  );
}

function cubic(a: number, b: number, c: number, d: number, t: number) {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}

function buildFineCove() {
  const fine = { ...fineBounds, heights: new Float32Array(fineBounds.nx * fineBounds.nz) };
  for (let j = 0; j < fine.nz; j++)
    for (let i = 0; i < fine.nx; i++) {
      const x = fine.x0 + i * fine.cell,
        z = fine.z0 + j * fine.cell;
      const fx = (x - GRID.x0) / CELL,
        fz = (z - GRID.z0) / CELL;
      const ci = Math.floor(fx),
        cj = Math.floor(fz),
        u = fx - ci,
        v = fz - cj;
      const sample = (dx: number, dz: number) => heights[at(ci + dx, cj + dz)]!;
      const row = (dz: number) => cubic(sample(-1, dz), sample(0, dz), sample(1, dz), sample(2, dz), u);
      // Clamp bicubic overshoot to this coarse cell: no new peaks, pits or shoreline terraces.
      const corners = [sample(0, 0), sample(1, 0), sample(0, 1), sample(1, 1)];
      const curved = Math.max(
        Math.min(...corners),
        Math.min(Math.max(...corners), cubic(row(-1), row(0), row(1), row(2), v)),
      );
      const original = coarseTriangleHeight(x, z);
      // Exact old triangles at the patch seam and on all protected path/rail/landing shoulders.
      const edge = Math.min(x - fine.x0, fine.x1 - x, z - fine.z0, fine.z1 - z);
      const weight = smoothstep(0, 4, edge) * coveProtection(x, z);
      fine.heights[i + j * fine.nx] = original + (curved - original) * weight;
    }
  return fine;
}

/** Bounded 1 m refinement. The rest of Place retains its original 2 m grid and catalog. */
export const COVE_FINE = buildFineCove();

export function fineHeightAt(x: number, z: number, fallback: number): number {
  const fine = COVE_FINE;
  if (x < fine.x0 || x > fine.x1 || z < fine.z0 || z > fine.z1) return fallback;
  const fx = (x - fine.x0) / fine.cell,
    fz = (z - fine.z0) / fine.cell;
  const i = Math.min(Math.floor(fx), fine.nx - 2),
    j = Math.min(Math.floor(fz), fine.nz - 2);
  const atFine = (dx: number, dz: number) => fine.heights[i + dx + (j + dz) * fine.nx]!;
  return triangleHeight(atFine(0, 0), atFine(1, 0), atFine(0, 1), atFine(1, 1), fx - i, fz - j);
}

// Static final assembly: fit the opaque kit return to the finished, protected soil.
// Do not sample H here: it already includes the kit whose shared triangles we are fitting.
fitCoveBacking((x, z) => fineHeightAt(x, z, coarseTriangleHeight(x, z)));

export type TerrainCollisionTile = {
  heights: number[][];
  cell: number;
  position: { x: number; y: number; z: number };
};

/** Disjoint cell rectangles; the fine patch replaces coarse collision rather than covering it. */
export function terrainCollisionTiles(): TerrainCollisionTile[] {
  const coarse = (x0: number, x1: number, z0: number, z1: number): TerrainCollisionTile => ({
    heights: Array.from({ length: (x1 - x0) / CELL + 1 }, (_, i) =>
      Array.from(
        { length: (z1 - z0) / CELL + 1 },
        (_, j) => heights[at((x0 - GRID.x0) / CELL + i, (z1 - GRID.z0) / CELL - j)]!,
      ),
    ),
    cell: CELL,
    position: { x: ORIGIN.x + x0, y: 0, z: ORIGIN.z + z1 },
  });
  const fine = COVE_FINE;
  return [
    coarse(GRID.x0, fine.x0, GRID.z0, GRID.z1),
    coarse(fine.x1, GRID.x1, GRID.z0, GRID.z1),
    coarse(fine.x0, fine.x1, GRID.z0, fine.z0),
    coarse(fine.x0, fine.x1, fine.z1, GRID.z1),
    {
      heights: Array.from({ length: fine.nx }, (_, i) =>
        Array.from({ length: fine.nz }, (_, j) => fine.heights[i + (fine.nz - 1 - j) * fine.nx]!),
      ),
      cell: fine.cell,
      position: { x: ORIGIN.x + fine.x0, y: 0, z: ORIGIN.z + fine.z1 },
    },
  ];
}

/** Finished rendered/collision surface for grounding audits, including the fine cove grid and kit. */
export function surfaceHeight(wx: number, wz: number) {
  const coarse = coarseHeight(wx, wz, true);
  return coveSurface(wx - ORIGIN.x, wz - ORIGIN.z, fineHeightAt(wx - ORIGIN.x, wz - ORIGIN.z, coarse));
}

/** The land's height at a world point. */
export function H(wx: number, wz: number) {
  const lx = wx - ORIGIN.x,
    lz = wz - ORIGIN.z;
  // The cove's 4 m apron uses its unchanged coarse triangles too. Bilinear lookup here
  // otherwise disagrees with the actual rendered/collision surface immediately outside the patch.
  const nearFine =
    lx >= fineBounds.x0 - 4 && lx <= fineBounds.x1 + 4 && lz >= fineBounds.z0 - 4 && lz <= fineBounds.z1 + 4;
  const h = coarseHeight(wx, wz, coveWeight(lx, lz) > 0 || nearFine);
  return coveSurface(lx, lz, fineHeightAt(lx, lz, h));
}
export const insidePlace = (wx: number, wz: number) =>
  wx - ORIGIN.x > GRID.x0 + 4 &&
  wx - ORIGIN.x < GRID.x1 - 4 &&
  wz - ORIGIN.z > GRID.z0 + 4 &&
  wz - ORIGIN.z < GRID.z1 - 4;
