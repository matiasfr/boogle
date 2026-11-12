// Line two's part of the load check (docs/plans/ecs-migration-railway.md, M8b): its conditions on the rows and the
// world queries. Run by railwayCheck (./railway-check.ts).
//
//   checkLine2(w)    the forge and its pour clock; Q1 to Q7's bounds, order, funding and laying; the depot, the cart,
//                    the lever, hook, glider and pack; the shelf; the boiler; rail conservation (throws on the first)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { LINE2_FORGE as FORGE, LINE2_STATIONS, Q6 } from './railway-line2-layout.ts';
import { CART, CART_PHASE, CART_PHASES, CART_ROAD } from './railway-cart.ts';
import { DEPOT_OUT, Leg } from './railway-components.ts';
import { accounts, beam, boiler, cart, forge, forgeClock, rail, steel } from './railway-rows.ts';
import { line2Jobs, scheduleOf } from './railway-queries.ts';
import {
  line2Aboard,
  line2Active,
  line2Completed,
  line2GateDown,
  line2Open,
  line2Rails,
} from './railway-queries-line2.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** Line two's whole-world invariants; throws on the first broken one. */
export function checkLine2(w: World) {
  const f = forge(w),
    lastPour = forgeClock(w).lastPour,
    r0 = rail(w);
  if ((f.used > 0 || f.lit >= 0) && !line2Open(w)) bad('forge before path');
  if (f.lit >= 0 !== (f.used === FORGE.logs)) bad('forge lit');
  if (f.lit < 0 && (f.rack || f.poured || lastPour)) bad('unlit pour');
  if (f.lit >= 0 && lastPour < f.lit) bad('pour clock');
  const jobs = line2Jobs(w);
  jobs.forEach(({ job: j, run }, k) => {
    const spec = LINE2_STATIONS[k]!;
    for (const n of [
      j.stock,
      j.railStock,
      run.allocation,
      run.railAllocation,
      run.used,
      run.railUsed,
      j.delivered,
      j.railDelivered,
      run.elapsed,
      run.lastTick,
    ])
      if (!railInt(n)) bad('line2 job bounds');
    if (!railInt(j.start, RAILWAY_MAX_INT, -1) || !railInt(j.completion, 1)) bad('line2 job bounds');
    const schedule = scheduleOf(spec, j);
    if (run.elapsed > schedule.totalTicks || j.stock > spec.bill[0] || j.railStock > spec.bill[1])
      bad('line2 job bounds');
    const before = k === 0 ? f.lit >= 0 : !!jobs[k - 1]!.job.completion;
    if (!before && (j.start >= 0 || j.delivered > 0 || j.railDelivered > 0)) bad('line2 ordered stations');
    if (j.start < 0) {
      if (
        run.allocation ||
        run.used ||
        run.railAllocation ||
        run.railUsed ||
        run.elapsed ||
        j.completion ||
        j.stock !== j.delivered ||
        j.railStock !== j.railDelivered ||
        (j.stock === spec.bill[0] && j.railStock === spec.bill[1] && line2GateDown(w, k))
      )
        bad('line2 unfunded job');
    } else {
      const fraction = Math.max(0, run.elapsed - schedule.depositTicks - schedule.feedTicks) / schedule.layTicks;
      if (
        !line2GateDown(w, k) ||
        j.start < f.lit ||
        run.lastTick < j.start ||
        j.stock ||
        j.railStock ||
        j.delivered !== spec.bill[0] ||
        j.railDelivered !== spec.bill[1] ||
        run.used !== Math.min(spec.bill[0], Math.floor(fraction * spec.bill[0])) ||
        run.railUsed !== Math.min(spec.bill[1], Math.floor(fraction * spec.bill[1])) ||
        run.allocation + run.used !== spec.bill[0] ||
        run.railAllocation + run.railUsed !== spec.bill[1] ||
        j.completion !== Number(run.elapsed === schedule.totalTicks)
      )
        bad('line2 funded job');
    }
  });
  if ((r0.depot || r0.depotProduced) && !jobs[0]!.job.completion) bad('early depot');
  const depotOut = DEPOT_OUT.map((key) => r0[key]);
  // The greybox route's kit: the logs a leg's kit halt minted (Leg.loadedLogs) are depot production too, and the rails
  // it gave off the forge rack (Leg.loadedRails) may be on the shelf (its rack) or aboard beside the Q jobs'.
  let legLogs = 0,
    legRails = 0;
  w.each([Leg], (_id, l) => ((legLogs += l.loadedLogs), (legRails += l.loadedRails)));
  if (
    depotOut.some((n, k) => !railInt(n, LINE2_STATIONS[k]!.bill[0]) || (n > 0 && !LINE2_STATIONS[k]!.depot)) ||
    depotOut.reduce((a, b) => a + b, 0) + legLogs !== r0.depotProduced
  )
    bad('depot output');
  const c = cart(w);
  // Logs aboard are a stretch's kit or, after the rivet, the steel works' (made at the Village: outLogs).
  if (r0.depot + c.logs + line2Aboard(w, 'logs') > r0.depotProduced + steel(w).outLogs) bad('depot stock');
  // The cart's road ends at Q6's rack (the farthest it is ever sent; Q6 and Q7 are fed by train).
  const road = CART_ROAD.rackCm(Q6);
  if (
    !railInt(c.phase, CART_PHASES - 1) ||
    !railInt(c.depart) ||
    !railInt(c.to, road) ||
    !railInt(c.from, c.to) ||
    !railInt(c.logs, CART.load) ||
    !railInt(c.rails, CART.rails) ||
    ((c.phase === CART_PHASE.RUN || c.phase === CART_PHASE.DROP || c.phase === CART_PHASE.BACK) &&
      (c.to < CART_ROAD.forgeCm || c.from < CART_ROAD.forgeCm))
  )
    bad('cart');
  const done = line2Completed(w);
  if (r0.lever && done < 3) bad('lever before Q3');
  if (r0.hook && done < 2) bad('hook before Q2');
  if (r0.glide && done < 5) bad('glide before Q5');
  if (r0.pack && f.used < FORGE.bills[0]) bad('pack before the forge bill');
  // The shelf holds rails only for the active, unfunded `shelf` stretch, and never more than its rail bill.
  if (
    !railInt(r0.depotRails, 64) ||
    !railInt(r0.shelfOut, 64) ||
    r0.depotRails + c.rails + line2Aboard(w, 'rails') > r0.shelfOut + steel(w).outRails + legRails
  )
    bad('shelf bounds');
  if (r0.shelfOut) {
    const k = line2Active(w);
    const spec = LINE2_STATIONS[k],
      j = jobs[k]?.job;
    if (!spec?.shelf || !j || j.start >= 0 || r0.shelfOut > spec.bill[1]) bad('shelf outside its stretch');
  }
  const b = boiler(w),
    beamRow = beam(w);
  if (
    !['none', 'pedestal', 'held', 'ground', 'fitted'].includes(b.state) ||
    !railInt(b.epoch) ||
    !railInt(b.revision) ||
    !railInt(b.age, 21) ||
    !railInt(b.x, 200000, -200000) ||
    !railInt(b.y, 200000, -200000) ||
    !railInt(b.z, 200000, -200000) ||
    (b.state === 'none') !== done < 5 ||
    (b.state === 'fitted') !== r0.trains >= 0 ||
    (b.holder !== '') !== (b.state === 'held') ||
    (b.state === 'held' &&
      !accounts(w).some((a) => a.pid === b.holder && a.epoch === b.epoch && !a.carry && !a.stone && !a.rails)) ||
    (b.state === 'held' && beamRow.state === 'held' && beamRow.holder === b.holder) ||
    !railInt(r0.trains, RAILWAY_MAX_INT, -1)
  )
    bad('boiler');
  if (line2Rails(w) !== f.poured) bad('rail conservation');
}
