// The rule tick's order (docs/plans/ecs-migration-railway.md, M3): which systems `railTick` runs on each tick, in
// what order, and the world hash after each tick, on several seed stages. The fixture was recorded once on the
// hand-coded tick (six `w.run` calls in a row) before M3 made it a schedule, so the schedule is proved to run the same
// systems in the same order with the same result on every tick, not only after 1,200 (the hash golden).
//
// A refactor step must NEVER re-record test/fixtures/railway-tick-order.json. Only a deliberate change to the tick's
// systems or rules (which also bumps WORLD_NS) may (see the rule and its seed-data exception in test/helpers/railway-golden.ts): `TICK_ORDER=1 node --test test/railway-tick-order.test.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import type { World } from '../src/ecs/index.ts';
import { buildSeedWorld, type SeedStage } from '../src/sim/railway-seeds.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { createRailwayWorld } from '../src/sim/railway-components.ts';

const FILE = new URL('./fixtures/railway-tick-order.json', import.meta.url);
const TICKS = 300;
/** Line one laying, the depot cart, line two laying, the trains waking, the kiln casting, the wagon, the crossing; since
 * v27 the ring's footings at the railhead and three trains to Ring Island. */
const STAGES: readonly SeedStage[] = [
  'q1-done',
  'q2-arriving',
  'q4-arriving',
  'trains-on',
  'works-lit',
  'wagon-on',
  'crossing-finishing',
  'deck-laid',
  'ring-joined',
];
/** The trains' headway hold (the room tunable railTrainHeadPct, 0 to 100, default 75) where trains run, over 1,200
 * ticks. Recorded on the schedule (main after M3, before M3b), which the default rows prove equal to the hand-coded
 * tick; re-recorded never, as above (`TICK_ORDER_HEADS=1`). */
const HEADS_FILE = new URL('./fixtures/railway-tick-order-heads.json', import.meta.url);
const HEAD_TICKS = 1200;
const HEAD_STAGES: readonly SeedStage[] = ['trains-on', 'wagon-on', 'crossing-finishing', 'ring-joined'];
const HEAD_PCTS = [0, 40, 100] as const;
/** Per stage: the distinct per-tick sequences of system names, which one each tick ran, and the hash after it. */
type Row = { tick: number; sequences: string[][]; perTick: number[]; hashes: number[] };
type Fixture = { ticks: number; stages: Record<string, Row> };

/** The world, with every top-level system run recorded by name (what railTick calls, in order). */
function recording(w: World, names: string[]): World {
  return new Proxy(w, {
    get(target, key, receiver) {
      if (key === 'run')
        return (sys: Parameters<World['run']>[0], input: unknown) => {
          names.push(sys.name);
          return target.run(sys, input as never);
        };
      return Reflect.get(target, key, receiver) as unknown;
    },
  });
}

/** `ticks` rule ticks from a stage, on an unaudited copy of it, at the default headway hold or at `headPct`. */
function record(stage: SeedStage, ticks: number, headPct?: number): Row {
  const seed = buildSeedWorld(stage);
  const w = createRailwayWorld();
  w.load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  const row: Row = { tick: seed.t, sequences: [], perTick: [], hashes: [] };
  let t = seed.t;
  for (let i = 0; i < ticks; i++) {
    const names: string[] = [];
    if (headPct === undefined) railTick(recording(w, names), ++t);
    else railTick(recording(w, names), ++t, headPct);
    let k = row.sequences.findIndex((s) => s.join() === names.join());
    if (k < 0) k = row.sequences.push(names) - 1;
    row.perTick.push(k);
    row.hashes.push(w.hash());
  }
  return row;
}

// Built at module scope, outside the 5 s test timeout (as test/helpers/railway-golden.ts does).
const got: Record<string, Row> = {};
for (const stage of STAGES) got[stage] = record(stage, TICKS);
const gotHeads: Record<string, Row> = {};
for (const stage of HEAD_STAGES)
  for (const pct of HEAD_PCTS) gotHeads[`${stage}@${pct}`] = record(stage, HEAD_TICKS, pct);
if (process.env.TICK_ORDER === '1') writeFileSync(FILE, JSON.stringify({ ticks: TICKS, stages: got }) + '\n');
if (process.env.TICK_ORDER_HEADS === '1')
  writeFileSync(HEADS_FILE, JSON.stringify({ ticks: HEAD_TICKS, stages: gotHeads }) + '\n');
const fixture = JSON.parse(readFileSync(FILE, 'utf8')) as Fixture;
const heads = JSON.parse(readFileSync(HEADS_FILE, 'utf8')) as Fixture;

const HOW =
  'the tick runs other systems, in another order, or with another result than the hand-coded tick did: undo it';
test('the fixture covers the stages and ticks this test runs', () => {
  assert.deepEqual(Object.keys(fixture.stages), [...STAGES]);
  assert.equal(fixture.ticks, TICKS);
});
function same(stage: string, have: Row, want: Row, ticks: number) {
  assert.equal(have.tick, want.tick, `${stage}: the seed route changed`);
  for (let i = 0; i < ticks; i++) {
    assert.deepEqual(have.sequences[have.perTick[i]!], want.sequences[want.perTick[i]!], `${stage} tick ${i}: ${HOW}`);
    assert.equal(have.hashes[i], want.hashes[i], `${stage} tick ${i}: hash differs; ${HOW}`);
  }
}
for (const stage of STAGES)
  test(`seed stage ${stage}: each of ${TICKS} ticks runs the recorded systems in order and hashes as recorded`, () =>
    same(stage, got[stage]!, fixture.stages[stage]!, TICKS));
test('the headway fixture covers the stages, holds and ticks this test runs', () => {
  assert.deepEqual(Object.keys(heads.stages), Object.keys(gotHeads));
  assert.equal(heads.ticks, HEAD_TICKS);
});
for (const key of Object.keys(gotHeads))
  test(`seed stage ${key.replace('@', ' at headway hold ')}%: ${HEAD_TICKS} ticks as recorded`, () =>
    same(key, gotHeads[key]!, heads.stages[key]!, HEAD_TICKS));
