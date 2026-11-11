// The railway hash golden's shared body (docs/plans/ecs-migration-railway.md, M0): every SeedStage's world hash at the
// stage and after 1,200 further rule ticks, as recorded on world v26. The stages are split over the files
// test/railway-golden-<n>.test.ts (SHARDS, balanced by build time) so `node --test` builds them in parallel; each
// stage is built once, and the tick pass runs on a plain (unaudited) copy of the built world, which is about 250 times
// faster than the audited seed world and hashes the same.
//
// A refactor step must NEVER regenerate test/fixtures/railway-golden.json. Only a deliberate rule change that also
// bumps WORLD_NS may: `GOLDEN=1 node --test --test-concurrency=1 'test/railway-golden-*.test.ts'` (each shard rewrites
// its own stages in the file, so they must not run at once).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { WORLD_NS } from '../../src/world/namespace.ts';
import { SEED_STAGES, buildSeedWorld, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { railTick } from '../../src/sim/railway-systems.ts';
import { createRailwayWorld } from '../../src/sim/railway-components.ts';
import { modelVerdict, worldVerdict } from './railway-check.ts';

const FILE = new URL('../fixtures/railway-golden.json', import.meta.url);
const TICKS = 1200;
/** Every stage in exactly one shard (checked below); the trains and works stages share their cached bases. */
export const SHARDS: readonly (readonly SeedStage[])[] = [
  ['awake', 'q1-done', 'q2-stocked', 'q2-arriving'],
  ['hook-taken', 'q3-stocked', 'q3-done'],
  ['q4-stocked', 'q4-arriving'],
  ['hook-earned', 'q4-done', 'q5-arriving'],
  ['q5-shelved', 'sea-open', 'q5-stocked'],
  ['q5-carry', 'q5-finishing'],
  ['q5-done', 'glide-earned'],
  ['boiler'],
  [
    'boiler-camp',
    'trains-on',
    'q6-stocked',
    'q6-finishing',
    'q6-done',
    'works-arrive',
    'works-open',
    'works-stocked',
    'works-lit',
    'stall-done',
    'cradle-fitted',
    'wagon-on',
    'crossing-finishing',
    'crossing-done',
  ],
];
type Row = { tick: number; stage: number; after: number };
type Golden = { worldNs: string; ticks: number; stages: Record<string, Row> };

const HOW =
  'The railway rules or the seed route changed. A refactor step must never regenerate this golden: undo the change. ' +
  'Only a deliberate rule change that bumps WORLD_NS regenerates it (GOLDEN=1, see test/helpers/railway-golden.ts).';

export function goldenShard(shard: number) {
  // Built at module scope, outside the 5 s test timeout (as test/railway-trains.test.ts does).
  const got: Record<string, Row> = {};
  const verdicts: Record<string, { world: string | null; model: string | null }> = {};
  for (const stage of SHARDS[shard]!) {
    const seed = buildSeedWorld(stage);
    const built = seed.w;
    const at = built.hash();
    // The same state on an unaudited world: the audit only checks writes, it never changes them.
    const w = createRailwayWorld();
    w.load(JSON.parse(JSON.stringify(built.snapshot())));
    assert.equal(w.hash(), at, `${stage}: the copy hashes as the built world`);
    // The load check's corpus (./railway-check.ts): the stage as the server holds it, before the tick pass.
    verdicts[stage] = { world: worldVerdict(w), model: modelVerdict(w) };
    let t = seed.t;
    for (let i = 0; i < TICKS; i++) railTick(w, ++t);
    got[stage] = { tick: seed.t, stage: at, after: w.hash() };
  }
  if (process.env.GOLDEN === '1') {
    let g: Golden = { worldNs: WORLD_NS, ticks: TICKS, stages: {} };
    try {
      g = JSON.parse(readFileSync(FILE, 'utf8')) as Golden;
    } catch {
      // first recording
    }
    g = { worldNs: WORLD_NS, ticks: TICKS, stages: { ...g.stages, ...got } };
    g.stages = Object.fromEntries(SEED_STAGES.filter((s) => g.stages[s]).map((s) => [s, g.stages[s]!]));
    writeFileSync(FILE, JSON.stringify(g, null, 1) + '\n');
  }
  const golden = JSON.parse(readFileSync(FILE, 'utf8')) as Golden;

  test(`shard ${shard}: the shards hold every seed stage once, and the golden lists them`, () => {
    assert.deepEqual([...SHARDS.flat()].sort(), [...SEED_STAGES].sort(), 'SHARDS must partition SEED_STAGES');
    assert.deepEqual(Object.keys(golden.stages), [...SEED_STAGES], 'stage list changed: ' + HOW);
    assert.equal(golden.ticks, TICKS);
  });
  for (const stage of SHARDS[shard]!)
    test(`seed stage ${stage}: the world check and the read model's check accept it`, () => {
      assert.equal(verdicts[stage]!.world, null, `${stage}: the world check`);
      assert.equal(verdicts[stage]!.model, null, `${stage}: the read model's check`);
    });
  for (const stage of SHARDS[shard]!)
    test(`seed stage ${stage}: hash at the stage and after ${TICKS} ticks match the golden`, () => {
      assert.deepEqual(got[stage], golden.stages[stage], `${stage}: ${HOW}`);
    });
}
