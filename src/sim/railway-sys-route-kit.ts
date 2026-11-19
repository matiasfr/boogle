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
//   legKitService(w, slot, r)   the kit's service stops: each open leg's drop while this train carries kit it can unload
//   legKitArrive(w, slot)       come to a stand: unload onto the rack (Rail.depot and Rail.depotRails), then a yard
//                               leg's yard (LegYard); at the kit halt the kit no leg can use goes home (logs unmade,
//                               rails to the forge rack)
//   legKitLoad(w, slot, tick)   standing at the kit halt: load (minted, holding for the forge's rails as Q6's and Q7's
//                               kit does; or, on a yard leg's line, out of the yard)
//   legKitStock(w)              the stand-in: an open leg with no track yet has its first rack stocked from Home's
//   legYardHome(w, k)           a completed yard leg's yard goes home
//   legKitLifted, legKitPut      the rack's units on backs: lifted off the rack (counted held), off a back (not)
//   legKitRelease                a leaver's units no longer counted held (the host's leaver check)
import { defineSystem, type World } from '../ecs/index.ts';
import { deckHeld } from './railway-queries-trade.ts';
import { LINE2, RAIL_TRAINS } from './railway-lines.ts';
import { RAIL_LEGS, legRack } from './railway-route.ts';
import { RAILS } from './railway-line2-layout.ts';
import { steelNeed } from './railway-queries.ts';
import { TRAIN, type RailTrain, type ServiceStop } from './railway-train.ts';
import { Account, Aperture, Forge, Leg, LegYard, Pile, Rail, Train } from './railway-components.ts';
import {
  heldKit,
  MINT_LEGS,
  SERVED_LEGS,
  STOCKED_LEGS,
  sum,
  legHeldRoom,
  legId,
  legKitCap,
  legKitCarriers,
  legKitDrop,
  legKitFits,
  legKitHalt,
  legKitRoom,
  legKitSurplus,
  legKitTrains,
  legMintChain,
  legOpen,
  legOpenYard,
  legRackNeed,
  legRow,
  legYard,
  legYardId,
  legYardOwed,
  legsServed,
  type Kit,
} from './railway-queries-route.ts';

const trainOf = (w: World, slot: number) => w.lookup(Train, slot)!;
/** The kit's service stops for train `slot` (row `r`): the drop halt of each open leg its line serves that lacks
 * something it carries (legKitRoom). Its kit halt needs none: it is the line's first halt, an end every train stands
 * at. */
export function legKitService(w: World, slot: number, r: Readonly<RailTrain>): ServiceStop {
  const line = RAIL_TRAINS[slot]!.line;
  if (!r.legKit || r.logs + r.rails <= 0) return () => false;
  const at = legsServed(w, line).flatMap((k) => (legKitFits(w, line, k, r) ? [legKitDrop(w, line, k)] : []));
  return (stop) => at.includes(stop);
}
/** Train `slot` has come to a stand: at each open leg's drop halt it unloads what that leg may take (legKitRoom), the
 * rack's first (Rail.depot and Rail.depotRails), then the yard's (LegYard), up to what it carries; at its kit halt the
 * kit no leg it serves can use goes home (legKitHome). */
