// The route's seeds as the unconverted tests know them (docs/plans/ecs-migration-railway.md, M3c): a fixture is a
// seed's world behind the read-only live view (src/sim/railway-live.ts) and its tick. The builders and steps are the
// world seeds' (src/sim/railway-seed-route.ts); a step runs on the fixture's world and refreshes its view. Converted
// tests use test/helpers/rail.ts instead; M12b deletes this file.
import * as route from '../../src/sim/railway-seed-route.ts';
import type { Seed } from '../../src/sim/railway-seed-route.ts';
import type { Railway } from '../../src/sim/railway.ts';
import { edit, liveOf, worldOf } from '../railway-live.ts';

export type { RailSeedStage } from '../../src/sim/railway-seed-route.ts';
export type World = { s: Railway; t: number };

/** A seed as a fixture: its world behind a live view. */
export const fixture = (seed: Seed): World => ({ s: liveOf(seed.w), t: seed.t });
/** A world-seed step on a fixture: the step runs on its world and tick, then the view is rebuilt. */
export const step =
  <A extends unknown[], R>(fn: (seed: Seed, ...a: A) => R) =>
  (f: World, ...a: A): R => {
    const seed = { w: worldOf(f.s), t: f.t };
    try {
      return fn(seed, ...a);
    } finally {
      edit(f.s, () => {}); // the world changed under the view, a throw included
      f.t = seed.t;
    }
  };
export const act = step(route.act);
export const advance = step(route.advance);
export const logs = step(route.logs);
export const rails = step(route.rails);
export const railwayAtQ2 = () => fixture(route.railwayAtQ2());
export const railwayAtQ4 = () => fixture(route.railwayAtQ4());
export const railwayAtQ5 = (stage: route.RailSeedStage) => fixture(route.railwayAtQ5(stage));
