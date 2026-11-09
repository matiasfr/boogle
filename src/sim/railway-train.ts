// Server train legs, pure in whole centimetres and 100 ms ticks. Rows change at decisions; views derive the pose.
import { PIER_STOP_CM } from './railway-works-layout.ts';
export const TRAIN = {
  speed: 200,
  accel: 3.5,
  dwellTicks: 50,
  callDwellTicks: 15,
  wakeTicks: 60,
  kitWaitTicks: 60,
} as const;
export const TRAIN_PHASE = { STAND: 0, RUN: 1 } as const;
export const TRAIN_STOPS: readonly (readonly number[])[] = [
  [1400, 20700],
  [1700, 17400, 52400, PIER_STOP_CM],
];
/** The stops a line serves now: line 2's fourth, the pier, opens once Q6 is laid (every decision reads this; the
 * pose and legs index TRAIN_STOPS, whose first stops are the same). */
const BEFORE_PIER = TRAIN_STOPS[1]!.slice(0, 3);
export const trainStopsOf = (line: number, pier: boolean): readonly number[] =>
  line === 1 && !pier ? BEFORE_PIER : TRAIN_STOPS[line]!;
export const TRAIN_HOME = [1, 0] as const;
export const LINE_HALTS = [
  { name: 'Village', line: 0, stop: 0, x: 92819, z: -434, y: 1902, reach: 1260 },
  { name: 'Camp', line: 0, stop: 1, x: 100964, z: -14610, y: 3102, reach: 1360 },
  { name: 'Village, line 2', line: 1, stop: 0, x: 92779, z: 2617, y: 1902, reach: 1260 },
  { name: 'Quarry', line: 1, stop: 1, x: 108132, z: 4114, y: 2502, reach: 1160 },
  { name: 'Far Head', line: 1, stop: 2, x: 136361, z: -16353, y: 2502, reach: 1260 },
  // Place's halt maths at s 719-741 m, lat -2.9 (the side of the pier rack); open once Q6 is laid.
  { name: 'Pier', line: 1, stop: 3, x: 139969, z: -35833, y: 2502, reach: 1260 },
] as const;
export type RailTrain = {
  phase: number;
  at: number;
  to: number;
  sweep: number;
  depart: number;
  call: number;
  logs: number;
  rails: number;
  /** Line 2 only: the footing wagon is coupled, and the footings aboard it. */
  wagon: boolean;
  foot: number;
};
export function trainIdle(line: number): RailTrain {
  return {
    phase: TRAIN_PHASE.STAND,
    at: TRAIN_HOME[line]!,
    to: TRAIN_HOME[line]!,
    sweep: line ? 1 : -1,
    depart: 0,
    call: -1,
    logs: 0,
    rails: 0,
    wagon: false,
    foot: 0,
  };
}
function profile(dist: number) {
  const accelTicks = TRAIN.speed / TRAIN.accel;
  const accelCm = (TRAIN.accel * accelTicks * accelTicks) / 2;
  if (dist >= 2 * accelCm) return { up: accelTicks, cruise: (dist - 2 * accelCm) / TRAIN.speed };
  return { up: Math.sqrt(dist / TRAIN.accel), cruise: 0 };
}
/** Whole ticks a leg of `dist` cm takes. */
export function trainLegTicks(dist: number) {
  if (dist <= 0) return 0;
  const p = profile(dist);
  return Math.ceil(2 * p.up + p.cruise);
}
/** Centimetres covered `t` ticks into a leg of `dist`: 0 at t ≤ 0, `dist` from trainLegTicks(dist) on. */
export function trainLegAlong(dist: number, t: number) {
  if (dist <= 0 || !(t > 0)) return 0;
  const { up, cruise } = profile(dist);
  const total = 2 * up + cruise;
  if (t >= total) return dist;
  const a = TRAIN.accel,
    peak = a * up;
  let s: number;
  if (t < up) s = (a * t * t) / 2;
  else if (t < up + cruise) s = (a * up * up) / 2 + peak * (t - up);
  else {
    const left = total - t;
    s = dist - (a * left * left) / 2;
  }
  return Math.max(0, Math.min(dist, Math.round(s)));
}

export function trainAlong(row: Readonly<RailTrain>, line: number, tick: number) {
  const stops = TRAIN_STOPS[line]!,
    from = stops[row.at]!,
    to = stops[row.to]!;
  if (row.phase === TRAIN_PHASE.STAND) return from;
  return from + (to >= from ? 1 : -1) * trainLegAlong(Math.abs(to - from), tick - row.depart);
}
export function trainArrives(row: Readonly<RailTrain>, line: number) {
  const stops = TRAIN_STOPS[line]!;
  return row.depart + trainLegTicks(Math.abs(stops[row.to]! - stops[row.at]!));
}
/** Pending calls take effect at the next stop decision. A standing call uses the short dwell, never skips wake. */
export function trainEtaTicks(row: Readonly<RailTrain>, line: number, stop: number, tick: number) {
  const stops = TRAIN_STOPS[line]!;
  const leg = (a: number, b: number) => trainLegTicks(Math.abs(stops[b]! - stops[a]!));
  if (row.phase === TRAIN_PHASE.STAND) {
    if (row.at === stop) return 0;
    return Math.max(0, row.depart + TRAIN.callDwellTicks - tick) + leg(row.at, stop);
  }
  const left = Math.max(0, trainArrives(row, line) - tick);
  return row.to === stop ? left : left + TRAIN.callDwellTicks + leg(row.to, stop);
}
