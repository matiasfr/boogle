// The load check's corpus (docs/plans/ecs-migration-railway.md, M8b), shared by test/railway-check.test.ts (the bad
// worlds) and test/railway-check-stages-<n>.test.ts (every golden stage, split as the golden's shards are so the
// stages build in parallel). Each world is checked twice: by the world check (railwayCheck) and, while the old
// validators exist, by the read model's (validateRailway on railwayOf(w), the world's read model, which railwayCheck
// ran until M8b), which must agree. M12b deletes the old side.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { World } from '../../src/ecs/index.ts';
import { buildSeedWorld, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { railwayCheck, validateRailway } from '../../src/sim/railway-check.ts';
import { railwayOf } from './railway-model.ts';
import { createRailwayWorld } from '../../src/sim/railway-components.ts';
import { SHARDS } from './railway-golden.ts';

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
/** The read model's check on the same world (validateRailway, which railwayCheck ran until M8b). */
export const modelVerdict = (w: World) => message(() => validateRailway(railwayOf(w)));
/** A stage's world as the server holds it: the seed's snapshot loaded into a plain world (no check on load). */
export function stageWorld(stage: SeedStage): World {
  const w = createRailwayWorld();
  w.load(JSON.parse(JSON.stringify(buildSeedWorld(stage).w.snapshot())));
  return w;
}

/** Every stage of the golden's shards `shards` is accepted by both checks. Built at module scope (the 5 s timeout). */
export function checkStages(shards: readonly number[]) {
  const stages = shards.flatMap((k) => SHARDS[k]!);
  const got = stages.map((stage) => {
    const w = stageWorld(stage);
    return { stage, world: worldVerdict(w), model: modelVerdict(w) };
  });
  for (const { stage, world, model } of got)
    test(`seed stage ${stage}: the world check and the read model's check accept it`, () => {
      assert.equal(world, null, `${stage}: the world check`);
      assert.equal(model, null, `${stage}: the read model's check`);
    });
}
