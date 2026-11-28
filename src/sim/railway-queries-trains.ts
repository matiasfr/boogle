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
import { RAIL_HALTS, RAIL_LINES, LINE2, WALL_LEG, haltPlatform } from './railway-lines.ts';
import { TRAIN, TRAIN_PHASE, reqHas, trainCanBrake, trainWakeAt } from './railway-train.ts';
import { runLine, lapSlots, gorgeStop } from './railway-lap.ts';
import { atEnd, retainedEndBlock, trainPose, trainServes } from './railway-trains.ts';
import { railId, ringOpen, stopsOf, trainId } from './railway-queries.ts';
import { haltHead, legDone } from './railway-queries-route.ts';

export const railTrainsOf = (w: World, line: number) =>
  lapSlots(line, legDone(w, WALL_LEG)).map((k) => w.get(Train, trainId(w, k))!);
export const trainStops = stopsOf;

/** Track, service and lever asks use the slot's running line. */
export const runningLine = (w: World, slot: number) => runLine(slot, legDone(w, WALL_LEG));
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
  stops: readonly number[] = trainStops(w, runningLine(w, slot)),
) {
  const r = trainRow(w, slot),
    line = runningLine(w, slot),
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
  if (at < 0 || r.phase !== TRAIN_PHASE.STAND || tick < trainWakeAt(runningLine(w, slot), at) + TRAIN.wakeTicks)
    return false;
  return r.at < 0 || tick >= r.depart + TRAIN.dwellTicks + 10;
}
/** Whether halt `stop` of `line` is one of its open ends now (the adapter's railOpenEnd). */
export const railOpenEnd = (w: World, line: number, stop: number, stops: readonly number[] = trainStops(w, line)) =>
  atEnd(stop, stops);

/** A halt still boards like the far end while an accepted old-end arrival/departure occupies its original block.
 * This is shared platform authority, including a pending `turn` arrival before it acquires its departure origin. */
export function railPlatformEnd(
  w: World,
  line: number,
  stop: number,
  tick: number,
  stops: readonly number[] = trainStops(w, line),
) {
  return (
    stop === stops.length - 1 ||
    lapSlots(line, legDone(w, WALL_LEG)).some(
      (slot) => retainedEndBlock(trainRow(w, slot), line, Math.floor(tick))?.stop === stop,
    )
  );
}
/** The accepted platform used by both the lever view and server reach validation. */
export function railCallPlatform(w: World, halt: number, way: number, tick: number) {
  const h = RAIL_HALTS[halt]!;
  const end = railPlatformEnd(w, h.line, h.stop, tick);
  // A reflected departure occupies cave outward, the joined halt's second platform.
  if (end && h.line === LINE2 && h.stop > gorgeStop) return h.platforms[1];
  return haltPlatform(h, way, haltHead(w, halt, ringOpen(w).head), end);
}

/** During a retained departure, only its still-boardable train can answer the old-side lever. Once it leaves,
 * both levers wait for clearance rather than inviting a future train that will board the opposite side. */
export function railCallReady(
  w: World,
  line: number,
  stop: number,
  dir: number,
  tick: number,
  stops: readonly number[] = trainStops(w, line),
) {
  if (stop === stops.length - 1 || !railPlatformEnd(w, line, stop, tick, stops)) return true;
  return lapSlots(line, legDone(w, WALL_LEG)).some((slot) => {
    const r = trainRow(w, slot);
    const block = retainedEndBlock(r, line, Math.floor(tick));
    if (block?.stop !== stop || dir !== -block.dir) return false;
    return (
      (r.phase === TRAIN_PHASE.STAND && r.at === stop && r.from === stops[stop]) ||
      (r.turn && r.to === stop && r.dest === stops[stop])
    );
  });
}
