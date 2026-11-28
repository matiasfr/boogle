// The railway hash golden's shared body (docs/plans/ecs-migration-railway.md, M0): every SeedStage's world hash at the
// stage and after 1,200 further rule ticks, as recorded on world v26. The stages are split over the files
// test/railway-golden-<n>.test.ts (SHARDS, balanced by build time) so `node --test` builds them in parallel; each
// stage is built once, and the tick pass runs on a plain (unaudited) copy of the built world, which is about 250 times
// faster than the audited seed world and hashes the same.
//
// A refactor step must NEVER regenerate test/fixtures/railway-golden.json. Only a deliberate rule change that also
// bumps WORLD_NS may, with one exception (owner, 11 November, "yes"): pinned fixtures may also be regenerated, without a
// WORLD_NS bump, when ONLY dev seed data changes (the seed builders' own op sequences under src/sim/railway-seed*.ts), never for a rule, tick, wire or save-shape change. The regeneration must change only the stages whose
// seeds changed; an independent reviewer confirms that by a keyed comparison. `GOLDEN=1 node --test --test-concurrency=1 'test/railway-golden-*.test.ts'` (each shard rewrites
// its own stages in the file, so they must not run at once).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { WORLD_NS } from '../../src/world/namespace.ts';
import { SEED_STAGES, buildSeedWorld, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { railTick } from '../../src/sim/railway-systems.ts';
import { createRailwayWorld } from '../../src/sim/railway-components.ts';
import { createRailway } from '../../src/sim/railway-drive.ts';
import { RAIL_LINES, trainPassesBy } from '../../src/sim/railway-lines.ts';
import { roomWorks, WORKS_STEPS } from '../../src/sim/railway-queries-room.ts';
import type { RoomWorks, WorksSite } from '../../src/sim/railway-queries-room.ts';
import { trainStops } from '../../src/sim/railway-queries-trains.ts';
import { rail } from '../../src/sim/railway-rows.ts';
import { worldVerdict } from './railway-check.ts';

const FILE = new URL('../fixtures/railway-golden.json', import.meta.url);
const TICKS = 1200;
// Lane A's pinned seed table. Keep this independent of the query's predicates.
const WORKS_AT: Record<SeedStage, WorksSite> = {
  awake: 'T1',
  't1-laid': 'T2',
  'forge-frame-last': 'forge',
  'forge-lit-last': 'forge',
  'q1-last': 'Q1',
  'q1-done': 'Q2',
  'q2-stocked': 'Q2',
  'q2-arriving': 'Q2',
  'hook-taken': 'Q3',
  'q3-stocked': 'Q3',
  'glide-earned': 'Q3',
  'q3-done': 'lever',
  'hook-earned': 'lever',
  'q4-stocked': 'Q4',
  'q4-arriving': 'Q4',
  'q4-done': 'sea',
  'q5-arriving': 'sea',
  'q5-shelved': 'sea',
  'sea-open': 'Q5',
  'q5-stocked': 'Q5',
  'q5-carry': 'Q5',
  'q5-finishing': 'Q5',
  'q5-done': 'boiler',
  boiler: 'boiler',
  'boiler-camp': 'boiler',
  'trains-on': 'breaker',
  'freight-running': 'breaker',
  'fares-running': 'breaker',
  'house-ready': 'breaker',
  'house-built': 'breaker',
  'sack-waiting': 'breaker',
  'yard-ready': 'breaker',
  'yard-built': 'breaker',
  'q6-stocked': 'breaker',
  'q6-finishing': 'breaker',
  'q6-done': 'breaker',
  'works-arrive': 'breaker',
  'works-open': 'kiln',
  'works-stocked': 'kiln',
  'works-lit': 'stall',
  'stall-done': 'cradle',
  'cradle-fitted': 'table',
  'wagon-on': 'crossing',
  'yard-wagon': 'crossing',
  'crossing-finishing': 'crossing',
  'crossing-done': 'Q7',
  'deck-laid': 'bents',
  'yard-deck': 'bents',
  'gap-footed': 'brace',
  'leaf-raised': 'brace',
  'ring-joined': 'steelworks',
  'steel-kit': 'steelworks',
  'gorge-open': 'steelworks',
  'gorge-mid': 'steelworks',
  'steel-lit': 'install',
  'steel-home': 'install',
  'boiler-long': 'stack-1',
  'gorge-reached': 'pick',
  'incline-open': 'incline-1',
  'incline-mid': 'incline-2',
  'bell-reached': 'seeds',
  'bay-open': 'bay-1',
  'bay-mid': 'bay-2',
  'trade-ready': 'bay-2',
  'trade-fitted': 'bay-2',
  'bay-reached': 'plug-gate',
  'canopy-open': 'canopy-1',
  'trade-held': 'canopy-1',
  'canopy-mid': 'canopy-2',
  'canopy-reached': 'cloth',
  'cave-first-open': 'cave-1',
  'cave-open': 'cave-1',
  'cave-mid': 'cave-2',
  'cave-first-reached': 'canopy-gate',
  'port-reached': 'wall-1',
  'quay-garage': 'wall-1',
  'wall-mid': 'wall-3',
  'wall-deep': 'deep-gate',
  'wall-closed': 'notch-gate',
  'lap-ride': 'notch-gate',
  'notch-open': 'notch-gate',
  'notch-reached': 'lantern',
  'causeway-open': 'causeway-1',
  'island-reached': 'arrive',
  arrived: 'arrive',
};
/** Every stage in exactly one shard (checked below); the trains and works stages share their cached bases. */
export const SHARDS: readonly (readonly SeedStage[])[] = [
  [
    'awake',
    't1-laid',
    'forge-frame-last',
    'forge-lit-last',
    'q1-done',
    'q2-stocked',
    'q2-arriving',
  ],
  ['hook-taken', 'q3-stocked', 'q3-done'],
  ['q4-stocked', 'q4-arriving'],
  ['hook-earned', 'q4-done', 'q5-arriving'],
  ['q5-shelved', 'sea-open', 'q5-stocked'],
  ['q5-carry', 'q5-finishing'],
  ['q5-done'],
  ['glide-earned'],
  // Every stage from the boiler on is built on railwayAtTrains' cached base: one build per shard that holds any.
  [
    'boiler',
    'boiler-camp',
    'trains-on',
    'freight-running',
    'fares-running',
    'house-ready',
    'house-built',
    'sack-waiting',
  ],
  ['yard-ready', 'yard-built'],
  ['yard-wagon', 'yard-deck'],
  [
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
    'deck-laid',
    'gap-footed',
    'leaf-raised',
    'ring-joined',
    'steel-kit',
    'steel-lit',
    'steel-home',
    'boiler-long',
    'gorge-open',
    'gorge-mid',
    'gorge-reached',
    // Greybox leg 2 (docs/plans/greybox-leg2.md, step 3): built on gorge-reached, a second apiece.
    'incline-open',
    'incline-mid',
    'bell-reached',
    'bay-open',
    'bay-mid',
    'bay-reached',
    'canopy-open',
    'canopy-mid',
    'canopy-reached',
    'cave-first-open',
    'cave-first-reached',
    'cave-open',
    'cave-mid',
    'port-reached',
    'wall-mid',
    'wall-deep',
    'wall-closed',
    'lap-ride',
    'notch-open',
    'notch-reached',
    'causeway-open',
    'island-reached',
    'arrived',
    // Garage step 4 (docs/plans/garage-step4.md, step 3): the trade's seeds, built on bay-mid.
    'trade-ready',
    'trade-fitted',
    'trade-held',
    'quay-garage',
    // The Rail yoke (docs/plans/rail-yoke.md, step 2): look only, Q1 one rail short.
    'q1-last',
  ],
];
type Row = { tick: number; stage: number; after: number };
type Golden = { worldNs: string; ticks: number; stages: Record<string, Row> };

const HOW =
  'The railway rules or the seed route changed. A refactor step must never regenerate this golden: undo the change. ' +
  'Only a deliberate rule change that bumps WORLD_NS regenerates it (GOLDEN=1); see the rule and its seed-data exception at the top of this file.';

export function goldenShard(shard: number) {
  // Built at module scope, outside the 5 s test timeout (as test/railway-trains.test.ts does).
  const got: Record<string, Row> = {};
  const verdicts: Record<string, string | null> = {};
  const objectives = new Map<SeedStage, { works: RoomWorks; serving: boolean; stops: number }>();
  for (const stage of SHARDS[shard]!) {
    const seed = buildSeedWorld(stage);
    const built = seed.w;
    const works = roomWorks(built);
    objectives.set(stage, {
      works,
      serving: rail(built).trains >= 0,
      stops: works.halt ? trainStops(built, works.halt.line).length : 0,
    });
    const at = built.hash();
    // The same state on an unaudited world: the audit only checks writes, it never changes them.
    const w = createRailwayWorld();
    w.load(JSON.parse(JSON.stringify(built.snapshot())));
    assert.equal(w.hash(), at, `${stage}: the copy hashes as the built world`);
    // The load check's corpus (./railway-check.ts): the stage as the server holds it, before the tick pass.
    verdicts[stage] = worldVerdict(w);
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

  if (shard === 0)
    test('a fresh room names the wake site', () => {
      const works = roomWorks(createRailway());
      assert.equal(works.site, 'wake');
      assert.equal(works.done, false);
      assert.equal(works.halt, null);
    });
  for (const stage of SHARDS[shard]!)
    test(`seed stage ${stage}: the room's works is ${WORKS_AT[stage]}`, () => {
      const { works, serving, stops } = objectives.get(stage)!;
      assert.equal(works.site, WORKS_AT[stage]);
      assert.equal(works.done, stage === 'arrived');
      const expectedAt =
        stage === 'boiler-camp'
          ? { x: 100700, y: 3030, z: -14400 }
          : WORKS_STEPS.find((s) => s.site === WORKS_AT[stage])!.at;
      assert.deepEqual(works.at, expectedAt);
      for (const { what, have, of } of works.needs) {
        assert.ok(have >= 0 && have <= of, `${what}: ${have} of ${of}`);
      }
      if (stage === 'q5-finishing') {
        assert.deepEqual(works.needs, [
          { what: 'logs', have: 24, of: 24 },
          { what: 'rails', have: 24, of: 24 },
        ]);
        assert.deepEqual(works.ops, []);
      }
      assert.equal(works.halt !== null, serving);
      if (works.halt) {
        const { line, stop } = works.halt;
        assert.ok(RAIL_LINES[line] && stop >= 0 && stop < stops);
        assert.ok(!trainPassesBy(line, stop, 1, stops) || !trainPassesBy(line, stop, -1, stops));
      }
    });

  test(`shard ${shard}: the shards hold every seed stage once, and the golden lists them`, () => {
    assert.deepEqual([...SHARDS.flat()].sort(), [...SEED_STAGES].sort(), 'SHARDS must partition SEED_STAGES');
    assert.deepEqual(Object.keys(golden.stages), [...SEED_STAGES], 'stage list changed: ' + HOW);
    assert.equal(golden.ticks, TICKS);
  });
  for (const stage of SHARDS[shard]!)
    test(`seed stage ${stage}: the world check accepts it`, () => {
      assert.equal(verdicts[stage], null, `${stage}: the world check`);
    });
  for (const stage of SHARDS[shard]!)
    test(`seed stage ${stage}: hash at the stage and after ${TICKS} ticks match the golden`, () => {
      assert.deepEqual(got[stage], golden.stages[stage], `${stage}: ${HOW}`);
    });
}
