// The greybox route's facts on the world (docs/plans/greybox-route.md, step 3): pure reads that the route's systems
// (./railway-sys-route.ts), the trains' side of the kit (./railway-sys-route-kit.ts), the server's reach checks and
// the load check share. Queries never write. Imports no other query module, so ./railway-queries.ts can read it.
//
//   legId, routeId, legRow, routeRow   the rows
//   legsLaid(w)                  sections laid by RAIL_LEGS slot (what the stops read)
//   legDone, legReached, legOpen, openLeg   a leg complete; reached (built, its `after` complete); open (reached, not
//                                complete); the open leg on a line
//   legSection(w, k)             the section being fed (its index), or -1 with the leg complete
//   legKitHalt(line), legKitStop(w, k)   where a leg's kit loads (its line's home halt) and unloads (the rack's halt)
//   legKitCap(w, k)              one kit: the current section's bill (one kit a train)
//   legKitNeed(w, k)             the kit still to load for the sections owed ahead (LEG_TUNE.kitLead)
//   legRackNeed(w, k)            what the current section still lacks, fed and racked
//   legKitSurplus(w, slot)       the leg kit aboard a train that no open leg's remaining sections lack (it goes home)
//   legKitOwed(w, line, r)       an empty train on `line` is owed a kit at its kit halt (within kitTrains)
//   legKitTrains, legKitCarriers  the trains that may carry kit (running less one), and those that do
//   legKitWaiting(w, line, r)    the kit aboard cannot unload at any halt open now (the stone stop's test)
//   gateLeg(g)                   the leg and section a RAIL_GATES row shuts
//   haltHead(w, halt)            the head a `heads` halt stands at now (the Railhead's ring head, a leg's sections)
import type { World } from '../ecs/index.ts';
import { RAIL_HALTS, RAIL_LINES, RAIL_TRAINS, legBuilt } from './railway-lines.ts';
import { LEG_TUNE, RAIL_LEGS, legS } from './railway-route.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { TRAIN_PHASE, type RailTrain } from './railway-train.ts';
import { Account, Aperture, Leg, Rail, Route, Train } from './railway-components.ts';

export const legId = (w: World, slot: number) => w.lookup(Leg, slot)!;
export const routeId = (w: World) => w.single(Route);
export const legRow = (w: World, slot: number) => w.get(Leg, legId(w, slot))!;
export const routeRow = (w: World) => w.get(Route, routeId(w))!;
/** Sections laid, by RAIL_LEGS slot. */
export const legsLaid = (w: World): number[] => RAIL_LEGS.map((_l, k) => legRow(w, k).laid);
/** Leg k's sections are all laid. */
export const legDone = (w: World, k: number) => legRow(w, k).laid >= RAIL_LEGS[k]!.sections.length;
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
  const from = legS(leg, leg.fromCm);
  return RAIL_LINES[leg.line]!.halts.findIndex((h) => h.s === from);
}
const billOf = (k: number, from: number, to: number) => {
  let logs = 0,
    rails = 0;
  for (const s of RAIL_LEGS[k]!.sections.slice(from, to)) [logs, rails] = [logs + s.logs, rails + s.rails];
  return { logs, rails };
};
/** One kit (one train's): the current section's bill. */
export function legKitCap(w: World, k: number) {
  const s = RAIL_LEGS[k]!.sections[legRow(w, k).laid];
  return s ? { logs: s.logs, rails: s.rails } : { logs: 0, rails: 0 };
}
/** Leg kit units of leg k's line aboard its trains (a train's `legKit` cargo; the steel works' kit is not the leg's),
 * less train `skip`'s. */
const aboardLine = (w: World, line: number, key: 'logs' | 'rails', skip = -1) =>
  LINE_SLOTS[line]!.reduce((n, s) => {
    const t = w.get(Train, w.lookup(Train, s)!)!;
    return n + (t.legKit && s !== skip ? t[key] : 0);
  }, 0);
/** Logs or rails on the players' backs (a unit lifted off the rack on its way to the frame). */
const onBacks = (w: World, key: 'carry' | 'rails') => {
  let n = 0;
  w.each([Account], (_id, a) => (n += a[key]));
  return n;
};
/** The kit still to load for leg k (ruling 1.4, "the kit runs ahead by the whole leg"): the bills of the current
 * section and the next LEG_TUNE.kitLead - 1, less what is fed, on the rack (Rail.depot, Rail.depotRails: the
 * train-fed rack, Q6's and Q7's), aboard the line's trains and on the players' backs. A unit lifted off the rack and
 * then dropped, or fed to another bill, is owed again (the step 4 review's finding 2: a unit taken from one rack can
 * never short the leg's bill), so the leg can always complete. */
