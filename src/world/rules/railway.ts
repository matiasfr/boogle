// T1 rules. The playable namespace opts into persisted placement; the isolated spine retains its original shape.
import {
  createRailway,
  railAccount,
  railApply,
  railCounts,
  railInt,
  railYaw,
  railOutcome,
  railPhase,
  railResume,
  railSession,
  railSource,
  railTick,
  serializeRailway,
  loadRailway,
  hashRailway,
  railwayInvariant,
  RAILWAY_DURATION,
  RAILWAY_MAX_INT,
  RAILWAY_MAX_MARKER,
  railMaxDuration,
  railBeamRelease,
  railPanelCount,
  railPanelStock,
  type RailAction,
} from '../../sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../sim/railway-layout.ts';
import {
  LINE1_STATIONS,
  LINE1_ROCKS,
  LINE1_GREAT_TREE,
  LINE1_HARDWOODS,
  LINE1_AXE_STAND,
  LINE1_JUMP_DEVICE,
} from '../../sim/railway-line-layout.ts';
import { LINE_TIMING } from '../../sim/railway-line.ts';
import {
  LINE2_FORGE,
  LINE2_STATIONS,
  LINE2_DEPOT,
  LINE2_LEVER,
  LINE2_HOOK,
} from '../../sim/railway-line2-layout.ts';
import { line2Active, line2GateOpen, line2Completed } from '../../sim/railway-line2.ts';
import { railSupplyPulse, RECOVERY_RACK, RAIL_GROW_MASK_LENGTH, type SupplyPulse } from '../../sim/railway-supply.ts';
import { okPid } from '../../sim/roster.ts';
import type { Ctx, Edit, Land, Stream, SyncView } from './types.ts';
import type { RosterApi } from './roster.ts';
import type { TuneApi } from './tune.ts';
import { JUNK, bad } from './edit-gen.ts';

