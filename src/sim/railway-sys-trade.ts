// The town economy's systems (docs/plans/slice5-town-economy.md, R1): the yards' crates, and the trains' side of the
// freight that ./railway-sys-trains.ts's TrainIO calls. Pure integers; the numbers are ./railway-trade-layout.ts's.
//
//   yardTick (rail.yardTick)   while the trains run, each yard makes a crate every `everyTicks` up to its cap
//   freightLoads(w, slot)      a train standing at its line's yard heading home loads what it has room for
//   freightArrives(w, slot)    a train come to a stand at its line's Village halt unloads into the Town
import { defineSystem, type World } from '../ecs/index.ts';
import { RAIL_TRAINS } from './railway-lines.ts';
import { TRAIN_PHASE, trainDir } from './railway-train.ts';
import { TRADE } from './railway-trade-layout.ts';
import { Rail, Town, Train, Yard, YardClock } from './railway-components.ts';
import { railId, trainId } from './railway-queries.ts';
import { lineYard, townId, yardId } from './railway-queries-trade.ts';
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
 * `min(freightCap - freight, stock)`: whatever it stopped for (an end, a lever or a rider ask, the kit or the wagon).
 * Freight never adds a stop (slice 5, R1 as built).
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
/** Train `slot` has just come to a stand at its line's Village halt: its freight lands in the Town's count for its
 * yard's goods (timber at line 1's, stone at line 2's). */
export function freightArrives(w: World, slot: number) {
  const y = lineYard(RAIL_TRAINS[slot]!.line);
  if (y < 0) return;
  const r = w.get(Train, trainId(w, slot))!,
    yard = TRADE.yards[y]!;
  if (r.at !== yard.home || !r.freight) return;
  w.mut(Town, townId(w, 0))![yard.goods] += r.freight;
  w.mut(Train, trainId(w, slot))!.freight = 0;
}
