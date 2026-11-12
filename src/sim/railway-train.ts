// Server train legs, pure in whole centimetres and 100 ms ticks. Rows change at decisions; views derive the pose.
//
// Stop on request (owner, 10 November; docs/plans/works-late-game.md, step 1): a train stops at a halt only when that
// halt has a request in its direction, at an end of its line, or at a service stop the sim decides (cargo, the footing
// wagon); otherwise it runs straight through. A leg runs from where it starts (`from`, cm along the line, at `v0` cm per
// tick) to a standstill at stop `to`, so a request made mid-run replans the leg from the train's pose that tick. Since
// v26 (docs/plans/generic-lines.md) each line is double track, one direction a track: a train runs end to end on its
// `track` and turns back only at an end; spacing, holds and who serves a lever ask are ./railway-trains.ts.
import {
  RAIL_HALTS,
  RAIL_LINES,
  RAIL_TRAINS,
  lineDef,
  trainPassesBy,
  trainPlaces,
  type LineRef,
} from './railway-lines.ts';
export { trainPassesBy };
export const TRAIN = {
  speed: 200,
  accel: 3.5,
  dwellTicks: 50,
  wakeTicks: 60,
  kitWaitTicks: 60,
  /** The block rule's gap round the circuit (27.4 m, set as the footing wagon's tail, RIDER_SPAN, plus 20 m). Since
   * v30's 8.2 m extent ahead of the pose (TRAIN_EXTENT), the nose-to-tail clearance at this floor is 10.2 m (R3 review). */
  sepCm: 2740,
} as const;
/** A train's cruise (cm a tick) by the boiler it wears (`Train.boiler`; ring-island-build2, R3): the standard boiler
 * (its line's own speed, 20 m/s) and the longer one (25 m/s, line 2's install). Row 0 is never read for a speed: a
 * train on the standard boiler runs at its line's, so every v27 leg is bit for bit (test/railway-install.test.ts). */
export const BOILER_SPEED = [200, 250] as const;
/** The last boiler row. */
export const BOILER_MAX = BOILER_SPEED.length - 1;
/** A line's cruise (cm a tick) and acceleration (cm a tick²); TRAIN's by default. `brake` (cm a tick²), when set, is
 * the leg's braking rate instead of `accel` (a halt's eased end stop: stopKin). */
export type TrainKin = { readonly speed: number; readonly accel: number; readonly brake?: number };
/** The rate a leg brakes at. */
const brakeOf = (kin: TrainKin) => kin.brake ?? kin.accel;
export const TRAIN_PHASE = { STAND: 0, RUN: 1 } as const;
// v25's tables, now views of the catalog (src/sim/railway-lines.ts).
export const TRAIN_STOPS: readonly (readonly number[])[] = RAIL_LINES.map((l) => l.halts.map((h) => h.s));
/** v26's boolean `laid`: true is "Q6 is laid" (its six slots complete), which opens the pier. */
const Q6_LAID = 6;
/** Ring Island's state as the stops read it (R3b's `ringOpen`): the railhead's bent past bent 6 (`RailHalt.heads`'s
 * index) and whether the rivet is struck (a `ring` halt opens). */
export type RingOpen = { readonly head: number; readonly joined: boolean };
const RING_SHUT: RingOpen = { head: 0, joined: false };
/** The stops a line serves now: the halts whose `opens` QJob slot is complete and, for a `ring` halt, the rivet
 * struck; a `heads` halt's stop is `heads[ring.head]` (every decision reads this, while the pose reads only the row).
 * Open stops are a prefix of the halts (endBlocks reads the last's end). `laid` is how many QJob slots are complete,
 * or v26's boolean (true: Q6 is laid). */
