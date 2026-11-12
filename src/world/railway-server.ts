// The railway: Server kind (docs/plans/replication.md, R1a). Installed on the server's world only: it registers the
// `railway` state as a server state (saved with the world's 2 s checkpoint and on shutdown, never hashed or served as
// a lockstep snapshot) and the rule tick, and applies each client action the moment the room hands it over. Clients
// mirror it through replication (../railway-replicate.ts); nothing here runs in a tab.
//
// The rules stay pure (state, action, tick): railApply and railTick are the same functions R1b's prediction runs.
// Validation reads the facts the action carried (the actor's own position and action clock) through `Actor`.
import { railInt, railYaw, railSource, RAILWAY_MAX_INT, type RailAction, type RailResult } from '../sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../sim/railway-layout.ts';
import {
  LINE1_STATIONS,
  LINE1_GREAT_TREE,
  LINE1_HARDWOODS,
  LINE1_AXE_STAND,
  LINE1_JUMP_DEVICE,
} from '../sim/railway-line-layout.ts';
import { LINE_TIMING } from '../sim/railway-line.ts';
import {
  LINE2_FORGE,
  LINE2_STATIONS,
  LINE2_DEPOT,
  LINE2_LEVER,
  LINE2_SEA,
  LINE2_GLIDE,
  LINE2_HOOK,
  LINE2_PACK,
  LINE2_BOILER,
  LINE2_OLD_TRAIN,
} from '../sim/railway-line2-layout.ts';
import { railCounts, line2Active, line2GateOpen, line2Completed } from '../sim/railway-queries-line2.ts';
import { railMaxDuration, railPanelCount, railPanelStock, railPhase } from '../sim/railway-queries-line1.ts';
import { trainAlong, trainSpeed } from '../sim/railway-train.ts';
import { LINE2, RAIL_HALTS, RAIL_TRAINS, haltPlatform } from '../sim/railway-lines.ts';
import { BOILER_MAX } from '../sim/railway-train.ts';
import { RING_BRACE, RING_HEAD, RING_RIVET, RING_STEEL_WORKS, RING_STEEL_YARD } from '../sim/railway-ring-layout.ts';
import { railLinePoint } from '../sim/railway-line-path.ts';
import {
  PIER_FRAME,
  PIER_RACK,
  RAIL_ROCKS,
  SHED_STALL,
  SHED_TABLE,
  WORKS_BREAKER,
  WORKS_KILN,
  WORKS_RACK,
  WORKS_SEAMS,
} from '../sim/railway-works-layout.ts';
import { SEAM_THROAT } from '../sim/railway-works.ts';
import { RECOVERY_RACK, type SupplyPulse } from '../sim/railway-supply.ts';
import {
  Account,
  Beam,
  Boiler,
  Train,
  Pile,
  RailClock,
  Rail,
  Shed,
  Tree,
  Works,
  createRailwayWorld,
} from '../sim/railway-components.ts';
import { railwayCheck } from '../sim/railway-check.ts';
import { railApply, railOutcome, railTick } from '../sim/railway-systems.ts';
import { railBoilerPutDown, railBoilerStood } from '../sim/railway-sys-line2.ts';
import { railFootHolders, railFootRelease } from '../sim/railway-sys-works.ts';
import { railBeamPutDown, railBeamRelease, railBeamStood } from '../sim/railway-sys-line1.ts';
import { railLine2Active, ringHead } from '../sim/railway-queries.ts';
import { railResume, railSupplyPulse } from '../sim/railway-sys-away.ts';
import { railSession, railSettle } from '../sim/railway-sys-core.ts';
import { RAIL_ARRIVAL, RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, legFrame, legRack } from '../sim/railway-route.ts';
import { haltHead, legOpen, legRow } from '../sim/railway-queries-route.ts';
import type { World } from '../ecs/index.ts';
import { GLOBAL_CELL, cellOf, type Fields } from './replicate.ts';
import { touchChanges, worldProjections } from './replicate-world.ts';
import { railEffect, railWakeTick, piles as pilesOf, type RailEffect } from './railway-predict.ts';
export type { RailEffect } from './railway-predict.ts';
import type { Replicator } from './replicate-server.ts';
import type { SyncView } from './rules/types.ts';
import type { TuneApi } from './rules/tune.ts';

