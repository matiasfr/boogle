// The greybox route's kit on the trains (docs/plans/greybox-route.md, step 3, and the design review of 12 November,
// ruling 1.4: "the kit runs ahead by the whole leg, one kit a train"): the trains' side of a leg's kit, called from
// the trains' step (./railway-sys-trains.ts) as slice 5's freight is. A train standing at its line's kit halt (the
// Village) with room loads one section's kit while the leg's kitLead sections still owe kit; it keeps running its
// service with the kit aboard, and at the leg's rack (its first halt, then its railhead) unloads what the current
// section still lacks, the rest riding on until a later section's railhead opens. Transfers are atomic inside the
// tick's apply. Pure integers.
//
//   legKitService(w, slot, r)   the kit's service stop: the rack's halt while this train carries kit it can unload
//   legKitArrive(w, slot)       come to a stand: unload onto the rack (Rail.depot and Rail.depotRails)
//   legKitLoad(w, slot, tick)   standing at the kit halt: load, holding for the forge's rails as Q6's and Q7's kit does
import type { World } from '../ecs/index.ts';
import { RAIL_TRAINS } from './railway-lines.ts';
import { TRAIN, type RailTrain, type ServiceStop } from './railway-train.ts';
import { Forge, Leg, Rail, Train } from './railway-components.ts';
import { legId, legKitCap, legKitHalt, legKitNeed, legKitStop, legRackNeed, openLeg } from './railway-queries-route.ts';

const trainOf = (w: World, slot: number) => w.lookup(Train, slot)!;
/** The kit's service stop for train `slot` (row `r`): its line's open leg's rack halt, while it carries kit the current
 * section still lacks. Its kit halt needs none: it is the line's first halt, an end every train stands at. */
export function legKitService(w: World, slot: number, r: Readonly<RailTrain>): ServiceStop {
  const k = openLeg(w, RAIL_TRAINS[slot]!.line);
  if (k < 0 || r.logs + r.rails <= 0) return () => false;
  const at = legKitStop(w, k),
    need = legRackNeed(w, k),
    some = (r.logs > 0 && need.logs > 0) || (r.rails > 0 && need.rails > 0);
  return (stop) => some && stop === at;
}
/** Train `slot` has come to a stand: at its line's open leg's rack halt it unloads what the current section still
 * lacks (fed and racked), up to what it carries. */
export function legKitArrive(w: World, slot: number) {
  const k = openLeg(w, RAIL_TRAINS[slot]!.line);
  if (k < 0) return;
  const r = w.get(Train, trainOf(w, slot))!;
  if (r.at !== legKitStop(w, k) || r.logs + r.rails <= 0) return;
  const need = legRackNeed(w, k),
    logs = Math.min(r.logs, need.logs),
    rails = Math.min(r.rails, need.rails);
  if (!logs && !rails) return;
  const rail = w.mut(Rail, w.single(Rail))!,
    m = w.mut(Train, trainOf(w, slot))!;
  rail.depot += logs;
  rail.depotRails += rails;
  m.logs -= logs;
  m.rails -= rails;
}
/** Train `slot`, standing, before its dwell is judged: at its line's kit halt it loads the open leg's kit, up to one
 * section's bill aboard (one kit a train): logs minted (counted production, as the depot's), rails off the forge rack.
 * While rails are still owed and the forge is lit it holds up to TRAIN.kitWaitTicks past its dwell, as Q6's and Q7's
 * kit does. */
export function legKitLoad(w: World, slot: number, tick: number): 'hold' | 'on' {
  const line = RAIL_TRAINS[slot]!.line,
    k = openLeg(w, line);
  if (k < 0) return 'on';
  const r = w.get(Train, trainOf(w, slot))!;
  if (r.at !== legKitHalt(line)) return 'on';
  const cap = legKitCap(w, k),
    need = legKitNeed(w, k),
    forge = w.get(Forge, w.single(Forge))!;
  const logs = Math.max(0, Math.min(cap.logs - r.logs, need.logs)),
    rails = Math.max(0, Math.min(cap.rails - r.rails, need.rails, forge.rack));
  if (logs || rails) {
    const rail = w.mut(Rail, w.single(Rail))!,
      leg = w.mut(Leg, legId(w, k))!,
      m = w.mut(Train, trainOf(w, slot))!;
    rail.depotProduced += logs;
    leg.loadedLogs += logs;
    m.logs += logs;
    leg.loadedRails += rails;
    m.rails += rails;
    if (rails) w.mut(Forge, w.single(Forge))!.rack -= rails;
  }
  const now = w.get(Train, trainOf(w, slot))!;
  if (
    now.rails < cap.rails &&
    legKitNeed(w, k).rails > 0 &&
    forge.lit >= 0 &&
    tick < now.depart + TRAIN.dwellTicks + TRAIN.kitWaitTicks
  )
    return 'hold';
  return 'on';
}
