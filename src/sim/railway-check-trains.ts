// The trains' and lines' part of the load check (docs/plans/ecs-migration-railway.md, M8b): its conditions on the rows
// and the world queries. The conditions are railway-trains.ts's own (lineReqOk, trainRowBroken, lineBlocksBroken: one
// copy, so v27's run here too); this file reads the world for them. Run by railwayCheck (./railway-check.ts). The
// spacing needs a tick and is not part of it (trainSpacing).
//
//   checkTrains(w)   each line's asks and headway ticks; each train's shape and bounds by its line and open stops,
//                    its legs, its turn-back, its riders' asks and the asleep placement; at most one train in or bound
//                    for each end block (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { lineBlocksBroken, lineReqOk, servingSlots, trainRowBroken } from './railway-trains.ts';
import { TRAIN_PHASE, fleetOf, trainIdle } from './railway-train.ts';
import { legsLaid } from './railway-queries-route.ts';
import { lines, rail, trains } from './railway-rows.ts';
import { stopsOf } from './railway-queries.ts';
import { railTrainsOf } from './railway-queries-trains.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The trains' and lines' whole-world invariants; throws on the first broken one. */
export function checkTrains(w: World) {
  // The train and line row counts are railwayCheck's own count check, which refuses first.
  const awake = rail(w).trains >= 0;
  const stops = (line: number) => stopsOf(w, line);
  lines(w).forEach((l, line) => {
    if (
      !lineReqOk(l.req, line, stops(line)) ||
      !railInt(l.left0, RAILWAY_MAX_INT, -1) ||
      !railInt(l.left1, RAILWAY_MAX_INT, -1)
    )
      bad('line');
    if (!awake && (l.req || l.left0 >= 0 || l.left1 >= 0)) bad('line asleep');
  });
  const rows = trains(w);
  // The greybox route's fleet: a shed train is exactly its idle row, only a fleet row is ever in the shed, the shed
  // rows are the line's last, and a line runs no more than its stage's fleet nor fewer than its first stage's.
  const legs = legsLaid(w);
  rows.forEach((r, slot) => {
    if (r.phase !== TRAIN_PHASE.SHED) return;
    const idle = trainIdle(slot);
    if (
      !RAIL_TRAINS[slot]!.shed ||
      r.freight ||
      r.riders ||
      (Object.keys(idle) as (keyof typeof idle)[]).some((key) => r[key] !== idle[key])
    )
      bad('shed train');
  });
  RAIL_LINES.forEach((l, line) => {
    const serving = servingSlots((k) => rows[k]!, line),
      all = railTrainsOf(w, line);
    if (
      serving.length > Math.max(l.trains, fleetOf(line, legs)) ||
      serving.length < l.trains ||
      all.slice(serving.length).some((r) => r.phase !== TRAIN_PHASE.SHED)
    )
      bad('fleet');
  });
  rows.forEach((r, slot) => {
    if (r.phase === TRAIN_PHASE.SHED) return;
    const { line, home, track } = RAIL_TRAINS[slot]!;
    const asleep =
      !awake &&
      !!(r.phase || r.at !== home || r.to !== home || r.track !== track || r.depart || r.req || r.logs || r.rails);
    const broken = trainRowBroken(r, line, stops(line), line === LINE2 ? 32 : 0, asleep);
    // Any message trainRowBroken returns is a refusal ('railway: train' or 'railway: rider ask' today), so a new one
    // can never pass the check unnoticed.
    if (broken) throw new Error(broken);
  });
  // Without a tick: standing in a block, or a leg ending in one.
  for (let line = 0; line < RAIL_LINES.length; line++)
    if (
      stops(line).length >= 2 &&
      lineBlocksBroken(
        railTrainsOf(w, line).filter((r) => r.phase !== TRAIN_PHASE.SHED),
        line,
        stops(line),
      )
    )
      bad('end block');
}
