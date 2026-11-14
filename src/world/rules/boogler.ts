// Server pose checkpoint and 10 Hz decisions. Native math and projection are injected from src/world.
import { mulberry32 } from '../../sim/rng.ts';
import { FNV_SEED, foldStr } from '../../sim/hash.ts';
import type { SyncView } from './types.ts';
import { GIFTS } from '../../sim/gift-catalog.ts';
import type { ServerOps, ServerOpContext } from '../server-ops.ts';

/** Cosmetic commands: only accepted requests spend cadence. No inventory or dialogue lives on the server. */
export function installBooglerReactions(
  ops: ServerOps,
  now: () => number,
  pose: () => { x: number; z: number },
  tick: () => number,
) {
  const gifts = new Map<string, number>(),
    puffs = new Map<string, number>();
  const near = (ctx: ServerOpContext, range: number) => {
    const p = pose();
    return ctx.actor.reach(p.x * 100, p.z * 100, range * 100);
  };
  const cadence = (last: Map<string, number>, pid: string, ms: number) => {
    const at = now();
    if (at - (last.get(pid) ?? -Infinity) < ms) return false;
    last.set(pid, at);
    return true;
  };
  ops.define('boogler.gift', {
    validate(e, ctx) {
      const gift = typeof e.kind === 'number' && Number.isInteger(e.kind) ? GIFTS[e.kind] : undefined;
      return !!gift && !gift.key && near(ctx, 5.6) && cadence(gifts, e.u, 1500);
    },
    apply: () => true,
    event(e) {
      const taste = GIFTS[e.kind as number]!.taste;
      return {
        op: 'boogler.react',
        pid: e.u,
        kind: taste === 'love' || taste === 'like' ? 5 : taste === 'dislike' ? 6 : 2,
      };
    },
  });
  ops.define('boogler.puff', {
    validate(e, ctx) {
      return (
        typeof e.end === 'number' && Number.isFinite(e.end) && e.end >= 0 && near(ctx, 2.6) && cadence(puffs, e.u, 2000)
      );
    },
    apply: () => true,
    // The rider supplies its room-clock launch deadline. Bound future duration to the normal 750 ms.
    event: (e) => ({ op: 'boogler.react', pid: e.u, kind: 4, end: Math.min(e.end as number, tick() + 7.5) }),
  });
  return {
    release(pid: string) {
      gifts.delete(pid);
      puffs.delete(pid);
    },
  };
}

export function installBoogler<T>(
  sync: SyncView,
  create: (
    rng: () => number,
    tick: number,
  ) => {
    step: (tick: number) => void;
    pause: (tick: number) => void;
    snapshot: () => T;
    serialize: () => number[];
    load: (value: unknown) => void;
    validate: (tick: number) => void;
  },
  active: () => boolean,
  project: () => void,
) {
  let rng: (() => number) | null = null;
  const brain = create(() => rng!(), 0);
  sync.registerState(
    'boogler',
    {
      serialize: brain.serialize,
      load: brain.load,
      hash: () => foldStr(FNV_SEED, JSON.stringify(brain.serialize())),
    },
    { server: true },
  );
  // Verify saved pose/hash before terrain validation changes a no-longer-safe spot.
  sync.onSnapshot((tick) => {
    brain.validate(tick);
    project();
  });
  sync.onTick((tick) => {
    if (!active()) brain.pause(tick);
    else {
      rng ??= mulberry32((sync.world.seed ^ Math.imul(tick, 0x9e3779b9)) >>> 0);
      brain.step(tick);
    }
    project();
  }, 'boogler');
  return {
    leg: brain.snapshot,
    pause: () => {
      brain.pause(sync.world.tick);
      project();
    },
  };
}
