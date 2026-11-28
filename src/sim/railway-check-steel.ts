// The steel works' part of the load check (docs/plans/ring-island-build2.md, R1 and R2): the Steel row's bounds and
// order, and steel on line 2's trains and in the Roundhouse bay, on the rows and the world queries. Run by railwayCheck
// (./railway-check.ts). Its logs and rails are in the conserved counts (railCounts' line2 and produced, line2Rails:
// ./railway-queries-line2.ts).
//
//   checkSteel(w)   bounds; nothing before the rivet; what is out was sent; lit exactly when the bill is full;
//                   the cast clock; steel only on
//                   line 2's kit cars, a trip's worth each; steel conserved; the boiler fit: line 2's only, after
//                   steel is home, and no train wearing more than its line's (R3); each line's install revision
//                   and the garage table's copy (garage step 4) (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { STEEL } from './railway-ring-layout.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';
import { BOILER_MAX } from './railway-train.ts';
import { TRADE_LINES, isTradeLine } from './railway-route.ts';
import { Leg } from './railway-components.ts';
import { cart, lines, rail, shed, steel, steelClock, trains } from './railway-rows.ts';
import { aboard, ringJoined } from './railway-queries.ts';
import { INSTALL_STEEL } from './railway-works-layout.ts';
import { runningLine } from './railway-queries-trains.ts';
import { legDone, tradeRepickReached, tradeOpen } from './railway-queries-route.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The steel works' whole-world invariants; throws on the first broken one. */
export function checkSteel(w: World, tick: number) {
  const s = steel(w),
    lastCast = steelClock(w).lastCast,
    ts = trains(w),
    bay = shed(w).steel,
    spent = shed(w).spent;
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
    !railInt(bay, STEEL.total) ||
    !railInt(spent, bay)
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
  // The greybox route's kit rails (Leg.loadedRails, off the forge rack at the Village) ride and rack beside them.
  let rackLogs = 0,
    rackRails = 0;
  let legRails = 0;
  w.each([Leg], (_id, l) => {
    rackLogs += l.rackLogs;
    rackRails += l.rackRails;
    legRails += l.loadedRails;
  });
  if (r0.depot + rackLogs + c.logs + aboard(w, 'logs') + s.yardLogs > r0.depotProduced + r0.giftOut + s.outLogs)
    bad('steel sent logs');
  if (r0.depotRails + rackRails + c.rails + aboard(w, 'rails') + s.yardRails > r0.shelfOut + s.outRails + legRails)
    bad('steel sent rails');
  if (s.lit >= 0 !== (s.logs === STEEL.logs && s.rails === STEEL.rails)) bad('steel lit');
  if (s.lit >= 0 && lastCast < s.lit) bad('steel cast clock');
  if (s.lit < 0 && (s.poured || lastCast)) bad('steel unlit cast');
  // Every steel cast is on the rack, aboard a train or in the bay.
  if (s.poured !== s.rack + ts.reduce((n, r) => n + r.steel, 0) + bay) bad('steel conservation');
  // Landed steel remains the gate even after the pool empties. Every bought fit accounts for its steel once.
  const ls = lines(w);
  const allowed = (line: number, row: number) => {
    if (isTradeLine(line)) return row === 0 || row === 4 || row === 5;
    return railInt(row, line === LINE2 ? 3 : line === 0 ? 1 : 0);
  };
  if (ls.some((l) => !railInt(l.boiler, BOILER_MAX) || !railInt(l.fitted, RAILWAY_MAX_INT, -1) || !railInt(l.rev)))
    bad('boiler bounds');
  // Every bought fit accounts for its steel once: line 2's big boiler, and each trade line's first fit.
  const fittedSteel =
    (ls[LINE2]!.boiler === 3 ? INSTALL_STEEL[3] : 0) +
    TRADE_LINES.reduce((n, line) => n + (ls[line]!.boiler > 0 ? INSTALL_STEEL[5] : 0), 0);
  if (spent !== fittedSteel) bad('steel spent');
  if (
    ls.some(
      (l, line) =>
        l.boiler > 0 !== l.fitted >= 0 ||
        !allowed(line, l.boiler) ||
        (line <= LINE2 && (l.boiler >= 1 !== shed(w).ready >= 0 || (l.boiler >= 1 && shed(w).table !== 1))) ||
        (line === LINE2 && l.boiler >= 2 && bay < 1) ||
        (l.boiler === 3 && !legDone(w, 0)),
    )
  )
    bad('boiler fit');
  if (
    ts.some((r, slot) => {
      const line = runningLine(w, slot);
      // A cave slot keeps its standard cruise until its first Village stand.
      if (line !== RAIL_TRAINS[slot]!.line && r.boiler === 1) return false;
      return !allowed(line, r.boiler) || (line <= LINE2 && r.boiler > ls[line]!.boiler);
    })
  )
    bad('boiler aboard');
  // Each line's install revision (garage step 4): line 2's is its boiler row; a trade line's
  // is 0 until its first fit, which only an open trade accepts; no other line installs.
  const revOk = (l: (typeof ls)[number], line: number) => {
    if (line === LINE2) return l.rev === l.boiler;
    if (!isTradeLine(line)) return l.rev === 0;
    if (!l.boiler) return l.rev === 0;
    return tradeOpen(w, line) && (l.rev === 1 || (l.rev === 2 && tradeRepickReached(w, line)));
  };
  if (ls.some((l, line) => !revOk(l, line))) bad('install revision');
  // The garage table holds line 2's copy until the first bring, then line 2's or an open trade line's (garage step 4).
  const h = shed(w);
  if (
    !railInt(h.quayRev) ||
    !railInt(h.quayBrought, tick, -1) ||
    (h.quayBrought === -1) !== (h.quayRev === 0) ||
    (h.quayLine !== LINE2 && (!h.quayRev || !tradeOpen(w, h.quayLine))) ||
    !railInt(h.bringRev) ||
    !railInt(h.brought, RAILWAY_MAX_INT, -1) ||
    h.brought >= 0 !== h.bringRev > 0 ||
    (h.tableLine !== LINE2 && (h.bringRev === 0 || !tradeOpen(w, h.tableLine)))
  )
    bad('garage table');
}