export const legKitNeed = (w: World, k: number) => kitOwed(w, k, -1);
/** legKitNeed, not counting what train `skip` carries (-1: every train's). */
function kitOwed(w: World, k: number, skip: number) {
  const leg = RAIL_LEGS[k]!,
    row = legRow(w, k),
    rail = w.get(Rail, w.single(Rail))!,
    to = Math.min(leg.sections.length, row.laid + LEG_TUNE.kitLead);
  const out = billOf(k, row.laid, to);
  return {
    logs: Math.max(0, out.logs - row.logs - rail.depot - aboardLine(w, leg.line, 'logs', skip) - onBacks(w, 'carry')),
    rails: Math.max(
      0,
      out.rails - row.rails - rail.depotRails - aboardLine(w, leg.line, 'rails', skip) - onBacks(w, 'rails'),
    ),
  };
}
/** The leg kit aboard train `slot` (its `legKit` cargo) that no leg on its line can use: all of it while no leg there
 * is open (the leg is complete), else what passes the open leg's remaining sections' lack (legKitNeed without this
 * train's). It goes home at the kit halt (legKitArrive), as the steel works' surplus does (steelArrives). */
export function legKitSurplus(w: World, slot: number) {
  const r = w.get(Train, w.lookup(Train, slot)!)!;
  if (!r.legKit) return { logs: 0, rails: 0 };
  const k = openLeg(w, RAIL_TRAINS[slot]!.line);
  if (k < 0) return { logs: r.logs, rails: r.rails };
  const owed = kitOwed(w, k, slot);
  return { logs: Math.max(0, r.logs - owed.logs), rails: Math.max(0, r.rails - owed.rails) };
}
/** What leg k's current section still lacks, counting what is fed and on the rack: a train unloads only this. */
export function legRackNeed(w: World, k: number) {
  const s = RAIL_LEGS[k]!.sections[legRow(w, k).laid],
    row = legRow(w, k),
    rail = w.get(Rail, w.single(Rail))!;
  if (!s || row.start >= 0) return { logs: 0, rails: 0 };
  return {
    logs: Math.max(0, s.logs - row.logs - rail.depot),
    rails: Math.max(0, s.rails - row.rails - rail.depotRails),
  };
}
/** An empty train on `line` is owed a kit: the line's open leg still has kit to load. */
/** The trains of `line` that may carry a leg's kit at once (`kitTrains`, call 65): those running less one, so one kit
 * car stays empty (for build 2's steel). */
export const legKitTrains = (w: World, line: number) =>
  Math.max(
    0,
    LINE_SLOTS[line]!.filter((s) => w.get(Train, w.lookup(Train, s)!)!.phase !== TRAIN_PHASE.SHED).length - 1,
  );
/** The trains of `line` carrying a leg's kit now (the steel works' kit rides the car `kitTrains` leaves empty). */
export const legKitCarriers = (w: World, line: number) =>
  LINE_SLOTS[line]!.filter((s) => {
    const t = w.get(Train, w.lookup(Train, s)!)!;
    return t.legKit && t.logs + t.rails > 0;
  }).length;
/** Row `r` on `line` carries a leg's kit that cannot unload at any halt open now: its open leg's current section
 * lacks nothing it carries (the next railhead is not open yet). Ruling D: such a train makes the stone stop. A Q
 * job's kit can always unload (no leg is open before the rivet). */
export function legKitWaiting(w: World, line: number, r: Readonly<RailTrain>) {
  const k = openLeg(w, line);
  if (k < 0 || !r.legKit || r.logs + r.rails <= 0) return false;
  const need = legRackNeed(w, k);
  return !(r.logs > 0 && need.logs > 0) && !(r.rails > 0 && need.rails > 0);
}
export function legKitOwed(w: World, line: number, r: Readonly<RailTrain>) {
  const k = openLeg(w, line);
  if (k < 0 || r.logs + r.rails > 0) return false;
  if (legKitCarriers(w, line) >= legKitTrains(w, line)) return false;
  const need = legKitNeed(w, k);
  return need.logs > 0 || need.rails > 0;
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
