// Line 2 as the views stand it on the ground: place/layout.ts's east line to the pier head, then the ring's straight
// run on over the bents (src/sim/railway-ring-layout.ts), which the layout's line does not hold (its straight
// extension heads 8 m off the bents by bent 6). One path for the trains' cars, Q7's deck and the pier's second track,
// so they agree with each other and with the sim's platforms (ringAt). Pure numbers; no three.js.
import {
  FORMATION,
  LINKS,
  ORIGIN,
  TURNOUT,
  UP_LAT,
  crossLat,
  lineAt,
  railY,
  type LinePoint,
} from '../../place/layout.ts';
import { LINE2, RAIL_LINES } from '../../sim/railway-lines.ts';
import { RING_S_HEAD, ringAt, ringDeckY } from '../../sim/railway-ring-layout.ts';
import { ROW_SHIFT } from '../../sim/railway-route.ts';
import { WORLD_LINES } from '../../sim/railway-world-lines.ts';

const LINE = LINKS[1]!.line;
/** Where the ring takes over from the layout's line, metres along line 2 (the pier head: Q6's toCm). */
export const RING_S = RING_S_HEAD / 100;
/** The layout's line and the ring's straight run differ by a metre and a half and a bend at the pier head; the pose
 * blends from one to the other over the 12 m before it. */
const BLEND = 12;
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const ringLocal = (s: number, out: LinePoint) => {
  const u = (s - RING_S) * 100,
    a = ringAt(u),
    b = ringAt(u + 1000);
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len = Math.hypot(dx, dz);
  out.x = a.x / 100 - ORIGIN.x;
  out.z = a.z / 100 - ORIGIN.z;
  out.ux = dx / len;
  out.uz = dz / len;
  return out;
};
const ring = { x: 0, z: 0, ux: 0, uz: 1 };

// ---------------------------------------------------------------- the stack line, on from Ring Island (greybox-route)
// Past the island halt line 2 follows the catalog's `ring` row to High Gorge (src/sim/railway-lines.ts LINE2_ON). The
// row is a polyline with a vertex every 15 m or so, so the views read it smoothed (the mean of three row points 7.5 m
// apart) from a table every 5 m. The row turns off the ring's straight run at s 1200 m, inside the island's platforms
// (they end at s 1210 m); the sim's own path is the straight run to s 1210 m and the row from s 1220 m, so the views
// keep the straight run and its 8.0 m deck to STACK_S and ease onto the row over the 30 m after it: a train standing at
// the island halt is on straight track and nothing steps at the join.
/** Where the views' line 2 takes the row's path, and where the row ends (metres along line 2). */
export const STACK_S = 1210;
const STACK_EASE = 30,
  TABLE_S = 1200;
const RING_ROW = WORLD_LINES.find((l) => l.id === 'ring')!;
export const LINE2_END_S = (RING_ROW.fromCm + RING_ROW.lengthCm - ROW_SHIFT.ring) / 100;
const STACK_STEP = 5;
/** The row's spans' lengths (cm), and its point `cm` along it, unrounded (the sim's rowPoint rounds to the centimetre,
 * which over a 5 m chord is a heading a car's length shows); past either end the end span runs on straight. */