export const name = 'railway';
export type RailwayApi = ReturnType<typeof install>;
/** What the host knows about an action's actor: judged from the facts the action carried. */
export type Actor = {
  /** Within radius (cm) of (x, z) by the action's own position. */
  reach(x: number, z: number, radius: number): boolean;
  /** Within radius (cm) of height y. */
  height(y: number, radius: number): boolean;
  /** Swing and unload cadence on the client's own action clock (records the action time when it passes). */
  cadence(op: string): boolean;
};
/** The material actions a client may send. */
export const RAIL_ACTIONS = new Set([
  'rail.wake',
  'rail.chop',
  'rail.take',
  'rail.rackTake',
  'rail.drop',
  'rail.deposit',
  'rail.mine',
  'rail.axe',
  'rail.beamChop',
  'rail.beamTake',
  'rail.beamDrop',
  'rail.beamDeposit',
  'rail.jump',
  'rail.forgeTake',
  'rail.depotTake',
  'rail.lever',
  'rail.seaSwitch',
  'rail.hook',
  'rail.glide',
  'rail.depotRailTake',
  'rail.pack',
  'rail.boilerTake',
  'rail.boilerDrop',
  'rail.boilerFit',
  'rail.call',
  'rail.breaker',
  'rail.strike',
  'rail.kiln',
  'rail.footTake',
  'rail.footSet',
  'rail.brace',
  'rail.cradle',
  'rail.turn',
  'rail.steelTake',
  'rail.steel',
  'rail.install',
  // The greybox route (step 3).
  'rail.legStock',
  'rail.grant',
  'rail.gate',
  'rail.arrive',
]);

/** A passenger's reach of its train: 10 m of the train's pose (its cars run 7.4 m behind it), at the tick or in the
 * second before it (the rider's own view of the train lags the room clock). */
export const RIDER_REACH = 1000;
const RIDER_LAG_TICKS = 10;
/** The farthest car from the train's pose: the rear car (line 2's footing wagon) sits 7.4 m behind it
 * (TRAIN_OFFSETS in src/entities/railway/cars.ts). */
export const RIDER_SPAN = 740;
/** A passenger's ask is judged against the train's pose now, widened by what it can travel in the lag window (its
 * speed now × RIDER_LAG_TICKS) and by the train's length, all in integer cm. Not replayed from the row's past poses:
 * a replan rewrites the row, which would collapse those to the replan point and refuse a lagging rider. */
function nearTrain(w: World, slot: number, tick: number, actor: Actor) {
  const id = w.lookup(Train, slot);
  if (id === undefined) return false;
  const row = w.get(Train, id)!,
    line = RAIL_TRAINS[slot]!.line;
  const p = railLinePoint(line, trainAlong(row, line, tick));
  const travel = Math.ceil(trainSpeed(row, line, tick)) * RIDER_LAG_TICKS;
  return actor.reach(p.x, p.z, RIDER_REACH + travel + RIDER_SPAN);
}
/** Whether a well-formed action is in range of its target. Readiness and balances are the rule's, not this. `tick` is
 * the rule tick it applies at (a passenger's stop request is judged against the train's pose then). */
