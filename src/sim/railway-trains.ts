// Several trains on a line (docs/plans/generic-lines.md, "The state shape" 3-8; v26): the circuit, the end blocks and
// their signals, the block rule, the headway hold at the ends, who serves a lever ask, and the per-line step. Pure, in
// whole cm and ticks over the rows (a `Rows` getter by slot), so the server's systems and a client's mirror read the
// same rules; railway-sys-trains.ts supplies the world's side (cargo, the wagon, the cart) through `TrainIO`.
//
//   circuitCm, circuitLen         (./railway-lines.ts) one number round a line, for ordering and spacing only
//   endBlocks(line, stops)        the two open ends' blocks (turnout to end stop, both tracks) and their signals
//   cycleTicks, headTicks         the non-stop round trip; the least gap between two departures from an end (both
//                                 by the leaving train's boiler, v28)
//   blockFree(...)                whether a train may plan a leg to `dest` now: the block rule and the end blocks
//   trainServes(...)              the train a lever ask (halt, way) is for: the nearest that way that can still brake
//   planLeg(...)                  the leg a train plans from a pose: its next reason, or the farthest hold short of it
//   balancedHold(...)             a line with `balance`: an end holds a train while the gap ahead is the shorter
//   trainStepLine(io, line, tick) one line's trains for a tick: arrivals, turn-backs, holds, departures and replans
//   endMoved(io, line, last, tick) the line runs on past its old end `last` (Q6, Q7, the rivet)
//   stopMoved(io, line, k, tick)  halt k's stop moved on (the railhead's next bent)
//   trainSpacing(rows, ...)       the spacing invariants at a tick (tests sample it); lineSpacing for one line
//   servingSlots(rows, line)      a line's trains in service (the greybox route's fleet rows wait in the shed)
//   fleetJoin(io, line, tick)     a shed train joins at the line's first halt once its stage runs one more (step 3)
//
// Every `line` is a LineRef: a catalog index, or a test's fixture line (./railway-lines.ts).
import {
  RAIL_LINES,
  RAIL_TRAINS,
  TRAIN_EXTENT,
  balanceOk,
  circuitAhead,
  circuitCm,
  circuitLen,
  lineDef,
  lineIndex,
  type LineRef,
} from './railway-lines.ts';
import {
  BOILER_MAX,
  TRAIN,
  TRAIN_PHASE,
  boilerKin,
  boilerSpeed,
  reqAdd,
  reqAt,
  reqDrop,
  reqHas,
  reqOnly,
  reqValid,
  stopKin,
  trainAlong,
  trainArrives,
  trainCanBrake,
  trainLegTicks,
  trainNextStop,
  trainPassesBy,
  trainSpeed,
  type RailTrain,
  type ServiceStop,
} from './railway-train.ts';

/** A line's shared row (the `line` component): its halts' lever asks, and when a train last left each end. */
export type RailLineRow = { req: number; left0: number; left1: number };
/** The headway hold's default share of an even split, in percent (the room tunable railTrainHeadPct). */
export const TRAIN_HEAD_PCT = 75;
/** Train rows by slot. */
export type Rows = (slot: number) => Readonly<RailTrain>;
/** Each line's train slots, in slot order. */
export const LINE_SLOTS: readonly (readonly number[])[] = RAIL_LINES.map((_l, line) =>
  RAIL_TRAINS.flatMap((t, slot) => (t.line === line ? [slot] : [])),
);
/** A line's train slots: LINE_SLOTS for a catalog line, 0 to `trains - 1` for a fixture line. */
export function lineSlots(line: LineRef): readonly number[] {
  const k = lineIndex(line);
  return k >= 0 ? LINE_SLOTS[k]! : Array.from({ length: lineDef(line).trains }, (_v, j) => j);
}
/** A line's slots in service now, in slot order: its rows not in the shed (TRAIN_PHASE.SHED; the greybox route's fleet
 * rows, step 3). A line with no fleet has none in the shed, so this is lineSlots. Every rule that reads the other
 * trains of a line (the block rule, service, the holds, the spacing) reads these. */
