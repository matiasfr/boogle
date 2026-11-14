// How a little guy on line 1's track bed keeps clear of trains (docs/game-design/place.md, "The little guys"): where
// he can stand while one passes (a refuge: clear of every car on either track, with something drawn under his feet),
// when a train is due by its own plan, and his walk along the path between the two. Pure arithmetic, no three.js, so
// test/path-refuge.test.ts walks the whole path with real trains. View only: nothing here is state.
import { railY, type Line } from '../../place/layout.ts';
import { STEEL_CAR, TRAIN_CARS } from './cars.ts';

/** folk.ts gives way to a car's box widened by its side racks and by the room a walker keeps from a wall
 * (`clearTraffic`: hx + 0.15, then WALL 0.38). A car is a chord of the curve it stands on, so its corners swing a
 * little outside the track's line: 0.12 m covers the longest car on the line's tightest bend. */
const RACKS = 0.15,
  WALL = 0.38,
  SWING = 0.12;
/** The widest car that runs: the trailers and the steel car (1.1 m) or the engine. */
export const WIDEST_CAR = Math.max(STEEL_CAR.hx, ...TRAIN_CARS.map((c) => c.hx));
/** A refuge's least distance from a track's middle: 1.75 m with today's cars. */
export const REFUGE_CLEAR = WIDEST_CAR + RACKS + WALL + SWING;
/** The sleepers' and planks' top over the rail height (track.ts TOP). */
const TOP = 0.1;
/** What a refuge may differ from the track bed's top in height: a step off the sleepers, not a drop off a trestle or
 * into a cutting. */
const STEP = 0.5;
/** A little guy's half width, which a deck must hold on both sides of him, and what his sole bridges of the 0.16 m
 * gaps between a deck's planks. */
const BODY = 0.27,
  SOLE = 0.14;

export type Refuge = { lat: number; y: number; on: 'ground' | 'deck' };
export type Land = {
  /** The drawn, collided ground at a world point (terrain.ts surfaceHeight). */
  ground: (x: number, z: number) => number;
  /** The top of the drawn plank under a world point, a sole of radius `r` bridging gaps; -Infinity with none
   * (`plankTops` over the line's own track pieces). */
  deckTop: (x: number, z: number, r: number) => number;
  /** The up track's lateral at `s`, 0 where the line is single (layout upLat). */
  up: (s: number) => number;
  /** A world point `l` beside the line at `s` (line-geometry.ts besideLine). */
  beside: (line: Line, s: number, l: number) => { x: number; z: number };
};

/** A drawn box as boxes.ts keeps it: its place, and a local matrix over the unit box whose top is y = 1. */
type Plank = { x: number; y: number; z: number; local: { elements: ArrayLike<number> } };
/** `Land.deckTop` over a track's plank pieces (track.ts `planks`): each plank's own leaning top plane, inside its own
 * footprint. */
export function plankTops(planks: readonly Plank[]) {
  const tops = planks.map((b) => {
    const e = b.local.elements;
    const ny = Math.hypot(e[4]!, e[5]!, e[6]!);
    return {
      // A point on the top plane and its normal; the footprint's two axes with their squared lengths.
      px: b.x + e[12]! + e[4]!,
      py: b.y + e[13]! + e[5]!,
      pz: b.z + e[14]! + e[6]!,
      nx: e[4]! / ny,
      ny: e[5]! / ny,
      nz: e[6]! / ny,
      ox: b.x + e[12]!,
      oy: b.y + e[13]!,
      oz: b.z + e[14]!,
      ax: [e[0]!, e[1]!, e[2]!] as const,
      az: [e[8]!, e[9]!, e[10]!] as const,
      wx: Math.hypot(e[0]!, e[1]!, e[2]!),
      wz: Math.hypot(e[8]!, e[9]!, e[10]!),
    };
  });
  return (x: number, z: number, r: number) => {
    let top = -Infinity;
    for (const p of tops) {
      if (Math.abs(x - p.ox) + Math.abs(z - p.oz) > p.wx + p.wz + r) continue;
      const y = p.py - (p.nx * (x - p.px) + p.nz * (z - p.pz)) / p.ny;
      const dx = x - p.ox,
        dy = y - p.oy,
        dz = z - p.oz;
      const qx = (dx * p.ax[0] + dy * p.ax[1] + dz * p.ax[2]) / (p.wx * p.wx),
        qz = (dx * p.az[0] + dy * p.az[1] + dz * p.az[2]) / (p.wz * p.wz);
      if (Math.abs(qx) <= 0.5 + r / p.wx && Math.abs(qz) <= 0.5 + r / p.wz) top = Math.max(top, y);
    }
    return top;
  };
}

