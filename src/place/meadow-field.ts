// The meadow's two maps over Home's whole land grid (docs/game-design/place.md, "The meadow"; owner, 14 November:
// "that kind of texture around the bugler statue and just widespread in the map in general"): the pure half of
// meadow.ts and meadow-flowers.ts, so Node can check where things grow without a renderer.
//   The noise, 4 m texels: two slow noises that the lawn's tint and the planting both read, so the ground's colour
//   and what grows on it agree. Cheap (a few milliseconds): made before the land is drawn.
//   The keep map, 1 m texels (the path field's grid): how far the nearest thing a flower must stay off is, and how
//   thick the planting may be. Slow (a few hundred milliseconds): baked in slices after the first frame.
// Integer-hashed noise and layout data only, so every client bakes the same maps. Local view data: nothing here moves
// a height, is saved, or is read by the sim.
import { smoothstep, valueNoise } from '../math.ts';
import { RAIL_HALTS } from '../sim/railway-lines.ts';
import { LINE1_STATIONS } from '../sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import {
  RAIL_ROCKS,
  SHED_STALL,
  SHED_TABLE,
  WORKS_BREAKER,
  WORKS_CLEFT,
  WORKS_KILN,
  WORKS_RACK,
  WORKS_SEAMS,
} from '../sim/railway-works-layout.ts';
import { insideSplitRock } from '../entities/railway/works-shape.ts';
import { steepness } from './ground-layers.ts';
import { openingStops } from './opening-stops.ts';
import {
  CART_FORGE,
  HALL,
  ISLAND,
  ISLAND_A,
  ISLAND_C,
  PROPS,
  STALLS,
  TABLE,
  axisPoint,
  cartRoadAt,
  legPoints,
  spurPoints,
  stallFrame,
} from './home-station.ts';
import {
  BANK_CART,
  FORGE,
  FORGE_FRAME,
  GREAT_TREE,
  GRID,
  FORMATION,
  HALTS,
  HEAP,
  LINES,
  LINKS,
  OAK,
  ORIGIN,
  ROCKS,
  SCOPE,
  SPAWN,
  SPIRE,
  TOWN,
  lineAt,
  offsetLat,
  type LinePoint,
} from './layout.ts';
import { FIELD_H, FIELD_W, pathAt } from './path-field.ts';
import { DEVICES, GATES, GLIDE_RAMP, LEVER, PADS, PILLARS, POSTS, SEA_SWITCH, SECRETS } from './tech-layout.ts';
import { CELL, NX, NZ, at, clearMask, heights } from './terrain.ts';
import {
  TOWN_CENTRE,
  TOWN_COURT,
  courtLength,
  TOWN_GROUND,
  TOWN_PROPS,
  TOWN_SLOTS,
  townBuilding,
} from './town-plan.ts';

/** The noise map's texel, metres, and its size over the land's grid. */
export const NOISE_CELL = 4;
export const NOISE_W = (GRID.x1 - GRID.x0) / NOISE_CELL + 1,
  NOISE_H = (GRID.z1 - GRID.z0) / NOISE_CELL + 1;
/** The keep map's texels: the path field's 1 m grid over the same ground. */
export const KEEP_W = FIELD_W,
  KEEP_H = FIELD_H;
/** The keep map's first channel is the distance to the nearest kept thing over this, metres (1 is "this far or more"). */
export const KEEP_REACH = 4;

/** Two slow noises in 0..1 at a Place-local point: `sun` (lush and dark at 0, sunny and flowered at 1; patches of 20
 * to 60 m) and `zone` (which flower keeps this ground; patches of 10 to 30 m). */
export function meadowNoise(x: number, z: number) {
  const sun = 0.62 * valueNoise(x / 34 + 11.3, z / 34 - 4.7) + 0.38 * valueNoise(x / 15 - 2.1, z / 15 + 8.9);
  const zone = 0.65 * valueNoise(x / 21 - 17.9, z / 21 + 3.3) + 0.35 * valueNoise(x / 9.5 + 6.4, z / 9.5 - 12.2);
  return { sun: smoothstep(-0.55, 0.55, sun), zone: smoothstep(-0.6, 0.6, zone) };
}