export function railValid(w: World, e: RailAction, actor: Actor, tick = 0): boolean {
  const near = (x: number, z: number, r: number) => actor.reach(x, z, r) && actor.cadence(e.op);
  const kind = e.kind === undefined || railInt(e.kind, 2);
  // Drops and takes also move a footing (pile kind 3); nothing else takes kind 3.
  const pileKind = e.kind === undefined || railInt(e.kind, 3);
  const height = (y: number) => actor.height(y + 40, 260);
  // The Works and the Roundhouse: judged at the catalog's spot, at its height.
  const at = (p: { x: number; z: number; y: number; reach: number }) =>
    actor.height(p.y, 300) && near(p.x, p.z, p.reach);
  switch (e.op) {
    case 'rail.wake':
      // Keep the existing ten-metre server allowance, centred on the machine like its six-metre prompt.
      return near(T1.wake.x, T1.wake.z, 1000);
    case 'rail.chop': {
      const k = railInt(e.id) ? railSource(e.id) : -1;
      const source = RAILWAY_SOURCES[k] ?? LINE1_HARDWOODS.find((row) => row[0] === e.id);
      return (
        !!source && railYaw(e.yaw) && typeof e.collapsed === 'boolean' && near(source[1], source[2], T1.sourceReach)
      );
    }
    case 'rail.deposit': {
      const station =
        LINE1_STATIONS.find((row) => row.id === e.station) ??
        LINE2_STATIONS.find((row) => row.id === e.station) ??
        (e.station === 'F' ? LINE2_FORGE : undefined);
      return !!station && kind && railInt(e.n, LINE2_PACK.carry, 1) && near(station.x, station.z, T1.reach);
    }
    case 'rail.drop':
      return (
        railInt(e.n, LINE2_PACK.carry, 1) &&
        pileKind &&
        railInt(e.x, 200000, -200000) &&
        railInt(e.z, 200000, -200000) &&
        railInt(e.y, 200000, -200000) &&
        near(e.x, e.z, 320)
      );
    case 'rail.take': {
      if (!railInt(e.id, RAILWAY_MAX_INT, 1)) return false;
      const pile = w.get(Pile, e.id);
      return !!pile && pileKind && near(pile.x, pile.z, 320);
    }
    case 'rail.rackTake':
      return (e.kind === undefined || railInt(e.kind, 1)) && near(RECOVERY_RACK.x, RECOVERY_RACK.z, 320);
    case 'rail.mine': {
      const rock = railInt(e.id, RAIL_ROCKS.length - 1) ? RAIL_ROCKS[e.id] : undefined;
      return !!rock && near(rock.x, rock.z, 320);
    }
    case 'rail.axe':
      return near(LINE1_AXE_STAND.x, LINE1_AXE_STAND.z, 340);
    case 'rail.beamChop':
      return near(LINE1_GREAT_TREE.x, LINE1_GREAT_TREE.z, 420);
    case 'rail.boilerTake': {
      const b = w.get(Boiler, w.single(Boiler))!;
      return railInt(e.revision) && near(b.x, b.z, LINE2_BOILER.reach);
    }
    case 'rail.boilerFit':
      return railInt(e.revision) && near(LINE2_OLD_TRAIN.x, LINE2_OLD_TRAIN.z, LINE2_OLD_TRAIN.reach);
    case 'rail.call': {
      // From the request lever on the halt's platform for that way (docs/plans/generic-lines.md, 7), or aboard the
      // train `train` names, which must run on that halt's line. The rule refuses an open end's way in (no train
      // stands at that platform: Far Head's up one until Q6 opens the pier) and a rider's ask the other way.
      const h = railInt(e.id, RAIL_HALTS.length - 1) ? RAIL_HALTS[e.id] : undefined;
      if (!h || (e.dir !== -1 && e.dir !== 1)) return false;
      if (e.train !== undefined)
        return (
          railInt(e.train, RAIL_TRAINS.length - 1) &&
          RAIL_TRAINS[e.train]!.line === h.line &&
          nearTrain(w, e.train, tick, actor) &&
          actor.cadence(e.op)
        );
      // The Railhead's down platform moves out with its head (v27), a leg's railhead with its sections laid (the greybox
      // route): judged where the head stands now.
      const p = haltPlatform(h, e.dir, haltHead(w, e.id!, ringHead(w)));
      return height(p.y) && near(p.x, p.z, p.reach);
    }
    case 'rail.beamTake': {
      const beam = w.get(Beam, w.single(Beam))!;
      return railInt(e.revision) && near(beam.x, beam.z, 420);
    }
    case 'rail.boilerDrop':
    case 'rail.beamDrop':
      return (
        railInt(e.revision) &&
        railInt(e.x, 200000, -200000) &&
        railInt(e.y, 200000, -200000) &&
        railInt(e.z, 200000, -200000) &&
        near(e.x, e.z, 320)
      );
    case 'rail.beamDeposit':
      return e.station === 'T3' && railInt(e.revision) && near(LINE1_STATIONS[2]!.x, LINE1_STATIONS[2]!.z, T1.reach);
    case 'rail.jump':
      return actor.height(LINE1_JUMP_DEVICE.y, 220) && near(LINE1_JUMP_DEVICE.x, LINE1_JUMP_DEVICE.z, 300);
    case 'rail.forgeTake':
      return near(LINE2_FORGE.rackX, LINE2_FORGE.rackZ, 340);
    case 'rail.depotTake': {
      const spec = LINE2_STATIONS[railLine2Active(w)];
      if (!spec) return legRackNear(w, at);
      return spec.depot && near(spec.x, spec.z, LINE2_DEPOT.reach);
    }
    case 'rail.depotRailTake': {
      const spec = LINE2_STATIONS[railLine2Active(w)];
      if (!spec) return legRackNear(w, at);
      return spec.shelf && near(spec.x, spec.z, LINE2_DEPOT.reach);
    }
    case 'rail.pack':
      return near(LINE2_PACK.x, LINE2_PACK.z, 340);
    case 'rail.lever':
      return height(LINE2_LEVER.y) && near(LINE2_LEVER.x, LINE2_LEVER.z, 320);
    case 'rail.seaSwitch':
      return height(LINE2_SEA.y) && near(LINE2_SEA.x, LINE2_SEA.z, 320);
    case 'rail.hook':
      return height(LINE2_HOOK.y) && near(LINE2_HOOK.x, LINE2_HOOK.z, 320);
    case 'rail.glide':
      // Readiness (Q5 laid, not yet taken) is the rule's; here only the summit device's reach.
      return height(LINE2_GLIDE.y) && near(LINE2_GLIDE.x, LINE2_GLIDE.z, 320);
    case 'rail.breaker':
      return at(WORKS_BREAKER);
    case 'rail.strike':
      // Seams 0 and 1 at the Works; 2 is Ring Island's rivet (v27).
      return railInt(e.id, 2) && at(e.id === 2 ? RING_RIVET : WORKS_SEAMS[e.id]!);
    case 'rail.kiln':
      // Its loading frame stands in the cut: nobody reaches it before the throat is struck.
      return !!(w.get(Works, w.single(Works))!.seams & SEAM_THROAT) && at(WORKS_KILN);
    case 'rail.footTake':
      // Rack 2 is the railhead's, where its head stands now (v27).
      return railInt(e.rack, 2) && at([WORKS_RACK, PIER_RACK, RING_HEAD[ringHead(w)]!.rack][e.rack]!);
    case 'rail.footSet':
      // Site 3 is the railhead's jib (v27).
      return railInt(e.site, 3) && at([SHED_STALL, SHED_STALL, PIER_FRAME, RING_HEAD[ringHead(w)]!.jib][e.site]!);
    case 'rail.brace':
      // The brace names the leaf it saw: only the raised one (1) is braced.
      return e.revision === 1 && at(RING_BRACE);
    case 'rail.cradle':
      return at(SHED_STALL);
    case 'rail.turn':
      // A turn names the table it saw: a stale one is refused, like a contested beam.
      return railInt(e.to, 1) && e.revision === w.get(Shed, w.single(Shed))!.tableRev && at(SHED_TABLE);
    case 'rail.steelTake':
      // Ring Island's steel works (v31, ring-island-build2 R4): logs (0) or rails (1) off the yard where it lies.
      return railInt(e.kind, 1) && at(RING_STEEL_YARD);
    case 'rail.steel':
      return at(RING_STEEL_WORKS);
    case 'rail.install':
      // At the table: line 2 (1), the longer boiler (1), on the fit the actor saw; a stale one is the rule's noop.
      return e.line === LINE2 && e.part === 1 && railInt(e.revision, BOILER_MAX) && at(SHED_TABLE);
    // The greybox route (step 3): ids are catalog indexes; whether the leg is open, the pickup's leg laid or the grant
    // held is the rule's (./railway-sys-route.ts), never this.
    case 'rail.legStock': {
      // At the frame of the leg's current section (none once it is complete).
      if (!railInt(e.leg, RAIL_LEGS.length - 1)) return false;
      const laid = legRow(w, e.leg).laid;
      return laid < RAIL_LEGS[e.leg]!.sections.length && at(legFrame(RAIL_LEGS[e.leg]!, laid));
    }
    case 'rail.grant':
      return railInt(e.id, RAIL_GRANTS.length - 1) && at(RAIL_GRANTS[e.id]!.at);
    case 'rail.gate':
      return railInt(e.id, RAIL_GATES.length - 1) && at(RAIL_GATES[e.id]!.at);
    case 'rail.arrive':
      return at(RAIL_ARRIVAL);
  }
  return false;
}
/** After the last Q job, the depot's racks are the open leg's (the greybox route: its kit unloads onto Rail.depot and
 * Rail.depotRails), judged at its current rack (legRack); with no leg open there is no rack to take from. */
