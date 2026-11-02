// The crossing's line (?proto=crossing): a gentle S over open sea, from a station off home's south-east shore due south
// to the far stop, as a table of points a fixed arc length apart. `s` is metres along it from the home end, and it is
// straight past either end. The section across it has its `lateral` axis pointing to the walkway side (west at home).
import { CROSSING, TIMETABLE } from './tuning.ts';
import { smoothstep } from '../../math.ts';

export const LOW = 3.2; // m of rail height over the sea at both stations
export const WALK = { in: 1.2, out: 3, up: 0.7 }; // the walkway: lateral from, lateral to, height over the rails (a flatbed's deck)
export const ORIGIN = { x: 52, z: -12 };
const STRAIGHT = 70; // m at each end with no swing or climb, for the stations
const STEP = 2;

// Where the line is at fraction u of the way along its straight axis, for a straight length `span`.
const sway = (u: number, span: number) => {
  const m = STRAIGHT / span;
  return CROSSING.swing * Math.sin(u * Math.PI * 2) * smoothstep(0, m * 2, u) * smoothstep(0, m * 2, 1 - u);
};
const arc = (span: number) => {
  let d = 0,
    px = sway(0, span);
  for (let k = 1; k <= 2000; k++) {
    const x = sway(k / 2000, span);
    d += Math.hypot(x - px, span / 2000);
    px = x;
  }
  return d;
};
// The straight span that makes the line itself `length` metres long.
let span = CROSSING.length;
for (let n = 0; n < 3; n++) span *= CROSSING.length / arc(span);

export const LENGTH = CROSSING.length;
const N = Math.ceil(LENGTH / STEP) + 1;
const xs = new Float64Array(N),
  zs = new Float64Array(N);
{
  // Walk the curve in small steps, writing a point every STEP metres of arc.
  let d = 0,
    px = sway(0, span),
    pz = 0,
    k = 1;
  xs[0] = ORIGIN.x + px;
  zs[0] = ORIGIN.z;
  for (let m = 1; m <= 40000 && k < N; m++) {
    const u = m / 40000;
    const x = sway(u, span),
      z = u * span;
    const seg = Math.hypot(x - px, z - pz);
    // the exact point on this small step where the arc reaches the next table entry: even speed along the table
    while (k < N && d + seg >= k * STEP) {
      const t = (k * STEP - d) / seg;
      xs[k] = ORIGIN.x + px + (x - px) * t;
      zs[k] = ORIGIN.z + pz + (z - pz) * t;
      k++;
    }
    d += seg;
    px = x;
    pz = z;
  }
  for (; k < N; k++) {
    xs[k] = xs[k - 1]!;
    zs[k] = zs[k - 1]! + STEP;
  }
}

export type LinePoint = { x: number; z: number; ux: number; uz: number };
/** Where `s` is, with the unit direction the line runs there. */
export function lineAt(s: number, out: LinePoint) {
  const f = Math.max(0, Math.min(N - 1.001, s / STEP)),
    k = Math.floor(f),
    t = f - k;
  let dx = xs[k + 1]! - xs[k]!,
    dz = zs[k + 1]! - zs[k]!;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  const past = s - (k + t) * STEP; // off the end: carry on straight
  out.x = xs[k]! + (xs[k + 1]! - xs[k]!) * t + dx * past;
  out.z = zs[k]! + (zs[k + 1]! - zs[k]!) * t + dz * past;
  out.ux = dx;
  out.uz = dz;
  return out;
}
/** The rails' height at `s`: low at the shore, rising to mid-span. */
export function railY(s: number) {
  const end = Math.min(s, LENGTH - s);
  return LOW + (CROSSING.rise - LOW) * smoothstep(STRAIGHT, STRAIGHT + CROSSING.ramp, end);
}
/** The `s` of the point on the line nearest (x, z), to about 10 m. */
export function nearestS(x: number, z: number) {
  let best = 0,
    bd = Infinity;
  for (let k = 0; k < N; k += 5) {
    const dx = xs[k]! - x,
      dz = zs[k]! - z,
      d = dx * dx + dz * dz;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best * STEP;
}

// ---------------------------------------------------------------- the timetable: pure in seconds
const { dwell, stopIn } = TIMETABLE;
const { speed, accel } = CROSSING;
export const STOP_A = stopIn,
  STOP_B = LENGTH - stopIn;
const RUN_LEN = STOP_B - STOP_A,
  RUN_S = RUN_LEN / speed + speed / accel;
const CYCLE = 2 * (dwell + RUN_S);
/** One run's time, station to station, speeding up and braking included. */
export const RUN_SECONDS = RUN_S;

export type TrainState = { s: number; v: number; stop: -1 | 0 | 1 };
const along = (t: number) => {
  const ta = speed / accel;
  if (t < ta) return 0.5 * accel * t * t;
  if (t < RUN_S - ta) return speed * (t - ta / 2);
  const r = RUN_S - t;
  return RUN_LEN - 0.5 * accel * r * r;
};
const speedAt = (t: number) => Math.min(speed, accel * t, accel * (RUN_S - t));
/** The train at time `t` on the timetable: t = 0 is when it pulls into the home station. */
export function trainAt(t: number, out: TrainState) {
  const c = ((t % CYCLE) + CYCLE) % CYCLE;
  if (c < dwell) return (void Object.assign(out, { s: STOP_A, v: 0, stop: 0 }), out);
  if (c < dwell + RUN_S) {
    out.s = STOP_A + along(c - dwell);
    out.v = speedAt(c - dwell);
    out.stop = -1;
  } else if (c < 2 * dwell + RUN_S) {
    out.s = STOP_B;
    out.v = 0;
    out.stop = 1;
  } else {
    const r = c - 2 * dwell - RUN_S;
    out.s = STOP_B - along(r);
    out.v = -speedAt(r);
    out.stop = -1;
  }
  return out;
}
/** The time on the timetable when the outbound train is at `s`. */
export function timeAtS(s: number) {
  let lo = 0,
    hi = RUN_S;
  for (let n = 0; n < 40; n++) {
    const m = (lo + hi) / 2;
    if (STOP_A + along(m) < s) lo = m;
    else hi = m;
  }
  return dwell + lo;
}
