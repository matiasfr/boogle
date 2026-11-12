// The town economy's systems (docs/plans/slice5-town-economy.md, R1): the yards' crates, and the trains' side of the
// freight that ./railway-sys-trains.ts's TrainIO calls. Pure integers; the numbers are ./railway-trade-layout.ts's.
//
//   yardTick (rail.yardTick)   while the trains run, each yard makes a crate every `everyTicks` up to its cap
//   freightLoads(w, slot)      a train standing at its line's yard heading home loads what it has room for
//   freightArrives(w, slot)    a train come to a stand at its yard's `home` halt unloads into the yard's `town`
//   yardsAway(w, ticks, tick)  the away credit's part for the yards (R2): called by rail.resume's awayCredit
//   tradeTick (rail.tradeTick) R3: each route's town sends riders to both of its halts, up to the crowd's cap
//   ridersArrive(w, slot, pct) R3: a train come to a stand at the route halt its riders ride to: they step off and pay
//   ridersBoard(w, slot)       R3: a train standing at a route halt, leaving toward the other: the waiting board
import { defineSystem, type World } from '../ecs/index.ts';
import { RAIL_TRAINS } from './railway-lines.ts';
import { TRAIN_PHASE, trainDir } from './railway-train.ts';
import { RIDER_UNIT, TRADE, type TradePct } from './railway-trade-layout.ts';
import { Rail, Till, Town, Train, Yard, YardClock } from './railway-components.ts';
import { railId, trainId } from './railway-queries.ts';
import {
  boxCap,
  fareOf,
  lineRoute,
  lineYard,
  routeAhead,
  townBuildings,
  townId,
  trainSeats,
  waitingFor,
  yardId,
} from './railway-queries-trade.ts';
import type { Tick } from './railway-sys-core.ts';

/** The yards' production (as the forge pours: ./railway-sys-line2.ts, layLine2): while the trains are awake, a crate
 * for every whole `everyTicks` since the last, up to the cap; a full yard's clock stays at the tick, so its next crate
 * comes a whole interval after a train takes one. Runs after the cart (order 2) and before the trains (order 3), so a
 * train standing at a yard takes a crate the tick it is made. */
export const yardTick = defineSystem(
  'rail.yardTick',
  { reads: [Rail], writes: [Yard, YardClock], phase: 'tick', order: 2.5 },
  (w, { tick }: Tick) => {
    if (w.get(Rail, railId(w))!.trains < 0) return;
    TRADE.yards.forEach((y, slot) => {
      const id = yardId(w, slot);
      // A clock in the future (a corrupt or hand-made save) would freeze the yard: it restarts from now.
      if (w.get(YardClock, id)!.last > tick) w.mut(YardClock, id)!.last = tick;
      if (w.get(Yard, id)!.stock < y.cap && tick - w.get(YardClock, id)!.last >= y.everyTicks) {
        const ym = w.mut(Yard, id)!,
          cm = w.mut(YardClock, id)!;
        while (ym.stock < y.cap && tick - cm.last >= y.everyTicks) {
          ym.stock++;
          ym.made++;
          cm.last += y.everyTicks;
        }
      }
      if (w.get(Yard, id)!.stock >= y.cap) w.mut(YardClock, id)!.last = tick;
    });
  },
);
/** Train `slot` standing at its line's yard, heading home (an end's train has already turned), loads
 * `min(freightCap - freight, stock)`: whatever it stopped for (an end, a lever or a rider ask, the kit, the wagon, or
 * R2b's full-load stop, the one stop freight adds: freightStop in ./railway-queries-trade.ts).
 * Called every tick it stands, so it also takes a crate made while it waits. */
export function freightLoads(w: World, slot: number) {
  const y = lineYard(RAIL_TRAINS[slot]!.line);
  if (y < 0) return;
  const r = w.get(Train, trainId(w, slot))!;
  if (r.phase !== TRAIN_PHASE.STAND || r.at !== TRADE.yards[y]!.stop || trainDir(r) >= 0) return;
  const id = yardId(w, y),
    n = Math.min(TRADE.freightCap - r.freight, w.get(Yard, id)!.stock);
  if (n <= 0) return;
  w.mut(Yard, id)!.stock -= n;
  w.mut(Train, trainId(w, slot))!.freight += n;
}
/** Train `slot` has just come to a stand at its yard's `home` halt: its freight lands in the yard's `town`, in its
 * goods' count (today both yards' town is the Village: timber at line 1's halt, stone at line 2's). */
