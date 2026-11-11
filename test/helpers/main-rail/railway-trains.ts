// Several trains on a line (docs/plans/generic-lines.md, "The state shape" 3-8; v26): the circuit, the end blocks and
// their signals, the block rule, the headway hold at the ends, who serves a lever ask, and the per-line step. Pure, in
// whole cm and ticks over the rows (a `Rows` getter by slot), so the server's systems and a client's mirror read the
// same rules; railway-sys-trains.ts supplies the world's side (cargo, the wagon, the cart) through `TrainIO`.
//
//   circuitCm, circuitLen         (./railway-lines.ts) one number round a line, for ordering and spacing only
//   endBlocks(line, stops)        the two open ends' blocks (turnout to end stop, both tracks) and their signals
//   cycleTicks, headTicks         the non-stop round trip; the least gap between two departures from an end
//   blockFree(...)                whether a train may plan a leg to `dest` now: the block rule and the end blocks
//   trainServes(...)              the train a lever ask (halt, way) is for: the nearest that way that can still brake
//   planLeg(...)                  the leg a train plans from a pose: its next reason, or the farthest hold short of it
//   trainStepLine(io, line, tick) one line's trains for a tick: arrivals, turn-backs, holds, departures and replans
//   trainSpacing(rows, ...)       the spacing invariants at a tick (tests sample it)
import { LINE2, RAIL_LINES, RAIL_TRAINS, TRAIN_EXTENT, circuitAhead, circuitCm, circuitLen } from './railway-lines.ts';
import type { Railway } from '../../../src/sim/railway.ts';
import {
  TRAIN,
  TRAIN_PHASE,
  reqAt,
  reqDrop,
  reqHas,
  reqOnly,
  reqValid,
  trainAlong,
  trainArrives,
  trainCanBrake,
  trainLegTicks,
  trainNextStop,
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

// ---------------------------------------------------------------- the ends
/** One open end's block, both tracks from `from` to `to` (cm along the line: from a stub's turnout's far side, or a
 * crossover's start, to the end stop), the halt it ends at (its index in the open stops), the way into it, and where a
 * train that can't enter waits: its signal (`RailEnd.signalCm`), a stop with no halt on the inbound track, never
 * nearer the end stop than `TRAIN.sepCm`. A train is in it while any of it is (`TRAIN_EXTENT`). */
export type EndBlock = { from: number; to: number; stop: number; dir: number; signal: number };
export function endBlocks(line: number, stops: readonly number[]): readonly [EndBlock, EndBlock] {
  const halts = RAIL_LINES[line]!.halts,
    last = stops.length - 1;
  const a = halts[0]!.end,
    b = halts[last]!.end;
  if (!a || !b) throw new Error(`railway: line ${line} has no end at halt 0 or ${last}`);
  const s0 = stops[0]!,
    s1 = stops[last]!;
  return [
    { from: s0, to: a.edgeCm, stop: 0, dir: -1, signal: Math.max(a.signalCm, s0 + TRAIN.sepCm) },
    { from: b.edgeCm, to: s1, stop: last, dir: 1, signal: Math.min(b.signalCm, s1 - TRAIN.sepCm) },
  ];
}
/** Whether a train with its along at `s` reaches into block `b`. */
const within = (b: EndBlock, s: number) => s - TRAIN_EXTENT.behindCm < b.to && s + TRAIN_EXTENT.aheadCm > b.from;
/** Whether a halt is one of the open ends (its track turns there). */
export const atEnd = (stop: number, stops: readonly number[]) => stop === 0 || stop === stops.length - 1;

// ---------------------------------------------------------------- the headway
/** The non-stop round trip between the open ends, two dwells included. */
export function cycleTicks(line: number, stops: readonly number[]) {
  return 2 * trainLegTicks(stops[stops.length - 1]! - stops[0]!, 0, RAIL_LINES[line]!) + 2 * TRAIN.dwellTicks;
}
/** The least gap between two trains leaving the same end: `headPct` of an even split; none with one train. */
export function headTicks(line: number, stops: readonly number[], headPct = TRAIN_HEAD_PCT) {
  const n = RAIL_LINES[line]!.trains;
  return n < 2 ? 0 : Math.floor((cycleTicks(line, stops) * headPct) / (100 * n));
}

// ---------------------------------------------------------------- poses, blocks and service
/** Where a train is now: cm along the line, speed (whole cm a tick, as a replan starts from it) and circuit position. */
export function trainPose(row: Readonly<RailTrain>, line: number, stops: readonly number[], tick: number) {
  const s = trainAlong(row, line, tick);
  const v = Math.min(RAIL_LINES[line]!.speed, Math.round(trainSpeed(row, line, tick)));
  return { s, v, c: circuitCm(stops, row.track, s) % circuitLen(stops) };
}
/** Whether a train is in an end block or bound for it: standing or running inside it, or its leg ending in it. */
function inBlock(row: Readonly<RailTrain>, line: number, b: EndBlock, tick: number) {
  return within(b, trainAlong(row, line, tick)) || (row.phase === TRAIN_PHASE.RUN && within(b, row.dest));
}
/** Whether train `slot`, now on `track`, may plan a leg to `dest` (cm): the circuit position it ends at is at least
 * `TRAIN.sepCm` behind the train ahead of it now (which only moves on, so the gap holds all leg), and an end block it
 * ends in has no other train of its line in it. */
export function blockFree(
  rows: Rows,
  line: number,
  stops: readonly number[],
  slot: number,
  track: number,
  dest: number,
  tick: number,
) {
  const c = circuitLen(stops),
    me = trainPose(rows(slot), line, stops, tick);
  const leg = circuitAhead(me.c, circuitCm(stops, track, dest) % c, c);
  for (const other of LINE_SLOTS[line]!) {
    if (other === slot) continue;
    const gap = circuitAhead(me.c, trainPose(rows(other), line, stops, tick).c, c);
    if (leg + TRAIN.sepCm > gap) return false;
  }
  for (const b of endBlocks(line, stops))
    if (within(b, dest) && LINE_SLOTS[line]!.some((k) => k !== slot && inBlock(rows(k), line, b, tick))) return false;
  return true;
}
/** The train a lever ask at `stop` heading `dir` is for: the one with the least circuit distance to that platform
 * whose braking distance at its speed now fits in it (a train standing there, leaving that way, at no distance);
 * -1 for none. A train too close runs through and the next one takes it, so the assignment only ever moves back. */
export function trainServes(
  rows: Rows,
  line: number,
  stops: readonly number[],
  stop: number,
  dir: number,
  tick: number,
) {
  const c = circuitLen(stops),
    at = circuitCm(stops, dir > 0 ? 0 : 1, stops[stop]!) % c,
    a = RAIL_LINES[line]!.accel;
  let best = -1,
    near = c;
  for (const slot of LINE_SLOTS[line]!) {
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
/** Why a train stops at a halt: its riders' ask, a lever ask it serves, or a service stop. */
export function trainReasons(
  rows: Rows,
  line: number,
  stops: readonly number[],
  slot: number,
  lineReq: number,
  tick: number,
  service: ServiceStop,
): ServiceStop {
  const n = stops.length;
  return (k, dir) =>
    reqHas(rows(slot).req, k, dir, n) ||
    service(k, dir) ||
    (reqHas(lineReq, k, dir, n) && trainServes(rows, line, stops, k, dir, tick) === slot);
}
export type Leg = { to: number; dest: number; reason: boolean };
/** The leg train `slot` plans from (`s`, `v`) on `track`: to its next reason (or its end) when the blocks allow it,
 * else to the farthest halt or signal short of it they allow (a hold: `reason` false); null when they allow none. */
export function planLeg(
  rows: Rows,
  line: number,
  stops: readonly number[],
  slot: number,
  pose: { s: number; v: number; track: number },
  tick: number,
  reasons: ServiceStop,
): Leg | null {
  const { s, v, track } = pose,
    dir = track ? -1 : 1,
    kin = RAIL_LINES[line]!;
  const k = trainNextStop(stops, s, v, dir, reasons, kin);
  if (k < 0) return null;
  const goal = stops[k]!;
  const holds: { to: number; dest: number }[] = [];
  for (let j = 0; j < stops.length; j++)
    if (j !== k && (goal - stops[j]!) * dir > 0 && trainCanBrake(s, v, dir, stops[j]!, kin))
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
export type TrainIO = {
  row: Rows;
  set(slot: number, patch: Partial<RailTrain>): void;
  line(line: number): Readonly<RailLineRow>;
  setLine(line: number, patch: Partial<RailLineRow>): void;
  stops(line: number): readonly number[];
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
};
/** A running train's leg, judged again from its pose now: shortened for a reason it can still brake for, or
 * lengthened past a hold the train ahead has moved off. The pose stays continuous (`from` is where it is now). */
function replan(io: TrainIO, line: number, slot: number, tick: number) {
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
export function trainStepLine(io: TrainIO, line: number, tick: number) {
  if (io.awake < 0) return;
  for (const slot of LINE_SLOTS[line]!) {
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
        io.set(slot, { phase: TRAIN_PHASE.STAND, at: r.to, from: r.dest, v0: 0, depart: arrival, turn: false });
        if (r.to >= 0) io.arrive(slot);
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
      const end = r.at >= 0 && atEnd(r.at, stops);
      const head = headTicks(line, stops, io.headPct),
        left = r.at === 0 ? io.line(line).left0 : io.line(line).left1;
      if (end && head > 0 && left >= 0 && tick < left + head && !io.headExempt(slot)) break;
      const reasons = trainReasons(io.row, line, stops, slot, io.line(line).req, tick, io.service(slot));
      const leg = planLeg(io.row, line, stops, slot, { s: r.from, v: 0, track: r.track }, tick, reasons);
      if (!leg) break; // held: the block ahead is not clear
      const dir = r.track ? -1 : 1;
      if (r.at >= 0) {
        // Leaving that way serves this halt's asks that way: its riders' and the lever's.
        io.setLine(line, { req: reqDrop(io.line(line).req, r.at, dir, n) });
        if (end) io.setLine(line, r.at === 0 ? { left0: tick } : { left1: tick });
      }
      io.set(slot, {
        phase: TRAIN_PHASE.RUN,
        to: leg.to,
        depart: tick,
        req: r.at >= 0 ? reqDrop(r.req, r.at, dir, n) : r.req,
        v0: 0,
        dest: leg.dest,
      });
      break;
    }
  }
}

// ---------------------------------------------------------------- the read model
/** A line's trains on the read model, in slot order (replaces v25's `line2.train[k]`). */
export const railTrainsOf = (s: Pick<Railway, 'trains'>, line: number) => LINE_SLOTS[line]!.map((k) => s.trains[k]!);

// ---------------------------------------------------------------- invariants
const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
/** The trains' and lines' rows on the read model (railwayCheck's part for them): shapes and bounds by each train's
 * line and its open stops, asks that pass `reqValid` (a rider's only at middle halts, its own way), the asleep
 * placement, cargo only on line 2, and at most one train in or bound for each end block. The spacing needs a tick:
 * trainSpacing. */
export function validateRailTrains(s: Railway, stops: (line: number) => readonly number[]) {
  if (s.trains.length !== RAIL_TRAINS.length || s.lines.length !== RAIL_LINES.length)
    throw new Error('railway: trains');
  const awake = (s.line2?.trains ?? -1) >= 0;
  s.lines.forEach((l, line) => {
    if (!reqValid(l.req, stops(line).length) || !int(l.left0, 2147483647, -1) || !int(l.left1, 2147483647, -1))
      throw new Error('railway: line');
    if (!awake && (l.req || l.left0 >= 0 || l.left1 >= 0)) throw new Error('railway: line asleep');
  });
  s.trains.forEach((r, slot) => {
    const { line, home, track } = RAIL_TRAINS[slot]!,
      st = stops(line),
      last = st.length - 1,
      dir = r.track ? -1 : 1;
    const cargo = line === LINE2 ? 32 : 0;
    if (
      !int(r.phase, 1) ||
      !int(r.at, last, -1) ||
      !int(r.to, last, -1) ||
      !int(r.track, 1) ||
      !int(r.depart) ||
      !reqValid(r.req, st.length) ||
      !int(r.from, st[last]!, st[0]!) ||
      !int(r.dest, st[last]!, st[0]!) ||
      !int(r.v0, RAIL_LINES[line]!.speed) ||
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
          !RAIL_LINES[line]!.halts[r.to]!.end ||
          r.dest !== st[r.to])) ||
      (r.at >= 0 && r.phase === TRAIN_PHASE.STAND && r.from !== st[r.at]) ||
      (r.to >= 0 && r.dest !== st[r.to]) ||
      (!awake &&
        (r.phase || r.at !== home || r.to !== home || r.track !== track || r.depart || r.req || r.logs || r.rails))
    )
      throw new Error('railway: train');
    // A rider's ask is for a middle halt its own way (an end it stops at anyway; the other way it can't serve).
    for (let k = 0; k <= last; k++)
      if (atEnd(k, st) ? reqAt(r.req, k) : reqHas(r.req, k, -dir, st.length)) throw new Error('railway: rider ask');
  });
  for (let line = 0; line < RAIL_LINES.length; line++) {
    const st = stops(line);
    // Without a tick: standing in a block, or a leg ending in one.
    for (const b of endBlocks(line, st))
      if (
        railTrainsOf(s, line).filter(
          (r) =>
            (r.phase === TRAIN_PHASE.STAND && within(b, r.from)) || (r.phase === TRAIN_PHASE.RUN && within(b, r.dest)),
        ).length > 1
      )
        throw new Error('railway: end block');
  }
}
/** The spacing invariants at `tick` (null when they hold): every train of a line at least `TRAIN.sepCm` behind the
 * one ahead round its circuit, and at most one train in or bound for each end block. */
export function trainSpacing(rows: Rows, stops: (line: number) => readonly number[], tick: number): string | null {
  for (let line = 0; line < RAIL_LINES.length; line++) {
    const slots = LINE_SLOTS[line]!,
      st = stops(line),
      c = circuitLen(st);
    if (slots.length > 1) {
      const at = slots.map((k) => trainPose(rows(k), line, st, tick).c).sort((p, q) => p - q);
      for (let k = 0; k < at.length; k++) {
        const gap = circuitAhead(at[k]!, at[(k + 1) % at.length]!, c);
        if (gap < TRAIN.sepCm) return `railway: line ${line} trains ${gap} cm apart`;
      }
    }
    for (const b of endBlocks(line, st))
      if (slots.filter((k) => inBlock(rows(k), line, b, tick)).length > 1)
        return `railway: line ${line} end block at ${b.stop} holds two trains`;
  }
  return null;
}
