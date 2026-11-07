// The railway: Server kind (docs/plans/replication.md, R1a). Installed on the server's world only: it registers the
// `railway` state as a server state (saved with the world's 2 s checkpoint and on shutdown, never hashed or served as
// a lockstep snapshot) and the rule tick, and applies each client action the moment the room hands it over. Clients
// mirror it through replication (../railway-replicate.ts); nothing here runs in a tab.
//
// The rules stay pure (state, action, tick): railApply and railTick are the same functions R1b's prediction runs.
// Validation reads the facts the action carried (the actor's own position and action clock) through `Actor`.
import {
  railCounts,
  railInt,
  railYaw,
  railPhase,
  railSource,
  railMaxDuration,
  railPanelCount,
  railPanelStock,
  RAILWAY_MAX_INT,
  type RailAction,
  type RailResult,
  type Railway,
} from '../sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../sim/railway-layout.ts';
import {
  LINE1_STATIONS,
  LINE1_ROCKS,
  LINE1_GREAT_TREE,
  LINE1_HARDWOODS,
  LINE1_AXE_STAND,
  LINE1_JUMP_DEVICE,
} from '../sim/railway-line-layout.ts';
import { LINE_TIMING } from '../sim/railway-line.ts';
import { LINE2_FORGE, LINE2_STATIONS, LINE2_DEPOT, LINE2_LEVER, LINE2_HOOK } from '../sim/railway-line2-layout.ts';
import { line2Active, line2GateOpen, line2Completed } from '../sim/railway-line2.ts';
import { RECOVERY_RACK, type SupplyPulse } from '../sim/railway-supply.ts';
import {
  Account,
  Beam,
  Pile,
  RailClock,
  Rail,
  Tree,
  createRailwayWorld,
  railwayCheck,
  railwayView,
} from '../sim/railway-world.ts';
import {
  railApply,
  railBeamPutDown,
  railBeamRelease,
  railBeamStood,
  railLine2Active,
  railOutcome,
  railResume,
  railSession,
  railSettle,
  railSupplyPulse,
  railTick,
} from '../sim/railway-systems.ts';
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
  'rail.hook',
]);

/** Whether a well-formed action is in range of its target. Readiness and balances are the rule's, not this. */
export function railValid(w: World, e: RailAction, actor: Actor): boolean {
  const near = (x: number, z: number, r: number) => actor.reach(x, z, r) && actor.cadence(e.op);
  const kind = e.kind === undefined || railInt(e.kind, 2);
  const height = (y: number) => actor.height(y + 40, 260);
  switch (e.op) {
    case 'rail.wake':
      return near(T1.x, T1.z, 1000);
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
      return !!station && kind && railInt(e.n, T1.carry, 1) && near(station.x, station.z, T1.reach);
    }
    case 'rail.drop':
      return (
        railInt(e.n, T1.carry, 1) &&
        kind &&
        railInt(e.x, 200000, -200000) &&
        railInt(e.z, 200000, -200000) &&
        railInt(e.y, 200000, -200000) &&
        near(e.x, e.z, 320)
      );
    case 'rail.take': {
      if (!railInt(e.id, RAILWAY_MAX_INT, 1)) return false;
      const pile = w.get(Pile, e.id);
      return !!pile && kind && near(pile.x, pile.z, 320);
    }
    case 'rail.rackTake':
      return (e.kind === undefined || railInt(e.kind, 1)) && near(RECOVERY_RACK.x, RECOVERY_RACK.z, 320);
    case 'rail.mine': {
      const rock = railInt(e.id, 2) ? LINE1_ROCKS[e.id] : undefined;
      return !!rock && near(rock.x, rock.z, 320);
    }
    case 'rail.axe':
      return near(LINE1_AXE_STAND.x, LINE1_AXE_STAND.z, 340);
    case 'rail.beamChop':
      return near(LINE1_GREAT_TREE.x, LINE1_GREAT_TREE.z, 420);
    case 'rail.beamTake': {
      const beam = w.get(Beam, w.single(Beam))!;
      return railInt(e.revision) && near(beam.x, beam.z, 420);
    }
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
      return !!spec && spec.depot && near(spec.x, spec.z, LINE2_DEPOT.reach);
    }
    case 'rail.lever':
      return height(LINE2_LEVER.y) && near(LINE2_LEVER.x, LINE2_LEVER.z, 320);
    case 'rail.hook':
      return height(LINE2_HOOK.y) && near(LINE2_HOOK.x, LINE2_HOOK.z, 320);
  }
  return false;
}