export function servingSlots(rows: Rows, line: LineRef): readonly number[] {
  const all = lineSlots(line);
  return lineDef(line).fleet ? all.filter((k) => rows(k).phase !== TRAIN_PHASE.SHED) : all;
}

// ---------------------------------------------------------------- the ends
/** One open end's block, both tracks from `from` to `to` (cm along the line: from a stub's turnout's far side, or a
 * crossover's start, to the end stop), the halt it ends at (its index in the open stops), the way into it, and where a
 * train that can't enter waits: its signal (`RailEnd.signalCm`), a stop with no halt on the inbound track, never
 * nearer the end stop than `TRAIN.sepCm`. A train is in it while any of it is (`TRAIN_EXTENT`). The far end's block
 * and signal move with its stop (a `heads` halt's: by `stops[last] - halts[last].s`, 0 for a fixed halt). */
export type EndBlock = { from: number; to: number; stop: number; dir: number; signal: number };
export function endBlocks(line: LineRef, stops: readonly number[]): readonly [EndBlock, EndBlock] {
  const halts = lineDef(line).halts,
    last = stops.length - 1;
  const a = halts[0]!.end,
    b = halts[last]!.end;
  if (!a || !b)
    throw new Error(`railway: line ${typeof line === 'number' ? line : line.id} has no end at halt 0 or ${last}`);
  const s0 = stops[0]!,
    s1 = stops[last]!,
    shift = s1 - halts[last]!.s;
  return [
    { from: s0, to: a.edgeCm, stop: 0, dir: -1, signal: Math.max(a.signalCm, s0 + TRAIN.sepCm) },
    { from: b.edgeCm + shift, to: s1, stop: last, dir: 1, signal: Math.min(b.signalCm + shift, s1 - TRAIN.sepCm) },
  ];
}
/** Whether a train with its along at `s` reaches into block `b`. */
const within = (b: EndBlock, s: number) => s - TRAIN_EXTENT.behindCm < b.to && s + TRAIN_EXTENT.aheadCm > b.from;
/** Whether a halt is one of the open ends (its track turns there). */
export const atEnd = (stop: number, stops: readonly number[]) => stop === 0 || stop === stops.length - 1;

// ---------------------------------------------------------------- the headway
/** The non-stop round trip between the open ends, two dwells included, for a train wearing `boiler` (v28). */
export function cycleTicks(line: LineRef, stops: readonly number[], boiler = 0) {
  return 2 * trainLegTicks(stops[stops.length - 1]! - stops[0]!, 0, boilerKin(line, boiler)) + 2 * TRAIN.dwellTicks;
}
/** The least gap between two trains leaving the same end: `headPct` of an even split, over `n` trains (those in
 * service; `trains` by default), of the round trip of the train leaving (its `boiler`); none with one train. */
export function headTicks(
  line: LineRef,
  stops: readonly number[],
  headPct = TRAIN_HEAD_PCT,
  boiler = 0,
  n = lineDef(line).trains,
) {
  return n < 2 ? 0 : Math.floor((cycleTicks(line, stops, boiler) * headPct) / (100 * n));
}

// ---------------------------------------------------------------- poses, blocks and service
/** Where a train is now: cm along the line, speed (whole cm a tick, as a replan starts from it, at most its boiler's
 * cruise) and circuit position. */
export function trainPose(row: Readonly<RailTrain>, line: LineRef, stops: readonly number[], tick: number) {
  const s = trainAlong(row, line, tick);
  const v = Math.min(boilerSpeed(line, row.boiler ?? 0), Math.round(trainSpeed(row, line, tick)));
  return { s, v, c: circuitCm(stops, row.track, s) % circuitLen(stops) };
}
/** Whether a train is in an end block or bound for it: standing or running inside it, or its leg ending in it. */
function inBlock(row: Readonly<RailTrain>, line: LineRef, b: EndBlock, tick: number) {
  return within(b, trainAlong(row, line, tick)) || (row.phase === TRAIN_PHASE.RUN && within(b, row.dest));
}
/** Whether train `slot`, now on `track`, may plan a leg to `dest` (cm): the circuit position it ends at is at least
 * `TRAIN.sepCm` behind the train ahead of it now (which only moves on, so the gap holds all leg), and an end block it
 * ends in has no other train of its line in it. */
