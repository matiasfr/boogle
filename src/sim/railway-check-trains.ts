// The trains' and lines' part of the load check (docs/plans/ecs-migration-railway.md, M8b): validateRailTrains's
// conditions on the rows and the world queries, in the same order and with the same messages. The conditions are
// railway-trains.ts's own (lineReqOk, trainRowBroken, lineBlocksBroken: one copy, so v27's run here too); this file
// reads the world for them. Run by railwayCheck (./railway-check.ts). The spacing needs a tick and is not part of it
// (trainSpacing).
//
//   checkTrains(w)   each line's asks and headway ticks; each train's shape and bounds by its line and open stops,
//                    its legs, its turn-back, its riders' asks and the asleep placement; at most one train in or bound
//                    for each end block (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { lineBlocksBroken, lineReqOk, trainRowBroken } from './railway-trains.ts';
import { lines, rail, trains } from './railway-rows.ts';
import { stopsOf } from './railway-queries.ts';
import { railTrainsOf } from './railway-queries-trains.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The trains' and lines' whole-world invariants; throws on the first broken one. */
export function checkTrains(w: World) {
  // validateRailTrains's 'railway: trains' (row counts) is railwayCheck's own count check here, which refuses first.
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
  trains(w).forEach((r, slot) => {
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
    if (lineBlocksBroken(railTrainsOf(w, line), line, stops(line))) bad('end block');
}