export const name = 'railway';
export type RailwayApi = ReturnType<typeof install>;
export type RailReach = (e: Edit, x: number, z: number, reach: number) => boolean;
export type RailCadence = (e: Edit, tick: number) => boolean;
type Material = RailAction & { station?: string };
function token(e: RailAction) {
  return railInt(e.epoch, RAILWAY_MAX_INT, 1) && railInt(e.request, RAILWAY_MAX_INT, 1);
}
export function install(
  sync: SyncView,
  _land: Land,
  rules: { roster: RosterApi; tune?: TuneApi },
  { playable = false, line1 = false } = {},
) {
  const railway = createRailway(playable, line1);
  const timing = () => ({
    ...LINE_TIMING,
    ...(line1 && rules.tune
      ? {
          feedIntervalMs: rules.tune.get('railFeedMs'),
          cruiseCmPerTick: rules.tune.get('railLaySpeed'),
          departureTicks: rules.tune.get('railDepartureTicks'),
        }
      : {}),
  });
  if (playable)
    sync.registerOp<SupplyPulse>('rail.supply', {
      hostOnly: true,
      validate: (e, c) =>
        railInt(e.marker, RAILWAY_MAX_MARKER, 1) &&
        (e.beam === undefined || (line1 && railInt(e.beam))) &&
        typeof e.grow === 'string' &&
        e.grow.length === RAIL_GROW_MASK_LENGTH &&
        /^[0-9a-f]+$/.test(e.grow) &&
        Array.isArray(e.recover) &&
        e.recover.length <= 1 &&
        e.recover.every((id, k) => railInt(id, RAILWAY_MAX_INT, 1) && (k === 0 || id > e.recover[k - 1]!)) &&
        typeof c.env.railSupplySafe === 'function' &&
        (c.env.railSupplySafe as (pulse: SupplyPulse) => boolean)(e),
      apply: (e) =>
        railSupplyPulse(railway, e, {
          regrow: rules.tune!.get('railRegrowMinutes'),
          recover: rules.tune!.get('railRecoveryMinutes'),
        }),
    });
  const reach = (e: Edit, c: Ctx, x: number, z: number, radius: number) =>
    typeof c.env.railReach === 'function' &&
    (c.env.railReach as RailReach)(e, x, z, radius) &&
    typeof c.env.railCadence === 'function' &&
    (c.env.railCadence as RailCadence)(e, c.tick);
  sync.registerOp<{ pid: string; epoch: number }>('rail.session', {
    hostOnly: true,
    validate: (e) =>
      okPid(e.pid) && railInt(e.epoch, RAILWAY_MAX_INT, 1) && e.epoch === (railAccount(railway, e.pid)?.epoch ?? 0) + 1,
    apply: (e) => rules.roster.ensure(e.pid) >= 0 && railSession(railway, e.pid, e.epoch),
  });
  sync.registerOp<{ pid: string; epoch: number; request: number }>('rail.reject', {
    hostOnly: true,
    validate: (e) => okPid(e.pid) && token({ ...e, op: 'rail.reject' }),
    apply: (e, tick) => railApply(railway, e.pid, { ...e, op: 'rail.reject' }, tick),
  });
  sync.registerOp<{ ticks: number; marker: number }>('rail.resume', {
    hostOnly: true,
    validate: (e) => railInt(e.ticks, railMaxDuration(railway)) && railInt(e.marker, RAILWAY_MAX_MARKER, 1),
    apply: (e, tick) => railResume(railway, e.ticks, e.marker, tick),
  });
  const material = (op: string, validate: (e: Edit<Material>, c: Ctx) => boolean) => {
    sync.registerOp<Material>(op, {
      validate: (e, c) => token(e) && !!railAccount(railway, e.u) && e.i === 0 && e.j === 0 && validate(e, c),
      apply: (e, tick) => railApply(railway, e.u, e, tick, timing()),
    });
  };
  material('rail.wake', (e, c) => reach(e, c, T1.x, T1.z, 1000));
  material('rail.chop', (e, c) => {
    const k = railInt(e.id) ? railSource(e.id) : -1;
    const source = RAILWAY_SOURCES[k] ?? (line1 ? LINE1_HARDWOODS.find((row) => row[0] === e.id) : undefined);
    return (
      !!source &&
      (!playable || (railYaw(e.yaw) && typeof e.collapsed === 'boolean')) &&
      reach(e, c, source[1], source[2], T1.sourceReach)
    );
  });
  material('rail.deposit', (e, c) => {
    const station = line1
      ? (LINE1_STATIONS.find((s) => s.id === e.station) ??
        LINE2_STATIONS.find((s) => s.id === e.station) ??
        (e.station === 'F' ? LINE2_FORGE : undefined))
      : e.station === 'T1'
        ? T1
        : undefined;
    return (
      !!station &&
      (!line1 || e.kind === undefined || railInt(e.kind, 2)) &&
      railInt(e.n, T1.carry, 1) &&
      reach(e, c, station.x, station.z, T1.reach)
    );
  });
  material(
    'rail.drop',
    (e, c) =>
      railInt(e.n, T1.carry, 1) &&
      (!line1 || e.kind === undefined || railInt(e.kind, 2)) &&
      railInt(e.x, 200000, -200000) &&
      railInt(e.z, 200000, -200000) &&
      (!playable || railInt(e.y, 200000, -200000)) &&
      reach(e, c, e.x, e.z, 320),
  );
  material('rail.take', (e, c) => {
    if (!railInt(e.id, RAILWAY_MAX_INT, 1)) return false;
    const pile = railway.piles.find((p) => p.id === e.id);
    // A raced-away pile still yields a terminal no-op; no current target means reject via rail.reject.
    return !!pile && (!line1 || e.kind === undefined || railInt(e.kind, 2)) && reach(e, c, pile.x, pile.z, 320);
  });
  if (playable)
    material(
      'rail.rackTake',
      (e, c) =>
        (!line1 || e.kind === undefined || railInt(e.kind, 1)) && reach(e, c, RECOVERY_RACK.x, RECOVERY_RACK.z, 320),
    );
  if (line1) {
    material('rail.mine', (e, c) => {
      const rock = railInt(e.id, 2) ? LINE1_ROCKS[e.id] : undefined;
      return !!rock && reach(e, c, rock.x, rock.z, 320);
    });
    material('rail.axe', (e, c) => reach(e, c, LINE1_AXE_STAND.x, LINE1_AXE_STAND.z, 340));
    material('rail.beamChop', (e, c) => reach(e, c, LINE1_GREAT_TREE.x, LINE1_GREAT_TREE.z, 420));
    material(
      'rail.beamTake',
      (e, c) => railInt(e.revision) && reach(e, c, railway.line!.beam.x, railway.line!.beam.z, 420),
    );
    material(
      'rail.beamDrop',
      (e, c) =>
        railInt(e.revision) &&
        railInt(e.x, 200000, -200000) &&
        railInt(e.y, 200000, -200000) &&
        railInt(e.z, 200000, -200000) &&
        reach(e, c, e.x, e.z, 320),
    );
    material(
      'rail.beamDeposit',
      (e, c) =>
        e.station === 'T3' && railInt(e.revision) && reach(e, c, LINE1_STATIONS[2]!.x, LINE1_STATIONS[2]!.z, T1.reach),
    );
    material(
      'rail.jump',
      (e, c) =>
        typeof c.env.railHeight === 'function' &&
        (c.env.railHeight as (e: Edit, y: number, radius: number) => boolean)(e, LINE1_JUMP_DEVICE.y, 220) &&
        reach(e, c, LINE1_JUMP_DEVICE.x, LINE1_JUMP_DEVICE.z, 300),
    );
    // Line two. Height checks keep the lever and hook device to their ledges; readiness is the sim's, not here.
    const height = (e: Edit, c: Ctx, y: number) =>
      typeof c.env.railHeight === 'function' &&
      (c.env.railHeight as (e: Edit, y: number, radius: number) => boolean)(e, y + 40, 260);
    material('rail.forgeTake', (e, c) => reach(e, c, LINE2_FORGE.rackX, LINE2_FORGE.rackZ, 340));
    material('rail.depotTake', (e, c) => {
      const spec = LINE2_STATIONS[line2Active(railway)];
      return !!spec && spec.depot && reach(e, c, spec.x, spec.z, LINE2_DEPOT.reach);
    });
    material('rail.lever', (e, c) => height(e, c, LINE2_LEVER.y) && reach(e, c, LINE2_LEVER.x, LINE2_LEVER.z, 320));
    material('rail.hook', (e, c) => height(e, c, LINE2_HOOK.y) && reach(e, c, LINE2_HOOK.x, LINE2_HOOK.z, 320));
    sync.registerOp<{ pid: string; epoch: number; revision: number }>('rail.beamRelease', {
      hostOnly: true,
      validate: (e) => okPid(e.pid) && railInt(e.epoch, RAILWAY_MAX_INT, 1) && railInt(e.revision),
      apply: (e) => railBeamRelease(railway, e.pid, e.epoch, e.revision),
    });
  }
  sync.registerState('railway', {
    serialize: () => serializeRailway(railway, rules.roster.roster.pids),
    load: (json) => loadRailway(railway, json, rules.roster.roster.pids),
    hash: () => hashRailway(railway, rules.roster.roster.pids),
  });
  sync.onTick((tick) => railTick(railway, tick), 'railway');
  return {
    railway,
    account: (pid: string) => railAccount(railway, pid),
    outcome: (pid: string, epoch: number, request: number) => railOutcome(railway, pid, epoch, request),
    counts: () => railCounts(railway),
    phase: () => railPhase(railway, sync.world.tick),
    panels: () => ({ committed: railPanelCount(railway), stock: railPanelStock(railway) }),
    line2: () => ({
      active: line2Active(railway),
      completed: line2Completed(railway),
      gateOpen: line2GateOpen(railway),
    }),
    beamSpeeds: () => ({
      solo: line1 ? rules.tune!.get('railBeamSoloSpeed') / 100 : 2.2,
      help: line1 ? rules.tune!.get('railBeamHelpSpeed') / 100 : 5,
    }),
    movement: () => ({
      beamSoloSpeed: line1 ? rules.tune!.get('railBeamSoloSpeed') / 100 : 2.2,
      beamHelpSpeed: line1 ? rules.tune!.get('railBeamHelpSpeed') / 100 : 5,
      jumpImpulse: line1 ? rules.tune!.get('railJumpImpulse') / 100 : 6.8,
      jumpTurn: line1 ? rules.tune!.get('railJumpTurn') / 100 : 0.7,
      jumpSteer: line1 ? rules.tune!.get('railJumpSteer') / 100 : 25,
      jumpApexSpeed: line1 ? rules.tune!.get('railJumpApexSpeed') / 100 : 1.6,
    }),
  };
}
type View = { rules: { railway: RailwayApi }; tick: number };
const request = (v: View) => {
  const a = v.rules.railway.railway.accounts[0];
  return { epoch: a?.epoch ?? 1, request: (a?.request ?? 0) + 1, i: 0, j: 0 };
};
export const edits = {
  'rail.session': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.session')
      : {
          op: 'rail.session',
          i: 0,
          j: 0,
          pid: 'railtester',
          epoch: (v.rules.railway.account('railtester')?.epoch ?? 0) + 1,
        },
  'rail.reject': (r: Stream, v: View) =>
    r.chance(JUNK) ? bad(r, 'rail.reject') : { op: 'rail.reject', ...request(v), pid: 'railtester' },
  'rail.resume': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.resume')
      : {
          op: 'rail.resume',
          i: 0,
          j: 0,
          ticks: r.int(0, RAILWAY_DURATION),
          marker: v.rules.railway.railway.resumeMarker + 1,
        },
  'rail.wake': (r: Stream, v: View) => (r.chance(JUNK) ? bad(r, 'rail.wake') : { op: 'rail.wake', ...request(v) }),
  'rail.chop': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.chop')
      : {
          op: 'rail.chop',
          ...request(v),
          id: r.pick(RAILWAY_SOURCES)[0],
          ...(v.rules.railway.railway.falls ? { yaw: 0, collapsed: false } : {}),
        },
  'rail.deposit': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.deposit')
      : { op: 'rail.deposit', ...request(v), station: 'T1', n: r.int(1, T1.carry) },
  'rail.drop': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.drop')
      : {
          op: 'rail.drop',
          ...request(v),
          x: T1.x,
          z: T1.z,
          n: r.int(1, T1.carry),
          ...(v.rules.railway.railway.falls ? { y: 3000 } : {}),
        },
  'rail.take': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.take')
      : { op: 'rail.take', ...request(v), id: v.rules.railway.railway.piles[0]?.id ?? 1 },
};
export const invariants = (api: RailwayApi): string | null => railwayInvariant(api.railway);
