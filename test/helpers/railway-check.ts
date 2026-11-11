// The load check's corpus (docs/plans/ecs-migration-railway.md, M8b), shared by test/railway-check.test.ts (the bad
// worlds) and the golden shards (./railway-golden.ts: every golden stage, on the world each shard already builds).
// Each world is checked by the world check (railwayCheck).
import type { World } from '../../src/ecs/index.ts';
import { buildSeedWorld, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { createRailwayWorld } from '../../src/sim/railway-components.ts';

const message = (f: () => void) => {
  try {
    f();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
};
/** The world check's verdict: its message, or null. */
export const worldVerdict = (w: World) => message(() => railwayCheck(w));
/** A stage's world as the server holds it: the seed's snapshot loaded into a plain world (no check on load). */
export function stageWorld(stage: SeedStage): World {
  const w = createRailwayWorld();
  w.load(JSON.parse(JSON.stringify(buildSeedWorld(stage).w.snapshot())));
  return w;
}