export function freightArrives(w: World, slot: number) {
  const y = lineYard(RAIL_TRAINS[slot]!.line);
  if (y < 0) return;
  const r = w.get(Train, trainId(w, slot))!,
    yard = TRADE.yards[y]!;
  if (r.at !== yard.home || !r.freight) return;
  w.mut(Town, townId(w, yard.town))![yard.goods] += r.freight;
  w.mut(Train, trainId(w, slot))!.freight = 0;
}
/** The yards' away credit (R2): `ticks` of production (railAwayCredit's, the same as the forge's and the cart's) gives
 * each yard `floor(ticks / everyTicks)` crates, never past its cap, while the trains are awake; `made` grows with it
 * and the clock moves to `tick`, so the next crate comes a whole interval after the join. Trains do not run while
 * away, so nothing is loaded or delivered. Applied once per resume marker (rail.resume refuses a marker already
 * used before it gets here). */
export function yardsAway(w: World, ticks: number, tick: number) {
  if (ticks <= 0 || w.get(Rail, railId(w))!.trains < 0) return;
  TRADE.yards.forEach((y, slot) => {
    const id = yardId(w, slot),
      n = Math.min(y.cap - w.get(Yard, id)!.stock, Math.floor(ticks / y.everyTicks));
    if (n > 0) {
      const ym = w.mut(Yard, id)!;
      ym.stock += n;
      ym.made += n;
    }
    w.mut(YardClock, id)!.last = tick;
  });
}

// ---------------------------------------------------------------- R3: riders, fares and the strongbox
/** Riders (the plan's R3): while the trains run, each route gains `buildings × ridersPerMin ×
 * riderPct` hundredths of a rider-tick; each whole RIDER_UNIT sends one rider to each end, up to TRADE.crowdCap there
 * (the rest give up). Integers only; every town's route in TRADE.routes order. After the trains (order 3), before the
 * Works (order 4). */
export const tradeTick = defineSystem(
  'rail.tradeTick',
  { reads: [Rail], writes: [Town], phase: 'tick', order: 3.5 },
  (w, { riderPct }: Tick) => {
    if (w.get(Rail, railId(w))!.trains < 0) return;
    TRADE.routes.forEach((r) => {
      const id = townId(w, r.town),
        t = w.mut(Town, id)!;
      t.acc += townBuildings() * TRADE.ridersPerMin * riderPct;
      while (t.acc >= RIDER_UNIT) {
        t.acc -= RIDER_UNIT;
        t.wait0 = Math.min(TRADE.crowdCap, t.wait0 + 1);
        t.wait1 = Math.min(TRADE.crowdCap, t.wait1 + 1);
      }
    });
  },
);
/** Train `slot` has just come to a stand at a halt (before it turns at an end): if that is the route halt its riders
 * ride to (the one ahead the way it came), they step off: `alighted` grows by them, and their fares (each
 * `fareOf(route, farePct)`, charged once a rider a trip, here) land in the one strongbox up to its cap (`landed`), the
 * rest counted in `lost`. */
export function ridersArrive(w: World, slot: number, pct: TradePct) {
  const route = lineRoute(RAIL_TRAINS[slot]!.line);
  if (route < 0) return;
  const r = w.get(Train, trainId(w, slot))!;
  if (!r.riders || r.at !== routeAhead(w, route, trainDir(r))) return;
  const n = r.riders,
    rt = TRADE.routes[route]!;
  w.mut(Train, trainId(w, slot))!.riders = 0;
  w.mut(Town, townId(w, rt.town))!.alighted += n;
  const tid = w.single(Till),
    till = w.get(Till, tid)!;
  const fares = n * fareOf(w, route, pct.farePct),
    land = Math.min(fares, Math.max(0, boxCap(w, pct) - till.boogles));
  const m = w.mut(Till, tid)!;
  m.boogles += land;
  m.landed += land;
  m.lost += fares - land;
}
/** Train `slot` standing at a route halt, leaving toward the other (an end's train has already turned): the riders
 * waiting there to ride its way board, up to its seats; `boarded` grows by them. Called every tick it stands. */
export function ridersBoard(w: World, slot: number) {
  const route = lineRoute(RAIL_TRAINS[slot]!.line);
  if (route < 0) return;
  const r = w.get(Train, trainId(w, slot))!;
  if (r.phase !== TRAIN_PHASE.STAND || r.at < 0) return;
  const dir = trainDir(r),
    waiting = waitingFor(w, route, r.at, dir),
    n = Math.min(trainSeats() - r.riders, waiting);
  if (n <= 0) return;
  const rt = TRADE.routes[route]!,
    t = w.mut(Town, townId(w, rt.town))!;
  if (r.at === rt.a) t.wait0 -= n;
  else t.wait1 -= n;
  t.boarded += n;
  w.mut(Train, trainId(w, slot))!.riders += n;
}
