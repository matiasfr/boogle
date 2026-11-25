// The greybox route's facts on the world (docs/plans/greybox-route.md, step 3): pure reads that the route's systems
// (./railway-sys-route.ts), the trains' side of the kit (./railway-sys-route-kit.ts), the server's reach checks and
// the load check share. Queries never write. Imports no other query module, so ./railway-queries.ts can read it.
//
//   legId, routeId, legRow, routeRow   the rows
//   legsLaid(w)                  sections laid by RAIL_LEGS slot (what the stops read)
//   legDone, legReached, legOpen, openLeg   a leg complete; reached (built, its `after` complete); open (reached, not
//                                complete); the open leg on a line
//   tradeOpen(w, line)           a trade line's Quick or Strong trade is open (garage step 4: TRADE_OPENS)
//   LEG_KIT_MOST                 the most of one kind in a kit bill (the cargo bound's unit)
//   legSection(w, k)             the section being fed (its index), or -1 with the leg complete
//   legKitHalt(line), legKitStop(w, k)   where a leg's kit loads (its line's home halt) and unloads (the rack's halt)
//   legKitCap(w, k)              one kit: the current section's bill (one kit a train)
//   legMintLine, MINT_LEGS, YARD_LEGS, legYardDrop, legYard, legKitDrop, legsServed   the kit's roles (greybox-leg2):
//                                which line mints a leg's kit, which loads it from a yard, where each unloads
//   legKitNeed(w, k)             the kit still to mint for the sections owed ahead (LEG_TUNE.kitLead), the yard and
//                                every line's aboard units counted; legYardOwed what a yard leg's trains may still take
//   legKitRoom(w, line, k)       what a train of `line` may unload for leg k at its drop: the rack's, the yard's
//   legHeldRoom(w, k)            the most a leg's held counts (units lifted off its rack onto backs) may reach
//   legRackNeed(w, k)            what the current section still lacks, fed and racked
//   legKitSurplus(w, slot)       the leg kit aboard a train that no loading leg its line serves lacks (it goes home)
//   legKitOwed(w, line, r)       an empty train on `line` is owed a kit at its kit halt (within kitTrains)
//   legKitTrains, legKitCarriers  the trains that may carry kit (line 2: running less one; else all), and those that do
//   legKitWaiting(w, line, r)    the kit aboard cannot unload at any halt open now (the stone stop's test)
//   gateLeg(g)                   the leg and section a RAIL_GATES row shuts
//   haltHead(w, halt)            the head a `heads` halt stands at now (the Railhead's ring head, a leg's sections)
import type { World } from '../ecs/index.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS, legBuilt } from './railway-lines.ts';
import { LEG_TUNE, RAIL_LEGS, RAIL_YARDS, TRADE_LEG, TRADE_OPENS, isTradeLine, legStartS } from './railway-route.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { TRAIN_PHASE, type RailTrain } from './railway-train.ts';
import { Account, Aperture, Leg, LegYard, Route, Train } from './railway-components.ts';

export const legId = (w: World, slot: number) => w.lookup(Leg, slot)!;
export const routeId = (w: World) => w.single(Route);
export const legRow = (w: World, slot: number) => w.get(Leg, legId(w, slot))!;
export const routeRow = (w: World) => w.get(Route, routeId(w))!;
/** Sections laid, by RAIL_LEGS slot. */
export const legsLaid = (w: World): number[] => RAIL_LEGS.map((_l, k) => legRow(w, k).laid);
/** Leg k's sections are all laid. */
export const legDone = (w: World, k: number) => legRow(w, k).laid >= RAIL_LEGS[k]!.sections.length;
/** A trade line's Quick or Strong trade is open (garage step 4): its first leg has TRADE_OPENS' sections laid. */
export const tradeOpen = (w: World, line: number) =>
  isTradeLine(line) && legRow(w, TRADE_LEG[line]!).laid >= TRADE_OPENS[line]!;