export const trainStopsOf = (line: LineRef, laid: number | boolean, ring: RingOpen = RING_SHUT): readonly number[] => {
  const done = laid === true ? Q6_LAID : laid === false ? 0 : laid;
  const out: number[] = [];
  for (const h of lineDef(line).halts)
    if (h.opens < done && (!h.ring || ring.joined)) out.push(h.heads ? h.heads[ring.head]! : h.s);
  return out;
};
/** Every stage a line's stops can reach (each `opens` slot laid in turn, each head, the rivet). */
export function lineStages(line: LineRef): (readonly number[])[] {
  const halts = lineDef(line).halts,
    top = Math.max(0, ...halts.map((h) => h.opens + 1)),
    heads = Math.max(1, ...halts.map((h) => h.heads?.length ?? 1));
  const out: (readonly number[])[] = [];
  for (let laid = 0; laid <= top; laid++)
    for (let head = 0; head < heads; head++)
      for (const joined of [false, true]) out.push(trainStopsOf(line, laid, { head, joined }));
  return out;
}
// The catalog is refused at load if any line's trains could not all be placed at a stage they wake at (trainPlaces
// throws rather than stack two), so the wake (rail.boilerFit) never meets it in a room. Note: this runs when the module
// is imported, so a bad catalog row throws at the first import of railway-train.ts (server start, page load, any
// test), not inside a rule; a fixture line (a test's RailLineDef) is never checked here and is placed when its test
// calls trainPlaces.
RAIL_LINES.forEach((_l, line) => lineStages(line).forEach((stops) => trainPlaces(line, stops)));
/** The stop each train (by slot) stands at before it wakes. */
export const TRAIN_HOME: readonly number[] = RAIL_TRAINS.map((t) => t.home);
/** The track each train (by slot) stands on before it wakes. */
export const TRAIN_HOME_TRACK: readonly number[] = RAIL_TRAINS.map((t) => t.track);
type LineHalt = { name: string; line: number; stop: number; x: number; z: number; y: number; reach: number };
/** Every halt with v25's one platform, today's (the down track's): the id is the index (rail.call's `id`). Typed as
 * v27's eight-halt tuple (v25's six, then the Railhead and Ring Island), which test/railway-lines.test.ts holds the
 * catalog to; the type goes when callers read RAIL_HALTS (v26 step 4b). The Railhead's here is its first head's
 * (haltPlatform reads the current one). */
export const LINE_HALTS = RAIL_HALTS.map(({ name, line, stop, platforms: [, p] }) => ({
  name,
  line,
  stop,
  ...p,
})) as readonly LineHalt[] as readonly [LineHalt, LineHalt, LineHalt, LineHalt, LineHalt, LineHalt, LineHalt, LineHalt];
export type RailTrain = {
  phase: number;
  /** The stop it stands at, or last left; -1 a signal (no halt). */
  at: number;
  /** The stop this leg ends at (standing: `at`); -1 a signal. */
  to: number;
  /** 0 up (+s, away from Home), 1 down: the way it runs; standing at an end, the track it leaves on. */
  track: number;
  depart: number;
  /** Its riders' stop requests: digit `reqIndex(stop, dir)`, middle halts its way only. The halts' lever asks are
   * the line's (`Line.req`, railway-components.ts). */
  req: number;
  /** Where this leg started (cm along the line) and its speed there (cm per tick); standing, where it stands and 0. */
  from: number;
  v0: number;
  /** Where this leg ends, in cm along the line (standing: `from`). The pose reads only the row, never a stop table,
   * so a stop that moves (Ring Island's railhead, v26) never makes a running train jump. */
  dest: number;
  /** Running on track 0 to `to`, it turns back there though that halt is no longer an open end: it was on the end's
   * crossover when the line was extended past it (Far Head's, as Q6 opens the pier), so it has already crossed. */
  turn: boolean;
  logs: number;
  rails: number;
  /** Line 2 only, one train at most: the footing wagon is coupled, and the footings aboard it. */
  wagon: boolean;
  foot: number;
  /** The tick it last came to a stand (v27): the balanced hold's cap runs from here, so a lever ask, which restarts
   * `depart` (the dwell), never restarts the cap. At most `depart`. */
  arrived: number;
  /** The boiler it wears (v28; BOILER_SPEED's row): its cruise. Absent reads 0 (a fixture line's row). */
  boiler?: number;
};
/** Train `slot` standing at its home, asleep. */
export function trainIdle(slot: number): RailTrain {
  const at = TRAIN_HOME[slot]!,
    here = TRAIN_STOPS[RAIL_TRAINS[slot]!.line]![at]!;
  return {
    phase: TRAIN_PHASE.STAND,
    at,
    to: at,
    track: TRAIN_HOME_TRACK[slot]!,
    depart: 0,
    req: 0,
    from: here,
    v0: 0,
    dest: here,
    turn: false,
    logs: 0,
    rails: 0,
    wagon: false,
    foot: 0,
    arrived: 0,
  };
}