export function blockFree(
  rows: Rows,
  line: LineRef,
  stops: readonly number[],
  slot: number,
  track: number,
  dest: number,
  tick: number,
) {
  const c = circuitLen(stops),
    me = trainPose(rows(slot), line, stops, tick);
  const leg = circuitAhead(me.c, circuitCm(stops, track, dest) % c, c);
  const serving = servingSlots(rows, line);
  for (const other of serving) {
    if (other === slot) continue;
    const gap = circuitAhead(me.c, trainPose(rows(other), line, stops, tick).c, c);
    if (leg + TRAIN.sepCm > gap) return false;
  }
  for (const b of endBlocks(line, stops))
    if (within(b, dest) && serving.some((k) => k !== slot && inBlock(rows(k), line, b, tick))) return false;
  return true;
}
/** The train a lever ask at `stop` heading `dir` is for: the one with the least circuit distance to that platform
 * whose braking distance at its speed now fits in it (a train standing there, leaving that way, at no distance);
 * -1 for none (and for a way the halt refuses: trainPassesBy). A train too close runs through and the next one takes
 * it, so the assignment only ever moves back. Braking distances are at the halt's own rate (stopKin). */
export function trainServes(
  rows: Rows,
  line: LineRef,
  stops: readonly number[],
  stop: number,
  dir: number,
  tick: number,
) {
  if (trainPassesBy(line, stop, dir, stops.length)) return -1;
  const c = circuitLen(stops),
    at = circuitCm(stops, dir > 0 ? 0 : 1, stops[stop]!) % c,
    kin = stopKin(line, stop, dir > 0 ? 0 : 1),
    a = kin.brake ?? kin.accel;
  let best = -1,
    near = c;
  for (const slot of servingSlots(rows, line)) {
    const r = rows(slot),
      p = trainPose(r, line, stops, tick),
      d = circuitAhead(p.c, at, c);
    // A train already braking for that platform keeps it (braking at the normal rate, its distance only just covers
    // its braking distance, which whole-cm rounding could tip under).
    const braking = r.phase === TRAIN_PHASE.RUN && r.to === stop && (r.track ? -1 : 1) === dir;
    if ((braking || (d === 0 ? p.v === 0 : d >= (p.v * p.v) / (2 * a))) && d < near) [best, near] = [slot, d];
  }
  return best;
}
/** Why a train stops at a halt: its riders' ask, a lever ask it serves, or a service stop; never at a halt that
 * refuses its way (trainPassesBy). */
export function trainReasons(
  rows: Rows,
  line: LineRef,
  stops: readonly number[],
  slot: number,
  lineReq: number,
  tick: number,
  service: ServiceStop,
): ServiceStop {
  const n = stops.length;
  return (k, dir) =>
    !trainPassesBy(line, k, dir, n) &&
    (reqHas(rows(slot).req, k, dir, n) ||
      service(k, dir) ||
      (reqHas(lineReq, k, dir, n) && trainServes(rows, line, stops, k, dir, tick) === slot));
}
export type Leg = { to: number; dest: number; reason: boolean };
/** The leg train `slot` plans from (`s`, `v`) on `track`: to its next reason (or its end) when the blocks allow it,
 * else to the farthest halt or signal short of it they allow (a hold: `reason` false); null when they allow none. */
