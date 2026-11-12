// The town economy's facts on the world (docs/plans/slice5-town-economy.md, "Queries"): the one home for trade
// arithmetic, pure reads that the trade systems, the trains' side of them and the load check share. R1: the yards and
// the freight (which never adds a stop: a train loads only where it already stands).
//
//   yardId, townId                 the rows' entity ids by slot
//   lineYard(line)                 the yard slot a line loads at and delivers for (-1 none)
//   freightAboard(w, yard)         a yard's crates aboard its line's trains
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
