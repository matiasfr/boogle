// The railway's actions as a client asks for them (docs/plans/ecs-m12-m13.md, M12f): the intent shapes, an event's
// intent read back off the wire, the sets the session's submit and settle judge by, and the adapter's action methods.
// Nothing here sends, predicts or plays: that is railway-session.ts.
import { RAILWAY_SOURCES } from '../sim/railway-layout.ts';
import { activeStation, MAX_KIND_CAPACITY } from '../sim/railway-queries.ts';
import { railInt, railYaw } from '../sim/railway.ts';
import { LINE1_STATIONS, LINE1_HARDWOODS, type RailMaterial, type LineStationId } from '../sim/railway-line-layout.ts';
import type { Line2StationId } from '../sim/railway-line2-layout.ts';
import { BOILER_MAX, LINE_HALTS } from '../sim/railway-train.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS } from '../sim/railway-lines.ts';
import { installAdmits, RAIL_ROCKS, type InstallPart } from '../sim/railway-works-layout.ts';
import { isTradeLine, RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, railPos } from '../sim/railway-route.ts';
import { HALT_YARDS } from '../sim/railway-yard-layout.ts';
import { Pile } from '../sim/railway-components.ts';
import { railBeamChoppable } from '../sim/railway-queries-line1.ts';
import type { World } from '../ecs/index.ts';
import { TRADE } from '../sim/railway-trade-layout.ts';

const pricedPlot = (id: unknown): id is number => railInt(id) && !!TRADE.plots[Math.floor(id / 16)]?.[id % 16];

export type RailwayIntent =
  | { op: 'rail.wake'; tk?: number }
  | { op: 'rail.chop'; id: number; yaw?: number; collapsed?: boolean }
  | { op: 'rail.mine'; id: number }
  | { op: 'rail.axe' | 'rail.beamChop' | 'rail.sack' }
  | { op: 'rail.jump' | 'rail.pack'; station?: 'T1' }
  | {
      op:
        | 'rail.forgeTake'
        | 'rail.lever'
        | 'rail.seaSwitch'
        | 'rail.hook'
        | 'rail.glide'
        | 'rail.yoke'
        | 'rail.breaker'
        | 'rail.kiln'
        | 'rail.cradle'
        | 'rail.steel'
        | 'rail.arrive';
    }
  | { op: 'rail.call'; id: number; dir: -1 | 1; train?: number }
  | { op: 'rail.strike'; id: number }
  | { op: 'rail.buy'; id: number; kind?: number }
  | { op: 'rail.footTake'; rack: 0 | 1 | 2 }
  | { op: 'rail.footSet'; site: 0 | 1 | 2 | 3 }
  | { op: 'rail.brace'; revision: 1 }
  | { op: 'rail.turn'; to: 0 | 1; revision: number }
  | { op: 'rail.steelTake'; kind: 0 | 1 }
  | { op: 'rail.depotTake' | 'rail.depotRailTake'; leg?: number }
  | { op: 'rail.legStock'; leg: number }
  | { op: 'rail.haltPut' | 'rail.haltTake'; yard: number; kind: 0 | 1 | 2 }
  | { op: 'rail.grant' | 'rail.gate'; id: number }
  | { op: 'rail.install'; site: number; line: number; part: InstallPart; revision: number }
  | { op: 'rail.bring'; site: number; line: number; revision: number }
  | { op: 'rail.boilerTake' | 'rail.boilerFit'; revision: number }
  | { op: 'rail.boilerDrop'; revision: number; x: number; y: number; z: number }
  | { op: 'rail.beamTake'; revision: number }
  | { op: 'rail.beamDrop'; revision: number; x: number; y: number; z: number }
  | { op: 'rail.beamDeposit'; revision: number; station: 'T3' }
  | { op: 'rail.take'; id: number; kind?: RailMaterial | 2 | 3 }
  | { op: 'rail.rackTake'; kind?: RailMaterial }
  | { op: 'rail.deposit'; station: LineStationId | Line2StationId | 'F'; n: number; kind?: RailMaterial | 2 }
  | { op: 'rail.drop'; x: number; y?: number; z: number; n: number; kind?: RailMaterial | 2 | 3 };

