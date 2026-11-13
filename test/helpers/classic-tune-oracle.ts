// Pre-step-3 tune.set/commit semantics for the surviving tune/roster authority oracle. Test-only.
// The retired fill/reset ops and their site-capacity validation are removed with the haul states in step 5.
import { createTune, okTune, setTune, serializeTune, loadTune, hashTune, type TuneKey } from '../../src/sim/tune.ts';
import type { SyncView, Ctx } from '../../src/world/rules/types.ts';

export const name = 'tune';
export type TuneCommit = { key: string; v: number; expectedRevision: number; requestId: string };
const controlled = (ctx: Ctx) =>
  ctx.env.protoRoom === true &&
  typeof ctx.env.tuneController === 'function' &&
  ctx.env.tuneController(ctx.from) === true;

export function install(sync: SyncView) {
  const tune = createTune();
  const ok = (key: unknown, v: unknown): key is TuneKey => okTune(key, v);
  sync.registerOp<{ key: string; v: number }>('tune.set', {
    validate: (e, ctx) => controlled(ctx) && ok(e.key, e.v),
    apply: (e) => {
      if (!ok(e.key, e.v)) return null;
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
  return { tune };
}
