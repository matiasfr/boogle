// The steel works' part of the load check (docs/plans/ring-island-build2.md, R1 and R2): the Steel row's bounds and
// order, and steel on line 2's trains and in the Roundhouse bay, on the rows and the world queries. Run by railwayCheck
// (./railway-check.ts). Its logs and rails are in the conserved counts (railCounts' line2 and produced, line2Rails:
// ./railway-queries-line2.ts).
//
//   checkSteel(w)   bounds; nothing before the rivet; what is out was sent; lit exactly when the bill is full;
//                   the cast clock; steel only on
//                   line 2's kit cars, a trip's worth each; steel conserved; the boiler fit: line 2's only, after
//                   steel is home, and no train wearing more than its line's (R3) (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { STEEL } from './railway-ring-layout.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';
import { BOILER_MAX } from './railway-train.ts';
import { Leg } from './railway-components.ts';
import { cart, lines, rail, shed, steel, steelClock, trains } from './railway-rows.ts';
import { aboard, ringJoined } from './railway-queries.ts';

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
  // Everything line 2 has out by cart or train, the yard included, was made for it at the Village: a stretch's kit
  // (depotProduced, shelfOut) or the works' (outLogs, outRails). The weaker form of R1's "yard <= sent", which a
  // stretch kit's leftovers aboard could break (review of R1-R2).
  const r0 = rail(w),
    c = cart(w);
  if (r0.depot + c.logs + aboard(w, 'logs') + s.yardLogs > r0.depotProduced + s.outLogs) bad('steel sent logs');
  // The greybox route's kit rails (Leg.loadedRails, off the forge rack at the Village) ride and rack beside them.
  let legRails = 0;
  w.each([Leg], (_id, l) => (legRails += l.loadedRails));
  if (r0.depotRails + c.rails + aboard(w, 'rails') + s.yardRails > r0.shelfOut + s.outRails + legRails)
    bad('steel sent rails');
  if (s.lit >= 0 !== (s.logs === STEEL.logs && s.rails === STEEL.rails)) bad('steel lit');
  if (s.lit >= 0 && lastCast < s.lit) bad('steel cast clock');
  if (s.lit < 0 && (s.poured || lastCast)) bad('steel unlit cast');
  // Every steel cast is on the rack, aboard a train or in the bay.
  if (s.poured !== s.rack + ts.reduce((n, r) => n + r.steel, 0) + bay) bad('steel conservation');
  // The boiler fit (R3): line 2's alone, installed (with its tick) only once steel is in the bay; a train wears at most
  // its line's fit. Nothing spends Shed.steel in build 2 (the install is free): the first feature that spends bay steel
  // must relax `bay < 1` here, or a fitted room with an empty bay fails its load.
  const ls = lines(w);
  if (ls.some((l) => !railInt(l.boiler, BOILER_MAX) || !railInt(l.fitted, RAILWAY_MAX_INT, -1))) bad('boiler bounds');
  if (ls.some((l, line) => l.boiler > 0 !== l.fitted >= 0 || (l.boiler > 0 && (line !== LINE2 || bay < 1))))
    bad('boiler fit');
  if (ts.some((r, slot) => !railInt(r.boiler, ls[RAIL_TRAINS[slot]!.line]!.boiler))) bad('boiler aboard');
}