/** The most of each kind one kit bill holds, over every leg's sections: a leg-kit train carries at most its row's
 * `kitBills` of it (the load check's cargo bound and boilerAdopt's kit guard). */
export const LEG_KIT_MOST = Math.max(...RAIL_LEGS.flatMap((l) => l.sections.map((s) => Math.max(s.logs, s.rails))));
/** Leg k may be built on: its rules are built (legBuilt) and the leg before it is complete (`after` -1: Ring Island's
 * rivet struck). */
export function legReached(w: World, k: number) {
  const leg = RAIL_LEGS[k];
  if (!leg || !legBuilt(k)) return false;
  return leg.after < 0 ? w.get(Aperture, w.single(Aperture))!.joined >= 0 : legDone(w, leg.after);
}
/** Leg k takes kit and feeding now: reached (legReached) and not complete. */
export const legOpen = (w: World, k: number) => legReached(w, k) && !legDone(w, k);
/** The open leg on `line` whose kit loads at the line's home halt, or -1 (the catalog opens one leg at a time: each
 * leg's `after` is the one before it). */
export const openLeg = (w: World, line: number) =>
  RAIL_LEGS.findIndex((l, k) => l.line === line && l.kit === 'home' && legOpen(w, k));
/** The section of leg k being fed or laid now, or -1 once it is complete. */
export const legSection = (w: World, k: number) => (legDone(w, k) ? -1 : legRow(w, k).laid);
/** The halt a line's legs load their kit at: its home halt (line 2's Village). */
export const legKitHalt = (line: number) => RAIL_LINES[line]!.home;
/** The halt (an index on its line) leg k's rack stands at now: its first halt while nothing is laid, then the head of the
 * last section laid; -1 once complete. */
export function legKitStop(w: World, k: number) {
  const leg = RAIL_LEGS[k]!,
    laid = legRow(w, k).laid;
  if (laid >= leg.sections.length) return -1;
  // One halt a head (call 88): the head of the last section laid.
  if (laid > 0) return leg.railheadHalt + laid - 1;
  const from = legStartS(leg);
  return RAIL_LINES[leg.line]!.halts.findIndex((h) => h.s === from);
}
const billOf = (k: number, from: number, to: number) => {
  let logs = 0,
    rails = 0;
  for (const s of RAIL_LEGS[k]!.sections.slice(from, to)) [logs, rails] = [logs + s.logs, rails + s.rails];
  return { logs, rails };
};
/** Capacity ends with the last bill of this leg, even with a second kit car. */
export function legKitCap(w: World, k: number, bills = 1) {
  const from = legRow(w, k).laid;
  return billOf(k, from, from + bills);
}
/** Leg kit units aboard `line`'s trains (a train's `legKit` cargo; the steel works' kit is not a leg's), less train
 * `skip`'s. */
function aboardKit(w: World, line: number, skip = -1): Kit {
  let logs = 0,
    rails = 0;
  for (const s of LINE_SLOTS[line]!) {
    const t = w.get(Train, w.lookup(Train, s)!)!;
    if (t.legKit && s !== skip) [logs, rails] = [logs + t.logs, rails + t.rails];
  }
  return { logs, rails };
}
/** What leg k's held counts may reach (Leg.heldLogs, Leg.heldRails): its remaining sections' bills less what is fed
 * (nothing once it is complete). The load check's bound; a lift is clamped to it. */
export function legHeldRoom(w: World, k: number) {
  const row = legRow(w, k),
    out = billOf(k, row.laid, RAIL_LEGS[k]!.sections.length);
  return { logs: out.logs - row.logs, rails: out.rails - row.rails };
}
/** Leg k's units on backs: those each account lifted off its rack and has not fed or put down (Account.legLogs,
 * Account.legRails; their sum is Leg.heldLogs, Leg.heldRails), each never more than that back carries (a unit that
 * left it by a way that does not count it off). */
