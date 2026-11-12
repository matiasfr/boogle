// The greybox route's kit on the trains (docs/plans/greybox-route.md, step 3, and the design review of 12 November,
// ruling 1.4: "the kit runs ahead by the whole leg, one kit a train"): the trains' side of a leg's kit, called from
// the trains' step (./railway-sys-trains.ts) as slice 5's freight is. A train standing at its line's kit halt (the
// Village) with room loads one section's kit while the leg's kitLead sections still owe kit, at most kitTrains of them
// (the running trains less one: ruling C, call 65); it keeps running its
// service with the kit aboard, and at the leg's rack (its first halt, then its railhead) unloads what the current
// section still lacks, the rest riding on until a later section's railhead opens. Transfers are atomic inside the
// tick's apply. Pure integers. On line 2 the steel works' kit comes first (call 64): a leg's kit loads only when the
// works wants none, onto a train not carrying the works', and is marked `Train.legKit` so neither side reads the other's.
//
//   legKitService(w, slot, r)   the kit's service stop: the rack's halt while this train carries kit it can unload
//   legKitArrive(w, slot)       come to a stand: unload onto the rack (Rail.depot and Rail.depotRails); at the kit
//                               halt the kit no leg can use goes home (logs unmade, rails to the forge rack)
//   legKitLoad(w, slot, tick)   standing at the kit halt: load, holding for the forge's rails as Q6's and Q7's kit does
//   legKitLifted, legKitPut      the rack's units on backs: lifted off the rack (counted held), off a back (not)
//   legKitRelease                a leaver's units no longer counted held (the host's leaver check)
import { defineSystem, type World } from '../ecs/index.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';
import { RAIL_LEGS } from './railway-route.ts';
import { steelNeed } from './railway-queries.ts';
import { TRAIN, type RailTrain, type ServiceStop } from './railway-train.ts';
import { Account, Forge, Leg, Rail, Train } from './railway-components.ts';
import {
  legHeldRoom,
  legId,
  legKitCap,
  legKitCarriers,
  legKitHalt,
  legKitNeed,
  legKitStop,
  legKitTrains,
  legKitSurplus,
  legOpen,
  legRackNeed,
  legRow,
  openLeg,
} from './railway-queries-route.ts';

const trainOf = (w: World, slot: number) => w.lookup(Train, slot)!;
/** The kit's service stop for train `slot` (row `r`): its line's open leg's rack halt, while it carries kit the current
 * section still lacks. Its kit halt needs none: it is the line's first halt, an end every train stands at. */
export function legKitService(w: World, slot: number, r: Readonly<RailTrain>): ServiceStop {
  const k = openLeg(w, RAIL_TRAINS[slot]!.line);
  if (k < 0 || !r.legKit || r.logs + r.rails <= 0) return () => false;
  const at = legKitStop(w, k),
    need = legRackNeed(w, k),
    some = (r.logs > 0 && need.logs > 0) || (r.rails > 0 && need.rails > 0);
  return (stop) => some && stop === at;
}
/** Train `slot` has come to a stand: at its line's open leg's rack halt it unloads what the current section still
 * lacks (fed and racked), up to what it carries; at its kit halt the kit no leg there can use goes home (legKitHome). */
export function legKitArrive(w: World, slot: number) {
  const line = RAIL_TRAINS[slot]!.line,
    k = openLeg(w, line),
    r = w.get(Train, trainOf(w, slot))!;
  if (!r.legKit || r.logs + r.rails <= 0) return;
  if (r.at === legKitHalt(line)) return legKitHome(w, slot);
  if (k < 0 || r.at !== legKitStop(w, k)) return;
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
  if (m.logs + m.rails === 0) m.legKit = false;
}
/** Train `slot` at its kit halt sends home the leg kit no leg on its line can use (legKitSurplus: the leg is complete,
 * or its remaining sections lack none of it, fed from backs while it rode), as the steel works' surplus goes home
 * (steelArrives, build 2's P2-1): its logs off the books (made here, they are unmade: Rail.depotProduced and the leg's
 * loadedLogs, so the depot's output still balances), its rails back onto the forge rack (out of loadedRails); with
 * nothing left aboard the mark clears, and the works may load the car again. */