/** What holds a little guy standing `lat` beside the line at `s`, or null: the drawn deck where planks lie under him
 * and under both his sides, else the drawn ground; either within a step of the track bed's top. */
function supportAt(line: Line, s: number, lat: number, land: Land): Refuge | null {
  const bed = railY(line, s) + TOP;
  const at = land.beside(line, s, lat);
  const deck = land.deckTop(at.x, at.z, SOLE);
  if (deck > -Infinity) {
    const a = land.beside(line, s, lat - BODY),
      b = land.beside(line, s, lat + BODY);
    if (
      land.deckTop(a.x, a.z, SOLE) > -Infinity &&
      land.deckTop(b.x, b.z, SOLE) > -Infinity &&
      Math.abs(deck - bed) <= STEP
    )
      return { lat, y: deck, on: 'deck' };
  }
  const y = land.ground(at.x, at.z);
  // Ground under a deck, or under its edge, is not a place to stand.
  return y >= deck && Math.abs(y - bed) <= STEP ? { lat, y, on: 'ground' } : null;
}

/** The refuge at `s`, worked out there and then (its height is never carried from another `s`), or null where
 * nothing clear of both tracks is supported (he walks on to one that is). Tried in order: the side away from the up
 * track, between the two tracks, the far side of the up track. */
export function refugeAt(line: Line, s: number, land: Land): Refuge | null {
  const ul = land.up(s),
    away = ul > 0 ? -1 : 1,
    out = Math.max(2.4, REFUGE_CLEAR + 0.3);
  const tries = [away * out];
  if (Math.abs(ul) >= 2 * REFUGE_CLEAR) tries.push(ul / 2);
  if (Math.abs(ul) > 0.5) tries.push(ul - away * out);
  for (const lat of tries) {
    const found = supportAt(line, s, lat, land);
    if (found) return found;
  }
  return null;
}

/** The refuges of a path from `from` to `to` along the line: `at(s)` the refuge there (worked out at `s`), `go(s)`
 * which way along the line the nearest one is where there is none (+1 the way `s` grows, 0 in one or with none in
 * reach), and `first` the first `s` of the path that has one. */
export function pathRefuges(line: Line, from: number, to: number, land: Land) {
  const FINE = 0.1,
    REACH = 15;
  const at = (s: number) => refugeAt(line, s, land);
  // The way to the nearest refuge is the same every time for a place: kept by the decimetre.
  const ways = new Map<number, -1 | 0 | 1>();
  const go = (s: number): -1 | 0 | 1 => {
    if (at(s)) return 0;
    const key = Math.round(s / FINE);
    let way = ways.get(key);
    if (way === undefined) {
      way = 0;
      for (let d = FINE; d <= REACH && !way; d += FINE)
        way = s + d <= to && at(s + d) ? 1 : s - d >= from && at(s - d) ? -1 : 0;
      ways.set(key, way);
    }
    return way;
  };
  let first = from;
  while (first < to && !at(first)) first += FINE;
  return { at, go, first };
}

// ---------------------------------------------------------------- when a train is due
/** Seconds ahead of a train that a commuter leaves the track bed, and how fast they step off it or hurry on to a
 * refuge (m/s). The widest step, from the far lane to the side away from the up track, is 3.6 m. */
export const TRAIN_WARN = 4.5,
  STEP_OFF = 3;
/** A train is alongside from 3 m before its first car to 3 m past its last. One standing with no leg planned can
 * leave at any tick, at 3.5 m/s² (railway-train.ts TRAIN.accel): nobody walks the bed within 6 m of its ends, which it
 * takes 1.85 s to cover from rest, longer than the widest step off. */
const PASS = 3,
  REST_KEEP = 6;
/** A train's ends along the line (m) `sec` seconds from now, by its own accepted plan (the leg it is on; a standing
 * train stays where it is). */
