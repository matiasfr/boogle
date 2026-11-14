// The Boogler's server brain, projection, reactions and decision meter; rules retain their registration order.
import type { createSync } from '../../../src/world/sync.ts';
import type { ServerOps } from '../../../src/world/server-ops.ts';
import type { Replicator } from '../../../src/world/replicate-server.ts';
import type { RailwayPosition } from './railway-supply.ts';
import { installBoogler, installBooglerReactions } from '../../../src/world/rules/boogler.ts';
import { createBooglerShadow, booglerPose } from '../../../src/world/boogler-shadow.ts';
import { projectBoogler } from '../../../src/world/boogler-replicate.ts';
import { loadBooglerLand } from './land.ts';
import { booglerVisitors } from './boogler-presence.ts';
import { createBooglerMeter } from './boogler-meter.ts';

// One immutable baked land per process, shared by awake rooms.
let booglerLand: ReturnType<typeof loadBooglerLand> | undefined;

export function createHostBoogler({
  sync,
  ops,
  replication,
  now,
  positions,
  active,
}: {
  sync: ReturnType<typeof createSync>;
  ops: ServerOps;
  replication: Replicator;
  now: () => number;
  positions: () => (RailwayPosition | null)[];
  active: () => boolean;
}) {
  const booglerMeter = createBooglerMeter();
  let publishBoogler = () => {};
  const boogler = installBoogler(
    sync,
    (rng, tick) => {
      const brain = createBooglerShadow((booglerLand ??= loadBooglerLand()), rng, tick);
      publishBoogler = projectBoogler(replication, brain.leg);
      return {
        ...brain,
        snapshot: brain.snapshot,
        step(t: number) {
          const started = performance.now();
          const time = now();
          brain.step(t, booglerVisitors(positions(), time));
          const cost = performance.now() - started;
          booglerMeter.measure(cost);
        },
      };
    },
    active,
    () => publishBoogler(),
  );
  const booglerReactions = installBooglerReactions(
    ops,
    now,
    () => {
      const state = boogler.leg();
      return state.leg ? booglerPose(state.leg, sync.roomStep() / 6) : state;
    },
    () => sync.roomStep() / 6,
  );

  return { boogler, reactions: booglerReactions, meter: booglerMeter };
}
