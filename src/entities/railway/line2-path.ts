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
/** Local coordinates (the layout's, without ORIGIN) and heading of `s` metres along line 2, past the pier head too. */
export function line2At(s: number, out: LinePoint) {
  if (s < RING_S - BLEND) return lineAt(LINE, s, out);
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
/** Rail height at `s`: the layout's to the pier head, then the bow (ringDeckY: 24.3 m to bent 1, 4% down to 8.0 m). */
export const line2Y = (s: number) => (s <= RING_S ? railY(LINE, s) : ringDeckY((s - RING_S) * 100) / 100);
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
