// Playtest tuning: the eight haul keys stay in lockstep `tune`; rail keys use Server-kind `railTune`.
// Retained until the classic transport retires: tune.set and tune.commit change the eight haul values in proto rooms.
// The seven classic gameplay states and their fill/reset shortcuts retired at v39.
// Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createTune,
  okTune,
  setTune,
  costIn,
  serializeTune,
  loadTune,
  hashTune,
  specOf,
  HAUL_TUNABLES,
  RAIL_TUNABLES,
  type TuneKey,
} from '../../sim/tune.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Stream, Ctx, Rules } from './types.ts';
import type { ServerOps } from '../server-ops.ts';
import type { Replicator } from '../replicate-server.ts';

export const name = 'tune';
export type TuneApi = ReturnType<typeof install>;
export type TuneCommit = { key: string; v: number; expectedRevision: number; requestId: string };
const allowed = (ctx: Ctx) => ctx.env.protoRoom === true;
const controlled = (ctx: Ctx) =>
  allowed(ctx) && typeof ctx.env.tuneController === 'function' && ctx.env.tuneController(ctx.from) === true;

export function install(sync: SyncView) {
  const tune = createTune(HAUL_TUNABLES);
  const ok = (key: unknown, v: unknown): key is TuneKey =>
    typeof key === 'string' && Object.hasOwn(tune.v, key) && okTune(key, v);
  sync.registerOp<{ key: string; v: number }>('tune.set', {
    validate: (e, ctx) => controlled(ctx) && ok(e.key, e.v),
    apply: (e) => {
      if (!ok(e.key, e.v)) return null; // the world moved on between stamp and apply
      setTune(tune, e.key, e.v);
      return { key: e.key, v: e.v };
    },
  });
  sync.registerOp<TuneCommit>('tune.commit', {
    validate: (e, ctx) =>
      controlled(ctx) &&
      typeof e.requestId === 'string' &&
      e.requestId.length > 0 &&
      e.requestId.length <= 80 &&
      e.expectedRevision === tune.revision &&
      ok(e.key, e.v),
    apply: (e) => {
      if (e.expectedRevision !== tune.revision || !ok(e.key, e.v))
        return { requestId: e.requestId, status: 'rejected', revision: tune.revision };
      setTune(tune, e.key, e.v);
      return { requestId: e.requestId, status: 'applied', key: e.key, v: e.v, revision: tune.revision };
    },
  });
  sync.registerState('tune', {
    serialize: () => serializeTune(tune),
    load: (json: unknown) => loadTune(tune, json),
    hash: () => hashTune(tune),
  });
  return { tune, cost: costIn(tune), get: (key: TuneKey) => tune.v[key] };
}

// Replay-test generators: set a retained key within its bounds, or reject malformed input.
export const edits = {
  'tune.commit': (r: Stream, view: { rules: Rules }) => ({
    op: 'tune.commit',
    i: 0,
    j: 0,
    key: 'yield',
    v: r.int(1, 60),
    expectedRevision: view.rules.tune.tune.revision,
    requestId: 'replay',
  }),
  'tune.set': (r: Stream) => {
    if (r.chance(JUNK)) return bad(r, 'tune.set');
    const t = r.pick(HAUL_TUNABLES);
    const v = r.chance(0.5) ? t.def + r.int(-t.def + t.min, t.def) : r.int(t.min, t.max);
    return { op: 'tune.set', i: 0, j: 0, key: t.key, v: Math.min(t.max, Math.max(t.min, v)) };
  },
};

// Every value is a known key within its bounds.
export function invariants({ tune }: TuneApi): string | null {
  for (const [key, v] of Object.entries(tune.v)) if (!specOf(key) || !okTune(key, v)) return `tune ${key} = ${v}`;
  return null;
}

/** Rail keys are Server kind. The eight haul keys above retain their classic transport. */
export function installRailTune(sync: SyncView, ops: ServerOps, replication: Replicator) {
  const tune = createTune(RAIL_TUNABLES);
  const changed = () => {
    replication.touchAll('tuneValue');
    replication.touchAll('tuneRev');
  };
  sync.registerState(
    'railTune',
    {
      serialize: () => serializeTune(tune),
      load: (json) => {
        loadTune(tune, json);
        changed();
      },
      hash: () => hashTune(tune),
    },
    { server: true },
  );
  const ok = (key: unknown, v: unknown): key is TuneKey =>
    typeof key === 'string' && Object.hasOwn(tune.v, key) && okTune(key, v);
  for (const op of ['tune.set', 'tune.commit']) {
    const commit = op === 'tune.commit';
    ops.define(op, {
      durable: commit,
      validate: (e, ctx) =>
        ctx.protoRoom &&
        ctx.tuneController(ctx.from) &&
        ok(e.key, e.v) &&
        (!commit ||
          (typeof e.requestId === 'string' &&
            e.requestId.length > 0 &&
            e.requestId.length <= 80 &&
            e.expectedRevision === tune.revision)),
      apply: (e) => {
        // JSON can carry -0; the replica integer codec requires canonical zero.
        const v = (e.v as number) || 0;
        setTune(tune, e.key as TuneKey, v);
        changed();
        return commit
          ? { requestId: e.requestId, status: 'applied', key: e.key, v, revision: tune.revision }
          : { key: e.key, v };
      },
    });
  }
  return { tune, get: (key: TuneKey) => tune.v[key] };
}
export type RailTuneApi = ReturnType<typeof installRailTune>;