export function heldKit(w: World, k: number): Kit {
  if (!legRow(w, k).heldLogs && !legRow(w, k).heldRails) return NONE;
  let logs = 0,
    rails = 0;
  w.each([Account], (_id, a) => {
    if (a.liftLeg !== k) return;
    logs += Math.min(a.legLogs, a.carry);
    rails += Math.min(a.legRails, a.rails);
  });
  return { logs, rails };
}
/** Logs and rails of a leg's kit. */
export type Kit = { logs: number; rails: number };
export const NONE: Kit = { logs: 0, rails: 0 };
/** `a` less `b`, each never under 0. */
export const less = (a: Kit, b: Kit): Kit => ({
  logs: Math.max(0, a.logs - b.logs),
  rails: Math.max(0, a.rails - b.rails),
});
export const sum = (ks: readonly Kit[]): Kit =>
  ks.reduce((a, b) => ({ logs: a.logs + b.logs, rails: a.rails + b.rails }), NONE);

// ---------------------------------------------------------------- the kit's roles (docs/plans/greybox-leg2.md, step 2)
// A leg's kit is minted at a line's home halt (logs made, rails off the forge rack) by the trains of its MINT line: its
// own line, or for a yard leg (`kit` a RAIL_YARDS index) its feeder's line, whose trains unload it at the feeder's
// destination halt onto the rack (what the current section lacks while the rack stands there) and into the yard. A
// yard leg's own line's trains load it from the yard at their home halt (the yard's) and carry it to its rack. So the
// incline's kit relays line 2 -> High Gorge's rack and yard -> the `ns` trains -> the incline's head.
/** A yard leg's feeder (RAIL_YARDS[kit].fedBy), or -1 for a leg whose kit loads at its own line's home. */
const feederOf = (k: number) => {
  const kit = RAIL_LEGS[k]!.kit;
  return kit === 'home' ? -1 : RAIL_YARDS[kit]!.fedBy;
};
/** The line whose trains mint leg k's kit at their home halt. */
export const legMintLine = (k: number) => RAIL_LEGS[feederOf(k) < 0 ? k : feederOf(k)]!.line;
/** Built legs by the line that mints their kit, in RAIL_LEGS order (line 2: the stack, then the incline). */
export const MINT_LEGS: readonly (readonly number[])[] = RAIL_LINES.map((_l, line) =>
  RAIL_LEGS.flatMap((_g, k) => (legBuilt(k) && legMintLine(k) === line ? [k] : [])),
);
/** Built yard legs by their own line, whose trains load them from the yard (the `ns` line: the incline). */
export const YARD_LEGS: readonly (readonly number[])[] = RAIL_LINES.map((_l, line) =>
  RAIL_LEGS.flatMap((l, k) => (legBuilt(k) && l.kit !== 'home' && l.line === line ? [k] : [])),
);
/** The legs whose kit a line's trains carry (minted or out of a yard), in RAIL_LEGS order. */
export const SERVED_LEGS: readonly (readonly number[])[] = RAIL_LINES.map((_l, line) =>
  [...MINT_LEGS[line]!, ...YARD_LEGS[line]!].sort((a, b) => a - b),
);
/** A future leg starts holding trades when its prerequisite finishes. */
export const tradeBuildDone = (w: World, line: number) =>
  SERVED_LEGS[line]!.every((k) => !legReached(w, k) || legDone(w, k));
/** A saved second fit may predate either ending leg. */
export const tradeRepickReached = (w: World, line: number) =>
  SERVED_LEGS[line]!.every((k) => RAIL_LEGS[k]!.area === 9 || legDone(w, k));
/** Why a line cannot change its boiler. The garage reads the same saved lays and revision as an install. */
export function tradeSwapRefusal(w: World, line: number, revision: number) {
  if (revision > 0 && !tradeBuildDone(w, line)) return 'trade-building';
  if (revision >= 2) return 'trade-repicked';
  return undefined;
}
/** Built legs whose first kit is stocked (the stand-in, legKitStock): minted at their own line's home, on a line their
 * first section gives its track (its first halt opens with it, so no train can bring that kit). */
