// The Works' and the Roundhouse's part of the load check (docs/plans/ecs-migration-railway.md, M8b): the old
// read-model validator's conditions (validateRailWorks, deleted in M12b-2) on the rows and the world queries, in its
// order and with its messages. Run by railwayCheck (./railway-check.ts).
//
//   checkWorks(w)    the Works' and the shed's bounds; the breaker, seams, kiln and casts; the pier and the crossing;
//                    the stall, cradle, fit and table; the wagon; footings on backs and piles; footing conservation
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { WORKS } from './railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from './railway-works.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';
import { Pile } from './railway-components.ts';
import { accounts, beam, boiler, shed, trains, works, worksClock } from './railway-rows.ts';
import { line2Completed } from './railway-queries-line2.ts';
import { pierLaid } from './railway-line2-layout.ts';
import { footingTotal } from './railway-queries-works.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The Works' and the shed's whole-world invariants; throws on the first broken one. */
export function checkWorks(w: World) {
  // The old validator's 'works missing' read rows a world always has (railwayCheck counts them first).
  const k = works(w),
    lastCast = worksClock(w).lastCast,
    h = shed(w);
  const done = pierLaid(line2Completed(w));
  if (
    !railInt(k.breaker, 2) ||
    !railInt(k.seams, 3) ||
    !railInt(k.logs, WORKS.kilnLogs) ||
    !railInt(k.stone, WORKS.kilnStone) ||
    !railInt(k.lit, RAILWAY_MAX_INT, -1) ||
    !railInt(k.rack, WORKS.total) ||
    !railInt(k.poured, WORKS.total) ||
    !railInt(k.pierRack, WORKS.pier) ||
    !railInt(k.pierSet, WORKS.pier) ||
    !railInt(k.crossing, RAILWAY_MAX_INT, -1) ||
    !railInt(lastCast)
  )
    bad('works bounds');
  if (
    !railInt(h.stall, WORKS.stall) ||
    !railInt(h.cradle, WORKS.cradle) ||
    !railInt(h.cradleRails, WORKS.cradleRails) ||
    !railInt(h.fitted, RAILWAY_MAX_INT, -1) ||
    !railInt(h.table, 1) ||
    !railInt(h.tableRev) ||
    !railInt(h.ready, RAILWAY_MAX_INT, -1)
  )
    bad('shed bounds');
  // Works: the breaker comes with Q6; every seam and the kiln after it.
  if (k.breaker > 0 !== done) bad('breaker');
  if (k.seams > 0 && k.breaker !== 2) bad('seam before the breaker');
  if (k.lit >= 0 !== (k.logs === WORKS.kilnLogs && k.stone === WORKS.kilnStone)) bad('kiln lit');
  if ((k.logs || k.stone) && !(k.seams & SEAM_THROAT)) bad('kiln before the throat');
  if (k.lit >= 0 && lastCast < k.lit) bad('cast clock');
  if (k.lit < 0 && (k.poured || lastCast)) bad('unlit cast');
  if (k.pierRack + k.pierSet > WORKS.pier) bad('pier');
  if (k.pierRack + k.pierSet > 0 && !done) bad('pier before Q6');
  if (k.crossing >= 0 !== (k.pierSet === WORKS.pier)) bad('crossing');
  // The shed: the stall on the slab's footings, the cradle after it, fitted with both footings and every rail.
  if (h.stall > 0 && !(k.seams & SEAM_STALL)) bad('stall before the slab');
  if ((h.cradle > 0 || h.cradleRails > 0 || h.table === 1 || h.tableRev > 0) && h.stall !== WORKS.stall)
    bad('cradle before the stall');
  if (h.fitted >= 0 !== (h.cradle === WORKS.cradle && h.cradleRails === WORKS.cradleRails)) bad('fitted');
  // The table turns once, only when ready: after the fit, to line 2's road, sending the wagon out.
  if (h.tableRev !== h.table || (h.table === 1 && h.fitted < 0)) bad('table turned early');
  // The wagon couples to one line 2 train and stays on it.
  const ts = trains(w);
  if (ts.some((r) => typeof r.wagon !== 'boolean' || !railInt(r.foot))) bad('wagon');
  const coupled = ts.filter((r) => r.wagon);
  if (coupled.length > 1) bad('two wagons');
  if (h.ready >= 0 && h.fitted < 0) bad('ready before fitted');
  // Before it couples the wagon is on its way out exactly while the cradle is fitted and the table points at line 2;
  // once coupled it stays, and the table is a toy.
  if (coupled.length ? h.ready < 0 : h.ready >= 0 !== (h.fitted >= 0 && h.table === 1)) bad('wagon rollout');
  if (
    ts.some(
      (r, slot) =>
        (r.wagon && RAIL_TRAINS[slot]!.line !== LINE2) ||
        r.foot > WORKS.wagonCap ||
        (r.foot > 0 && !r.wagon) ||
        (r.wagon && h.fitted < 0),
    )
  )
    bad('wagon');
  // Footings: one fills a back, alone.
  const b = beam(w),
    bo = boiler(w);
  for (const a of accounts(w)) {
    if (!railInt(a.foot, 1)) bad('foot');
    if (
      a.foot &&
      (a.carry ||
        a.stone ||
        a.rails ||
        (b.state === 'held' && b.holder === a.pid) ||
        (bo.state === 'held' && bo.holder === a.pid))
    )
      bad('foot on a full back');
  }
  let lone = true;
  w.each([Pile], (_id, p) => (lone &&= !(p.kind === 3 && p.n !== 1)));
  if (!lone) bad('footing pile');
  if (k.poured > 0 && k.lit < 0) bad('unlit cast');
  if (footingTotal(w) !== k.poured) bad('footing conservation');
}
