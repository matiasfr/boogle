// The town economy's part of the load check (docs/plans/slice5-town-economy.md, "Invariants"; R1: the yards and the
// freight), on the rows and the trade queries. Run by railwayCheck (./railway-check.ts); its refusals are tested in
// test/railway-trade.test.ts.
//
//   checkTrade(w)   bounds; each yard's crates conserved (made = stock + aboard its line's trains + delivered)
//                   (throws on the first broken one)
import type { World } from '../ecs/index.ts';
import { RAILWAY_MAX_INT, railInt } from './railway.ts';
import { TRADE } from './railway-trade-layout.ts';
import { towns, trains, yardClock, yards } from './railway-rows.ts';
import { freightAboard } from './railway-queries-trade.ts';

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
}