/** The noise map, two bytes a texel and two spare, row by row from the grid's (x0, z0): sun, zone. */
export function bakeMeadowNoise() {
  const data = new Uint8Array(NOISE_W * NOISE_H * 4);
  for (let j = 0; j < NOISE_H; j++)
    for (let i = 0; i < NOISE_W; i++) {
      const n = meadowNoise(GRID.x0 + i * NOISE_CELL, GRID.z0 + j * NOISE_CELL);
      const k = (i + j * NOISE_W) * 4;
      data[k] = Math.round(255 * n.sun);
      data[k + 1] = Math.round(255 * n.zone);
      data[k + 3] = 255;
    }
  return data;
}

// ---------------------------------------------------------------- the keep map
/** Below this the beach's wandering line may draw sand (ground-material.ts: 2.6 m plus its 0.42 m wander). */
const SAND_TOP = 3.4;
/** A path's levelled strip clears this far from its tread (terrain.ts strip()); beyond it cleared ground is a footing. */
const STRIP = 10;
/** Nothing grows within this of a pad, a device, a secret, a gate or a lever (terrain-clean's design review). */
const KEEP_CLEAR = 6;
/** Half the width kept bare along a railway's centre line: both tracks' formation (7.6 m) and a verge. */
const RAIL_HALF = 4.8;
/** How thick the planting may be (the keep map's second channel) and how much is added to the drift noise before that
 * cap (the third): the open meadow has drifts and bare stretches at full strength; the Round's green and the gaps
 * between its buildings carry flowers everywhere but thinly, so the statue and the houses still read. */
const DENSITY = { open: { cap: 1, lift: 0 }, town: { cap: 0.42, lift: 0.55 } };

const cm = (p: { x: number; z: number }) => ({ x: p.x / 100 - ORIGIN.x, z: p.z / 100 - ORIGIN.z });
const inRound = (x: number, z: number) =>
  Math.hypot(x - TOWN_CENTRE.x, z - TOWN_CENTRE.z) < TOWN_GROUND.r + TOWN_GROUND.soft;

/** Whether grass is drawn at a grid vertex: not sand, not the facets or the broad slope the material calls rock. */
function lawnAt(i: number, j: number) {
  const k = at(i, j);
  if (heights[k]! < SAND_TOP) return false;
  const x = GRID.x0 + i * CELL,
    z = GRID.z0 + j * CELL;
  if (steepness(x, z) > 0.02) return false;
  const h = (di: number, dj: number) =>
    heights[at(Math.max(0, Math.min(NX - 1, i + di)), Math.max(0, Math.min(NZ - 1, j + dj)))]!;
  return 1 / Math.hypot(1, (h(1, 0) - h(-1, 0)) / (2 * CELL), (h(0, 1) - h(0, -1)) / (2 * CELL)) >= 0.72;
}

/** The keep map, three bytes and a spare a texel: distance to the nearest kept thing (0 on it, 255 at `KEEP_REACH`
 * or more), the density cap and the drift lift (`DENSITY`). A generator, so the browser can bake it a slice at a time:
 * it yields between stages and returns the map. Kept (nothing grows): everything that is not lawn; levelled footings
 * outside the Round (`clearMask`, as for the trees, less the paths' own strips); railways, the cart's road and the
 * turntable; every building, plot, room, platform, yard prop and work place listed here; the statue's footing; and
 * `KEEP_CLEAR` round every pad, device, secret, gate and lever. Path treads are left to the path field. */
