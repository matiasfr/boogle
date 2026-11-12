// The greybox route's part of the load check (docs/plans/greybox-route.md, step 3): the Leg, LegYard and Route rows'
// bounds and order, on the rows and the world queries. Run by railwayCheck (./railway-check.ts). The kit's logs and
// rails are in the conserved counts (railCounts: fed and laid in line2Logs and line2Rails, aboard, on the rack) and the
// depot's (railway-check-line2.ts: what the leg minted and gave beside the Q jobs'), so a unit a player carried off and
// dropped is accounted where it lies.
//
//   checkRoute(w)   each leg's bounds: 0 <= laid <= sections; fed never over the section's bill and nothing fed on a
//                   complete leg; laying only with the bill full; nothing laid, fed or loaded before the leg opens;
//                   loaded never over the leg's bill; a yard's bounds (nothing feeds one yet); a grant bit only with
//                   its leg complete, a gate bit only with its grant and its leg reached, `arrived` only with the
//                   route's last leg complete; a train's `legKit` mark only with cargo aboard on a line with a leg
//                   reached (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { RAIL_TRAINS, legBuilt } from './railway-lines.ts';
import { RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, RAIL_YARDS } from './railway-route.ts';
import { LegYard, Train } from './railway-components.ts';
import { gateLeg, legDone, legHeldRoom, legReached, legRow, routeRow } from './railway-queries-route.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
const KIT_CAP = 64;
/** The route's whole-world invariants; throws on the first broken one. */
export function checkRoute(w: World) {
  RAIL_LEGS.forEach((leg, k) => {
    const r = legRow(w, k),
      n = leg.sections.length,
      sec = leg.sections[r.laid];
    let logs = 0,
      rails = 0;
    for (const s of leg.sections) [logs, rails] = [logs + s.logs, rails + s.rails];
    if (
      !railInt(r.laid, n) ||
      !railInt(r.logs, sec?.logs ?? 0) ||
      !railInt(r.rails, sec?.rails ?? 0) ||
      !railInt(r.start, RAILWAY_MAX_INT, -1) ||
      // A unit lifted off the rack and lost is owed again, so what was ever loaded may pass the bill.
      !railInt(r.loadedLogs) ||
      !railInt(r.loadedRails) ||
      // Units lifted off its rack onto backs, never past what its remaining sections still lack (none once complete).
      !railInt(r.heldLogs, legHeldRoom(w, k).logs) ||
      !railInt(r.heldRails, legHeldRoom(w, k).rails)
    )
      bad('leg bounds');
    // Laying exactly while the current section's bill is full (the last unit starts it; laying spends it).
    if (r.start >= 0 !== (!!sec && r.logs === sec.logs && r.rails === sec.rails)) bad('leg laying');
    // Nothing happens on a leg before it opens: not built, or the leg before it not complete (the rivet, for the first).
    if (
      !legReached(w, k) &&
      (r.laid || r.logs || r.rails || r.loadedLogs || r.loadedRails || r.heldLogs || r.heldRails)
    )
      bad('leg before it opens');
    // A gated section is fed only once its barrier is open.
    if (sec?.gate !== undefined && (r.logs || r.rails) && !(routeRow(w).gates & (1 << sec.gate))) bad('leg gate');
  });
  // A train's `legKit` mark stands exactly while it carries a leg's kit: on a line with a leg reached, with cargo aboard
  // (steel first, call 64: the mark is what keeps the works' kit and a leg's apart).
  w.each([Train], (_id, t) => {
    if (!t.legKit) return;
    const line = RAIL_TRAINS[t.slot]!.line;
    if (t.logs + t.rails <= 0 || !RAIL_LEGS.some((l, k) => l.line === line && legReached(w, k))) bad('leg kit mark');
  });
  w.each([LegYard], (_id, y) => {
    if (!railInt(y.slot, RAIL_YARDS.length - 1) || !railInt(y.logs, KIT_CAP) || !railInt(y.rails, KIT_CAP))
      bad('yard bounds');
    // Nothing unloads at a junction yard until the leg that loads there is built (leg 2's rules).
    if ((y.logs || y.rails) && !RAIL_LEGS.some((l, k) => l.kit === y.slot && legBuilt(k))) bad('yard before its leg');
  });
  const route = routeRow(w);
  if (
    !railInt(route.grants, (1 << RAIL_GRANTS.length) - 1) ||
    !railInt(route.gates, (1 << RAIL_GATES.length) - 1) ||
    !railInt(route.arrived, RAILWAY_MAX_INT, -1)
  )
    bad('route bounds');
  RAIL_GRANTS.forEach((g, k) => {
    if (route.grants & (1 << k) && !legDone(w, g.leg)) bad('grant before its leg');
  });
  RAIL_GATES.forEach((g, k) => {
    if (!(route.gates & (1 << k))) return;
    const at = gateLeg(k);
    if (!(route.grants & (1 << g.needs))) bad('gate before its grant');
    if (!at || !legReached(w, at.leg)) bad('gate before its leg');
  });
  if (route.arrived >= 0 && !legDone(w, RAIL_LEGS.length - 1)) bad('arrived before the causeway');
}