export const STOCKED_LEGS: readonly number[] = RAIL_LEGS.flatMap((l, k) =>
  legBuilt(k) && l.kit === 'home' && RAIL_LINES[l.line]!.halts[0]?.leg?.slot === k ? [k] : [],
);
/** Where the mint line's trains unload yard leg k's kit: its feeder's destination halt (line 2's High Gorge). */
export function legYardDrop(k: number) {
  const f = RAIL_LEGS[feederOf(k)]!;
  return f.railheadHalt + f.sections.length - 1;
}
/** Yard leg k's yard row (LegYard) and its id. */
export const legYardId = (w: World, k: number) => w.lookup(LegYard, RAIL_LEGS[k]!.kit as number)!;
export const legYard = (w: World, k: number) => w.get(LegYard, legYardId(w, k))!;
/** What leg k still lacks for the sections owed ahead (ruling 1.4, "the kit runs ahead by the whole leg": the current
 * section and the next LEG_TUNE.kitLead - 1), less what is fed, on the rack (Rail.depot, Rail.depotRails, the open
 * leg's: one leg is open at a time) and lifted off the rack onto backs (heldKit; the step 3 review's P2-2: not every
 * back's logs and rails, so the steel works' rails held, or a leaver's, never short it). A unit lifted off the rack
 * and then dropped, or fed to another bill, is owed again (the step 4 review's finding 2), so the leg can always
 * complete. */
function legLack(w: World, k: number): Kit {
  const leg = RAIL_LEGS[k]!,
    row = legRow(w, k),
    out = billOf(k, row.laid, Math.min(leg.sections.length, row.laid + LEG_TUNE.kitLead)),
    held = heldKit(w, k);
  return less(out, {
    logs: row.logs + row.rackLogs + held.logs,
    rails: row.rails + row.rackRails + held.rails,
  });
}
/** What yard leg k's own line's trains may still take from the yard: its lack less what they carry (less `skip`'s). */
export const legYardOwed = (w: World, k: number, skip = -1) =>
  less(legLack(w, k), aboardKit(w, RAIL_LEGS[k]!.line, skip));
/** A yard leg's lack beyond its yard and every train of its own line: what is still to mint. */
const yardLack = (w: World, k: number) => less(legYardOwed(w, k), legYard(w, k));
/** Its feeder can fill this yard before the branch's own trains may load there. */
export const legYardAhead = (w: World, k: number) => !!RAIL_LEGS[k]!.kitAhead && legOpen(w, RAIL_LEGS[k]!.after);
/** A mint line's legs, each with whether it is loading and what it is still owed, over the line's aboard units (less
 * train `skip`'s), the first leg first; `spare` is the aboard units no loading leg lacks. A leg loads while it is
 * open, or while its kit rides ahead (greybox-leg2.md, "the kit ahead"): the leg before it on the same mint line is
 * open and owed nothing more, so line 2 brings the incline's kit while the stack's last section is still fed. */
export function legMintChain(w: World, line: number, skip = -1) {
  const legs = MINT_LEGS[line]!,
    loading: boolean[] = [],
    owed: Kit[] = [];
  let spare = aboardKit(w, line, skip);
  legs.forEach((k, i) => {
    const leg = RAIL_LEGS[k]!,
      prev = owed[i - 1];
    const on =
      legOpen(w, k) ||
      legYardAhead(w, k) ||
      (i > 0 && legs[i - 1] === leg.after && loading[i - 1]! && legOpen(w, leg.after) && !prev!.logs && !prev!.rails);
    loading.push(on);
    if (!on) return owed.push(NONE);
    const lack = leg.kit === 'home' ? legLack(w, k) : yardLack(w, k);
    const use = { logs: Math.min(spare.logs, lack.logs), rails: Math.min(spare.rails, lack.rails) };
    spare = less(spare, use);
    owed.push(less(lack, use));
  });
  return { legs, loading, owed, spare };
}
/** The kit still to mint for leg k: what it lacks less its yard, its own line's trains and the mint line's aboard units
 * the legs before it do not take (legMintChain). Zero for a leg that is not loading. */
