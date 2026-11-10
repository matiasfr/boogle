// Server train legs, pure in whole centimetres and 100 ms ticks. Rows change at decisions; views derive the pose.
//
// Stop on request (owner, 10 November; docs/plans/works-late-game.md, step 1): a train stops at a halt only when that
// halt has a request in its direction, at an end of its line, or at a service stop the sim decides (cargo, the footing
// wagon); otherwise it runs straight through. A leg runs from where it starts (`from`, cm along the line, at `v0` cm per
// tick) to a standstill at stop `to`, so a request made mid-run replans the leg from the train's pose that tick. It turns
// back early when the only requests lie behind it (LOOK, as lifts do); with none at all it sweeps end to end.
import { RAIL_HALTS, RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
export const TRAIN = {
  speed: 200,
  accel: 3.5,
  dwellTicks: 50,
  wakeTicks: 60,
  kitWaitTicks: 60,
} as const;
/** A line's cruise (cm a tick) and acceleration (cm a tick²); TRAIN's by default. */
export type TrainKin = { readonly speed: number; readonly accel: number };
export const TRAIN_PHASE = { STAND: 0, RUN: 1 } as const;
// v25's tables, now views of the catalog (src/sim/railway-lines.ts).
export const TRAIN_STOPS: readonly (readonly number[])[] = RAIL_LINES.map((l) => l.halts.map((h) => h.s));
const OPENS: readonly (readonly number[])[] = RAIL_LINES.map((l) => l.halts.map((h) => h.opens));
const ALL_LAID = Number.MAX_SAFE_INTEGER;
/** The stops a line serves now: the halts whose `opens` QJob slot is complete (line 2's pier once Q6 is laid; every
 * decision reads this, while the pose and legs index TRAIN_STOPS, whose first stops are the same). `laid` is how
 * many QJob slots are complete, or v25's boolean (true: every slot). */
export const trainStopsOf = (line: number, laid: number | boolean): readonly number[] => {
  const done = laid === true ? ALL_LAID : laid === false ? 0 : laid;
  return TRAIN_STOPS[line]!.filter((_s, k) => OPENS[line]![k]! < done);
};
/** The stop each train (by slot) stands at before it wakes. */
export const TRAIN_HOME: readonly number[] = RAIL_TRAINS.map((t) => t.home);
type LineHalt = { name: string; line: number; stop: number; x: number; z: number; y: number; reach: number };
/** Every halt with its platform: the id is the index (rail.call's `id`). Typed as v25's six-halt tuple, which
 * test/railway-lines.test.ts holds the catalog to; the type goes when callers read RAIL_HALTS (v26). */
export const LINE_HALTS = RAIL_HALTS.map(({ name, line, stop, platforms: [p] }) => ({
  name,
  line,
  stop,
  ...p,
})) as readonly LineHalt[] as readonly [LineHalt, LineHalt, LineHalt, LineHalt, LineHalt, LineHalt];
export type RailTrain = {
  phase: number;
  /** The stop it stands at, or last left. */
  at: number;
  /** The stop this leg ends at (standing: `at`). */
  to: number;
  /** Which way it is going: running, the leg's direction; standing, the way it leaves. */
  sweep: number;
  depart: number;
  /** Stop requests: bit `reqIndex(stop, dir)`, one per halt per direction (an end halt has one, the way out). */
  req: number;
  /** Where this leg started (cm along the line) and its speed there (cm per tick); standing, where it stands and 0. */
  from: number;
  v0: number;
  /** Where this leg ends, in cm along the line (standing: `from`). The pose reads only the row, never a stop table,
   * so a stop that moves (Ring Island's railhead, v26) never makes a running train jump. */
  dest: number;
  logs: number;
  rails: number;
  /** Line 2 only: the footing wagon is coupled, and the footings aboard it. */
  wagon: boolean;
  foot: number;
};
export function trainIdle(line: number): RailTrain {
  const at = TRAIN_HOME[line]!,
    here = TRAIN_STOPS[line]![at]!;
  return {
    phase: TRAIN_PHASE.STAND,
    at,
    to: at,
    sweep: line ? 1 : -1,
    depart: 0,
    req: 0,
    from: here,
    v0: 0,
    dest: here,
    logs: 0,
    rails: 0,
    wagon: false,
    foot: 0,
  };
}

// ---------------------------------------------------------------- one leg: from v0 to a standstill
type Profile = { v0: number; up: number; cruise: number; peak: number; dec: number; total: number; upCm: number };
function profile(dist: number, v0: number, kin: TrainKin): Profile {
  const a = kin.accel,
    top = kin.speed;
  // A save's leg too short to brake at the normal rate brakes harder: never past the stop.
  if (v0 > 0 && dist * 2 * a < v0 * v0) {
    const dec = (v0 * v0) / (2 * dist);
    return { v0, up: 0, cruise: 0, peak: v0, dec, total: v0 / dec, upCm: 0 };
  }
  const upTicks = (top - v0) / a,
    upCm = v0 * upTicks + (a * upTicks * upTicks) / 2,
    downCm = (top * top) / (2 * a);
  if (dist >= upCm + downCm) {
    const cruise = (dist - upCm - downCm) / top;
    return { v0, up: upTicks, cruise, peak: top, dec: a, total: upTicks + cruise + top / a, upCm };
  }
  // From a standstill, the old formula exactly; under way, the peak where speeding up meets braking.
  const up = v0 ? (Math.sqrt(a * dist + (v0 * v0) / 2) - v0) / a : Math.sqrt(dist / a);
  const peak = v0 + a * up;
  return { v0, up, cruise: 0, peak, dec: a, total: up + peak / a, upCm: v0 * up + (a * up * up) / 2 };
}
/** Whole ticks a leg of `dist` cm takes from `v0` cm per tick. */
export function trainLegTicks(dist: number, v0 = 0, kin: TrainKin = TRAIN) {
  if (dist <= 0) return 0;
  return Math.ceil(profile(dist, v0, kin).total);
}
/** Centimetres covered `t` ticks into a leg of `dist`: 0 at t ≤ 0, `dist` from trainLegTicks(dist, v0) on. */
export function trainLegAlong(dist: number, t: number, v0 = 0, kin: TrainKin = TRAIN) {
  if (dist <= 0 || !(t > 0)) return 0;
  const p = profile(dist, v0, kin);
  if (t >= p.total) return dist;
  let s: number;
  if (t < p.up) s = p.v0 * t + (kin.accel * t * t) / 2;
  else if (t < p.up + p.cruise) s = p.upCm + p.peak * (t - p.up);
  else {
    const left = p.total - t;
    s = dist - (p.dec * left * left) / 2;
  }
  return Math.max(0, Math.min(dist, Math.round(s)));
}
/** Speed (cm per tick) `t` ticks into the leg. */
export function trainLegSpeed(dist: number, t: number, v0 = 0, kin: TrainKin = TRAIN) {
  if (dist <= 0) return 0;
  if (!(t > 0)) return v0;
  const p = profile(dist, v0, kin);
  if (t >= p.total) return 0;
  if (t < p.up) return p.v0 + kin.accel * t;
  if (t < p.up + p.cruise) return p.peak;
  return p.dec * (p.total - t);
}

// The pose is the row's and its line's speed alone (never a stop table).
const kinOf = (line?: number): TrainKin => (line === undefined ? TRAIN : (RAIL_LINES[line] ?? TRAIN));
const legDist = (row: Readonly<RailTrain>) => Math.abs(row.dest - row.from);
/** Which way the train goes: a running leg's direction, a standing train's way out. */
export function trainDir(row: Readonly<RailTrain>) {
  if (row.phase === TRAIN_PHASE.STAND) return row.sweep;
  return row.dest >= row.from ? 1 : -1;
}
export function trainAlong(row: Readonly<RailTrain>, line: number, tick: number) {
  if (row.phase === TRAIN_PHASE.STAND) return row.from;
  return row.from + trainDir(row) * trainLegAlong(legDist(row), tick - row.depart, row.v0, kinOf(line));
}
/** Its speed at `tick` (cm per tick, unsigned). */
export function trainSpeed(row: Readonly<RailTrain>, line: number, tick: number) {
  if (row.phase === TRAIN_PHASE.STAND) return 0;
  return trainLegSpeed(legDist(row), tick - row.depart, row.v0, kinOf(line));
}
export function trainArrives(row: Readonly<RailTrain>, line?: number) {
  return row.depart + trainLegTicks(legDist(row), row.v0, kinOf(line));
}

// ---------------------------------------------------------------- requests and where the train stops next
// A request set is a plain safe integer, two binary digits a stop (stop*2 the way to stop 0, stop*2+1 the way out to
// the far end), kept with + - * / and floor rather than 32-bit bitwise operators: room for 26 stops (Ring Island's
// six-stop line 2 needs no schema change).
export const REQ_MAX_STOPS = 26;
const POW: number[] = [1];
for (let i = 1; i <= REQ_MAX_STOPS * 2; i++) POW.push(POW[i - 1]! * 2);
/** The digit for `stop` heading `dir`; an end halt (of `n` stops) has one, the way out. */
export function reqIndex(stop: number, dir: number, n: number) {
  const out = stop === 0 ? 1 : stop === n - 1 ? -1 : dir;
  return stop * 2 + (out > 0 ? 1 : 0);
}
const digit = (req: number, i: number) => Math.floor(req / POW[i]!) % 2 === 1;
/** Whether `req` asks for `stop` heading `dir`. */
export const reqHas = (req: number, stop: number, dir: number, n: number) => digit(req, reqIndex(stop, dir, n));
/** `req` with that ask added (unchanged if already there). */
export const reqAdd = (req: number, stop: number, dir: number, n: number) =>
  reqHas(req, stop, dir, n) ? req : req + POW[reqIndex(stop, dir, n)]!;
/** `req` with that ask served. */
export const reqDrop = (req: number, stop: number, dir: number, n: number) =>
  reqHas(req, stop, dir, n) ? req - POW[reqIndex(stop, dir, n)]! : req;
/** Whether `req` asks for `stop` either way. */
export const reqAt = (req: number, stop: number) => digit(req, stop * 2) || digit(req, stop * 2 + 1);
/** A well-formed set for `n` stops: a safe integer under 4^n, with no digit for an end's way in. */
export const reqValid = (req: number, n: number) =>
  Number.isSafeInteger(req) &&
  req >= 0 &&
  n <= REQ_MAX_STOPS &&
  req < POW[n * 2]! &&
  !digit(req, 0) &&
  !digit(req, (n - 1) * 2 + 1);
/** Cargo and the footing wagon's stops, decided by the sim from state (never a request). */
export type ServiceStop = (stop: number, dir: number) => boolean;
const NO_SERVICE: ServiceStop = () => false;
/** Halts strictly ahead of `s` going `dir` that a train at `v` cm per tick can still stop at, nearest first. */
function reachable(stops: readonly number[], s: number, v: number, dir: number, kin: TrainKin) {
  const brake = (v * v) / (2 * kin.accel);
  const out: number[] = [];
  for (let n = 0; n < stops.length; n++) {
    const k = dir > 0 ? n : stops.length - 1 - n;
    const d = (stops[k]! - s) * dir;
    if (d > 0 && d >= brake) out.push(k);
  }
  return out;
}
/** The stop a train at `s` (cm), `v` (cm per tick), going `dir` makes next, or -1 if it can stop nowhere ahead:
 * the nearest halt asked for in its direction (or a service stop); else the farthest halt ahead asked for the other
 * way, or (while anything is asked) owed a service that way: it turns there, so an ask never turns it back short of an
 * errand the sim still owes ahead; else, with requests only behind it, the next halt (it turns back early); else its
 * end (nothing asked anywhere: it runs the whole line). */
export function trainNextStop(
  stops: readonly number[],
  s: number,
  v: number,
  dir: number,
  req: number,
  service: ServiceStop = NO_SERVICE,
  kin: TrainKin = TRAIN,
) {
  const n = stops.length,
    end = dir > 0 ? n - 1 : 0;
  const ahead = reachable(stops, s, v, dir, kin);
  if (!ahead.length) return -1;
  for (const k of ahead) if ((k !== end && reqHas(req, k, dir, n)) || service(k, dir)) return k;
  let far = -1;
  for (const k of ahead) if (reqHas(req, k, -dir, n) || (req && service(k, -dir))) far = k;
  if (far >= 0) return far;
  for (let k = 0; k < n; k++) if (!ahead.includes(k) && reqAt(req, k)) return ahead[0]!;
  return ahead[ahead.length - 1]!;
}
/** Whether anything lies beyond stop `k` going `dir`: a request either way, or a service stop that way. */
function reasonBeyond(n: number, k: number, dir: number, req: number, service: ServiceStop) {
  for (let j = k + dir; j >= 0 && j < n; j += dir) if (reqAt(req, j) || service(j, dir)) return true;
  return false;
}
/** The way a train standing at stop `k` leaves: out from an end; on the way it was going while someone here or
 * anything ahead wants it; back for someone here or behind; else on (nothing asked anywhere: it sweeps). */
export function trainWayOut(n: number, k: number, sweep: number, req: number, service: ServiceStop = NO_SERVICE) {
  if (k === 0) return 1;
  if (k === n - 1) return -1;
  if (reqHas(req, k, sweep, n) || reasonBeyond(n, k, sweep, req, service)) return sweep;
  if (req) return -sweep;
  return sweep;
}
/** What a passenger's request would ask for now: the first halt ahead the train can still stop at, heading its way.
 * Null when that halt is the line's end (it stops there anyway); `requested` when it already stops there. */
export function trainRequestable(row: Readonly<RailTrain>, line: number, n: number, tick: number) {
  const stops = TRAIN_STOPS[line]!.slice(0, n);
  const dir = trainDir(row);
  const next = reachable(stops, trainAlong(row, line, tick), trainSpeed(row, line, tick), dir, kinOf(line))[0];
  if (next === undefined || next === 0 || next === n - 1) return null;
  const requested = reqHas(row.req, next, dir, n) || (row.phase === TRAIN_PHASE.RUN && row.to === next);
  return { stop: next, dir, requested };
}