const ROW_LEN = RING_ROW.pts.slice(1).map((b, i) => Math.hypot(b[0] - RING_ROW.pts[i]![0], b[1] - RING_ROW.pts[i]![1]));
function rowAt(cm: number) {
  let want = cm - RING_ROW.fromCm,
    i = 0;
  while (i < ROW_LEN.length - 1 && want > ROW_LEN[i]!) want -= ROW_LEN[i++]!;
  const a = RING_ROW.pts[i]!,
    b = RING_ROW.pts[i + 1]!,
    t = want / ROW_LEN[i]!;
  return {
    x: a[0] + (b[0] - a[0]) * t,
    z: a[1] + (b[1] - a[1]) * t,
    y: a[2] + (b[2] - a[2]) * Math.max(0, Math.min(1, t)),
  };
}
const STACK_TABLE = (() => {
  const
    n = Math.ceil((LINE2_END_S - TABLE_S) / STACK_STEP) + 2,
    out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const cm = (TABLE_S + i * STACK_STEP) * 100 + ROW_SHIFT.ring;
    let x = 0,
      z = 0,
      y = 0;
    for (const d of [-750, 0, 750]) {
      const p = rowAt(cm + d);
      x += p.x;
      z += p.z;
      y += p.y;
    }
    out.set([x / 300 - ORIGIN.x, z / 300 - ORIGIN.z, y / 300], i * 3);
  }
  return out;
})();
/** The smoothed row at `s` (local x, z and the rail height), linear between the table's rows. */
const rowLocal = (s: number, out: { x: number; z: number; y: number }) => {
  const f = Math.max(0, Math.min(STACK_TABLE.length / 3 - 1.001, (s - TABLE_S) / STACK_STEP)),
    i = Math.floor(f) * 3,
    t = f - Math.floor(f),
    T = STACK_TABLE;
  out.x = T[i]! + (T[i + 3]! - T[i]!) * t;
  out.z = T[i + 1]! + (T[i + 4]! - T[i + 1]!) * t;
  out.y = T[i + 2]! + (T[i + 5]! - T[i + 2]!) * t;
  return out;
};
const row = { x: 0, z: 0, y: 0 },
  straight = { x: 0, z: 0, ux: 0, uz: 1 };
/** The stack line's point at `s` >= STACK_S: the ring's straight run eased onto the smoothed row over STACK_EASE. */
const stackPoint = (s: number, out: { x: number; z: number; y: number }) => {
  rowLocal(s, row);
  const w = ease((s - STACK_S) / STACK_EASE);
  if (w >= 1) {
    out.x = row.x;
    out.z = row.z;
    out.y = row.y;
    return out;
  }
  ringLocal(s, straight);
  out.x = straight.x + (row.x - straight.x) * w;
  out.z = straight.z + (row.z - straight.z) * w;
  out.y = 8 + (row.y - 8) * w;
  return out;
};
const before = { x: 0, z: 0, y: 0 },
  after = { x: 0, z: 0, y: 0 },
  here = { x: 0, z: 0, y: 0 };
const stackLocal = (s: number, out: LinePoint) => {
  // The heading is the chord's over the 5 m about `s` (a table row's corner is spread over a car's bogie spacing).
  stackPoint(Math.max(STACK_S, s - 2.5), before);
  stackPoint(Math.max(STACK_S, s - 2.5) + 5, after);
  stackPoint(s, here);
  const hx = after.x - before.x,
    hz = after.z - before.z,
    len = Math.hypot(hx, hz);
  out.x = here.x;
  out.z = here.z;
  out.ux = hx / len;
  out.uz = hz / len;
  return out;
};
const stackY = (s: number) => stackPoint(s, here).y;
/** Local coordinates (the layout's, without ORIGIN) and heading of `s` metres along line 2, past the pier head too. */
export function line2At(s: number, out: LinePoint) {
  if (s < RING_S - BLEND) return lineAt(LINE, s, out);
  if (s >= STACK_S) return stackLocal(s, out);
  ringLocal(s, ring);
  if (s >= RING_S) {
    out.x = ring.x;
    out.z = ring.z;
    out.ux = ring.ux;
    out.uz = ring.uz;
    return out;
  }
  lineAt(LINE, s, out);
  const w = ease((s - (RING_S - BLEND)) / BLEND);
  out.x += (ring.x - out.x) * w;
  out.z += (ring.z - out.z) * w;
  const ux = out.ux + (ring.ux - out.ux) * w,
    uz = out.uz + (ring.uz - out.uz) * w,
    len = Math.hypot(ux, uz);
  out.ux = ux / len;
  out.uz = uz / len;
  return out;
}
/** Rail height at `s`: the layout's to the pier head, then the bow (ringDeckY: 24.3 m to bent 1, 4% down to 8.0 m),
 * then the stack line's row (8.0 m down to the 4.0 m sea deck, 3.0 m in the Gorge). */