export function legKitArrive(w: World, slot: number) {
  const line = RAIL_TRAINS[slot]!.line,
    r = w.get(Train, trainOf(w, slot))!;
  if (!r.legKit || r.logs + r.rails <= 0) return;
  if (r.at === legKitHalt(line)) return legKitHome(w, slot);
  for (const k of legsServed(w, line)) {
    if (r.at !== legKitDrop(w, line, k)) continue;
    const { rack } = legKitRoom(w, line, k);
    move(w, slot, rack, (logs, rails) => {
      const rail = w.mut(Rail, w.single(Rail))!;
      rail.depot += logs;
      rail.depotRails += rails;
    });
    // The yard's room, read after the rack's share is on the rack.
    const { yard } = legKitRoom(w, line, k);
    move(w, slot, yard, (logs, rails) => {
      const y = w.mut(LegYard, legYardId(w, k))!;
      y.logs += logs;
      y.rails += rails;
    });
  }
}
/** Off train `slot`, up to `room` and what it carries, into `put`; with nothing left aboard its kit mark clears. */
function move(w: World, slot: number, room: Kit, put: (logs: number, rails: number) => void) {
  const r = w.get(Train, trainOf(w, slot))!,
    logs = Math.min(r.logs, room.logs),
    rails = Math.min(r.rails, room.rails);
  if (!logs && !rails) return;
  put(logs, rails);
  const m = w.mut(Train, trainOf(w, slot))!;
  m.logs -= logs;
  m.rails -= rails;
  if (m.logs + m.rails === 0) m.legKit = false;
}
/** `logs` and `rails` of leg kit gone home (a train's surplus at its kit halt, a completed yard leg's yard), as the
 * steel works' surplus goes home (steelArrives, build 2's P2-1): its logs off the books (minted, they are unmade:
 * Rail.depotProduced and the loaded counts, so the depot's output still balances), its rails back onto the forge rack;
 * out of the loaded counts of `legs`, the latest first. */
