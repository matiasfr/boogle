// The timetabled wagon (vertical-slice S2): where it is on the laid rails, as a pure function of the tick. No state and
// no network: every tab and the server compute the same place, like runAt (./scripted-run.ts). Renders and platform
// carry sample it at a smooth fractional tick (src/netplay/shared-time.ts).
//
// It shuttles along the laid sections only (laid = how many ROUTE sections are laid, from the start; ./sites.ts `open`):
// it dwells at the first site, runs out stopping at each later site (a station), dwells at the far end of the last laid
// section, and comes back the same way, stopping at each station again. Every run between two stops eases in and out:
// accelerate, cruise, brake.
//
// Integer core: the timetable (dwell, accel, each leg's length in ticks) is integer ticks, and the line is integer
// centimetres. Within a run the position is computed from those integers with + - * / only, so it is the same float
// on every peer, at integer and fractional ticks alike, and continuous everywhere (no teleports at stops or
// turnarounds). When `laid` changes the timetable changes, so the result can jump: a later PR handles the transition.
// Corners between sections are sharp polyline joints; the render smooths them.

import { ROUTE, HOME_ROUTE } from './route.ts';
import { MS_PER_TICK } from './bank.ts';

// Tunables. Slow enough to hop on and off.
export const WAGON_CRUISE = 30; // cm per tick at full speed (3 m/s)
export const WAGON_ACCEL = 30; // ticks to reach full speed from a stop, and to brake from it (3 s, so 1 m/s^2)
export const WAGON_DWELL = 60; // ticks standing at each stop (6 s)

/** A speed profile: cruise in cm per tick, accel in ticks to reach it from a stop. Playtest rooms tune it (./tune.ts). */
export type WagonPace = { cruise: number; accel: number };
export const WAGON_PACE: WagonPace = { cruise: WAGON_CRUISE, accel: WAGON_ACCEL };

const TICKS_PER_S = 1000 / MS_PER_TICK;

/**
 * Where the wagon is at a tick.
 *   x, z      world metres
 *   dx, dz    unit heading: the direction it travels (while dwelling, the direction it leaves in next)
 *   vx, vz    velocity, metres per second (0 while dwelling): what platform carry adds
 *   speed     signed speed along the line, metres per second: + running out (away from ROUTE[0]), - coming back
 *   dist      centimetres along the line from ROUTE[0]'s site
 *   section   ROUTE index of the section it is on (while dwelling, the one it leaves on next)
 *   dir       1 on the way out, -1 on the way back
 *   stop      the stop it is dwelling at (0 = the first site, k = section k's site, laid = the far end), or -1 moving
 *   phase     ticks into the timetable's cycle (0 = the start of the dwell at stop 0)
 */
export type WagonState = {
  x: number;
  z: number;
  dx: number;
  dz: number;
  vx: number;
  vz: number;
  speed: number;
  dist: number;
  section: number;
  dir: 1 | -1;
  stop: number;
  phase: number;
};

// A section of line: from (ax, az) to (bx, bz), `len` integer centimetres, starting `at` cm along the line.
type Section = { ax: number; az: number; bx: number; bz: number; len: number; at: number };
// One step of the cycle, `start` and `len` in integer ticks: a dwell at `stop`, or a run over `section` in `dir`,
// accelerating for `accel` ticks to `peak` cm per tick.
type Step = { start: number; len: number; stop: number; section: number; dir: 1 | -1; accel: number; peak: number };

// Built on first use, not at import: `?layout=` (src/island/layout.ts) may move ROUTE's positions before anything asks.
// `home`: the shipped line (HOME_ROUTE) instead, for lockstep (wagonStandsAt).
const SECTIONS: Section[] = [],
  HOME_SECTIONS: Section[] = [];
function sections(home = false): Section[] {
  const out = home ? HOME_SECTIONS : SECTIONS;
  if (out.length) return out;
  const route = home ? HOME_ROUTE : ROUTE;
  for (let s = 0, at = 0; s < route.length; s++) {
    const r = route[s];
    const ex = r.to[0] - r.x;
    const ez = r.to[1] - r.z;
    const len = Math.round(Math.sqrt(ex * ex + ez * ez) * 100);
    out.push({ ax: r.x, az: r.z, bx: r.to[0], bz: r.to[1], len, at });
    at += len;
  }
  return out;
}

// Smallest integer n with n * n >= num / den (num, den positive integers), without trusting float rounding.
function ceilSqrtOf(num: number, den: number): number {
  let n = Math.floor(Math.sqrt(num / den));
  while (n * n * den < num) n++;
  while (n > 1 && (n - 1) * (n - 1) * den >= num) n--;
  return Math.max(1, n);
}

// A run of `len` cm from rest to rest: `accel` ticks speeding up, then cruising, then `accel` braking, `ticks` in all.
// The peak is len / (ticks - accel) <= cruise, and the acceleration peak / accel <= cruise / pace.accel.
export function runTicks(len: number, pace: WagonPace = WAGON_PACE): { ticks: number; accel: number } {
  const { cruise, accel: a } = pace;
  if (len >= cruise * a) return { ticks: a + Math.ceil(len / cruise), accel: a };
  const accel = ceilSqrtOf(len * a, cruise); // too short to reach cruise: speed up, then brake
  return { ticks: 2 * accel, accel };
}