export function legKitNeed(w: World, k: number): Kit {
  const ch = legMintChain(w, legMintLine(k)),
    i = ch.legs.indexOf(k);
  return i < 0 ? NONE : ch.owed[i]!;
}
/** The open yard leg `line`'s trains load from the yard, or -1. */
export const legOpenYard = (w: World, line: number) => YARD_LEGS[line]!.find((k) => legOpen(w, k)) ?? -1;
/** The leg kit aboard train `slot` (its `legKit` cargo) that no leg its line serves can use: all of it while none is
 * loading, else what passes their lack (counted without this train's). It goes home at the kit halt (legKitArrive), as
 * the steel works' surplus does (steelArrives). */
export function legKitSurplus(w: World, slot: number): Kit {
  const r = w.get(Train, w.lookup(Train, slot)!)!,
    line = RAIL_TRAINS[slot]!.line;
  if (!r.legKit) return NONE;
  if (MINT_LEGS[line]!.length) return less(r, sum(legMintChain(w, line, slot).owed));
  const k = legOpenYard(w, line);
  return k < 0 ? { logs: r.logs, rails: r.rails } : less(r, legYardOwed(w, k, slot));
}
/** What leg k's current section still lacks, counting what is fed, on the rack and lifted off it onto backs (heldKit:
 * the review of greybox leg 2, P2 and P3, as legKitNeed counts them): a train unloads only this, and the stand-in stocks
 * only this. Nothing for a leg that is not open (its rack is not the depot shelf yet) or laying. */
export function legRackNeed(w: World, k: number) {
  const s = RAIL_LEGS[k]!.sections[legRow(w, k).laid],
    row = legRow(w, k);
  if (!s || row.start >= 0 || !legOpen(w, k)) return { logs: 0, rails: 0 };
  const held = heldKit(w, k);
  return less(s, {
    logs: row.logs + row.rackLogs + held.logs,
    rails: row.rails + row.rackRails + held.rails,
  });
}
/** The halt (on `line`) where its trains unload leg k's kit: the feeder's destination for a yard leg minted on another
 * line, else the leg's rack halt (legKitStop). */
export const legKitDrop = (w: World, line: number, k: number) =>
  RAIL_LEGS[k]!.line === line ? legKitStop(w, k) : legYardDrop(k);
/** What a train of `line` may unload for open leg k at its drop halt now: the rack's lack (legRackNeed), and for a yard
 * leg minted here, while nothing is laid (its rack stands at the drop halt), that first, then the yard's room (what
 * its remaining sections lack past the rack, the yard and its own line's trains). Nothing for a leg not open. */
export function legKitRoom(w: World, line: number, k: number) {
  const leg = RAIL_LEGS[k]!;
  if (leg.kitAhead && line === legMintLine(k) && (legOpen(w, k) || legYardAhead(w, k)))
    return { rack: NONE, yard: yardLack(w, k) };
  if (!legOpen(w, k)) return { rack: NONE, yard: NONE };
  if (RAIL_LEGS[k]!.line === line) return { rack: legRackNeed(w, k), yard: NONE };
  const rack = legRow(w, k).laid === 0 ? legRackNeed(w, k) : NONE;
  return { rack, yard: less(yardLack(w, k), rack) };
}
/** The open legs whose kit `line`'s trains carry, in RAIL_LEGS order. */
export const legsServed = (w: World, line: number) =>
  SERVED_LEGS[line]!.filter((k) => legOpen(w, k) || (legYardAhead(w, k) && line === legMintLine(k)));
