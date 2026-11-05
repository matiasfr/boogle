// Isolated production-core rules. Installed only by installRailwayRules, never the default RULES.
import {
  createRailway,
  railAccount,
  railApply,
  railCounts,
  railInt,
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
  type RailAction,
} from '../../sim/railway.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../sim/railway-layout.ts';
import { okPid } from '../../sim/roster.ts';
import type { Ctx, Edit, Land, Stream, SyncView } from './types.ts';
import type { RosterApi } from './roster.ts';
import { JUNK, bad } from './edit-gen.ts';

export const name = 'railway';
export type RailwayApi = ReturnType<typeof install>;
export type RailReach = (e: Edit, x: number, z: number, reach: number) => boolean;
export type RailCadence = (e: Edit, tick: number) => boolean;
type Material = RailAction & { station?: string };
function token(e: RailAction) {
  return railInt(e.epoch, RAILWAY_MAX_INT, 1) && railInt(e.request, RAILWAY_MAX_INT, 1);
}
export function install(sync: SyncView, _land: Land, rules: { roster: RosterApi }) {
  const railway = createRailway();
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
    validate: (e) => railInt(e.ticks, RAILWAY_DURATION) && railInt(e.marker, RAILWAY_MAX_MARKER, 1),
    apply: (e, tick) => railResume(railway, e.ticks, e.marker, tick),
  });
  const material = (op: string, validate: (e: Edit<Material>, c: Ctx) => boolean) => {
    sync.registerOp<Material>(op, {
      validate: (e, c) => token(e) && !!railAccount(railway, e.u) && e.i === 0 && e.j === 0 && validate(e, c),
      apply: (e, tick) => railApply(railway, e.u, e, tick),
    });
  };
  material('rail.wake', (e, c) => reach(e, c, T1.x, T1.z, 1000));
  material('rail.chop', (e, c) => {
    const k = railInt(e.id) ? railSource(e.id) : -1;
    const source = RAILWAY_SOURCES[k];
    return !!source && reach(e, c, source[1], source[2], T1.sourceReach);
  });
  material(
    'rail.deposit',
    (e, c) => e.station === 'T1' && railInt(e.n, T1.carry, 1) && reach(e, c, T1.x, T1.z, T1.reach),
  );
  material(
    'rail.drop',
    (e, c) =>
      railInt(e.n, T1.carry, 1) &&
      railInt(e.x, 200000, -200000) &&
      railInt(e.z, 200000, -200000) &&
      reach(e, c, e.x, e.z, 320),
  );
  material('rail.take', (e, c) => {
    if (!railInt(e.id, RAILWAY_MAX_INT, 1)) return false;
    const pile = railway.piles.find((p) => p.id === e.id);
    // A raced-away pile still yields a terminal no-op; no current target means reject via rail.reject.
    return !!pile && reach(e, c, pile.x, pile.z, 320);
  });
  sync.registerState('railway', {
    version: 0,
    serialize: () => serializeRailway(railway),
    load: (json) => loadRailway(railway, json),
    hash: () => hashRailway(railway),
  });
  sync.onTick((tick) => railTick(railway, tick), 'railway');
  return {
    railway,
    account: (pid: string) => railAccount(railway, pid),
    outcome: (pid: string, epoch: number, request: number) => railOutcome(railway, pid, epoch, request),
    counts: () => railCounts(railway),
    phase: () => railPhase(railway, sync.world.tick),
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
    r.chance(JUNK) ? bad(r, 'rail.chop') : { op: 'rail.chop', ...request(v), id: r.pick(RAILWAY_SOURCES)[0] },
  'rail.deposit': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.deposit')
      : { op: 'rail.deposit', ...request(v), station: 'T1', n: r.int(1, T1.carry) },
  'rail.drop': (r: Stream, v: View) =>
    r.chance(JUNK) ? bad(r, 'rail.drop') : { op: 'rail.drop', ...request(v), x: T1.x, z: T1.z, n: r.int(1, T1.carry) },
  'rail.take': (r: Stream, v: View) =>
    r.chance(JUNK)
      ? bad(r, 'rail.take')
      : { op: 'rail.take', ...request(v), id: v.rules.railway.railway.piles[0]?.id ?? 1 },
};
export const invariants = (api: RailwayApi): string | null => railwayInvariant(api.railway);
