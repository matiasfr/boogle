// Server-owned rail tuning: ordered commands and durable commits, projected on the railway packet stream.
import { createTune, okTune, setTune, serializeTune, loadTune, hashTune, type TuneKey } from '../../sim/tune.ts';
import type { SyncView } from './types.ts';
import type { ServerOps } from '../server-ops.ts';
import type { Replicator } from '../replicate-server.ts';

export function installRailTune(sync: SyncView, ops: ServerOps, replication: Replicator) {
  const tune = createTune();
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