function legKitHome(w: World, slot: number) {
  const out = legKitSurplus(w, slot);
  if (!out.logs && !out.rails) return;
  const m = w.mut(Train, trainOf(w, slot))!;
  m.logs -= out.logs;
  m.rails -= out.rails;
  if (m.logs + m.rails === 0) m.legKit = false;
  w.mut(Rail, w.single(Rail))!.depotProduced -= out.logs;
  if (out.rails) w.mut(Forge, w.single(Forge))!.rack += out.rails;
  // Out of the loaded counts of the line's legs that loaded it, the latest first.
  let logs = out.logs,
    rails = out.rails;
  for (let k = RAIL_LEGS.length - 1; k >= 0 && logs + rails > 0; k--) {
    if (RAIL_LEGS[k]!.line !== RAIL_TRAINS[slot]!.line) continue;
    const row = w.get(Leg, legId(w, k))!,
      dl = Math.min(logs, row.loadedLogs),
      dr = Math.min(rails, row.loadedRails);
    if (!dl && !dr) continue;
    const leg = w.mut(Leg, legId(w, k))!;
    leg.loadedLogs -= dl;
    leg.loadedRails -= dr;
    [logs, rails] = [logs - dl, rails - dr];
  }
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
  // Steel first (call 64; owner, 12 November): the steel works' kit has the kit car and the forge's rails first. A leg's
  // kit loads only when the works wants none brought (steelNeed: its kit is fed, in the yard or aboard), and never onto
  // a train carrying the works' kit, so a train never carries both.
  if (line === LINE2) {
    const steel = steelNeed(w);
    if (steel.logs + steel.rails > 0 || (!r.legKit && r.logs + r.rails > 0)) return 'on';
  }
  // At most `kitTrains` (the running trains less one) carry kit: an empty train loads only below that.
  if (r.logs + r.rails === 0 && legKitCarriers(w, line) >= legKitTrains(w, line)) return 'on';
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
    m.legKit = true;
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
// ---------------------------------------------------------------- the rack's units on backs (review of step 3, P2-2)
/** The open leg loading at its line's home halt, whose rack is the depot shelf (Rail.depot, Rail.depotRails), or -1
 * (the catalog opens one leg at a time). */
const rackLeg = (w: World) => RAIL_LEGS.findIndex((l, k) => l.kit === 'home' && legOpen(w, k));
/** `logs` and `rails` lifted off the leg rack onto a back (rail.depotTake, rail.depotRailTake): the open leg counts
 * them held (Leg.heldLogs, Leg.heldRails), up to what its remaining sections still lack (legHeldRoom), so a train does
 * not load them twice while they are carried to the frame. */
export function legKitLifted(w: World, logs: number, rails: number) {
  const k = rackLeg(w);
  if (k < 0 || logs + rails <= 0) return;
  const room = legHeldRoom(w, k),
    row = legRow(w, k),
    m = w.mut(Leg, legId(w, k))!;
  m.heldLogs = Math.min(room.logs, row.heldLogs + logs);
  m.heldRails = Math.min(room.rails, row.heldRails + rails);
}
/** `logs` and `rails` gone off a back (fed to a frame, dropped, fed to the steel works, the kiln or the cradle; or a
 * leaver's, released): each leg's held count falls by as many, never under 0. A unit that may not be the rack's still
 * counts off, so a doubt is a unit owed again (a train brings one more; it goes home if no section takes it), never one
 * short. */
export function legKitPut(w: World, logs: number, rails: number) {
  if (logs + rails <= 0) return;
  for (let k = 0; k < RAIL_LEGS.length; k++) {
    const row = legRow(w, k);
    if (!row.heldLogs && !row.heldRails) continue;
    const m = w.mut(Leg, legId(w, k))!;
    m.heldLogs -= Math.min(row.heldLogs, logs);
    m.heldRails -= Math.min(row.heldRails, rails);
  }
}
const heldAll = (w: World) => RAIL_LEGS.reduce((n, _l, k) => n + legRow(w, k).heldLogs + legRow(w, k).heldRails, 0);
/** A player stayed away past the grace (the host's leaver check, as for a footing's carrier): what they carry is no
 * longer counted held, so a leg is never short a leaver's units (they are loaded again). `epoch` refuses a release for
 * a session that has since changed. Returns the units released from the count. */
export const legKitRelease = defineSystem(
  'rail.legKitRelease',
  { reads: [Account], writes: [Leg], phase: 'legKit', order: 0 },
  (w, q: { pid: string; epoch: number }) => {
    const id = w.lookup(Account, q.pid);
    const a = id === undefined ? undefined : w.get(Account, id)!;
    if (!a || a.epoch !== q.epoch) return 0;
    const before = heldAll(w);
    legKitPut(w, a.carry, a.rails);
    return before - heldAll(w);
  },
);
export const railLegKitRelease = (w: World, pid: string, epoch: number): number => w.run(legKitRelease, { pid, epoch });
/** Who carries logs or rails while a leg counts units held, and in which session (the host's leaver check; accepted
 * state only). None while no leg holds any. */
export function railLegKitHolders(w: World) {
  const out: { pid: string; epoch: number }[] = [];
  if (!heldAll(w)) return out;
  w.each([Account], (_id, a) => void (a.carry + a.rails > 0 && out.push({ pid: a.pid, epoch: a.epoch })));
  return out;
}
