// The steel works' part of the load check (docs/plans/ring-island-build2.md, R1 and R2): the Steel row's bounds and
// order, and steel on line 2's trains and in the Roundhouse bay, on the rows and the world queries. Run by railwayCheck
// (./railway-check.ts). Its logs and rails are in the conserved counts (railCounts' line2 and produced, line2Rails:
// ./railway-queries-line2.ts).
//
//   checkSteel(w)   bounds; nothing before the rivet; lit exactly when the bill is full; the cast clock; steel only on
//                   line 2's kit cars, a trip's worth each; steel conserved (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { STEEL } from './railway-ring-layout.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';
import { shed, steel, steelClock, trains } from './railway-rows.ts';
import { ringJoined } from './railway-queries.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The steel works' whole-world invariants; throws on the first broken one. */
export function checkSteel(w: World) {
  const s = steel(w),
    lastCast = steelClock(w).lastCast,
    ts = trains(w),
    bay = shed(w).steel;
  if (
    !railInt(s.yardLogs, STEEL.logs) ||
    !railInt(s.yardRails, STEEL.rails) ||
    !railInt(s.logs, STEEL.logs) ||
    !railInt(s.rails, STEEL.rails) ||
    !railInt(s.lit, RAILWAY_MAX_INT, -1) ||
    !railInt(s.rack, STEEL.rackCap) ||
    !railInt(s.poured, STEEL.total) ||
    !railInt(s.outLogs) ||
    !railInt(s.outRails) ||
    !railInt(lastCast) ||
    !railInt(bay, STEEL.total)
  )
    bad('steel bounds');
  // Steel rides only on line 2's trains, at most a trip's worth on each kit car (ruling C).
  if (ts.some((r, slot) => !railInt(r.steel, STEEL.trip) || (r.steel > 0 && RAIL_TRAINS[slot]!.line !== LINE2)))
    bad('steel aboard');
  // Nothing in the yard, the bill or the rack, and nothing sent, before the rivet.
  if ((s.yardLogs || s.yardRails || s.logs || s.rails || s.outLogs || s.outRails || s.lit >= 0) && !ringJoined(w))
    bad('steel before the rivet');
  if (s.lit >= 0 !== (s.logs === STEEL.logs && s.rails === STEEL.rails)) bad('steel lit');
  if (s.lit >= 0 && lastCast < s.lit) bad('steel cast clock');
  if (s.lit < 0 && (s.poured || lastCast)) bad('steel unlit cast');
  // Every steel cast is on the rack, aboard a train or in the bay.
  if (s.poured !== s.rack + ts.reduce((n, r) => n + r.steel, 0) + bay) bad('steel conservation');
}