export function planLeg(
  rows: Rows,
  line: LineRef,
  stops: readonly number[],
  slot: number,
  pose: { s: number; v: number; track: number },
  tick: number,
  reasons: ServiceStop,
): Leg | null {
  const { s, v, track } = pose,
    dir = track ? -1 : 1,
    // Braking distances read only a rate (the line's or a halt's), never a cruise, so they are the same on either
    // boiler (v28): the pose's speed `v` is what the longer boiler changes.
    kin = lineDef(line),
    at = (j: number) => stopKin(line, j, track);
  const k = trainNextStop(stops, s, v, dir, reasons, at);
  if (k < 0) return null;
  const goal = stops[k]!;
  // A hold never stands at a halt that refuses this way (no platform for it: the homeward-only Pier going up).
  const holds: { to: number; dest: number }[] = [];
  for (let j = 0; j < stops.length; j++)
    if (
      j !== k &&
      (goal - stops[j]!) * dir > 0 &&
      !trainPassesBy(line, j, dir, stops.length) &&
      trainCanBrake(s, v, dir, stops[j]!, at(j))
    )
      holds.push({ to: j, dest: stops[j]! });
  for (const b of endBlocks(line, stops))
    if (b.dir === dir && (goal - b.signal) * dir > 0 && trainCanBrake(s, v, dir, b.signal, kin))
      holds.push({ to: -1, dest: b.signal });
  if (blockFree(rows, line, stops, slot, track, goal, tick)) return { to: k, dest: goal, reason: true };
  holds.sort((p, q) => (q.dest - p.dest) * dir);
  for (const h of holds) if (blockFree(rows, line, stops, slot, track, h.dest, tick)) return { ...h, reason: false };
  return null;
}

// ---------------------------------------------------------------- one line's step
/** The world's side of a line's step, from railway-sys-trains.ts: rows to read and write, and the cargo rules. */
export type TrainIO<L extends LineRef = number> = {
  row: Rows;
  set(slot: number, patch: Partial<RailTrain>): void;
  line(line: L): Readonly<RailLineRow>;
  setLine(line: L, patch: Partial<RailLineRow>): void;
  stops(line: L): readonly number[];
  /** The tick the trains were woken (the boiler fit), -1 before. */
  awake: number;
  /** The headway hold's percent (the room's railTrainHeadPct). */
  headPct: number;
  /** Service stops for this train now (cargo, the footing wagon). */
  service(slot: number): ServiceStop;
  /** It has just come to a stand at a halt: unload or load what arrives with it. */
  arrive(slot: number): void;
  /** Standing, before its dwell is judged: 'hold' waits this tick, 'again' re-reads the row (it changed), 'on' goes on
   * to the departure checks. */
  standing(slot: number, tick: number): 'hold' | 'again' | 'on';
  /** Never held for headway (the footing wagon's train while the pier still owes footings). */
  headExempt(slot: number): boolean;
  /** The trains the line runs at its stage now (railway-train.ts, fleetOf; the greybox route, step 3). Absent (a test's
   * fixture IO): no train ever joins from the shed. */
  fleet?(line: L): number;
};
/** A running train's leg, judged again from its pose now: shortened for a reason it can still brake for, or
 * lengthened past a hold the train ahead has moved off. The pose stays continuous (`from` is where it is now). */
function replan<L extends LineRef>(io: TrainIO<L>, line: L, slot: number, tick: number) {
  if (io.row(slot).turn) return; // on a crossover, committed to the halt it turns back at
  const r = io.row(slot),
    stops = io.stops(line),
    dir = r.track ? -1 : 1;
  const pose = trainPose(r, line, stops, tick);
  const reasons = trainReasons(io.row, line, stops, slot, io.line(line).req, tick, io.service(slot));
  const leg = planLeg(io.row, line, stops, slot, { s: pose.s, v: pose.v, track: r.track }, tick, reasons);
  if (!leg || leg.dest === r.dest) return;
  const heldNow = r.to < 0 || !(atEnd(r.to, stops) || reasons(r.to, dir));
  if ((leg.dest - r.dest) * dir < 0 ? !leg.reason : !heldNow) return;
  io.set(slot, { to: leg.to, from: pose.s, v0: pose.v, dest: leg.dest, depart: tick });
}
/** The open end a train standing at no halt (`at` -1) leaves from: the end whose block it stands in, on that end's way
 * out (only a train the railhead's stop moved on from: a signal stands outside its block); -1 for none. */
