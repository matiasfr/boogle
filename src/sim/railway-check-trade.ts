// The town economy's part of the load check (docs/plans/slice5-town-economy.md, "Invariants"; R1: the yards and the
// freight), on the rows and the trade queries. Run by railwayCheck (./railway-check.ts); its refusals are tested in
// test/railway-trade.test.ts.
//
//   checkTrade(w)   bounds; each yard's crates conserved (made = stock + aboard its line's trains + delivered);
//                   R3: the riders' bounds and conservation (boarded = aboard + alighted, a town's route) and the
//                   strongbox's (boogles = landed + poured − spent) (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { legDone } from './railway-queries-route.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { RIDER_UNIT, TRADE, validPlotKind, lineRoute } from './railway-trade-layout.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';
import { WORKS } from './railway-works-layout.ts';
import { aperture, plot, till, townClock, towns, trains, yardClock, yards } from './railway-rows.ts';
import { plotSlot, freightAboard, ridersAboard, riderPlaces, loaderOn } from './railway-queries-trade.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The trade's whole-world invariants; throws on the first broken one. */
export function checkTrade(w: World, tick = RAILWAY_MAX_INT) {
  if (
    trains(w).some(
      (r, slot) =>
        !r.wagon &&
        r.foot > 0 &&
        // The original consist determines which flatbed can carry a footing.
        (RAIL_TRAINS[slot]!.line !== LINE2 ||
          !loaderOn(w, tick) ||
          r.foot > WORKS.loaderCap ||
          r.logs + r.rails + r.steel + r.freight > 0 ||
          r.legKit),
    )
  )
    bad('loader cargo');
  const ys = yards(w),
    ts = towns(w);
  if (
    ys.some(
      (y, slot) =>
        !railInt(y.stock, TRADE.yards[slot]!.cap) ||
        !railInt(y.made) ||
        y.made < y.stock ||
        !railInt(yardClock(w, slot).last, RAILWAY_MAX_INT),
    ) ||
    trains(w).some((r) => !railInt(r.freight, TRADE.freightCap)) ||
    ts.some((t) => !railInt(t.wood) || !railInt(t.stone))
  )
    bad('trade bounds');
  // Every crate a yard made is in its stock, aboard its line's trains or delivered to its town.
  if (
    ys.some((y, slot) => {
      const row = TRADE.yards[slot]!;
      return y.made !== y.stock + freightAboard(w, slot) + ts[row.town]![row.goods];
    })
  )
    bad('freight conservation');
  // R3: riders. A train's riders fit its own places, and only a line with a route carries any; each town's waiting crowds
  // stay under the cap and its accrual under a whole rider.
  if (
    trains(w).some(
      // The rider coach belongs to the original line's slots.
      (r, slot) => !railInt(r.riders, riderPlaces()) || (lineRoute(RAIL_TRAINS[slot]!.line) < 0 && r.riders !== 0),
    ) ||
    ts.some(
      (t) =>
        !railInt(townClock(w, t.slot).acc, RIDER_UNIT - 1) ||
        !railInt(t.wait0, TRADE.crowdCap) ||
        !railInt(t.wait1, TRADE.crowdCap) ||
        !railInt(t.boarded) ||
        !railInt(t.alighted),
    )
  )
    bad('riders bounds');
  // Everyone who boarded is aboard their route's trains or has stepped off.
  if (TRADE.routes.some((rt, k) => ts[rt.town]!.boarded !== ridersAboard(w, k) + ts[rt.town]!.alighted))
    bad('riders conservation');
  // Ring contributes to the existing route's far queue. Its own clock can run,
  // but no yard delivers there and no train has a second pair of queues.
  if (ts.slice(1).some((t) => t.wood || t.stone || t.wait0 || t.wait1 || t.boarded || t.alighted))
    bad('unused outer town fields');
  // R3: the one strongbox. Every field a whole number; what is in it is what landed and was poured, less what was spent.
  const b = till(w);
  // The sack's cap applies when it fills, never when a save loads: live rates may have fallen since it was earned.
  if (![b.boogles, b.landed, b.lost, b.spent, b.sack, b.poured].every((v) => railInt(v))) bad('till bounds');
  if (b.boogles !== b.landed + b.poured - b.spent) bad('till conservation');
  let paid = 0;
  TRADE.plots.forEach((ps, town) =>
    ps.forEach((threshold, k) => {
      const p = plot(w, plotSlot(town, k));
      if (
        !railInt(p.at, tick, -1) ||
        !railInt(p.paid, RAILWAY_MAX_INT, p.at >= 0 ? 1 : 0) ||
        (p.at === -1 && p.paid !== 0)
      )
        bad('plot bounds');
      const first = plot(w, plotSlot(town, 0));
      if ('spare' in threshold && p.at >= 0 && (first.at < 0 || first.at > p.at)) bad('plot order');
      if (p.at < 0 ? p.kind !== 0 : !validPlotKind(threshold, p.kind, first.kind)) bad('plot kind');
      if ('after' in threshold && p.at >= 0) {
        const joined = aperture(w).joined;
        if (
          joined < 0 ||
          p.at < joined ||
          (threshold.after === 'gorge' && !legDone(w, 0)) ||
          (threshold.after === 'canopy' && !legDone(w, 3))
        )
          bad('plot before arrival');
      }
      if (p.at >= 0 && (ts[town]!.wood < threshold.wood || ts[town]!.stone < threshold.stone)) bad('plot thresholds');
      paid += p.paid;
    }),
  );
  if (b.spent !== paid) bad('plot spending');
}
