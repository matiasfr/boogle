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
//   R3, riders and fares (every town's, from TRADE.routes; the Till is one):
//   lineRoute(line)                the route slot on a line (-1 none)
//   routeFar(w, route)             its far halt: `b`, or (`b` 'end') its line's current open end (a query, no state)
//   routeAhead(w, route, dir)      the halt its riders ride to going `dir`
//   fareOf(w, route, farePct)      2 to board and 1 a 100 m between its halts, times the room's fare percent
//   (riders never add a stop: the ruling of 12 November; they board and step off only where a train already stands)
//   townBuildings()         the town's buildings (its two starting ones until R4 builds plots)
//   tillRate(w, pct)               every route's demand rate in Boogles a minute; boxCap(w, pct) the strongbox's cap
//   trainSeats()            seats on a train (4; the garage's install changes it here)
//   ridersAboard(w, route)         riders on the route's line's trains
import type { World } from '../ecs/index.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { TRADE, type TradePct, type TradeRoute, type TradeYard } from './railway-trade-layout.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { WORKS } from './railway-works-layout.ts';
import type { RailTrain } from './railway-train.ts';
import { Town, Train, Works, Yard } from './railway-components.ts';
import { footingsOwed, kitOwed, stopsOf, worksId } from './railway-queries.ts';

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
  // The ruling of 12 November: while line 2's wagon is owed footings, the economy adds no stop on that line.
  if (footingsOwed(w, line)) return false;
  const freight = w.get(Train, w.lookup(Train, slot)!)!.freight;
  return w.get(Yard, yardId(w, y))!.stock >= TRADE.loadStop && TRADE.freightCap - freight >= TRADE.loadStop;
}

// ---------------------------------------------------------------- R3: riders, fares and the strongbox
/** The route slot on `line` (one at most a line today), or -1. */
export const lineRoute = (line: number): number => TRADE.routes.findIndex((r) => r.line === line);
/** A route's far halt: its `b`, or for `b: 'end'` its line's current open end (the ruling of 12 November: the
 * riders' far end follows line 2's end as Q6, Q7 and the rivet move it on; a query, no state). */
export function routeFar(w: World, route: number) {
  const r: TradeRoute = TRADE.routes[route]!;
  return r.b === 'end' ? stopsOf(w, r.line).length - 1 : r.b;
}
/** The route halt a train going `dir` carries its riders to: the far halt going up (+s), `a` going down. */
export const routeAhead = (w: World, route: number, dir: number) =>
  dir > 0 ? routeFar(w, route) : TRADE.routes[route]!.a;
/** A route's fare in whole Boogles: 2 to board plus 1 for each whole 100 m between its halts (Decided), times the
 * room's `farePct` / 100, rounded down. The Village to Far Head: 2 + floor(507 m / 100 m) = 7. */
export function fareOf(w: World, route: number, farePct: number = 100) {
  const r = TRADE.routes[route]!,
    halts = RAIL_LINES[r.line]!.halts;
  const far = halts[routeFar(w, route)]!.s;
  const base = TRADE.fare.board + TRADE.fare.per100m * Math.floor(Math.abs(far - halts[r.a]!.s) / 10000);
  return Math.floor((base * farePct) / 100);
}
/** A town's buildings: the two it arrives with (R4 adds its built plots). */
export const townBuildings = () => TRADE.startBuildings;
/** The demand rate in Boogles a minute (the plan's Default: not the seat-capped rate), over every route: buildings ×
 * riders a minute × the rider percent, both ways, times the fare; rounded down once. 56 at the start. */
export function tillRate(w: World, pct: TradePct) {
  let hundredths = 0;
  TRADE.routes.forEach((r, k) => {
    hundredths += townBuildings() * TRADE.ridersPerMin * pct.riderPct * 2 * fareOf(w, k, pct.farePct);
  });
  return Math.floor(hundredths / 100);
}
/** The dearest thing on offer: nothing is bought before R4 (its plots' prices come in then). */
export const dearestOnOffer = () => 0;
/** The strongbox's cap (Decided): the larger of `incomeMin` minutes of income or 1.5 times the dearest thing on offer. */
export function boxCap(w: World, pct: TradePct) {
  const b = TRADE.box;
  return Math.max(b.incomeMin * tillRate(w, pct), Math.floor((dearestOnOffer() * b.dearestNum) / b.dearestDen));
}
/** Seats on train `slot`: 4 (the garage's install changes it here, nowhere else). */
export const trainSeats = () => TRADE.seats;
/** Riders aboard the route's line's trains. */
export const ridersAboard = (w: World, route: number) =>
  LINE_SLOTS[TRADE.routes[route]!.line]!.reduce((n, k) => n + w.get(Train, w.lookup(Train, k)!)!.riders, 0);
/** The riders waiting at route halt `k` to ride the way `dir` (at `a` they go up to `b`, at `b` down to `a`). */
export function waitingFor(w: World, route: number, k: number, dir: number) {
  const r = TRADE.routes[route]!,
    t = w.get(Town, townId(w, r.town))!;
  if (k === r.a && dir > 0) return t.wait0;
  if (k === routeFar(w, route) && dir < 0) return t.wait1;
  return 0;
}