function endStanding(line: LineRef, stops: readonly number[], r: Readonly<RailTrain>) {
  const dir = r.track ? -1 : 1;
  for (const b of endBlocks(line, stops)) if (b.dir === -dir && within(b, r.from)) return b.stop;
  return -1;
}
/** The balanced hold (a line's `balance`, ring-island-build1 R3b, call 47): a train ready to leave open end `from`
 * waits while the gap to the train ahead of it round the circuit is shorter than the gap to the one behind, so trains
 * that bunched under demand spread out again. It reads only the rows' poses (as blockFree does), costs nothing when
 * the trains are already even, and never holds: past `balance` ticks after the dwell (the cap), the footing wagon's
 * train while it is exempt from headway, or while another train waits behind at this end's signal (it would keep the
 * end block shut).
 *
 * The cap runs from the row's `arrived` (v27), not its `depart`: a lever ask restarts the dwell (rail.call), which the
 * ask is owed so its asker can reach the platform, but never the cap. The dwell check runs before this hold, so an
 * ask on the hold's last tick still gets its full dwell; a hold is at most dwell + cap and one asker's dwell:
 * 50 + 600 + 50 ticks, 70 s on line 2 (test/railway-r3b1-review.test.ts, "griefing").
 *
 * The waiter test matches only a train at this end's signal now. One left at a signal the railhead's stop has since
 * moved on from (stopMoved) is not matched, and the train behind it may be held; the cap still ends that hold (the
 * review's "unmatched waiter" test). A `balance` outside balanceOk holds nothing. */
export function balancedHold<L extends LineRef>(
  io: TrainIO<L>,
  line: L,
  stops: readonly number[],
  slot: number,
  from: number,
  tick: number,
) {
  const cap = lineDef(line).balance,
    r = io.row(slot);
  if (cap === undefined || !balanceOk(cap) || io.headExempt(slot)) return false;
  if (tick >= r.arrived + (r.at >= 0 ? TRAIN.dwellTicks : 0) + cap) return false;
  const others = servingSlots(io.row, line).filter((k) => k !== slot);
  if (!others.length) return false;
  const b = endBlocks(line, stops)[from === 0 ? 0 : 1],
    inbound = b.dir > 0 ? 0 : 1;
  for (const k of others) {
    const o = io.row(k);
    if (o.to === -1 && o.dest === b.signal && o.track === inbound) return false;
  }
  const c = circuitLen(stops),
    me = trainPose(r, line, stops, tick).c;
  let ahead = c,
    behind = c;
  for (const k of others) {
    const p = trainPose(io.row(k), line, stops, tick).c;
    ahead = Math.min(ahead, circuitAhead(me, p, c));
    behind = Math.min(behind, circuitAhead(p, me, c));
  }
  return ahead < behind;
}
/** The greybox route's fleet (step 3): while the line runs fewer trains than its stage's fleet, its first shed train
 * joins, standing at the first halt on the up track as if it had just arrived, once no train in service is in or bound
 * for that end's block and every one is at least `TRAIN.sepCm` from it round the circuit either way. One a tick; the
 * dwell, the headway and the balanced hold then judge its leaving as any train's. */
