// The town economy's facts on the world (docs/plans/slice5-town-economy.md, "Queries"): the one home for trade
// arithmetic, pure reads that the trade systems, the trains' side of them and the load check share. R1: the yards and
// the freight (which never adds a stop: a train loads only where it already stands).
//
//   yardId, townId                 the rows' entity ids by slot
//   lineYard(line)                 the yard slot a line loads at and delivers for (-1 none)
//   freightAboard(w, yard)         a yard's crates aboard its line's trains
//   plotsStakedOf(town, wood, stone, bought)   the plots staked for those deliveries (R2), lowest first
//   plotsStaked(w, town)           the same on the world (no plot is bought before R4)
import type { World } from '../ecs/index.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { TRADE } from './railway-trade-layout.ts';
import { Town, Train, Yard } from './railway-components.ts';

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
