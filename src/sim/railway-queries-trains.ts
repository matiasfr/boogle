// The trains' derived facts on the world (docs/plans/ecs-migration-railway.md, M8). Pure reads.
//
//   railTrainsOf(w, line)     a line's train rows, in slot order
//   trainStops(w, k)          the stops line k serves now (line 2's pier once Q6 is laid; stopsOf)
//   railServing, railTrainAsked, railTrainHeld, railOpenEnd
//                             the world twins of the adapter's per-train reads (M10 a): the halts' lamps and levers.
//                             Each takes the stops it works on (default: trainStops), so a view that has the frame's
//                             stops does not work them out again for every train and every halt.
import type { World } from '../ecs/index.ts';
import { Line, Rail, Train } from './railway-components.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { TRAIN, TRAIN_PHASE, reqHas, trainCanBrake } from './railway-train.ts';
import { LINE_SLOTS, atEnd, trainPose, trainServes } from './railway-trains.ts';
import { railId, stopsOf, trainId } from './railway-queries.ts';

export const railTrainsOf = (w: World, line: number) => LINE_SLOTS[line]!.map((k) => w.get(Train, trainId(w, k))!);
export const trainStops = stopsOf;

const lineOf = (slot: number) => RAIL_TRAINS[slot]!.line;
const trainRow = (w: World, slot: number) => w.get(Train, trainId(w, slot))!;
const lineReq = (w: World, line: number) => w.get(Line, w.lookup(Line, line)!)!.req;
const trainsOn = (w: World) => w.get(Rail, railId(w))!.trains;

/** The train a lever ask at (`line`, `stop`) heading `dir` is for at `tick`: the sim's trainServes over the rows, -1 for
 * none (the adapter's railServing). */
export function railServing(
  w: World,
  line: number,
  stop: number,
  dir: number,
  tick: number,
  stops: readonly number[] = trainStops(w, line),
) {
  return trainServes((k) => trainRow(w, k), line, stops, stop, dir, Math.floor(tick));
}
/** Whether train `slot` is on its way to a request stop it will make (the adapter's railTrainAsked): its riders' ask at
 * a halt it can still brake for, or a lever ask at a middle halt it is the serving train for. Off while it stands at a
 * halt. */
export function railTrainAsked(
  w: World,
  slot: number,
  tick: number,
  stops: readonly number[] = trainStops(w, lineOf(slot)),
) {
  const r = trainRow(w, slot),
    line = lineOf(slot),
    n = stops.length,
    dir = r.track ? -1 : 1;
  if (trainsOn(w) < 0 || (r.phase === TRAIN_PHASE.STAND && r.at >= 0)) return false;
  const req = lineReq(w, line),
    pose = trainPose(r, line, stops, Math.floor(tick));
  for (let k = 1; k < n - 1; k++) {
    if (reqHas(r.req, k, dir, n) && (r.to === k || trainCanBrake(pose.s, pose.v, dir, stops[k]!, RAIL_LINES[line]!)))
      return true;
    if (reqHas(req, k, dir, n) && railServing(w, line, k, dir, tick, stops) === slot) return true;
  }
  return false;
}
/** Whether train `slot` is held (the adapter's railTrainHeld): awake and standing at a signal, or at a halt a second
 * past its dwell. */
export function railTrainHeld(w: World, slot: number, tick: number) {
  const r = trainRow(w, slot),
    at = trainsOn(w);
  if (at < 0 || r.phase !== TRAIN_PHASE.STAND || tick < at + TRAIN.wakeTicks) return false;
  return r.at < 0 || tick >= r.depart + TRAIN.dwellTicks + 10;
}
/** Whether halt `stop` of `line` is one of its open ends now (the adapter's railOpenEnd). */
export const railOpenEnd = (w: World, line: number, stop: number, stops: readonly number[] = trainStops(w, line)) =>
  atEnd(stop, stops);