export const line2Y = (s: number) =>
  s <= RING_S ? railY(LINE, s) : s >= STACK_S ? stackY(s) : ringDeckY((s - RING_S) * 100) / 100;
/** World (x, z) of `lat` metres east of line 2's down track at `s`. */
export function line2World(s: number, lat: number, out: { x: number; z: number }) {
  const p = line2At(s, tmp);
  out.x = p.x - p.uz * lat + ORIGIN.x;
  out.z = p.z + p.ux * lat + ORIGIN.z;
  return out;
}
const tmp: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };

// ---------------------------------------------------------------- the up track's lateral, from the room's rows
const QUARRY = FORMATION.quarry;
const HALTS = RAIL_LINES[LINE2]!.halts;
/** Far Head's stop on line 2: its facing crossover (s 490-512 m) is the first end the line has. */
const FAR_HEAD = 2;
/** A crossover end's length along the line (metres): Far Head's 22 m, the island's 22 m. */
const CROSS_LEN = QUARRY.crossover![1] - QUARRY.crossover![0];
/** The part of a train row the lateral reads. */
export type LatRow = { readonly track: number; readonly to: number; readonly turn: boolean; readonly dest: number };
/** Where the open end's merge (a stub) or crossover (a crossover) starts, metres: the catalog's, moved with a moving
 * stop (the Railhead's by its head). */
export const endMergeM = (stops: readonly number[]) => {
  const last = stops.length - 1,
    end = HALTS[last]!.end!;
  return (end.mergeCm + stops[last]! - HALTS[last]!.s) / 100;
};
/**
 * The lateral of line 2's train on `row`'s track at `s` metres (0 is the down track, UP_LAT the up track; Local, from
 * rows alone, so a restore or a joining tab draws it the same).
 *  - Down track: 0.
 *  - Up track: UP_LAT between the turnouts (eased out over the 20 m after the layout's merge at s 34).
 *  - While the open end is Far Head, every up train takes its crossover onto the down track (s 490-512); so does one
 *    the pier's opening caught there (`turn`, bound for Far Head).
 *  - While it is a stub (the Pier, the Railhead), the two tracks merge over the 20 m before `merge`; at a crossover
 *    (Ring Island) up trains cross onto the down track after it.
 *  - A train Q7 turns at the Pier (`turn`, bound elsewhere than Far Head) is on a straight double track: it eases onto
 *    the down track over the 20 m before the stop it turns at. It is not on Far Head's crossover (a train past s 512
 *    on the up track, turned at the Pier stub, once jumped 4 m sideways there).
 * `merge` is endMergeM(stops), or a smoothed value for a moving railhead.
 */
export function line2Lat(row: LatRow, s: number, stops: readonly number[], merge = endMergeM(stops)) {
  if (row.track) return 0;
  const last = stops.length - 1;
  const start = s <= QUARRY.from ? 0 : UP_LAT * ease((s - QUARRY.from) / TURNOUT);
  if (last === FAR_HEAD || (row.turn && row.to === FAR_HEAD)) {
    const c = QUARRY.crossover!;
    return s >= c[0] ? (crossLat(QUARRY, s) ?? 0) : start;
  }
  let lat = start;
  if (HALTS[last]!.end!.kind === 'stub')
    lat = UP_LAT * Math.min(ease((s - QUARRY.from) / TURNOUT), ease((merge - s) / TURNOUT));
  else if (s >= merge) lat = UP_LAT * (1 - ease((s - merge) / CROSS_LEN));
  if (row.turn && row.to !== last) lat *= 1 - ease((s - (row.dest / 100 - TURNOUT)) / TURNOUT);
  return lat + 0; // never -0
}