/** The most a back ever carries of one kind (logs with the pack, stone with the breaker): the wire's bound on a moved
 * count; the rule clips to today's back. */
export const CARRY_MAX = MAX_KIND_CAPACITY;
export function intentOf(e: Record<string, unknown>): RailwayIntent | null {
  if (e.op === 'rail.buy' && pricedPlot(e.id)) {
    if (e.kind === undefined) return { op: e.op, id: e.id };
    return railInt(e.kind, 15) ? { op: e.op, id: e.id, kind: e.kind } : null;
  }
  if (e.op === 'rail.wake') return { op: e.op };
  if (e.op === 'rail.sack') return { op: e.op };
  if (e.op === 'rail.jump' || e.op === 'rail.pack')
    return e.station === 'T1' ? { op: e.op, station: 'T1' } : e.station === undefined ? { op: e.op } : null;
  const kind = e.kind === 1 ? 1 : e.kind === 2 ? 2 : 0;
  if (
    e.op === 'rail.breaker' ||
    e.op === 'rail.kiln' ||
    e.op === 'rail.cradle' ||
    e.op === 'rail.steel' ||
    e.op === 'rail.arrive'
  )
    return { op: e.op };
  // Ring Island's steel works and the install (v31): a kind of 0 is left out of the event.
  if (e.op === 'rail.steelTake' && (e.kind === undefined || railInt(e.kind, 1)))
    return { op: e.op, kind: e.kind === 1 ? 1 : 0 };
  if (
    e.op === 'rail.install' &&
    railInt(e.site, 1) &&
    e.line === LINE2 &&
    installAdmits(LINE2, e.part) &&
    railInt(e.revision, BOILER_MAX + 1)
  )
    return { op: e.op, site: e.site, line: LINE2, part: e.part, revision: e.revision };
  // Garage step 4: a trade line's Quick (5) or Strong (6) boiler on the line's install revision, and a line's copy
  // brought to the garage table on the table's bring revision.
  if (
    e.op === 'rail.install' &&
    railInt(e.site, 1) &&
    isTradeLine(e.line) &&
    installAdmits(e.line, e.part) &&
    railInt(e.revision)
  )
    return { op: e.op, site: e.site, line: e.line, part: e.part, revision: e.revision };
  if (e.op === 'rail.bring' && railInt(e.site, 1) && railInt(e.line, RAIL_LINES.length - 1) && railInt(e.revision))
    return { op: e.op, site: e.site, line: e.line, revision: e.revision };
  // The greybox route (docs/plans/greybox-route.md, leg 1 step 4): catalog indexes.
  if (e.op === 'rail.legStock' && railInt(e.leg, RAIL_LEGS.length - 1)) return { op: e.op, leg: e.leg };
  // The halt yards: a HALT_YARDS index and a kind (0 logs, left out of the event; 1 stone; 2 rails).
  if (
    (e.op === 'rail.haltPut' || e.op === 'rail.haltTake') &&
    railInt(e.yard, HALT_YARDS.length - 1) &&
    (e.kind === undefined || railInt(e.kind, 2))
  )
    return { op: e.op, yard: e.yard, kind };
  if (e.op === 'rail.depotTake' || e.op === 'rail.depotRailTake') {
    if (e.leg === undefined) return { op: e.op };
    if (railInt(e.leg, RAIL_LEGS.length - 1)) return { op: e.op, leg: e.leg };
  }
  if (e.op === 'rail.grant' && railInt(e.id, RAIL_GRANTS.length - 1)) return { op: e.op, id: e.id };
  if (e.op === 'rail.gate' && railInt(e.id, RAIL_GATES.length - 1)) return { op: e.op, id: e.id };
  if (e.op === 'rail.strike' && railInt(e.id, 2)) return { op: e.op, id: e.id };
  if (e.op === 'rail.footTake' && railInt(e.rack, 2)) return { op: e.op, rack: e.rack as 0 | 1 | 2 };
  if (e.op === 'rail.footSet' && railInt(e.site, 3)) return { op: e.op, site: e.site as 0 | 1 | 2 | 3 };
  if (e.op === 'rail.brace' && e.revision === 1) return { op: e.op, revision: 1 };
  if (e.op === 'rail.turn' && railInt(e.to, 1) && railInt(e.revision))
    return { op: e.op, to: e.to as 0 | 1, revision: e.revision };
  // A footing goes down and comes up alone, as pile kind 3.
  if (e.op === 'rail.drop' && e.kind === 3 && e.n === 1 && railPos(e.x) && railPos(e.z))
    return { op: e.op, x: e.x, z: e.z, n: 1, kind: 3, ...(railPos(e.y) ? { y: e.y } : {}) };
  if (e.op === 'rail.take' && e.kind === 3 && railInt(e.id)) return { op: e.op, id: e.id, kind: 3 };
  if (
    e.op === 'rail.axe' ||
    e.op === 'rail.beamChop' ||
    e.op === 'rail.forgeTake' ||
    e.op === 'rail.lever' ||
    e.op === 'rail.seaSwitch' ||
    e.op === 'rail.hook' ||
    e.op === 'rail.glide' ||
    e.op === 'rail.yoke'
  )
    return { op: e.op };
  if (e.op === 'rail.call' && railInt(e.id, LINE_HALTS.length - 1) && (e.dir === -1 || e.dir === 1))
    return railInt(e.train, RAIL_TRAINS.length - 1)
      ? { op: e.op, id: e.id, dir: e.dir, train: e.train }
      : { op: e.op, id: e.id, dir: e.dir };
  if ((e.op === 'rail.boilerTake' || e.op === 'rail.boilerFit') && railInt(e.revision))
    return { op: e.op, revision: e.revision };
  if (e.op === 'rail.mine' && railInt(e.id, RAIL_ROCKS.length - 1)) return { op: e.op, id: e.id };
  if (e.op === 'rail.beamTake' && railInt(e.revision)) return { op: e.op, revision: e.revision };
  if (e.op === 'rail.beamDeposit' && railInt(e.revision) && e.station === 'T3')
    return { op: e.op, revision: e.revision, station: 'T3' };
  if (
    (e.op === 'rail.beamDrop' || e.op === 'rail.boilerDrop') &&
    railInt(e.revision) &&
    railPos(e.x) &&
    railPos(e.y) &&
    railPos(e.z)
  )
    return { op: e.op, revision: e.revision, x: e.x, y: e.y, z: e.z };
  if (e.op === 'rail.rackTake') return { op: e.op, kind: kind === 1 ? 1 : 0 };
  if (e.op === 'rail.take' && railInt(e.id)) return { op: e.op, id: e.id, kind };
  if (e.op === 'rail.chop' && railInt(e.id))
    return {
      op: e.op,
      id: e.id,
      ...(railYaw(e.yaw) && typeof e.collapsed === 'boolean' ? { yaw: e.yaw, collapsed: e.collapsed } : {}),
    };
  if (
    e.op === 'rail.deposit' &&
    (e.station === 'T1' ||
      e.station === 'T2' ||
      e.station === 'T3' ||
      e.station === 'F' ||
      e.station === 'Q1' ||
      e.station === 'Q2' ||
      e.station === 'Q3' ||
      e.station === 'Q4' ||
      e.station === 'Q5' ||
      e.station === 'Q6') &&
    railInt(e.n, CARRY_MAX, 1)
  )
    return { op: e.op, station: e.station, n: e.n, kind };
  if (e.op === 'rail.drop' && railInt(e.n, CARRY_MAX, 1) && railPos(e.x) && railPos(e.z))
    return { op: e.op, x: e.x, z: e.z, n: e.n, kind, ...(railPos(e.y) ? { y: e.y } : {}) };
  return null;
}
/** What the server leaves out of an event because the intent already says it (railway-requests.ts EVENT_FIELDS). */
export function implied(v: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...v };
  if ((v.op === 'rail.drop' || v.op === 'rail.deposit') && out.n === undefined) out.n = v.accepted;
  if (v.op === 'rail.drop') {
    out.px ??= v.x;
    out.py ??= v.y;
    out.pz ??= v.z;
  }
  if (v.op === 'rail.take') out.pile ??= v.id;
  return out;
}
/** Pieces flowing to the actor (a correction can return them to whoever got them instead). */
export const TAKES: ReadonlySet<string> = new Set([
  'rail.chop',
  'rail.mine',
  'rail.take',
  'rail.rackTake',
  'rail.forgeTake',
  'rail.depotTake',
  'rail.depotRailTake',
  'rail.footTake',
  'rail.steelTake',
  'rail.haltTake',
]);
/** The ops that never move material, so a held beam does not block them. */
export const NOT_MATERIAL: ReadonlySet<string> = new Set([
  'rail.wake',
  'rail.buy',
  'rail.sack',
  'rail.axe',
  'rail.jump',
  'rail.lever',
  'rail.seaSwitch',
  'rail.hook',
  'rail.glide',
  'rail.pack',
  'rail.yoke',
  'rail.boilerTake',
  'rail.boilerDrop',
  'rail.boilerFit',
  'rail.call',
  'rail.beamChop',
  'rail.beamTake',
  'rail.beamDrop',
  'rail.beamDeposit',
  'rail.breaker',
  'rail.strike',
  'rail.brace',
  'rail.turn',
  'rail.install',
  'rail.grant',
  'rail.bring',
  'rail.gate',
  'rail.arrive',
]);
/** Refused only while you haul the boiler, as the sim refuses them (one thing on your back at a time). */
export const NOT_WHILE_HAULING: ReadonlySet<string> = new Set(['rail.breaker', 'rail.strike']);

