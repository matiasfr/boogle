// Tick-only shadow. No commands, projection or checkpoint registration until players steps 6 and 7.
// Inject the native-trig brain from src/world; guarded rules contain only scheduling and seeded RNG.
import { mulberry32 } from '../../sim/rng.ts';
import type { SyncView } from './types.ts';

export function installBoogler<T>(
  sync: SyncView,
  create: (rng: () => number, tick: number) => { step: (tick: number) => void; snapshot: () => T },
  active: () => boolean,
) {
  let brain: ReturnType<typeof create> | null = null;
  sync.onTick((tick) => {
    if (!active()) return;
    // Lazily initialize after checkpoint recovery, using the persisted seed and first awake rule tick.
    brain ??= create(mulberry32((sync.world.seed ^ Math.imul(tick, 0x9e3779b9)) >>> 0), tick - 1);
    brain.step(tick);
  }, 'boogler-shadow');
  return { leg: () => brain?.snapshot() ?? null };
}