/** Row `r` of `line` carries kit that open leg k may take at its drop now (legKitRoom). */
export function legKitFits(w: World, line: number, k: number, r: Readonly<RailTrain>) {
  const { rack, yard } = legKitRoom(w, line, k);
  return (r.logs > 0 && rack.logs + yard.logs > 0) || (r.rails > 0 && rack.rails + yard.rails > 0);
}
/** Leg k's kit may be loaded: the leg is reached, or the leg before it is (its kit rides ahead). The load check's bound
 * on legMintChain's loading test, which also needs the leg before open and owed nothing more. */
export const legKitMayLoad = (w: World, k: number) =>
  legReached(w, k) || (RAIL_LEGS[k]!.after >= 0 && legReached(w, RAIL_LEGS[k]!.after));
/** The trains of `line` that may carry a leg's kit at once (`kitTrains`, call 65): on line 2 those running less one, so
 * one kit car stays empty for build 2's steel, which only line 2 carries; on any other line every running train
 * (greybox-leg2.md, step 2). */
export function legKitTrains(w: World, line: number) {
  const running = LINE_SLOTS[line]!.filter((s) => w.get(Train, w.lookup(Train, s)!)!.phase !== TRAIN_PHASE.SHED).length;
  return line === LINE2 ? Math.max(0, running - 1) : running;
}
/** The trains of `line` carrying a leg's kit now (the steel works' kit rides the car `kitTrains` leaves empty). */
export const legKitCarriers = (w: World, line: number) =>
  LINE_SLOTS[line]!.filter((s) => {
    const t = w.get(Train, w.lookup(Train, s)!)!;
    return t.legKit && t.logs + t.rails > 0;
  }).length;
/** Row `r` on `line` carries a leg's kit that cannot unload at any halt open now: no open leg its line serves lacks
 * anything it carries at its drop (the next railhead is not open yet, or the kit rides ahead of its leg). Ruling D:
 * such a train makes the stone stop. With no leg open it carries surplus home (an errand). A Q job's kit can always
 * unload (no leg is open before the rivet). */
export function legKitWaiting(w: World, line: number, r: Readonly<RailTrain>) {
  if (!r.legKit || r.logs + r.rails <= 0) return false;
  const open = legsServed(w, line);
  if (!open.length) return false;
  return !open.some((k) => legKitFits(w, line, k, r));
}
/** An empty train on `line` is owed a kit at its kit halt (within kitTrains): its mint line's loading legs are still
 * owed kit, or its open yard leg's yard holds units its trains have not taken. */
export function legKitOwed(w: World, line: number, r: Readonly<RailTrain>) {
  if (r.logs + r.rails > 0 || legKitCarriers(w, line) >= legKitTrains(w, line)) return false;
  if (MINT_LEGS[line]!.length) {
    const need = sum(legMintChain(w, line).owed);
    return need.logs > 0 || need.rails > 0;
  }
  const k = legOpenYard(w, line);
  if (k < 0) return false;
  const owe = legYardOwed(w, k),
    y = legYard(w, k);
  return (owe.logs > 0 && y.logs > 0) || (owe.rails > 0 && y.rails > 0);
}
/** The leg and section RAIL_GATES[g] shuts, or undefined. */
export function gateLeg(g: number) {
  for (const [leg, l] of RAIL_LEGS.entries()) {
    const section = l.sections.findIndex((s) => s.gate === g);
    if (section >= 0) return { leg, section };
  }
  return undefined;
}
/** The head a `heads` halt (a RAIL_HALTS id) stands at now: a leg's railhead by its sections laid, Ring Island's
 * Railhead by its bent (`ring`, ./railway-queries.ts's ringHead). */
export function haltHead(w: World, halt: number, ring: number) {
  const h = RAIL_HALTS[halt];
  if (!h?.heads) return 0;
  if (!h.leg) return ring;
  return Math.max(0, Math.min(h.heads.length - 1, legRow(w, h.leg.slot).laid - 1 - h.leg.section));
}
