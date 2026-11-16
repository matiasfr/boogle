// The town economy's facts on the world (docs/plans/slice5-town-economy.md, "Queries"): the one home for trade
// arithmetic, pure reads that the trade systems, the trains' side of them and the load check share. R1: the yards and
// the freight (a train loads where it stands); R2: the staked plots; R2b: the full-load stop (freightStop), the one
// stop freight adds.
//
//   yardId, townId                 the rows' entity ids by slot
//   lineYard(line)                 the yard slot a line loads at and delivers for (-1 none)
//   freightAboard(w, yard)         a yard's crates aboard its line's trains
//   plotsStakedOf(town, wood, stone, bought)   the plots staked for those deliveries (R2), lowest first
//   plotsStaked(w, town)           the same on the world, excluding bought plots
//   freightStop(w, slot, r, k, dir)  R2b's full-load stop: halt k going `dir` is a service stop for train `slot`
//   R3, riders and fares (every town's, from TRADE.routes; the Till is one):
//   lineRoute(line)                the route slot on a line (-1 none)
//   routeFar(w, route)             its far halt: `b`, or (`b` 'end') its line's current open end (a query, no state)
//   routeAhead(w, route, dir)      the halt its riders ride to going `dir`
//   fareOf(w, route, farePct)      2 to board and 1 a 100 m between its halts, times the room's fare percent
//   (riders never add a stop: the ruling of 12 November; they board and step off only where a train already stands)
//   townBuildings(w, town, tick)   the starting buildings plus completed houses
//   tillRate(w, pct)               every route's demand rate in Boogles a minute; boxCap(w, pct) the strongbox's cap
//   riderPlaces()           riders' places on a train, separate from the four player seats
//   ridersAboard(w, route)         riders on the route's line's trains
import type { World } from '../ecs/index.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { TRADE, TRADE_PCT, type TradePct, type TradeRoute, type TradeYard } from './railway-trade-layout.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { WORKS } from './railway-works-layout.ts';
import type { RailTrain } from './railway-train.ts';
import { Plot, Town, Train, Works, Yard } from './railway-components.ts';
import { footingsOwed, kitOwed, stopsOf, wagonSlot, worksId, type Row } from './railway-queries.ts';
import { legKitWaiting } from './railway-queries-route.ts';

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
 * with no priced plots). Bought plots free the next eligible offer. */
export function plotsStaked(w: World, town: number): number[] {
  const id = w.lookup(Town, town),
    t = id === undefined ? undefined : w.get(Town, id);
  return t ? plotsStakedOf(town, t.wood, t.stone, (k) => plotBought(w, plotSlot(town, k))) : [];
}
/** R2b, the full-load stop (the freight-stops ruling, calls 3 to 5): halt `k` going `dir` is a service stop for train
 * `slot` (row `r`) when its line's yard stands at that middle halt, the train is heading home, the yard's `after` is
 * met (the pier's twelve footings), the yard holds TRADE.loadStop crates and the train has room for them (empty, at 8),
 * and the train is on no build errand (call 4: not the footing wagon's, no kit aboard, no kit owed). A yard at a line's
 * end needs none: every train stands there. A train standing at the yard for any other reason loads all the same
 * (freightLoads). */
/** The Ring Island hold is off for row `r` of `line` (docs/plans/short-turn.md, the ruling on step 1's sheet, call 7;
 * railway-trains.ts, controlFree through TrainIO.controlOff): while the line owes footings (the wagon's errand), with a
 * kit aboard that can unload at a halt open now, or owed a kit, as the train-spacing sheets ran it (candidate B's
 * errand list). The wagon's train with no footings owed is on no errand. */