export function fleetJoin<L extends LineRef>(io: TrainIO<L>, line: L, tick: number) {
  if (!io.fleet || tick < io.awake + TRAIN.wakeTicks) return;
  const serving = servingSlots(io.row, line);
  if (serving.length >= io.fleet(line)) return;
  const slot = lineSlots(line).find((k) => io.row(k).phase === TRAIN_PHASE.SHED);
  const stops = io.stops(line);
  if (slot === undefined || stops.length < 2) return;
  const c = circuitLen(stops),
    b = endBlocks(line, stops)[0];
  for (const k of serving) {
    const p = trainPose(io.row(k), line, stops, tick).c;
    if (inBlock(io.row(k), line, b, tick) || circuitAhead(0, p, c) < TRAIN.sepCm || circuitAhead(p, 0, c) < TRAIN.sepCm)
      return;
  }
  const s0 = stops[0]!;
  io.set(slot, {
    phase: TRAIN_PHASE.STAND,
    at: 0,
    to: 0,
    track: 0,
    depart: tick,
    arrived: tick,
    req: 0,
    from: s0,
    v0: 0,
    dest: s0,
    turn: false,
  });
}
export function trainStepLine<L extends LineRef>(io: TrainIO<L>, line: L, tick: number) {
  if (io.awake < 0) return;
  fleetJoin(io, line, tick);
  const serving = servingSlots(io.row, line);
  for (const slot of serving) {
    for (let guard = 0; guard < 16; guard++) {
      const r = io.row(slot),
        stops = io.stops(line),
        n = stops.length;
      if (r.phase === TRAIN_PHASE.RUN) {
        const arrival = trainArrives(r, line);
        if (tick < arrival) {
          replan(io, line, slot, tick);
          break;
        }
        const turn = r.turn; // the row may be live: read it before the set clears it
        // A leg it could not replan off a halt that refuses its way (the homeward-only Pier, held short of a busy
        // railhead) ends at a stand with no halt, as at a signal: no platform, no dwell, no arrival.
        const at = !turn && r.to >= 0 && trainPassesBy(line, r.to, r.track ? -1 : 1, n) ? -1 : r.to;
        io.set(slot, {
          phase: TRAIN_PHASE.STAND,
          at,
          to: at,
          from: r.dest,
          v0: 0,
          depart: arrival,
          arrived: arrival,
          turn: false,
        });
        if (at >= 0) io.arrive(slot);
        // At an end (or the one it had crossed over at: `turn`) it turns back onto the other track; its riders' asks
        // the old way are past serving.
        if ((r.to === 0 && r.track === 1) || (r.to === n - 1 && r.track === 0) || turn) {
          const track = 1 - r.track;
          io.set(slot, { track, req: reqOnly(io.row(slot).req, n, track ? -1 : 1) });
        }
        continue;
      }
      const hold = io.standing(slot, tick);
      if (hold === 'again') continue;
      if (hold === 'hold') break;
      // A halt's dwell (a signal has none: the train goes the tick its block clears), and the wake.
      if ((r.at >= 0 && tick < r.depart + TRAIN.dwellTicks) || tick < io.awake + TRAIN.wakeTicks) break;
      // The halt it leaves: its own, or the end whose block it stands in on the way out (a train the railhead's stop
      // moved on from: stopMoved), which it leaves as from that end.
      const from = r.at >= 0 ? r.at : endStanding(line, stops, r),
        end = from >= 0 && atEnd(from, stops);
      const head = headTicks(line, stops, io.headPct, r.boiler ?? 0, serving.length),
        left = from === 0 ? io.line(line).left0 : io.line(line).left1;
      if (end && head > 0 && left >= 0 && tick < left + head && !io.headExempt(slot)) break;
      if (end && balancedHold(io, line, stops, slot, from, tick)) break;
      const reasons = trainReasons(io.row, line, stops, slot, io.line(line).req, tick, io.service(slot));
      const leg = planLeg(io.row, line, stops, slot, { s: r.from, v: 0, track: r.track }, tick, reasons);
      if (!leg) break; // held: the block ahead is not clear
      const dir = r.track ? -1 : 1;
      if (from >= 0) {
        // Leaving that way serves this halt's asks that way: its riders' and the lever's.
        io.setLine(line, { req: reqDrop(io.line(line).req, from, dir, n) });
        if (end) io.setLine(line, from === 0 ? { left0: tick } : { left1: tick });
      }
      io.set(slot, {
        phase: TRAIN_PHASE.RUN,
        to: leg.to,
        depart: tick,
        req: from >= 0 ? reqDrop(r.req, from, dir, n) : r.req,
        v0: 0,
        dest: leg.dest,
      });
      break;
    }
  }
}

// ---------------------------------------------------------------- the end and a stop move on (v27)
/** The rows a moved end or stop rewrites: read, write, and the line's open stops (already the new ones). */
export type TrainMoveIO<L extends LineRef = number> = Pick<TrainIO<L>, 'row' | 'set' | 'stops'>;
/** The line now runs on past `last`, its old end (Q6 past Far Head, Q7 past the Pier, the rivet past the Railhead;
 * `io.stops` already has the new end). A train running up to `last` as its end whose nose is past that end's edge (a
 * crossover's first point, or a stub's turnout, moved with a `heads` stop) has already crossed onto the terminal
 * track: it turns back there as at an end (`turn`). One short of it runs on and, unless the halt is `only`, stops
 * there once, as if a rider had asked (its riders could not ask for an end). A train standing at `last` has already
 * turned onto the down track, and leaves homeward as from a middle halt. */