const cache = new Map<string, Step[]>();
function timetable(laid: number, pace: WagonPace, home = false): Step[] {
  const key = `${laid}:${pace.cruise}:${pace.accel}${home ? ':home' : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const steps: Step[] = [];
  let t = 0;
  const add = (stop: number, section: number, dir: 1 | -1): void => {
    steps.push({ start: t, len: WAGON_DWELL, stop, section, dir, accel: 0, peak: 0 });
    t += WAGON_DWELL;
    const { len } = sections(home)[section];
    const { ticks, accel } = runTicks(len, pace);
    steps.push({ start: t, len: ticks, stop: -1, section, dir, accel, peak: len / (ticks - accel) });
    t += ticks;
  };
  for (let k = 0; k < laid; k++) add(k, k, 1); // out: dwell at stop k, run section k
  for (let k = laid; k > 0; k--) add(k, k - 1, -1); // back: dwell at stop k, run section k - 1
  cache.set(key, steps);
  return steps;
}

const clampLaid = (laid: number): number => Math.min(Math.floor(laid), ROUTE.length);

/** Ticks in one round trip with `laid` sections laid (0 with none). The timetable repeats with this period. */
export function wagonCycle(laid: number, pace: WagonPace = WAGON_PACE): number {
  const n = clampLaid(laid);
  if (!(n > 0)) return 0;
  const steps = timetable(n, pace);
  const last = steps[steps.length - 1];
  return last.start + last.len;
}

/**
 * Lockstep: whether the wagon stands at `tick` (none with nothing laid, or dwelling at a stop), as wagonAt(laid, tick,
 * 0, pace) would say on the shipped line. It reads HOME_ROUTE, never a `?layout=` one (that moves only what tabs draw),
 * so the steam clock (../world/rules/wagon.ts) ticks the same on every peer and the server. Allocation-free.
 */
export function wagonStandsAt(laid: number, tick: number, pace: WagonPace = WAGON_PACE): boolean {
  const n = clampLaid(laid);
  if (!(n > 0)) return true;
  const steps = timetable(n, pace, true);
  const last = steps[steps.length - 1];
  let phase = tick % (last.start + last.len);
  if (phase < 0) phase += last.start + last.len;
  let k = 0;
  while (k < steps.length - 1 && phase >= steps[k + 1].start) k++;
  return steps[k].stop >= 0;
}

/**
 * The wagon at `tick` (integer or fractional) with `laid` sections laid, on a timetable whose cycle starts at tick `t0`
 * (default 0; ticks before t0 run the same cycle backwards in time, so the result is periodic everywhere), at `pace`
 * (default WAGON_PACE). Null with nothing laid: no wagon.
 */
export function wagonAt(laid: number, tick: number, t0 = 0, pace: WagonPace = WAGON_PACE): WagonState | null {
  const n = clampLaid(laid);
  if (!(n > 0)) return null;
  const steps = timetable(n, pace);
  const cycle = wagonCycle(n, pace);
  let phase = (tick - t0) % cycle;
  if (phase < 0) phase += cycle;
  let k = 0;
  while (k < steps.length - 1 && phase >= steps[k + 1].start) k++;
  const st = steps[k];
  const sec = sections()[st.section];

  let along = 0; // cm along the section in the run's direction
  let rate = 0; // cm per tick, >= 0
  if (st.stop < 0) {
    const t = phase - st.start;
    const a = st.accel;
    const v = st.peak;
    if (t < a) {
      along = (v * t * t) / (2 * a);
      rate = (v * t) / a;
    } else if (t <= st.len - a) {
      along = v * (t - a / 2);
      rate = v;
    } else {
      const u = st.len - t;
      along = sec.len - (v * u * u) / (2 * a);
      rate = (v * u) / a;
    }
  }
  // Fraction of the way from the section's site (a) to its far end (b); a dwell sits at the end it leaves from.
  const f = st.dir === 1 ? along / sec.len : (sec.len - along) / sec.len;
  const ex = sec.bx - sec.ax;
  const ez = sec.bz - sec.az;
  const ux = ex / (sec.len / 100);
  const uz = ez / (sec.len / 100);
  const norm = Math.sqrt(ux * ux + uz * uz); // ~1: len is rounded to the centimetre
  const fwd = (st.dir * rate * TICKS_PER_S) / sec.len; // fraction of the section per second, signed
  return {
    x: sec.ax + ex * f,
    z: sec.az + ez * f,
    dx: (st.dir * ux) / norm,
    dz: (st.dir * uz) / norm,
    vx: rate ? ex * fwd : 0, // never -0 while standing
    vz: rate ? ez * fwd : 0,
    speed: rate ? (st.dir * rate * TICKS_PER_S) / 100 : 0,
    dist: sec.at + sec.len * f,
    section: st.section,
    dir: st.dir,
    stop: st.stop,
    phase,
  };
}
