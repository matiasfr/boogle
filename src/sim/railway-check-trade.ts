// The town economy's part of the load check (docs/plans/slice5-town-economy.md, "Invariants"; R1: the yards and the
// freight), on the rows and the trade queries. Run by railwayCheck (./railway-check.ts); its refusals are tested in
// test/railway-trade.test.ts.
//
//   checkTrade(w)   bounds; each yard's crates conserved (made = stock + aboard its line's trains + delivered);
//                   R3: the riders' bounds and conservation (boarded = aboard + alighted, a town's route) and the
//                   strongbox's (boogles = landed + poured − spent) (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { RIDER_UNIT, TRADE } from './railway-trade-layout.ts';
import { RAIL_TRAINS } from './railway-lines.ts';
import { till, towns, trains, yardClock, yards } from './railway-rows.ts';
import { freightAboard, lineRoute, ridersAboard, trainSeats } from './railway-queries-trade.ts';

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The trade's whole-world invariants; throws on the first broken one. */
export function checkTrade(w: World) {
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
  // R3: riders. A train's riders fit its seats, and only a line with a route carries any; each town's waiting crowds
  // stay under the cap and its accrual under a whole rider.
  if (
    trains(w).some(
      (r, slot) => !railInt(r.riders, trainSeats()) || (lineRoute(RAIL_TRAINS[slot]!.line) < 0 && r.riders !== 0),
    ) ||
    ts.some(
      (t) =>
        !railInt(t.acc, RIDER_UNIT - 1) ||
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
  // R3: the one strongbox. Every field a whole number; what is in it is what landed and was poured, less what was spent.
  const b = till(w);
  if (![b.boogles, b.landed, b.lost, b.spent, b.sack, b.poured].every((v) => railInt(v))) bad('till bounds');
  if (b.boogles !== b.landed + b.poured - b.spent) bad('till conservation');
}