export function endMoved<L extends LineRef>(io: TrainMoveIO<L>, line: L, last: number, tick: number) {
  const halt = lineDef(line).halts[last]!,
    stops = io.stops(line),
    edge = halt.end!.edgeCm + stops[last]! - halt.s;
  // Every slot: a shed train (the greybox route's fleet) is neither running nor standing, so it is never moved; a slot
  // the IO holds no row for (a caller's own rows for the trains it moves: test/railway-trains.test.ts) is skipped.
  for (const slot of lineSlots(line)) {
    const r = io.row(slot) as Readonly<RailTrain> | undefined;
    if (!r || r.phase !== TRAIN_PHASE.RUN || r.track !== 0 || r.to !== last) continue;
    if (trainAlong(r, line, tick) + TRAIN_EXTENT.aheadCm > edge) io.set(slot, { turn: true });
    else if (halt.only === undefined) io.set(slot, { req: reqAdd(r.req, last, 1, stops.length) });
  }
}
/** Halt `k`'s stop has moved on (the railhead's next bent: `io.stops` already has it). A train standing at the old
 * stop stands at a signal (`at` and `to` -1: it keeps its pose, has no dwell left and leaves homeward when its way is
 * clear); one running to `k` is replanned from its pose now to the new stop, as a replan writes a leg. No pose jumps. */
export function stopMoved<L extends LineRef>(io: TrainMoveIO<L>, line: L, k: number, tick: number) {
  const stops = io.stops(line);
  for (const slot of lineSlots(line)) {
    const r = io.row(slot) as Readonly<RailTrain> | undefined;
    if (!r) continue; // as endMoved: a slot the IO holds no row for
    if (r.phase === TRAIN_PHASE.STAND && r.at === k) io.set(slot, { at: -1, to: -1 });
    else if (r.phase === TRAIN_PHASE.RUN && r.to === k) {
      const pose = trainPose(r, line, stops, tick);
      io.set(slot, { from: pose.s, v0: pose.v, dest: stops[k]!, depart: tick });
    }
  }
}

// ---------------------------------------------------------------- invariants
const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
/** Whether `req` asks for a way a halt refuses (trainPassesBy: the homeward-only Pier's up way). */
function refusedAsk(req: number, line: LineRef, st: readonly number[]) {
  const n = st.length;
  for (let k = 0; k < n; k++)
    for (const dir of [-1, 1]) if (trainPassesBy(line, k, dir, n) && reqHas(req, k, dir, n)) return true;
  return false;
}
/** Whether a line's lever asks are well formed for its open stops `st`: reqValid, none for a refused way. */
export const lineReqOk = (req: number, line: LineRef, st: readonly number[]) =>
  reqValid(req, st.length) && !refusedAsk(req, line, st);
/** What is wrong with one train row on `line` with open stops `st` (null when nothing): its shape and bounds
 * ('railway: train', `cargo` the most it carries, `asleep` the caller's asleep-placement check), then its riders'
 * asks: only at middle halts, its own way, never a refused way ('railway: rider ask'). */
