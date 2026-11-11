// M10 a's oracle, frozen: the adapter's per-train reads over an inspected state (docs/plans/generic-lines.md, v26), as
// they stood on main before M12 removed them from src/adapters/railway.ts. Only test/railway-m10a-review.test.ts and
// test/railway-m10c-views.test.ts read them, as the twins the world queries in src/sim/railway-queries-trains.ts are
// held equal to; M12b deletes this file with the read model.
import { RAIL_LINES, RAIL_TRAINS } from '../../src/sim/railway-lines.ts';
import {
  TRAIN,
  TRAIN_PHASE,
  railRingOpen,
  reqHas,
  trainCanBrake,
  trainStopsOf,
  type RailTrain,
} from '../../src/sim/railway-train.ts';
import { LINE_SLOTS, atEnd, trainPose, trainServes, type RailLineRow } from '../../src/sim/railway-trains.ts';

/** What the per-train reads need of an inspected state (docs/plans/generic-lines.md, v26). */
export type RailTrainsRead = {
  readonly trains: readonly Readonly<RailTrain>[];
  readonly lines: readonly Readonly<RailLineRow>[];
  readonly line2: { readonly trains: boolean; readonly trainsAt: number; readonly completed: number };
  /** Ring Island's gap (v27): the railhead's head and the rivet decide line 2's stops past the Pier. */
  readonly ring: { readonly set: number; readonly joined: number };
};
/** Line `line`'s trains, in slot order, with their slots (replaces v25's `line2.train[k]`). */
export const railTrainsOf = (s: Pick<RailTrainsRead, 'trains'>, line: number) =>
  LINE_SLOTS[line]!.map((slot) => ({ slot, row: s.trains[slot]! }));
/** The line train `slot` runs on. */
const railLineOf = (slot: number) => RAIL_TRAINS[slot]!.line;
/** The stops line `line` serves now (line 2's pier once Q6 is laid; the Railhead at its head once Q7 is; Ring Island
 * once the rivet is struck). */
export const railStopsNow = (s: Pick<RailTrainsRead, 'line2' | 'ring'>, line: number) =>
  trainStopsOf(line, s.line2.completed, railRingOpen(s));
/** The train a lever ask at (`line`, `stop`) heading `dir` is for at `tick`: the sim's trainServes over the mirrored
 * rows, -1 for none. */
export function railServing(s: RailTrainsRead, line: number, stop: number, dir: number, tick: number) {
  return trainServes((k) => s.trains[k]!, line, railStopsNow(s, line), stop, dir, Math.floor(tick));
}
/** Whether train `slot` is on its way to a request stop it will make: its riders' ask at a halt it can still brake for
 * (one asked too late, which it runs through and drops at its turnback, leaves the lamp dark), or a lever ask at a
 * middle halt it is the serving train for (its amber stop lamp; design review, finding 2). Off while it stands at a
 * halt. */
export function railTrainAsked(s: RailTrainsRead, slot: number, tick: number) {
  const r = s.trains[slot]!,
    line = railLineOf(slot),
    stops = railStopsNow(s, line),
    n = stops.length,
    dir = r.track ? -1 : 1;
  if (!s.line2.trains || (r.phase === TRAIN_PHASE.STAND && r.at >= 0)) return false;
  const lineReq = s.lines[line]!.req,
    pose = trainPose(r, line, stops, Math.floor(tick));
  for (let k = 1; k < n - 1; k++) {
    if (reqHas(r.req, k, dir, n) && (r.to === k || trainCanBrake(pose.s, pose.v, dir, stops[k]!, RAIL_LINES[line]!)))
      return true;
    if (reqHas(lineReq, k, dir, n) && railServing(s, line, k, dir, tick) === slot) return true;
  }
  return false;
}
/** Whether train `slot` is held (its hold lamp; the boards' held departure): awake and standing at a signal, or at a
 * halt a second past its dwell, waiting on the block ahead or the headway at an end. */
export function railTrainHeld(s: RailTrainsRead, slot: number, tick: number) {
  const r = s.trains[slot]!;
  if (!s.line2.trains || r.phase !== TRAIN_PHASE.STAND || tick < s.line2.trainsAt + TRAIN.wakeTicks) return false;
  return r.at < 0 || tick >= r.depart + TRAIN.dwellTicks + 10;
}
/** Whether halt `stop` of `line` is one of its open ends now. */
export const railOpenEnd = (s: Pick<RailTrainsRead, 'line2' | 'ring'>, line: number, stop: number) =>
  atEnd(stop, railStopsNow(s, line));