function legRackNear(w: World, at: (p: { x: number; z: number; y: number; reach: number }) => boolean) {
  const k = RAIL_LEGS.findIndex((_l, j) => legOpen(w, j));
  return k >= 0 && at(legRack(RAIL_LEGS[k]!, legRow(w, k).laid));
}

export function install(sync: SyncView & { roomStep(): number }, rules: { tune: TuneApi }, replication: Replicator) {
  // The railway's state is an E world (src/sim/railway-components.ts); its rules are systems
  // (src/sim/railway-systems.ts).
  let world = createRailwayWorld();
  const touch = (kind: string, id: number | string) => replication.touch(kind, id);
  const cells = {
    tree: (_id: number, f: Fields) =>
      cellOf(RAILWAY_SOURCES[f.slot as number]![1], RAILWAY_SOURCES[f.slot as number]![2]),
    hardwood: (_id: number, f: Fields) =>
      cellOf(LINE1_HARDWOODS[f.slot as number]![1], LINE1_HARDWOODS[f.slot as number]![2]),
    rock: (_id: number, f: Fields) => cellOf(RAIL_ROCKS[f.slot as number]!.x, RAIL_ROCKS[f.slot as number]!.z),
    pile: (_id: number, f: Fields) => cellOf(f.x as number, f.z as number),
  };
  for (const p of worldProjections(() => world, cells, GLOBAL_CELL)) replication.define(p);
  // Every write ends in a commit: what the systems marked goes to the replicator.
  const commit = () => touchChanges(world, touch);
  const timing = () => ({
    ...LINE_TIMING,
    feedIntervalMs: rules.tune.get('railFeedMs'),
    cruiseCmPerTick: rules.tune.get('railLaySpeed'),
    departureTicks: rules.tune.get('railDepartureTicks'),
  });
  // Saved as the world's schema snapshot (accounts and the beam holder by pid); loaded all or nothing through the
  // railway's own check.
  sync.registerState(
    'railway',
    {
      serialize: () => world.snapshot(),
      load: (json) => {
        const next = createRailwayWorld();
        next.load(json, railwayCheck);
        world = next;
      },
      hash: () => world.hash(),
    },
    { server: true },
  );
  sync.onTick((tick) => {
    railTick(world, tick, rules.tune.get('railTrainHeadPct'), {
      farePct: rules.tune.get('railFarePct'),
      riderPct: rules.tune.get('railRiderPct'),
    });
    commit();
  }, 'railway');
  const touchAll = () => {
    for (const c of world.components) if (c.replicate) replication.touchAll(c.kind);
  };
  const railId = () => world.single(Rail);
  return {
    /** Every entity, after a load (the replicator starts empty). */
    touchAll,
    /** A client action, applied now. A well-formed action that fails validation is a recorded rejection. */
    act(pid: string, e: RailAction, actor: Actor | null): RailResult & { effect?: RailEffect } {
      const tick = sync.world.tick;
      const before = pilesOf(world);
      const valid = !!actor && RAIL_ACTIONS.has(e.op) && railValid(world, e, actor, tick);
      // A wake starts at the tick its actor pressed (bounded; R1b), so the actor's predicted wake and this one agree.
      const result = railApply(
        world,
        pid,
        valid ? e : { op: 'rail.reject', epoch: e.epoch, request: e.request },
        valid && e.op === 'rail.wake' ? railWakeTick(tick, e.tk) : tick,
        timing(),
      );
      railSettle(world);
      commit();
      return result.status === 'accepted' && result.accepted > 0
        ? { ...result, effect: railEffect(world, pid, e, before) }
        : result;
    },
    /** A new session epoch for pid (a page opened or took over). */
    session(pid: string, epoch: number) {
      const ok = railSession(world, pid, epoch);
      commit();
      return ok;
    },
    /** Where the beam's carrier stands (cm, feet): an absence past its grace puts it down there. */
    beamStood(pid: string, x: number, y: number, z: number) {
      railBeamStood(world, pid, x, y, z);
      commit();
    },
    /** The carrier stayed away past the grace: down where they last stood. */
    beamPutDown(pid: string) {
      const n = railBeamPutDown(world, pid);
      commit();
      return n;
    },
    /** The away credit: `yard` production ticks for the yards, then up to `ticks` for the funded job, once per marker. */
    resume(ticks: number, marker: number, yard = 0) {
      const n = railResume(world, Math.min(ticks, railMaxDuration(world)), marker, sync.world.tick, yard);
      commit();
      return n;
    },
    supply(pulse: SupplyPulse) {
      const moved = railSupplyPulse(world, pulse, {
        regrow: rules.tune.get('railRegrowMinutes'),
        recover: rules.tune.get('railRecoveryMinutes'),
      });
      commit();
      return moved;
    },
    /** Where the boiler's hauler stands (cm, feet): an absence past its grace puts it down there. */
    boilerStood(pid: string, x: number, y: number, z: number) {
      if (railBoilerStood(world, pid, x, y, z)) commit();
    },
    /** The hauler stayed away past the grace: down where they last stood, or on the pedestal. */
    boilerPutDown(pid: string) {
      const n = railBoilerPutDown(world, pid);
      commit();
      return n;
    },
    /** Who carries a footing, and in which session (at most one row per player). */
    footHolders: () => railFootHolders(world),
    footRelease(pid: string, epoch: number) {
      const n = railFootRelease(world, pid, epoch);
      commit();
      return n;
    },
    beamRelease(pid: string, epoch: number, revision: number) {
      const n = railBeamRelease(world, pid, epoch, revision);
      commit();
      return n;
    },
    /** The rule tick actions apply at now. */
    tick: () => sync.world.tick,
    step: () => sync.roomStep(),
    account(pid: string) {
      const id = world.lookup(Account, pid);
      return id === undefined ? undefined : { ...world.get(Account, id)! };
    },
    outcome: (pid: string, epoch: number, request: number) => railOutcome(world, pid, epoch, request),
    // The host's reads: queries on the world, its run rows current to the last rule tick (ECS M11).
    counts: () => railCounts(world),
    phase: () => railPhase(world, sync.world.tick),
    panels: () => ({ committed: railPanelCount(world), stock: railPanelStock(world) }),
    line2: () => ({ active: line2Active(world), completed: line2Completed(world), gateOpen: line2GateOpen(world) }),
    // Narrow reads for the host's maintenance.
    boiler: () => ({ ...world.get(Boiler, world.single(Boiler))! }),
    train: (k: number) => {
      const id = world.lookup(Train, k);
      return id === undefined ? undefined : { ...world.get(Train, id)! };
    },
    beam: () => ({ ...world.get(Beam, world.single(Beam))! }),
    piles: () => {
      const out: { id: number; x: number; z: number; age: number }[] = [];
      world.each([Pile], (id, p) => out.push({ id, x: p.x, z: p.z, age: p.age }));
      return out;
    },
    supplyMarker: () => world.get(RailClock, railId())!.supplyMarker,
    resumeMarker: () => world.get(RailClock, railId())!.resumeMarker,
    felled: (slot: number) => world.get(Tree, world.lookup(Tree, slot)!)!.left === 0,
    /** The world itself, for tests and tools (state only through the systems). */
    world: () => world,
  };
}