export function install(sync: SyncView, rules: { tune: TuneApi }, replication: Replicator) {
  // The railway's state is an E world (src/sim/railway-world.ts); its rules are systems (src/sim/railway-systems.ts).
  let world = createRailwayWorld();
  const touch = (kind: string, id: number | string) => replication.touch(kind, id);
  const cells = {
    tree: (_id: number, f: Fields) =>
      cellOf(RAILWAY_SOURCES[f.slot as number]![1], RAILWAY_SOURCES[f.slot as number]![2]),
    hardwood: (_id: number, f: Fields) =>
      cellOf(LINE1_HARDWOODS[f.slot as number]![1], LINE1_HARDWOODS[f.slot as number]![2]),
    rock: (_id: number, f: Fields) => cellOf(LINE1_ROCKS[f.slot as number]!.x, LINE1_ROCKS[f.slot as number]!.z),
    pile: (_id: number, f: Fields) => cellOf(f.x as number, f.z as number),
  };
  for (const p of worldProjections(() => world, cells, GLOBAL_CELL)) replication.define(p);
  // Every write ends in a commit: what the systems marked goes to the replicator, and the read model is rebuilt on
  // its next read.
  let view: Railway | null = null;
  const commit = () => {
    touchChanges(world, touch);
    view = null;
  };
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
        view = null;
      },
      hash: () => world.hash(),
    },
    { server: true },
  );
  sync.onTick((tick) => {
    railTick(world, tick);
    commit();
  }, 'railway');
  const touchAll = () => {
    for (const c of world.components) if (c.replicate) replication.touchAll(c.kind);
    view = null;
  };
  const railId = () => world.single(Rail);
  return {
    /** The read model (today's `Railway` shape), rebuilt from the world after each change; read only. */
    get railway() {
      return (view ??= railwayView(world));
    },
    /** Every entity, after a load (the replicator starts empty). */
    touchAll,
    /** A client action, applied now. A well-formed action that fails validation is a recorded rejection. */
    act(pid: string, e: RailAction, actor: Actor | null): RailResult & { effect?: RailEffect } {
      const tick = sync.world.tick;
      const before = pilesOf(world);
      const valid = !!actor && RAIL_ACTIONS.has(e.op) && railValid(world, e, actor);
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
      const n = railResume(world, Math.min(ticks, railMaxDuration(this.railway)), marker, sync.world.tick, yard);
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
    beamRelease(pid: string, epoch: number, revision: number) {
      const n = railBeamRelease(world, pid, epoch, revision);
      commit();
      return n;
    },
    /** The rule tick actions apply at now. */
    tick: () => sync.world.tick,
    account(pid: string) {
      const id = world.lookup(Account, pid);
      return id === undefined ? undefined : { ...world.get(Account, id)! };
    },
    outcome: (pid: string, epoch: number, request: number) => railOutcome(world, pid, epoch, request),
    counts() {
      return railCounts(this.railway);
    },
    phase() {
      return railPhase(this.railway, sync.world.tick);
    },
    panels() {
      return { committed: railPanelCount(this.railway), stock: railPanelStock(this.railway) };
    },
    line2() {
      const s = this.railway;
      return { active: line2Active(s), completed: line2Completed(s), gateOpen: line2GateOpen(s) };
    },
    // Narrow reads for the host's maintenance (no read model needed).
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