export function holdOff(w: World, line: number, r: Readonly<RailTrain>) {
  if (footingsOwed(w, line)) return true;
  return (r.logs + r.rails > 0 && !legKitWaiting(w, line, r)) || kitOwed(w, r, line);
}
export function freightStop(w: World, slot: number, r: Readonly<RailTrain>, k: number, dir: number) {
  const line = RAIL_TRAINS[slot]!.line,
    y = lineYard(line);
  if (y < 0 || dir >= 0) return false;
  const yard: TradeYard = TRADE.yards[y]!;
  if (k !== yard.stop || k === 0 || k >= stopsOf(w, line).length - 1) return false;
  if (yard.after === 'pier' && w.get(Works, worksId(w))!.pierSet < WORKS.pier) return false;
  // Ruling D (greybox route, 12 November; amends call 4's kit exemption): no stop while a kit is owed or aboard and able
  // to unload at a halt open now; a leg kit waiting for its railhead (legKitWaiting) is no errand.
  if (r.wagon || (r.logs + r.rails > 0 && !legKitWaiting(w, line, r)) || kitOwed(w, r, line)) return false;
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
/** Priced plot keys leave room for up to sixteen slots per town. */
export const plotSlot = (town: number, k: number) => town * 16 + k;
export function plotBought(w: World, slot: number): boolean {
  const id = w.lookup(Plot, slot);
  return id !== undefined && w.get(Plot, id)!.at >= 0;
}
export function plotBuilt(w: World, slot: number, tick: number): boolean {
  const id = w.lookup(Plot, slot),
    p = id === undefined ? undefined : w.get(Plot, id);
  return !!p && p.at >= 0 && tick >= p.at + TRADE.buildTicks;
}
export const housesOf = (w: World, town: number, tick: number): number =>
  (TRADE.plots[town] ?? []).reduce((n, p, k) => n + (plotBuilt(w, plotSlot(town, k), tick) ? p.riders : 0), 0);
/** Every bought building doubles the other prices immediately, including the yard and unfinished builds. */
export function plotPrice(w: World, town: number, k: number, pricePct: number): number {
  const p = TRADE.plots[town]?.[k];
  if (!p) return 0;
  let price = p.base;
  for (let j = 0; j < TRADE.plots[town]!.length; j++) if (plotBought(w, plotSlot(town, j))) price *= TRADE.houseOrder;
  return Math.floor((price * pricePct) / 100);
}
export const townBuildings = (w: World, town: number, tick: number) => TRADE.startBuildings + housesOf(w, town, tick);
/** The yard changes the Works' colour at completion; carrying still waits for the wagon's commissioning. */
export function loaderBuilt(w: World, tick: number): boolean {
  for (let town = 0; town < TRADE.plots.length; town++) {
    const ps = TRADE.plots[town]!;
    for (let k = 0; k < ps.length; k++) {
      const p = ps[k]!;
      if ('gives' in p && p.gives === 'loader' && plotBuilt(w, plotSlot(town, k), tick)) return true;
    }
  }
  return false;
}
export const loaderOn = (w: World, tick: number): boolean => loaderBuilt(w, tick) && wagonSlot(w) >= 0;
/** One deck, one cargo. The coupled wagon has its own deck and leaves its train's kit car free. */
export const deckHeld = (r: Readonly<RailTrain>): boolean => !r.wagon && r.foot > 0;
export const footCap = (r: Readonly<RailTrain>): number => (r.wagon ? WORKS.wagonCap : WORKS.loaderCap);
export const footCarrier = (w: World, r: Readonly<Row<typeof Train>>, tick: number): boolean =>
  r.wagon ||
  (RAIL_TRAINS[r.slot]!.line === LINE2 &&
    loaderOn(w, tick) &&
    (r.foot > 0 || (!r.legKit && r.logs + r.rails + r.steel + r.freight === 0)));
/** Demand income, before the seat cap, in whole Boogles a minute. */
export function tillRate(w: World, pct: TradePct, tick: number = 0) {
  let hundredths = 0;
  TRADE.routes.forEach((r, k) => {
    hundredths += townBuildings(w, r.town, tick) * TRADE.ridersPerMin * pct.riderPct * 2 * fareOf(w, k, pct.farePct);
  });
  return Math.floor(hundredths / 100);
}
/** Only staked, unbought plots are on offer. */
export function dearestOnOffer(w: World, pricePct: number) {
  let dearest = 0;
  TRADE.plots.forEach((_ps, town) => {
    for (const k of plotsStaked(w, town)) dearest = Math.max(dearest, plotPrice(w, town, k, pricePct));
  });
  return dearest;
}
/** The larger of twenty minutes' demand income or 1.5 times the dearest current offer. */
export function boxCap(w: World, pct: TradePct, tick: number = 0) {
  const b = TRADE.box;
  return Math.max(
    b.incomeMin * tillRate(w, pct, tick),
    Math.floor((dearestOnOffer(w, pct.pricePct ?? TRADE_PCT.pricePct) * b.dearestNum) / b.dearestDen),
  );
}
/** Riders' places on each passenger car; player seats never set the fare-paying capacity. */
export const riderPlaces = () => TRADE.riderPlaces;
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
