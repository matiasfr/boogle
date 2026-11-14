// Server pose checkpoint and 10 Hz decisions. Native math and projection are injected from src/world.
import { mulberry32 } from '../../sim/rng.ts';
import { FNV_SEED, foldStr } from '../../sim/hash.ts';
import type { SyncView } from './types.ts';

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
