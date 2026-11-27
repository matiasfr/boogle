// The greybox route's part of the load check (docs/plans/greybox-route.md, step 3): the Leg, LegYard and Route rows'
// bounds and order, on the rows and the world queries. Run by railwayCheck (./railway-check.ts). The kit's logs and
// rails are in the conserved counts (railCounts: fed and laid in line2Logs and line2Rails, aboard, on the rack) and the
// depot's (railway-check-line2.ts: what the leg minted and gave beside the Q jobs'), so a unit a player carried off and
// dropped is accounted where it lies.
//
//   checkRoute(w)   each leg's bounds: 0 <= laid <= sections; fed never over the section's bill and nothing fed on a
//                   complete leg; laying only with the bill full and its barrier open or absent;
//                   nothing fed or laid before the leg opens; loaded never over the leg's bill; a yard's units only while its leg is open, within its remaining
//                   bills less fed; each line's kit carriers within its kitTrains; a grant bit only with
//                   its leg complete, a gate bit only with its grant and its leg reached, `arrived` only with the
//                   route's last leg complete; a train's `legKit` mark only with cargo aboard on a line with a leg
//                   reached (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, RAIL_YARDS } from './railway-route.ts';
import { Account, LegYard, Train } from './railway-components.ts';
import {
  SERVED_LEGS,
  STOCKED_LEGS,
  gateLeg,
  legDone,
  legHeldRoom,
  legKitCarriers,
  legKitMayLoad,
  legKitTrains,
  legOpen,
  legYardAhead,
  legReached,
  legRow,
  routeRow,
} from './railway-queries-route.ts';

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
    // The stand-in stocks a stocked leg's first kit once (legKitStock), and lost rails come off its loaded count before
    // it stocks them again (they stay conserved), so its loaded rails never pass that section's bill (the reviews of
    // greybox leg 2: over-minting). Logs are not bounded so: the backstop mints lost logs again, at most once a minute
    // (railway-sys-route-kit.ts, legStandInBackstop).
    if (STOCKED_LEGS.includes(k) && r.laid === 0 && r.loadedRails > leg.sections[0]!.rails)
      bad('stand-in over its bill');
    const clear = sec?.gate === undefined || !!(routeRow(w).gates & (1 << sec.gate));
    if (r.start >= 0 !== (!!sec && clear && r.logs === sec.logs && r.rails === sec.rails)) bad('leg laying');
    // Nothing happens on a leg before it opens: not built, or the leg before it not complete (the rivet, for the first).
    // Its kit may load once the leg before it is reached (greybox-leg2.md, the kit ahead), never sooner.
    if (!legReached(w, k) && (r.laid || r.logs || r.rails || r.heldLogs || r.heldRails)) bad('leg before it opens');
    if ((r.loadedLogs || r.loadedRails) && !legKitMayLoad(w, k)) bad('leg kit before its leg');
  });
  const lifts = RAIL_LEGS.map(() => ({ logs: 0, rails: 0 }));
  w.each([Account], (_id, a) => {
    if (
      !railInt(a.legLogs, 255) ||
      !railInt(a.legRails, 255) ||
      !railInt(a.liftLeg, RAIL_LEGS.length - 1, -1) ||
      (a.liftLeg === -1) !== (a.legLogs + a.legRails === 0)
    )
      bad('account lifted bounds');
    if (a.liftLeg >= 0) {
      lifts[a.liftLeg]!.logs += a.legLogs;
      lifts[a.liftLeg]!.rails += a.legRails;
    }
  });
  RAIL_LEGS.forEach((leg, k) => {
    const row = legRow(w, k);
    if (row.heldLogs !== lifts[k]!.logs || row.heldRails !== lifts[k]!.rails) bad('leg held');
    const reached = legOpen(w, k) ? leg.sections.slice(0, row.laid + 1) : [];
    if (
      !railInt(row.rackLogs, Math.max(0, ...reached.map((s) => s.logs))) ||
      !railInt(row.rackRails, Math.max(0, ...reached.map((s) => s.rails)))
    )
      bad('leg rack');
  });
  // A train's `legKit` mark stands exactly while it carries a leg's kit: on a line serving a leg reached, or one whose
  // kit rides ahead (its leg before reached), with cargo aboard (steel first, call 64: the mark is what keeps the
  // works' kit and a leg's apart).
  w.each([Train], (_id, t) => {
    if (!t.legKit) return;
    const served = SERVED_LEGS[RAIL_TRAINS[t.slot]!.line]!;
    if (t.logs + t.rails <= 0 || !served.some((k) => legKitMayLoad(w, k))) bad('leg kit mark');
  });
  // Each line's kit carriers within its kitTrains (line 2: running less one; greybox-leg2.md, step 2).
  RAIL_LINES.forEach((_l, line) => {
    if (RAIL_LEGS.filter((leg, k) => leg.line === line && legOpen(w, k)).length > 1) bad('two open legs on a line');
    if (legKitCarriers(w, line) > legKitTrains(w, line)) bad('leg kit carriers');
  });
  w.each([LegYard], (_id, y) => {
    if (!railInt(y.slot, RAIL_YARDS.length - 1) || !railInt(y.logs, KIT_CAP) || !railInt(y.rails, KIT_CAP))
      bad('yard bounds');
    // A junction yard holds units only while a leg that loads there is open, never more than its remaining sections'
    // bills less what is fed (greybox-leg2.md, step 2: on the lay that completes it, the yard goes home).
    if (!y.logs && !y.rails) return;
    const k = RAIL_LEGS.findIndex((l, j) => l.kit === y.slot && (legOpen(w, j) || legYardAhead(w, j)));
    if (k < 0) bad('yard without its open leg');
    const room = legHeldRoom(w, k);
    if (y.logs > room.logs || y.rails > room.rails) bad('yard over its leg');
  });
  const route = routeRow(w);
  if (
    !railInt(route.grants, (1 << RAIL_GRANTS.length) - 1) ||
    !railInt(route.gates, (1 << RAIL_GATES.length) - 1) ||
    !railInt(route.reached, RAILWAY_MAX_INT, -1) ||
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
    if (at && legRow(w, at.leg).laid < at.section) bad('gate before its section');
  });
  if (route.reached >= 0 && !legDone(w, RAIL_LEGS.length - 1)) bad('island reached before the causeway');
  if (route.arrived >= 0 && (route.reached < 0 || route.arrived < route.reached))
    bad('arrival before a train reached the island');
}
