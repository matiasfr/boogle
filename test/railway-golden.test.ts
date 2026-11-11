// Hash golden for the railway's rules (docs/plans/ecs-migration-railway.md, M0): every SeedStage's world hash at the
// stage and after 1,200 further rule ticks, as recorded on world v26. A refactor of where the rules live (the ECS
// migration steps M2, M3, ...) must leave every number unchanged; this is its proof the rules did not move.
// A refactor step must NEVER regenerate this file. Only a deliberate rule change that also bumps WORLD_NS may, with
// `GOLDEN=1 node --test test/railway-golden.test.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { WORLD_NS } from '../src/world/namespace.ts';
import { SEED_STAGES, buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { worldOf } from './railway-live.ts';

const FILE = new URL('./fixtures/railway-golden.json', import.meta.url);
const TICKS = 1200;
type Row = { tick: number; stage: number; after: number };
type Golden = { worldNs: string; ticks: number; stages: Record<string, Row> };

// Built once, at module scope, outside the 5 s test timeout (as test/railway-trains.test.ts does).
const got: Record<string, Row> = {};
for (const stage of SEED_STAGES) {
  const seed = buildSeedWorld(stage);
  const w = worldOf(seed.s);
  const at = w.hash();
  let t = seed.t;
  for (let i = 0; i < TICKS; i++) railTick(w, ++t);
  got[stage] = { tick: seed.t, stage: at, after: w.hash() };
}

if (process.env.GOLDEN === '1') {
  const golden: Golden = { worldNs: WORLD_NS, ticks: TICKS, stages: got };
  writeFileSync(FILE, JSON.stringify(golden, null, 1) + '\n');
}
const golden = JSON.parse(readFileSync(FILE, 'utf8')) as Golden;
const HOW =
  'The railway rules or the seed route changed. A refactor step must never regenerate this golden: undo the change. ' +
  'Only a deliberate rule change that bumps WORLD_NS regenerates it (GOLDEN=1).';

test('the golden lists every seed stage and the same tick count', () => {
  assert.deepEqual(Object.keys(golden.stages), [...SEED_STAGES], 'stage list changed: ' + HOW);
  assert.equal(golden.ticks, TICKS);
});

for (const stage of SEED_STAGES)
  test(`seed stage ${stage}: hash at the stage and after ${TICKS} ticks match the golden`, () => {
    assert.deepEqual(got[stage], golden.stages[stage], `${stage}: ${HOW}`);
  });