/** The adapter's action methods: each checks its arguments and hands one intent to the session's `submit`, which
 * predicts, sends and plays it. `view` is the world the views see now. */
export const railwayActs = (submit: (intent: RailwayIntent) => boolean, view: () => World) => {
  const pileIn = (id: number) => view().get(Pile, id);
  const halt = (op: 'rail.haltPut' | 'rail.haltTake') => (yard: number, kind: 0 | 1 | 2) =>
    railInt(yard, HALT_YARDS.length - 1) && railInt(kind, 2) && submit({ op, yard, kind });
  return {
    wake: () => submit({ op: 'rail.wake' }),
    buy: (slot: number, kind?: number) =>
      pricedPlot(slot) &&
      (kind === undefined || railInt(kind, 15)) &&
      submit({ op: 'rail.buy', id: slot, ...(kind === undefined ? {} : { kind }) }),
    sack: () => submit({ op: 'rail.sack' }),
    openAxe: () => submit({ op: 'rail.axe' }),
    claimJump: (station?: 'T1') => submit({ op: 'rail.jump', station }),
    /** False (rebound now) when the rule would refuse the stroke: before Station 3 opens or once the tree is down. */
    beamChop: () => railBeamChoppable(view()) && submit({ op: 'rail.beamChop' }),
    beamTake: (revision: number) => railInt(revision) && submit({ op: 'rail.beamTake', revision }),
    beamDrop: (x: number, y: number, z: number, revision: number) =>
      railInt(revision) && railPos(x) && railPos(y) && railPos(z) && submit({ op: 'rail.beamDrop', revision, x, y, z }),
    beamDeposit: (revision: number) => railInt(revision) && submit({ op: 'rail.beamDeposit', revision, station: 'T3' }),
    mine: (id: number) => railInt(id, RAIL_ROCKS.length - 1) && submit({ op: 'rail.mine', id }),
    chop(id: number, yaw?: number, collapsed?: boolean) {
      const known =
        RAILWAY_SOURCES.some((source) => source[0] === id) || LINE1_HARDWOODS.some((source) => source[0] === id);
      return known && railYaw(yaw) && typeof collapsed === 'boolean' && submit({ op: 'rail.chop', id, yaw, collapsed });
    },
    take(id: number) {
      // A pile you just dropped has a temporary id until the server names it: it can be taken once it has.
      const pile = id > 0 ? pileIn(id) : undefined;
      const kind = pile?.kind === 1 ? 1 : pile?.kind === 2 ? 2 : pile?.kind === 3 ? 3 : 0;
      return !!pile && submit({ op: 'rail.take', id, kind });
    },
    rackTake: (kind: RailMaterial = 0) => submit({ op: 'rail.rackTake', kind }),
    /** Kind 3 puts down the footing on your back (n 1). */
    drop(x: number, y: number, z: number, n = 1, kind: RailMaterial | 2 | 3 = 0) {
      return (
        railPos(x) &&
        railPos(y) &&
        railPos(z) &&
        railInt(n, kind === 3 ? 1 : CARRY_MAX, 1) &&
        submit({ op: 'rail.drop', x, y, z, n, kind })
      );
    },
    /** Line two: the forge frame ('F') or active Q frame, including while its gate holds laying. */
    depositLine2(station: 'F' | Line2StationId, n = 1, kind: 0 | 2 = 0) {
      return railInt(n, CARRY_MAX, 1) && submit({ op: 'rail.deposit', station, n, kind });
    },
    forgeTake: () => submit({ op: 'rail.forgeTake' }),
    depotTake: (leg?: number) => submit({ op: 'rail.depotTake', leg }),
    depotRailTake: (leg?: number) => submit({ op: 'rail.depotRailTake', leg }),
    openPack: (station?: 'T1') => submit({ op: 'rail.pack', station }),
    takeYoke: () => submit({ op: 'rail.yoke' }),
    takeBoiler: (revision: number) => railInt(revision) && submit({ op: 'rail.boilerTake', revision }),
    dropBoiler: (x: number, y: number, z: number, revision: number) =>
      railInt(revision) &&
      railPos(x) &&
      railPos(y) &&
      railPos(z) &&
      submit({ op: 'rail.boilerDrop', revision, x, y, z }),
    fitBoiler: (revision: number) => railInt(revision) && submit({ op: 'rail.boilerFit', revision }),
    /** A stop request (docs/plans/generic-lines.md, 7): halt `id`, heading `dir` (-1 toward its line's stop 0, +1
     * away). From the lever on that way's platform (no `train`: the next train that can brake for it), or aboard train
     * `train` (its slot: only that train serves it). */
    callTrain: (id: number, dir: -1 | 1, train?: number) =>
      railInt(id, LINE_HALTS.length - 1) &&
      (dir === -1 || dir === 1) &&
      (train === undefined || railInt(train, RAIL_TRAINS.length - 1)) &&
      submit(train === undefined ? { op: 'rail.call', id, dir } : { op: 'rail.call', id, dir, train }),
    /** The Works and the Roundhouse (docs/plans/split-rock-roundhouse.md). */
    takeBreaker: () => submit({ op: 'rail.breaker' }),
    /** Strike a seam: 0 the stall slab at Home, 1 the throat at the quarry, 2 Ring Island's rivet (v27). */
    strike: (id: number) => railInt(id, 2) && submit({ op: 'rail.strike', id }),
    fillKiln: () => submit({ op: 'rail.kiln' }),
    /** Shoulder a footing: 0 the Works rack, 1 the pier rack, 2 the railhead's rack. */
    shoulderFooting: (rack: 0 | 1 | 2) => railInt(rack, 2) && submit({ op: 'rail.footTake', rack }),
    /** Set the footing on your back: 0 the stall, 1 the cradle, 2 the pier, 3 the railhead's jib. */
    setFooting: (site: 0 | 1 | 2 | 3) => railInt(site, 3) && submit({ op: 'rail.footSet', site }),
    /** Brace the raised leaf (the gold strut on the brace platform): only the raised leaf you saw. */
    braceLeaf: () => submit({ op: 'rail.brace', revision: 1 }),
    fitCradle: () => submit({ op: 'rail.cradle' }),
    /** Turn the table to a road (0 the stall road, 1 line 2's) on the revision you saw. */
    turnTable: (to: 0 | 1, revision: number) =>
      railInt(to, 1) && railInt(revision) && submit({ op: 'rail.turn', to, revision }),
    /** Ring Island's steel works (ring-island-build2): take logs (0) or rails (1) off the yard; feed your back's logs
     * and rails into its bill. */
    steelTake: (kind: 0 | 1) => railInt(kind, 1) && submit({ op: 'rail.steelTake', kind }),
    feedSteel: () => submit({ op: 'rail.steel' }),
    /** A halt yard (a HALT_YARDS index): Leave it here puts everything of `kind` (0 logs, 1 stone, 2 rails) off your back
     * into it; Pick up fills your back's room for `kind` from it. */
    haltPut: halt('rail.haltPut'),
    haltTake: halt('rail.haltTake'),
    /** Install at Home on the revision of line 2's boiler fit. */
    installBoiler: (site: number, revision: number, part: InstallPart = 2) =>
      railInt(site, 1) &&
      installAdmits(LINE2, part) &&
      railInt(revision, BOILER_MAX + 1) &&
      submit({ op: 'rail.install', site, line: LINE2, part, revision }),
    /** Garage step 4: bring `line`'s copy to the garage table on the bring revision this tab saw (`Shed.bringRev`). */
    bringLine: (site: number, line: number, revision: number) =>
      railInt(site, 1) &&
      railInt(line, RAIL_LINES.length - 1) &&
      railInt(revision) &&
      submit({ op: 'rail.bring', site, line, revision }),
    /** Install `part` on `line` (line 2's 1 to 3, a trade line's 5 Quick and 6 Strong) on its `Line.rev`. */
    installPart: (site: number, line: number, part: InstallPart, revision: number) =>
      railInt(site, 1) &&
      installAdmits(line, part) &&
      railInt(revision) &&
      submit({ op: 'rail.install', site, line, part, revision }),
    /** The greybox route: feed your back's logs and rails into leg `leg`'s current frame (a RAIL_LEGS index); take a
     * pickup for the room (a RAIL_GRANTS index); open a barrier (a RAIL_GATES index). */
    feedLeg: (leg: number) => railInt(leg, RAIL_LEGS.length - 1) && submit({ op: 'rail.legStock', leg }),
    takeGrant: (id: number) => railInt(id, RAIL_GRANTS.length - 1) && submit({ op: 'rail.grant', id }),
    openGate: (id: number) => railInt(id, RAIL_GATES.length - 1) && submit({ op: 'rail.gate', id }),
    arrive: () => submit({ op: 'rail.arrive' }),
    pullLever: () => submit({ op: 'rail.lever' }),
    pullSeaSwitch: () => submit({ op: 'rail.seaSwitch' }),
    claimHook: () => submit({ op: 'rail.hook' }),
    /** Take the glider from its summit device (on the first climb; the rule and the server judge it). */
    claimGlide: () => submit({ op: 'rail.glide' }),
    deposit(n = 1, kind: RailMaterial = 0) {
      const station = LINE1_STATIONS[activeStation(view())]!.id;
      return railInt(n, CARRY_MAX, 1) && submit({ op: 'rail.deposit', station, n, kind });
    },
  };
};