export function trainRowBroken(
  r: Readonly<RailTrain>,
  line: LineRef,
  st: readonly number[],
  cargo: number,
  asleep = false,
): string | null {
  const last = st.length - 1,
    dir = r.track ? -1 : 1;
  if (
    asleep ||
    !int(r.phase, 1) ||
    !int(r.at, last, -1) ||
    !int(r.to, last, -1) ||
    !int(r.track, 1) ||
    !int(r.depart) ||
    !int(r.arrived, r.depart) ||
    !reqValid(r.req, st.length) ||
    !int(r.from, st[last]!, st[0]!) ||
    !int(r.dest, st[last]!, st[0]!) ||
    !int(r.boiler ?? 0, BOILER_MAX) ||
    !int(r.v0, boilerSpeed(line, r.boiler ?? 0)) ||
    !int(r.logs, cargo) ||
    !int(r.rails, cargo) ||
    (r.phase === TRAIN_PHASE.STAND && (r.at !== r.to || r.from !== r.dest || r.v0 !== 0)) ||
    // A leg runs somewhere: a halt to another, or from a signal (-1) to a halt or to another signal (Q6 opening the
    // pier moves the far signal out, so a train held at the old one runs signal to signal). Its length is always
    // positive, its way the track's.
    (r.phase === TRAIN_PHASE.RUN &&
      ((r.at >= 0 && r.at === r.to) || r.from === r.dest || (r.dest - r.from) * dir < 0)) ||
    // Turning back at a halt that was an end: running up to it, a halt with an end that is no longer open.
    (r.turn &&
      (r.phase !== TRAIN_PHASE.RUN ||
        r.track !== 0 ||
        r.to < 0 ||
        atEnd(r.to, st) ||
        !lineDef(line).halts[r.to]!.end ||
        r.dest !== st[r.to])) ||
    (r.at >= 0 && r.phase === TRAIN_PHASE.STAND && r.from !== st[r.at]) ||
    // Never standing at a halt that refuses its way (an up train at the homeward-only Pier: it has no platform).
    (r.at >= 0 && r.phase === TRAIN_PHASE.STAND && trainPassesBy(line, r.at, dir, st.length)) ||
    (r.to >= 0 && r.dest !== st[r.to])
  )
    return 'railway: train';
  // A rider's ask is for a middle halt its own way (an end it stops at anyway; the other way it can't serve), and
  // never for a way the halt refuses.
  for (let k = 0; k <= last; k++)
    if (atEnd(k, st) ? reqAt(r.req, k) : reqHas(r.req, k, -dir, st.length)) return 'railway: rider ask';
  return refusedAsk(r.req, line, st) ? 'railway: rider ask' : null;
}
/** Whether two of a line's trains stand in, or run to, one of its end blocks (without a tick). */
export function lineBlocksBroken(trains: readonly Readonly<RailTrain>[], line: LineRef, st: readonly number[]) {
  return endBlocks(line, st).some(
    (b) =>
      trains.filter(
        (r) =>
          (r.phase === TRAIN_PHASE.STAND && within(b, r.from)) || (r.phase === TRAIN_PHASE.RUN && within(b, r.dest)),
      ).length > 1,
  );
}
/** One line's spacing invariants at `tick` (null when they hold): every train at least `TRAIN.sepCm` behind the one
 * ahead round its circuit, and at most one train in or bound for each end block. */
export function lineSpacing(rows: Rows, line: LineRef, st: readonly number[], tick: number): string | null {
  // A line with no open end yet (the greybox route's shut rows) has no train in service and nothing to space.
  if (st.length < 2) return null;
  const slots = servingSlots(rows, line),
    c = circuitLen(st),
    name = typeof line === 'number' ? line : line.id;
  if (slots.length > 1) {
    const at = slots.map((k) => trainPose(rows(k), line, st, tick).c).sort((p, q) => p - q);
    for (let k = 0; k < at.length; k++) {
      const gap = circuitAhead(at[k]!, at[(k + 1) % at.length]!, c);
      if (gap < TRAIN.sepCm) return `railway: line ${name} trains ${gap} cm apart`;
    }
  }
  for (const b of endBlocks(line, st))
    if (slots.filter((k) => inBlock(rows(k), line, b, tick)).length > 1)
      return `railway: line ${name} end block at ${b.stop} holds two trains`;
  return null;
}
/** The spacing invariants at `tick` for every catalog line (lineSpacing; null when they hold). */
export function trainSpacing(rows: Rows, stops: (line: number) => readonly number[], tick: number): string | null {
  for (let line = 0; line < RAIL_LINES.length; line++) {
    const broken = lineSpacing(rows, line, stops(line), tick);
    if (broken) return broken;
  }
  return null;
}