export type TrainAhead = (sec: number) => { lo: number; hi: number };
/** The nearest train seen from `s`: `eta` seconds until it is alongside by its plan (0 alongside, Infinity when it
 * never arrives within the look-ahead), `gap` metres of line to it now, `toward` which way along the line it is,
 * `rest` whether it stands with no leg planned. */
export type Due = { eta: number; gap: number; toward: 1 | -1; rest: boolean };
const AHEAD = TRAIN_WARN + 0.5;
export function trainDue(s: number, trains: readonly TrainAhead[]): Due | null {
  let best: Due | null = null;
  for (const train of trains) {
    const now = train(0),
      then = train(AHEAD);
    const rest = now.lo === then.lo && now.hi === then.hi && train(AHEAD / 2).lo === now.lo;
    const keep = rest ? REST_KEEP : PASS;
    const gap = Math.max(0, s - now.hi - keep, now.lo - keep - s);
    let eta = gap === 0 ? 0 : Infinity;
    // A leg runs one way, so the train reaches `s` within the look-ahead only if it is alongside at its end, and
    // the moment it first is can be halved down to.
    const forward = then.lo > now.lo;
    const alongside = (p: { lo: number; hi: number }) => (forward ? p.hi + PASS >= s : p.lo - PASS <= s);
    if (eta && !rest && (forward ? s > now.hi : s < now.lo) && alongside(then)) {
      let early = 0,
        late = AHEAD;
      for (let k = 0; k < 7; k++) {
        const mid = (early + late) / 2;
        if (alongside(train(mid))) late = mid;
        else early = mid;
      }
      eta = early;
    }
    if (!best || eta < best.eta || (eta === best.eta && gap < best.gap))
      best = { eta, gap, toward: (now.lo + now.hi) / 2 > s ? 1 : -1, rest };
  }
  return best;
}

// ---------------------------------------------------------------- the commuter's walk
/** A commuter on the path: `u` where along it (0 to 1), `way` which way he walks, `lat` how far to the side he is,
 * and the last refuge he made for (`refLat`, with `refY` the height of what holds him there). */
export type Commuter = { u: number; way: 1 | -1; lat: number; refLat: number; refY: number };
export type CommuterPath = {
  /** The path's length (m) for his speed along it, and his walking speeds along and across it (m/s). */
  len: number;
  speed: number;
  across: number;
  due: (u: number) => Due | null;
  refuge: (u: number) => Refuge | null;
  go: (u: number) => -1 | 0 | 1;
};
/** One step of his walk: there and back along the path in his `lane`; with a train due he steps off to the refuge
 * where he is, or, with none there, hurries along the path to the nearest first; a train standing on the path is where
 * he turns back. Returns whether he is keeping clear and whether he is hurrying on. */
export function stepCommuter(c: Commuter, lane: number, dt: number, path: CommuterPath) {
  const due = path.due(c.u);
  const aside = !!due && due.eta < TRAIN_WARN;
  const refuge = aside ? path.refuge(c.u) : null;
  if (refuge) {
    c.refLat = refuge.lat;
    c.refY = refuge.y;
  }
  const off = (refuge ? refuge.lat : lane) - c.lat;
  c.lat += Math.sign(off) * Math.min(Math.abs(off), (aside ? STEP_OFF : path.across) * dt);
  if (aside && !refuge) c.u = Math.max(0, Math.min(1, c.u + (path.go(c.u) * STEP_OFF * dt) / path.len));
  else if (!aside) {
    if (due && due.rest && due.gap < 2 && c.way === due.toward) c.way = -c.way as 1 | -1;
    c.u += (c.way * path.speed * dt) / path.len;
    if (c.u > 1 || c.u < 0) {
      c.way = -c.way as 1 | -1;
      c.u = Math.max(0, Math.min(1, c.u));
    }
  }
  return { aside, hurry: aside && !refuge, toward: due?.toward ?? 1 };
}
/** His feet over the path's own height `y` at his place: the path's in his lane, the refuge's support at the refuge,
 * eased across the step between. */
export function commuterFeet(c: Commuter, lane: number, y: number) {
  const span = Math.abs(c.refLat - lane);
  return y + (c.refY - y) * (span > 0.01 ? Math.min(1, Math.abs(c.lat - lane) / span) : 0);
}