// ---------------------------------------------------------------- one leg: from v0 to a standstill
type Profile = { v0: number; up: number; cruise: number; peak: number; dec: number; total: number; upCm: number };
function profile(dist: number, v0: number, kin: TrainKin): Profile {
  const a = kin.accel,
    top = kin.speed,
    b = brakeOf(kin);
  // An eased stop: speeding up at `a`, braking at `b`. With `b === a` the three branches below run untouched, so v26's
  // legs stay bit for bit (test/railway-train.test.ts).
  if (b !== a) return eased(dist, v0, a, b, top);
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
/** profile's three branches with braking at `b` (not `a`): the peak where speeding up at `a` from `v0` meets braking
 * at `b` solves (p² - v0²) / 2a + p² / 2b = dist. */
function eased(dist: number, v0: number, a: number, b: number, top: number): Profile {
  if (v0 > 0 && dist * 2 * b < v0 * v0) {
    const dec = (v0 * v0) / (2 * dist);
    return { v0, up: 0, cruise: 0, peak: v0, dec, total: v0 / dec, upCm: 0 };
  }
  const upTicks = (top - v0) / a,
    upCm = v0 * upTicks + (a * upTicks * upTicks) / 2,
    downCm = (top * top) / (2 * b);
  if (dist >= upCm + downCm) {
    const cruise = (dist - upCm - downCm) / top;
    return { v0, up: upTicks, cruise, peak: top, dec: b, total: upTicks + cruise + top / b, upCm };
  }
  const peak = Math.sqrt((2 * a * b * dist + b * v0 * v0) / (a + b)),
    up = (peak - v0) / a;
  return { v0, up, cruise: 0, peak, dec: b, total: up + peak / b, upCm: v0 * up + (a * up * up) / 2 };
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

/** A train's cruise on `line` wearing `boiler`: the line's own on the standard boiler, else BOILER_SPEED's. */
export const boilerSpeed = (line: LineRef, boiler = 0) => (boiler > 0 ? BOILER_SPEED[boiler]! : lineDef(line).speed);
/** The kin a train wearing `boiler` runs at on `line` (its line's own object on the standard boiler). */
export function boilerKin(line: LineRef, boiler = 0): TrainKin {
  const l = lineDef(line);
  return boiler > 0 ? { speed: boilerSpeed(line, boiler), accel: l.accel } : l;
}
/** The kin a leg to halt `to` (-1 a signal) on `track` runs at, wearing `boiler`: its line's (the boiler's cruise),
 * braking at the halt's `brake` when it ends there going up (track 0). With `boiler` 0 it is v27's, unchanged. */
export function stopKin(line: LineRef, to: number, track: number, boiler = 0): TrainKin {
  const l = boilerKin(line, boiler),
    brake = track === 0 && to >= 0 ? lineDef(line).halts[to]?.brake : undefined;
  return brake === undefined ? l : { speed: l.speed, accel: l.accel, brake };
}
// The pose is the row's (its `to` and `track` pick the braking rate, its `boiler` the cruise) and its line's kin alone
// (never a stop table).
const kinOf = (row: Readonly<RailTrain>, line?: LineRef): TrainKin =>
  line === undefined
    ? TRAIN
    : typeof line === 'number' && !RAIL_LINES[line]
      ? TRAIN
      : stopKin(line, row.to, row.track, row.boiler ?? 0);
const legDist = (row: Readonly<RailTrain>) => Math.abs(row.dest - row.from);
/** Which way the train goes: its track's (+1 up, -1 down). */
export const trainDir = (row: Readonly<{ track: number }>) => (row.track ? -1 : 1);
export function trainAlong(row: Readonly<RailTrain>, line: LineRef, tick: number) {
  if (row.phase === TRAIN_PHASE.STAND) return row.from;
  return row.from + trainDir(row) * trainLegAlong(legDist(row), tick - row.depart, row.v0, kinOf(row, line));
}
/** Its speed at `tick` (cm per tick, unsigned). */
export function trainSpeed(row: Readonly<RailTrain>, line: LineRef, tick: number) {
  if (row.phase === TRAIN_PHASE.STAND) return 0;
  return trainLegSpeed(legDist(row), tick - row.depart, row.v0, kinOf(row, line));
}
export function trainArrives(row: Readonly<RailTrain>, line?: LineRef) {
  return row.depart + trainLegTicks(legDist(row), row.v0, kinOf(row, line));
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
/** A kin for every stop (a line's halts may brake at their own rate: stopKin), or one for all. */
export type StopKin = TrainKin | ((stop: number) => TrainKin);
const kinAt = (kin: StopKin, k: number) => (typeof kin === 'function' ? kin(k) : kin);
/** Halts strictly ahead of `s` going `dir` that a train at `v` cm per tick can still stop at (each at its own braking
 * rate), nearest first. */
function reachable(stops: readonly number[], s: number, v: number, dir: number, kin: StopKin) {
  const out: number[] = [];
  for (let n = 0; n < stops.length; n++) {
    const k = dir > 0 ? n : stops.length - 1 - n;
    const d = (stops[k]! - s) * dir;
    if (d > 0 && d >= (v * v) / (2 * brakeOf(kinAt(kin, k)))) out.push(k);
  }
  return out;
}
/** The halt a train at `s` (cm), `v` (cm per tick), on the track going `dir` makes next, or -1 if it can stop
 * nowhere ahead: the nearest halt it can still brake for that has a reason (`reasons`: an ask it serves, or a service
 * stop), else its track's end. A track runs one way, so it never turns back mid-line (v25's LOOK went in v26). */
export function trainNextStop(
  stops: readonly number[],
  s: number,
  v: number,
  dir: number,
  reasons: ServiceStop = NO_SERVICE,
  kin: StopKin = TRAIN,
) {
  const ahead = reachable(stops, s, v, dir, kin);
  for (const k of ahead) if (reasons(k, dir)) return k;
  return ahead.length ? ahead[ahead.length - 1]! : -1;
}
/** Whether a train at `s` going `dir` at `v` can still brake to a standstill at `at` (strictly ahead). */
export function trainCanBrake(s: number, v: number, dir: number, at: number, kin: TrainKin = TRAIN) {
  const d = (at - s) * dir;
  return d > 0 && d >= (v * v) / (2 * brakeOf(kin));
}
/** `req` with only the asks heading `dir` kept (a train turning back at an end drops its riders' asks the other way,
 * which it could no longer serve). */
export function reqOnly(req: number, n: number, dir: number) {
  let out = req;
  for (let k = 0; k < n; k++) if (reqIndex(k, -dir, n) !== reqIndex(k, dir, n)) out = reqDrop(out, k, -dir, n);
  return out;
}
/** v26's count form of the open stops, the first `n` halts', read as trainStopsOf would: a `heads` halt at its last
 * head. That is its stop whenever it is a middle halt (the rivet opens the island only once the railhead has reached
 * its last bent), and while it is the end any head gives the same offer (the end is never offered). */
function countStops(line: LineRef, n: number) {
  return lineDef(line)
    .halts.slice(0, n)
    .map((h) => (h.heads ? h.heads[h.heads.length - 1]! : h.s));
}
/** What a passenger's request would ask for now: the first halt ahead the train can still stop at, heading its way.
 * Null when that halt is the line's end (it stops there anyway); `requested` when it already stops there. A halt that
 * refuses its way (trainPassesBy: the homeward-only Pier for an up train) is skipped, so the next one is offered.
 * `open` is the line's open stops (trainStopsOf), or v26's count of them (countStops: the same offer). */
export function trainRequestable(
  row: Readonly<RailTrain>,
  line: LineRef,
  open: number | readonly number[],
  tick: number,
) {
  const stops = typeof open === 'number' ? countStops(line, open) : open,
    n = stops.length;
  const dir = trainDir(row);
  const next = reachable(stops, trainAlong(row, line, tick), trainSpeed(row, line, tick), dir, (k) =>
    stopKin(line, k, row.track),
  ).find((k) => !trainPassesBy(line, k, dir, n));
  if (next === undefined || next === 0 || next === n - 1) return null;
  const requested = reqHas(row.req, next, dir, n) || (row.phase === TRAIN_PHASE.RUN && row.to === next);
  return { stop: next, dir, requested };
}
