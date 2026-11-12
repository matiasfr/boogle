// The town economy's facts on the world (docs/plans/slice5-town-economy.md, "Queries"): the one home for trade
// arithmetic, pure reads that the trade systems, the trains' side of them and the load check share. R1: the yards and
// the freight (a train loads where it stands); R2: the staked plots; R2b: the full-load stop (freightStop), the one
// stop freight adds.
//
//   yardId, townId                 the rows' entity ids by slot
//   lineYard(line)                 the yard slot a line loads at and delivers for (-1 none)
//   freightAboard(w, yard)         a yard's crates aboard its line's trains
//   plotsStakedOf(town, wood, stone, bought)   the plots staked for those deliveries (R2), lowest first
//   plotsStaked(w, town)           the same on the world (no plot is bought before R4)
//   freightStop(w, slot, r, k, dir)  R2b's full-load stop: halt k going `dir` is a service stop for train `slot`
import type { World } from '../ecs/index.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { TRADE, type TradeYard } from './railway-trade-layout.ts';
import { RAIL_TRAINS } from './railway-lines.ts';
import { WORKS } from './railway-works-layout.ts';
import type { RailTrain } from './railway-train.ts';
import { Town, Train, Works, Yard } from './railway-components.ts';
import { kitOwed, stopsOf, worksId } from './railway-queries.ts';

export const yardId = (w: World, slot: number) => w.lookup(Yard, slot)!;
export const townId = (w: World, slot: number) => w.lookup(Town, slot)!;
/** The yard slot on `line` (one at most a line), or -1. */
export const lineYard = (line: number): number => TRADE.yards.findIndex((y) => y.line === line);
/** A yard's crates aboard its line's trains. */
export const freightAboard = (w: World, yard: number) =>
  LINE_SLOTS[TRADE.yards[yard]!.line]!.reduce((n, k) => n + w.get(Train, w.lookup(Train, k)!)!.freight, 0);
/** The plots on offer (staked) in `town` for its deliveries: the lowest unbought plots whose timber and stone
 * thresholds are met, at most TRADE.stakedAtOnce (call 1). A query, not state: a late joiner and a reload agree. */
export function plotsStakedOf(
  town: number,
  wood: number,
  stone: number,
  bought: (k: number) => boolean = () => false,
): number[] {
  const out: number[] = [];
  for (const [k, p] of (TRADE.plots[town] ?? []).entries()) {
    if (out.length >= TRADE.stakedAtOnce) break;
    if (!bought(k) && wood >= p.wood && stone >= p.stone) out.push(k);
  }
  return out;
}
/** plotsStakedOf on the world's Town row; a town with no row has nothing staked ([], as plotsStakedOf for a town
 * with no priced plots). No plot can be bought until R4 adds the Plot row and `rail.buy`. */
export function plotsStaked(w: World, town: number): number[] {
  const id = w.lookup(Town, town),
    t = id === undefined ? undefined : w.get(Town, id);
  return t ? plotsStakedOf(town, t.wood, t.stone) : [];
}
/** R2b, the full-load stop (the freight-stops ruling, calls 3 to 5): halt `k` going `dir` is a service stop for train
 * `slot` (row `r`) when its line's yard stands at that middle halt, the train is heading home, the yard's `after` is
 * met (the pier's twelve footings), the yard holds TRADE.loadStop crates and the train has room for them (empty, at 8),
 * and the train is on no build errand (call 4: not the footing wagon's, no kit aboard, no kit owed). A yard at a line's
 * end needs none: every train stands there. A train standing at the yard for any other reason loads all the same
 * (freightLoads). */
export function freightStop(w: World, slot: number, r: Readonly<RailTrain>, k: number, dir: number) {
  const line = RAIL_TRAINS[slot]!.line,
    y = lineYard(line);
  if (y < 0 || dir >= 0) return false;
  const yard: TradeYard = TRADE.yards[y]!;
  if (k !== yard.stop || k === 0 || k >= stopsOf(w, line).length - 1) return false;
  if (yard.after === 'pier' && w.get(Works, worksId(w))!.pierSet < WORKS.pier) return false;
  if (r.wagon || r.logs + r.rails > 0 || kitOwed(w, r)) return false;
  const freight = w.get(Train, w.lookup(Train, slot)!)!.freight;
  return w.get(Yard, yardId(w, y))!.stock >= TRADE.loadStop && TRADE.freightCap - freight >= TRADE.loadStop;
}