function kitHome(w: World, legs: readonly number[], logs: number, rails: number) {
  w.mut(Rail, w.single(Rail))!.depotProduced -= logs;
  if (rails) w.mut(Forge, w.single(Forge))!.rack += rails;
  for (const k of [...legs].reverse()) {
    if (logs + rails <= 0) break;
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
/** Train `slot` at its kit halt sends home the leg kit no leg its line serves can use (legKitSurplus: the leg is
 * complete, or its remaining sections lack none of it, fed from backs while it rode); with nothing left aboard the
 * mark clears, and the works may load the car again. */
function legKitHome(w: World, slot: number) {
  const line = RAIL_TRAINS[slot]!.line,
    out = legKitSurplus(w, slot);
  if (!out.logs && !out.rails) return;
  const m = w.mut(Train, trainOf(w, slot))!;
  m.logs -= out.logs;
  m.rails -= out.rails;
  if (m.logs + m.rails === 0) m.legKit = false;
  kitHome(w, SERVED_LEGS[line]!, out.logs, out.rails);
}
/** A yard leg completed: whatever its yard still holds goes home (greybox-leg2.md, "Completion"). */
export function legYardHome(w: World, k: number) {
  if (RAIL_LEGS[k]!.kit === 'home') return;
  const y = legYard(w, k);
  if (!y.logs && !y.rails) return;
  kitHome(w, [k], y.logs, y.rails);
  const m = w.mut(LegYard, legYardId(w, k))!;
  m.logs = m.rails = 0;
}
/** The stand-in (greybox-leg2.md, "the bay cut's first kit is stocked", open question 2): an open leg minted at its
 * own line's home with nothing laid, on a line with no track yet (no train can bring its first kit), has its rack
 * stocked from Home's stock: what the section lacks (fed, racked and held counted: legRackNeed), logs minted, rails off
 * the forge rack as they are there (as kit loading waits for them). It stands in for one train's load, so what it has
 * loaded never passes the bill (the review of greybox leg 2, P2): a unit put down there is taken up again from its pile,
 * not minted again. A lost unit is owed again only when it leaves the leg's books, and only its rails (no player can
 * take rails by hand at this stage: rail.forgeTake gives none once the cradle is fitted), as the re-check's P1 asked:
 * a leaver's rails released after the grace (legKitRelease) and put-down rails the supply pulse returns to the forge
 * rack (legKitRecovered) come off its loaded count (legStandInLost), so it stocks them again. A leaver's logs are made
 * up by chopping, and recovered logs go to the recovery rack, where anyone takes them. How goods cross Home to the
 * West landing is still open (greybox-route section 3). */
export function legKitStock(w: World) {
  for (const k of STOCKED_LEGS) {
    if (legRow(w, k).laid > 0 || !legOpen(w, k)) continue;
    const need = legRackNeed(w, k),
      row = legRow(w, k),
      bill = RAIL_LEGS[k]!.sections[0]!,
      forge = w.get(Forge, w.single(Forge))!,
      logs = Math.max(0, Math.min(need.logs, bill.logs - row.loadedLogs)),
      rails = Math.max(0, Math.min(need.rails, bill.rails - row.loadedRails, forge.rack));
    if (!logs && !rails) continue;
    const rail = w.mut(Rail, w.single(Rail))!,
      m = w.mut(Leg, legId(w, k))!;
    rail.depot += logs;
    rail.depotProduced += logs;
    rail.depotRails += rails;
    m.loadedLogs += logs;
    m.loadedRails += rails;
    if (rails) w.mut(Forge, w.single(Forge))!.rack -= rails;
  }
}
/** Train `slot`, standing, before its dwell is judged: at its line's kit halt it loads kit, up to one section's bill
 * aboard (one kit a train). A mint line's: its loading legs' owed (the first first; logs minted, counted production as
 * the depot's, rails off the forge rack), holding up to TRAIN.kitWaitTicks past its dwell while rails are still owed
 * and the forge is lit, as Q6's and Q7's kit does. A yard line's: its open yard leg's, out of the yard, no hold. */
export function legKitLoad(w: World, slot: number, tick: number): 'hold' | 'on' {
  const line = RAIL_TRAINS[slot]!.line,
    r = w.get(Train, trainOf(w, slot))!;
  if (deckHeld(r) || r.at !== legKitHalt(line)) return 'on';
  if (!MINT_LEGS[line]!.length) return yardLoad(w, slot);
  // Steel first (call 64; owner, 12 November): the steel works' kit has the kit car and the forge's rails first. A leg's
  // kit loads only when the works wants none brought (steelNeed: its kit is fed, in the yard or aboard), and never onto
  // a train carrying the works' kit, so a train never carries both.
  if (line === LINE2) {
    const steel = steelNeed(w);
    if (steel.logs + steel.rails > 0 || (!r.legKit && r.logs + r.rails > 0)) return 'on';
  }
  // At most `kitTrains` carry kit: an empty train loads only below that.
  if (r.logs + r.rails === 0 && legKitCarriers(w, line) >= legKitTrains(w, line)) return 'on';
  const ch = legMintChain(w, line),
    first = ch.legs.findIndex((_k, i) => ch.loading[i] && ch.owed[i]!.logs + ch.owed[i]!.rails > 0);
  if (first < 0) return 'on';
  const cap = legKitCap(w, ch.legs[first]!),
    want = sum(ch.owed),
    forge = w.get(Forge, w.single(Forge))!;
  let logs = Math.max(0, Math.min(cap.logs - r.logs, want.logs)),
    rails = Math.max(0, Math.min(cap.rails - r.rails, want.rails, forge.rack));
  if (logs || rails) {
    const m = w.mut(Train, trainOf(w, slot))!;
    w.mut(Rail, w.single(Rail))!.depotProduced += logs;
    m.logs += logs;
    m.rails += rails;
    m.legKit = true;
    if (rails) w.mut(Forge, w.single(Forge))!.rack -= rails;
    // Loaded for the legs it is owed to, the first first.
    ch.legs.forEach((k, i) => {
      const dl = Math.min(logs, ch.owed[i]!.logs),
        dr = Math.min(rails, ch.owed[i]!.rails);
      if (!dl && !dr) return;
      const leg = w.mut(Leg, legId(w, k))!;
      leg.loadedLogs += dl;
      leg.loadedRails += dr;
      [logs, rails] = [logs - dl, rails - dr];
    });
  }
  const now = w.get(Train, trainOf(w, slot))!;
  if (
    now.rails < cap.rails &&
    forge.lit >= 0 &&
    tick < now.depart + TRAIN.dwellTicks + TRAIN.kitWaitTicks &&
    sum(legMintChain(w, line).owed).rails > 0
  )
    return 'hold';
  return 'on';
}
/** A yard line's train at its kit halt (the yard's) takes its open yard leg's kit from the yard: up to one section's
 * bill aboard and what the leg's sections still lack past its line's trains. */
function yardLoad(w: World, slot: number): 'on' {
  const line = RAIL_TRAINS[slot]!.line,
    k = legOpenYard(w, line),
    r = w.get(Train, trainOf(w, slot))!;
  if (k < 0 || (r.logs + r.rails > 0 && !r.legKit)) return 'on';
  if (r.logs + r.rails === 0 && legKitCarriers(w, line) >= legKitTrains(w, line)) return 'on';
  const cap = legKitCap(w, k),
    owe = legYardOwed(w, k),
    y = legYard(w, k),
    logs = Math.max(0, Math.min(cap.logs - r.logs, owe.logs, y.logs)),
    rails = Math.max(0, Math.min(cap.rails - r.rails, owe.rails, y.rails));
  if (!logs && !rails) return 'on';
  const ym = w.mut(LegYard, legYardId(w, k))!,
    m = w.mut(Train, trainOf(w, slot))!;
  ym.logs -= logs;
  ym.rails -= rails;
  m.logs += logs;
  m.rails += rails;
  m.legKit = true;
  return 'on';
}
// ---------------------------------------------------------------- the rack's units on backs (review of step 3, P2-2)
// Each account counts what it lifted off the open leg's rack and still carries toward its frame (Account.legLogs,
// Account.legRails); the leg's held counts (Leg.heldLogs, Leg.heldRails) are their sum, moved with them, so the kit
// owed reads one number and a release takes off one account's own units only.
/** The open leg, whose rack is the depot shelf (Rail.depot, Rail.depotRails), or -1 (the catalog opens one leg at a
 * time, whichever line mints its kit). */
const LIFT_MAX = 255;
const rackLeg = (w: World) => RAIL_LEGS.findIndex((_l, k) => legOpen(w, k));
/** Move account `aid`'s lifted counts and leg k's held counts together by `dl` logs and `dr` rails. */
function moveHeld(w: World, aid: number, k: number, dl: number, dr: number) {
  if (!dl && !dr) return;
  const a = w.mut(Account, aid)!,
    m = w.mut(Leg, legId(w, k))!;
  a.legLogs += dl;
  a.legRails += dr;
  m.heldLogs += dl;
  m.heldRails += dr;
}
/** The leg whose held counts are nonzero (the open rack leg, or one that just completed), or -1. */
const heldLeg = (w: World) => RAIL_LEGS.findIndex((_l, k) => legRow(w, k).heldLogs + legRow(w, k).heldRails > 0);
/** `logs` and `rails` lifted off the leg rack onto account `aid`'s back (rail.depotTake, rail.depotRailTake): counted
 * on that account and its open leg, up to what the leg's remaining sections still lack (legHeldRoom), so a train does
 * not load them twice while they are carried to the frame. */
export function legKitLifted(w: World, aid: number, logs: number, rails: number) {
  const k = rackLeg(w);
  if (k < 0 || logs + rails <= 0) return;
  const room = legHeldRoom(w, k),
    row = legRow(w, k),
    a = w.get(Account, aid)!;
  // Each account's count is a u8 (Account.legLogs, Account.legRails): a back never holds near 255.
  moveHeld(
    w,
    aid,
    k,
    Math.max(0, Math.min(logs, room.logs - row.heldLogs, LIFT_MAX - a.legLogs)),
    Math.max(0, Math.min(rails, room.rails - row.heldRails, LIFT_MAX - a.legRails)),
  );
}
/** `logs` and `rails` gone off account `aid`'s back (fed to a frame, dropped, fed to the steel works, the kiln or the
 * cradle): its lifted counts, and its leg's, fall by as many, never under 0, then trimLegHeld. A unit that may not be
 * the rack's still counts off, so a doubt is a unit owed again (a train brings one more; it goes home if no section
 * takes it), never one short. */
export function legKitPut(w: World, aid: number, logs: number, rails: number) {
  const a = w.get(Account, aid)!,
    k = heldLeg(w);
  if (k >= 0) moveHeld(w, aid, k, -Math.min(a.legLogs, logs), -Math.min(a.legRails, rails));
  trimLegHeld(w);
}
/** Keep the held counts within what the open rack leg's remaining sections still lack (legHeldRoom; nothing once no
 * leg is open): a feed of units from elsewhere, or the last lay, leaves less room, and the counts past it come off the
 * accounts in entity order (owed again; a surplus goes home). */
export function trimLegHeld(w: World) {
  const k = heldLeg(w);
  if (k < 0) return;
  const open = rackLeg(w),
    room = open === k ? legHeldRoom(w, k) : { logs: 0, rails: 0 },
    row = legRow(w, k);
  let logs = Math.max(0, row.heldLogs - room.logs),
    rails = Math.max(0, row.heldRails - room.rails);
  if (!logs && !rails) return;
  const cut: [number, number, number][] = [];
  w.each([Account], (id, a) => {
    const dl = Math.min(logs, a.legLogs),
      dr = Math.min(rails, a.legRails);
    if (dl || dr) cut.push([id, dl, dr]);
    [logs, rails] = [logs - dl, rails - dr];
  });
  for (const [id, dl, dr] of cut) moveHeld(w, id, k, -dl, -dr);
}
/** A player stayed away past the grace (the host's leaver check, as for a footing's carrier): what they lifted off the
 * rack is no longer counted held, so a leg is never short a leaver's units (they are loaded again). Their own units
 * only: idempotent (a second release finds none), and state, so it survives a restart. `epoch` refuses a release for a
 * session that has since changed. Returns the units released from the count. */
export const legKitRelease = defineSystem(
  'rail.legKitRelease',
  { reads: [Rail, Aperture], writes: [Leg, Account], phase: 'legKit', order: 0 },
  (w, q: { pid: string; epoch: number }) => {
    const id = w.lookup(Account, q.pid);
    const a = id === undefined ? undefined : w.get(Account, id)!;
    const k = heldLeg(w);
    if (!a || a.epoch !== q.epoch || k < 0 || a.legLogs + a.legRails <= 0) return 0;
    const n = a.legLogs + a.legRails,
      rails = a.legRails;
    moveHeld(w, id!, k, -a.legLogs, -a.legRails);
    // The stand-in's rails gone with a leaver are owed again (the re-check of greybox leg 2, P1), never more than it
    // has lost (the second re-check's P2: the shelf may hold the leg before's leftovers, lifted too).
    if (standing(w, k)) w.mut(Leg, legId(w, k))!.loadedRails -= Math.min(rails, legStandInLost(w, k).rails);
    return n;
  },
);
export const railLegKitRelease = (w: World, pid: string, epoch: number): number => w.run(legKitRelease, { pid, epoch });
/** Stocked leg k is standing in (legKitStock): open with nothing laid. */
const standing = (w: World, k: number) => STOCKED_LEGS.includes(k) && legRow(w, k).laid === 0 && legOpen(w, k);
/** Rails the supply pulse returned to the forge rack from abandoned piles: an open stand-in's rails that are lost (put
 * down and not taken up again: legStandInLost) come off its loaded count, as many as were returned and no more, so it
 * stocks them again from the forge rack they are back on (the re-check of greybox leg 2, P1). */
export function legKitRecovered(w: World, rails: number) {
  for (const k of STOCKED_LEGS) {
    if (rails <= 0 || !standing(w, k)) continue;
    const back = Math.min(rails, legStandInLost(w, k).rails);
    if (back <= 0) continue;
    w.mut(Leg, legId(w, k))!.loadedRails -= back;
    rails -= back;
  }
}
/** What stand-in leg k has loaded that is not on its rack, counted held on a back (heldKit, as legRackNeed counts it)
 * or fed: put down, carried off uncounted, or a leaver's before the grace. Never under 0 (the rack may hold the leg
 * before's leftovers). */
export function legStandInLost(w: World, k: number): Kit {
  const row = legRow(w, k),
    rail = w.get(Rail, w.single(Rail))!,
    held = heldKit(w, k);
  return {
    logs: Math.max(0, row.loadedLogs - rail.depot - held.logs - row.logs),
    rails: Math.max(0, row.loadedRails - rail.depotRails - held.rails - row.rails),
  };
}
/** Units taken off a pile by account `aid` while a stand-in stands: what it has lost of that kind counts held again
 * (the second re-check of greybox leg 2, P1: a unit put down and taken up again was no longer counted, so a leaver
 * carrying it off left the section short unseen), capped at the lost count and the held room. */
export function legKitRetaken(w: World, aid: number, logs: number, rails: number) {
  for (const k of STOCKED_LEGS) {
    if (logs + rails <= 0 || !standing(w, k)) continue;
    const lost = legStandInLost(w, k),
      room = legHeldRoom(w, k),
      row = legRow(w, k),
      a = w.get(Account, aid)!;
    moveHeld(
      w,
      aid,
      k,
      Math.max(0, Math.min(logs, lost.logs, room.logs - row.heldLogs, LIFT_MAX - a.legLogs)),
      Math.max(0, Math.min(rails, lost.rails, room.rails - row.heldRails, LIFT_MAX - a.legRails)),
    );
  }
}
/** How near the stand-in's rack a pile must lie to hold the backstop off (cm): a unit put down there is taken up again. */
const BACKSTOP_NEAR_CM = 3000;
/** The stand-in's liveness backstop (the second re-check of greybox leg 2): at a supply pulse that opens a new minute
 * (the host sends one a minute while the room plays; railway-sys-away.ts, supply), a standing stand-in whose section
 * is short (legRackNeed: fed, racked and counted held) with units it has lost (legStandInLost) and no pile of that
 * kind within BACKSTOP_NEAR_CM of its rack is made whole: lost rails come off its loaded count (legKitStock stocks
 * them again from the forge rack on the next tick, so rails stay conserved and loaded never passes the bill), lost
 * logs are minted onto its rack. At most once a minute, so it bounds how fast logs can be minted by losing them; it is
 * the floor under every other path (a leaver, a pile recovered, a unit carried off uncounted), not a replacement. */
export function legStandInBackstop(w: World) {
  for (const k of STOCKED_LEGS) {
    if (!standing(w, k)) continue;
    const need = legRackNeed(w, k),
      lost = legStandInLost(w, k),
      rack = legRack(RAIL_LEGS[k]!, 0);
    const near = (kind: number) => {
      let found = false;
      w.each([Pile], (_id, p) => {
        const dx = p.x - rack.x,
          dz = p.z - rack.z;
        if (p.kind === kind && p.n > 0 && dx * dx + dz * dz <= BACKSTOP_NEAR_CM * BACKSTOP_NEAR_CM) found = true;
      });
      return found;
    };
    const rails = Math.min(need.rails, lost.rails),
      logs = Math.min(need.logs, lost.logs);
    if (rails > 0 && !near(RAILS)) w.mut(Leg, legId(w, k))!.loadedRails -= rails;
    if (logs > 0 && !near(0)) {
      const r = w.mut(Rail, w.single(Rail))!,
        m = w.mut(Leg, legId(w, k))!;
      r.depot += logs;
      r.depotProduced += logs;
      m.loadedLogs += logs;
    }
  }
}
/** Who carries units lifted off a leg's rack, and in which session (the host's leaver check; accepted state only). */
export function railLegKitHolders(w: World) {
  const out: { pid: string; epoch: number }[] = [];
  w.each([Account], (_id, a) => void (a.legLogs + a.legRails > 0 && out.push({ pid: a.pid, epoch: a.epoch })));
  return out;
}
