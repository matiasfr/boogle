// The departures board's timetable (?proto=board; docs/game-design/board.md): when the wagon next stands at a station,
// read off wagonAt (src/sim/wagon.ts) so the board and the wagon can never disagree. Pure and Local (no state, no
// network): every tab computes the same times from the shared tick. Stations are the wagon's stops: 0 is the first
// site, k the site of section k, and `laid` the far end of the last laid section.
import { ROUTE } from '../../sim/route.ts';
import { wagonAt, wagonCycle } from '../../sim/wagon.ts';

/** A dwell in the timetable: the wagon stands at `stop` from `start` to `end` (ticks into the cycle), leaving in `dir`. */
export type Dwell = { stop: number; dir: 1 | -1; start: number; end: number };

/** Where station k stands (world metres): section k's site, or the far end of the route's last section. */
export function stationAt(k: number): { x: number; z: number } {
  if (k < ROUTE.length) return { x: ROUTE[k].x, z: ROUTE[k].z };
  const to = ROUTE[ROUTE.length - 1].to;
  return { x: to[0], z: to[1] };
}

const cache: Dwell[][] = [];
/** Every dwell in one cycle with `laid` sections laid, in order ([] with none laid). */
export function dwells(laid: number): Dwell[] {
  if (cache[laid]) return cache[laid];
  const cycle = wagonCycle(laid);
  const out: Dwell[] = [];
  let cur: Dwell | null = null;
  for (let t = 0; t <= cycle; t++) {
    const w = t < cycle ? wagonAt(laid, t) : null;
    const stop = w ? w.stop : -1;
    if (cur && (stop !== cur.stop || w!.dir !== cur.dir)) {
      cur.end = t;
      out.push(cur);
      cur = null;
    }
    if (!cur && w && stop >= 0) cur = { stop, dir: w.dir, start: t, end: t };
  }
  return (cache[laid] = out);
}

/**
 * The wagon's next call at `stop` leaving in `dir` (1 out, towards the far end; -1 back, towards station 0), seen at
 * `tick` (fractional is fine). `arrive` and `leave` are ticks from now (arrive 0 while it already stands there). Null if
 * it never leaves that stop that way (the far end only leaves back, station 0 only out) or nothing is laid.
 */
export function nextCall(
  laid: number,
  stop: number,
  dir: 1 | -1,
  tick: number,
): { arrive: number; leave: number } | null {
  const cycle = wagonCycle(laid);
  if (!cycle) return null;
  const d = dwells(laid).find((x) => x.stop === stop && x.dir === dir);
  if (!d) return null;
  let phase = tick % cycle;
  if (phase < 0) phase += cycle;
  if (phase >= d.start && phase < d.end) return { arrive: 0, leave: d.end - phase };
  const wait = (d.start - phase + cycle) % cycle;
  return { arrive: wait, leave: wait + d.end - d.start };
}

/** Which way to ride from station `from` to station `to`, and how many stops: 1 out, -1 back. */
export const towards = (from: number, to: number): 1 | -1 => (to > from ? 1 : -1);