export function* bakeMeadowKeep(): Generator<void, Uint8Array> {
  const W = KEEP_W,
    H = KEEP_H;
  const kept = new Uint8Array(W * H);
  const px = (x: number) => (x - GRID.x0) / (CELL / 2),
    pz = (z: number) => (z - GRID.z0) / (CELL / 2);
  const disc = (x: number, z: number, r: number) => {
    const cx = px(x),
      cz = pz(z);
    for (let j = Math.max(0, Math.floor(cz - r)); j <= Math.min(H - 1, Math.ceil(cz + r)); j++)
      for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(W - 1, Math.ceil(cx + r)); i++)
        if (Math.hypot(i - cx, j - cz) <= r) kept[i + j * W] = 1;
  };
  /** A box of `w` by `d` turned by `yaw` (three.js rotation.y: w along local x), grown by `margin`. */
  const box = (b: { x: number; z: number; w: number; d: number; yaw?: number }, margin = 0) => {
    const c = Math.cos(b.yaw ?? 0),
      s = Math.sin(b.yaw ?? 0),
      hw = b.w / 2 + margin,
      hd = b.d / 2 + margin,
      r = Math.hypot(hw, hd);
    const cx = px(b.x),
      cz = pz(b.z);
    for (let j = Math.max(0, Math.floor(cz - r)); j <= Math.min(H - 1, Math.ceil(cz + r)); j++)
      for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(W - 1, Math.ceil(cx + r)); i++) {
        const dx = i - cx,
          dz = j - cz;
        if (Math.abs(dx * c - dz * s) <= hw && Math.abs(dx * s + dz * c) <= hd) kept[i + j * W] = 1;
      }
  };
  const along = (points: readonly { x: number; z: number }[], r: number) => {
    for (let k = 0; k < points.length; k++) {
      const a = points[k]!,
        b = points[Math.min(points.length - 1, k + 1)]!;
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
      for (let t = 0; t < n; t++) disc(a.x + ((b.x - a.x) * t) / n, a.z + ((b.z - a.z) * t) / n, r);
    }
  };

  // Not lawn, or a levelled footing outside the Round (inside it the whole ground is levelled, and the lists below
  // say what stands): a texel is kept unless every grid vertex round it draws grass and is no footing.
  const lawn = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const x = GRID.x0 + i * CELL,
        z = GRID.z0 + j * CELL;
      const footing = clearMask[at(i, j)]! > 0.3 && !inRound(x, z) && pathAt(x, z).edge >= STRIP;
      lawn[at(i, j)] = !footing && lawnAt(i, j) ? 1 : 0;
    }
    if (j % 24 === 23) yield;
  }
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const i0 = Math.floor(i / 2),
        j0 = Math.floor(j / 2),
        i1 = Math.min(NX - 1, Math.ceil(i / 2)),
        j1 = Math.min(NZ - 1, Math.ceil(j / 2));
      if (!(lawn[at(i0, j0)]! && lawn[at(i1, j0)]! && lawn[at(i0, j1)]! && lawn[at(i1, j1)]!)) kept[i + j * W] = 1;
    }
  yield;

  // Railways: both lines for their whole length (rails are laid along them), the spur, the cart's leg and road.
  for (const line of [LINES.north, LINES.east])
    along(
      Array.from(line.xs, (x, k) => ({ x, z: line.zs[k]! })),
      RAIL_HALF,
    );
  // The second track of each double formation runs up to 4.35 m aside (layout.ts offsetLat, as terrain.ts beds it), and
  // the crossover lies between the two: the same width about its own centre line, turnouts included.
  const rail: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  for (const link of LINKS) {
    const formation = FORMATION[link.id];
    const up: { x: number; z: number }[] = [];
    for (let s = formation.from; s <= formation.to; s += 0.5) {
      const lat = offsetLat(formation, s);
      if (lat === null) continue;
      lineAt(link.line, s, rail);
      up.push({ x: rail.x - rail.uz * lat, z: rail.z + rail.ux * lat });
    }
    along(up, RAIL_HALF);
  }
  yield;
  along(spurPoints(), RAIL_HALF - 1.4);
  along(legPoints(), RAIL_HALF - 1.4);
  along(
    Array.from({ length: Math.ceil(CART_FORGE) + 1 }, (_, d) => cartRoadAt(Math.min(d, CART_FORGE), LINES)),
    RAIL_HALF - 1.4,
  );
  disc(TABLE.x, TABLE.z, TABLE.r + 2.5);
  for (const bearing of STALLS.bearings) {
    const f = stallFrame(bearing);
    box({ ...f.centre, w: STALLS.width, d: STALLS.depth, yaw: f.yaw }, 2);
    along([f.rim, f.door], STALLS.width / 2 + 1);
  }
  // Platforms: the village island and its hall, then each halt's deck beside its line.
  const axisBox = (a0: number, a1: number, c: number, w: number) =>
    box({ ...axisPoint((a0 + a1) / 2, c), w, d: a1 - a0, yaw: HALL.yaw }, 1.5);
  axisBox(ISLAND_A.buffers, ISLAND_A.foot, ISLAND_C, ISLAND.width);
  axisBox(ISLAND_A.buffers, ISLAND_A.apron, ISLAND_C, ISLAND.width);
  box(HALL, 2);
  const on: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  for (const halt of HALTS) {
    const line = halt.line ? LINES.east : LINES.north;
    for (let s = halt.s0 - 3; s <= halt.s1 + 3; s++) {
      lineAt(line, s, on);
      disc(on.x - on.uz * halt.lat, on.z + on.ux * halt.lat, 4.5);
      disc(on.x + on.uz * halt.lat, on.z - on.ux * halt.lat, 4.5);
    }
  }
  for (const halt of RAIL_HALTS) for (const p of halt.platforms) disc(cm(p).x, cm(p).z, Math.min(8, p.reach / 100) + 1);
  yield;
  // The town: every slot (built or still a plot), the older buildings and camps, and what stands that is not a building.
  for (const slot of TOWN_SLOTS) box(townBuilding(slot.id), 1.2);
  for (const p of [
    ...TOWN.start,
    ...TOWN.wood.flat(),
    ...TOWN.stone.flat(),
    ...TOWN.camps.flatMap((c) => [...c.asleep, ...c.awake]),
  ])
    if (p.w && p.d) box({ x: p.x, z: p.z, w: p.w, d: p.d, yaw: p.yaw }, 1.2);
    else disc(p.x, p.z, 3.5);
  const footing = TOWN_PROPS.statue.footing;
  box({ ...TOWN_PROPS.statue, w: footing, d: footing }, 0.6);
  const [a, b] = TOWN_COURT.goals;
  box({ ...TOWN_COURT.centre, w: TOWN_COURT.width, d: courtLength, yaw: Math.atan2(b.x - a.x, b.z - a.z) }, 0.5);
  disc(TOWN_COURT.lever.x, TOWN_COURT.lever.z, 0.65);
  box(TOWN_PROPS.bay.foot, 4); // the finders' bay and the boxes that wait in front of it
  box(TOWN_PROPS.shelf.foot, 2);
  box({ ...TOWN_PROPS.balcony, w: 6, d: 6 }, 1);
  disc(TOWN_PROPS.yard.x, TOWN_PROPS.yard.z, 4);
  disc(TOWN_PROPS.forgeDoor.x, TOWN_PROPS.forgeDoor.z, 4);
  // Where players work: the forge and its yard props, the stations and the works.
  box(FORGE, 3);
  for (const [p, r] of [
    [FORGE_FRAME, 4.5],
    [HEAP, 4],
    [PROPS.rack, 3.5],
    [PROPS.greeter, 2.5],
    [PROPS.pedestal, 3],
    [PROPS.crane, 3.5],
    [PROPS.dock, 3.5],
    [PROPS.yard, 6],
    [SPAWN, 3],
    [OAK, 2],
    [GREAT_TREE, 4],
    [SCOPE, 3.5],
    [BANK_CART, 3.5],
    [cm(WORKS_BREAKER), 6],
    [cm(WORKS_CLEFT), 6],
    [cm(WORKS_KILN), 6.5],
    [cm(WORKS_RACK), 6],
    [cm(SHED_STALL), 7],
    [cm(SHED_TABLE), 8],
  ] as const)
    disc(p.x, p.z, r);
  for (const station of [...LINE1_STATIONS, ...LINE2_STATIONS]) disc(cm(station).x, cm(station).z, 8);
  for (const seam of WORKS_SEAMS) disc(cm(seam).x, cm(seam).z, 6);
  for (const rock of RAIL_ROCKS) disc(cm(rock).x, cm(rock).z, 3.5);
  for (const rock of ROCKS) disc(rock.x, rock.z, rock.r + 1.5);
  // Found by dev/ground/meadow-audit.ts (the world's colliders): the works' split rock, the spire's foot and the
  // arches and other stops that stand on open lawn.
  for (let z = 56; z <= 140; z++)
    for (let x = 100; x <= 184; x++) if (insideSplitRock({ x: x + ORIGIN.x, z: z + ORIGIN.z }, 3)) disc(x, z, 0.8);
  disc(SPIRE.x, SPIRE.z, 13);
  for (const stop of openingStops())
    box({ x: stop.x - ORIGIN.x, z: stop.z - ORIGIN.z, w: stop.w, d: stop.d, yaw: stop.yaw }, 1.2);
  // The design review's keep-clear: nothing that hides a find or a prompt, or reads as a way to one.
  for (const pad of PADS) box({ x: pad.x, z: pad.z, w: pad.hx * 2, d: pad.hz * 2 }, KEEP_CLEAR);
  for (const p of [...Object.values(DEVICES), ...SECRETS, ...Object.values(GATES), LEVER, SEA_SWITCH])
    disc(p.x, p.z, KEEP_CLEAR);
  for (const p of PILLARS) disc(p.x, p.z, p.r + 3);
  for (const p of POSTS) disc(p.x, p.z, 3);
  box({ x: GLIDE_RAMP.x, z: GLIDE_RAMP.z, w: GLIDE_RAMP.hx * 2, d: GLIDE_RAMP.hz * 2 }, 3);

  yield;

  // Distance to the nearest kept texel, two chamfer passes, capped at the reach.
  const far = KEEP_REACH + 1,
    d = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) d[k] = kept[k] ? 0 : far;
  const relax = (k: number, i: number, j: number, di: number, dj: number, cost: number) => {
    const ni = i + di,
      nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= W || nj >= H) return;
    const v = d[ni + nj * W]! + cost;
    if (v < d[k]!) d[k] = v;
  };
  const step = CELL / 2,
    diagonal = step * Math.SQRT2;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = i + j * W;
      relax(k, i, j, -1, 0, step);
      relax(k, i, j, 0, -1, step);
      relax(k, i, j, -1, -1, diagonal);
      relax(k, i, j, 1, -1, diagonal);
    }
    if (j % 90 === 89) yield;
  }
  for (let j = H - 1; j >= 0; j--) {
    for (let i = W - 1; i >= 0; i--) {
      const k = i + j * W;
      relax(k, i, j, 1, 0, step);
      relax(k, i, j, 0, 1, step);
      relax(k, i, j, 1, 1, diagonal);
      relax(k, i, j, -1, 1, diagonal);
    }
    if (j % 90 === 0) yield;
  }
  const out = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = i + j * W;
      const density = inRound(GRID.x0 + i * step, GRID.z0 + j * step) ? DENSITY.town : DENSITY.open;
      out[k * 4] = Math.round(255 * Math.min(1, d[k]! / KEEP_REACH));
      out[k * 4 + 1] = Math.round(255 * density.cap);
      out[k * 4 + 2] = Math.round(255 * density.lift);
      out[k * 4 + 3] = 255;
    }
    if (j % 90 === 89) yield;
  }
  return out;
}

/** The keep map's bake as a step to call once a frame: it does nothing until a frame has been drawn after it was
 * made (`framesDrawn` is the loop's count of completed renders), so it never competes with the game's start, then
 * bakes for about `budgetMs` a call and returns the map on the call that finishes it (null before, and after). */
export function keepBakeByFrame(framesDrawn: () => number, budgetMs = 3, now: () => number = () => performance.now()) {
  const madeAt = framesDrawn();
  let baking: Generator<void, Uint8Array> | null = null,
    finished = false;
  return (): Uint8Array | null => {
    if (finished || framesDrawn() <= madeAt) return null;
    baking ??= bakeMeadowKeep();
    const started = now();
    for (;;) {
      const step = baking.next();
      if (step.done) {
        finished = true;
        return step.value;
      }
      if (now() - started >= budgetMs) return null;
    }
  };
}

/** The whole keep map at once, for Node. */
export function meadowKeep() {
  const baking = bakeMeadowKeep();
  for (;;) {
    const step = baking.next();
    if (step.done) return step.value;
  }
}
