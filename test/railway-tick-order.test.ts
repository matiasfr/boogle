// The rule tick's order (docs/plans/ecs-migration-railway.md, M3): which systems `railTick` runs on each tick, in
// what order, and the world hash after each tick, on the stages where trains run, at three headway holds (the room
// tunable railTrainHeadPct, 0 to 100, default 75) over 1,200 ticks. Recorded on the schedule after M3, before M3b.
// The default hold's end hashes are the hash golden's (test/helpers/railway-golden.ts); the hand-coded-tick rows this
// file once held (nine stages, 300 ticks at the default hold, the M3 conversion proof) were dropped in the test
// cleanup of 17 November 2026: every tick of every stage runs the one recorded sequence below, and a reordered system
// that changes a result also fails the golden.
//
// A refactor step must NEVER re-record test/fixtures/railway-tick-order-heads.json. Only a deliberate change to the
// tick's systems or rules (which also bumps WORLD_NS) may (see the rule and its seed-data exception in
// test/helpers/railway-golden.ts): `TICK_ORDER_HEADS=1 node --test test/railway-tick-order.test.ts`.
// Re-recorded 19 November: v64's yoke column moved every hash with every sequence the same (rail-yoke step 1), then
// seed data only (step 2: the seeds take the yoke at Q1; all 12 rows are built on railwayAtQ2): every per-tick system
// sequence and start tick the same, every hash moves. Re-recorded for v65's halt yards (four empty rows, later ids on
// by 4): every sequence, per-tick count and start tick the same, all 14,400 hashes move.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import type { World } from '../src/ecs/index.ts';
import { buildSeedWorld, type SeedStage } from '../src/sim/railway-seeds.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { createRailwayWorld } from '../src/sim/railway-components.ts';

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

/** `ticks` rule ticks from a stage, on an unaudited copy of it, at headway hold `headPct`. */
function record(stage: SeedStage, ticks: number, headPct: number): Row {
  const seed = buildSeedWorld(stage);
  const w = createRailwayWorld();
  w.load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  const row: Row = { tick: seed.t, sequences: [], perTick: [], hashes: [] };
  let t = seed.t;
  for (let i = 0; i < ticks; i++) {
    const names: string[] = [];
    railTick(recording(w, names), ++t, headPct);
    let k = row.sequences.findIndex((s) => s.join() === names.join());
    if (k < 0) k = row.sequences.push(names) - 1;
    row.perTick.push(k);
    row.hashes.push(w.hash());
  }
  return row;
}

// Built at module scope, outside the 5 s test timeout (as test/helpers/railway-golden.ts does).
const gotHeads: Record<string, Row> = {};
for (const stage of HEAD_STAGES)
  for (const pct of HEAD_PCTS) gotHeads[`${stage}@${pct}`] = record(stage, HEAD_TICKS, pct);
if (process.env.TICK_ORDER_HEADS === '1')
  writeFileSync(HEADS_FILE, JSON.stringify({ ticks: HEAD_TICKS, stages: gotHeads }) + '\n');
const heads = JSON.parse(readFileSync(HEADS_FILE, 'utf8')) as Fixture;

const HOW =
  'the tick runs other systems, in another order, or with another result than the hand-coded tick did: undo it';
function same(stage: string, have: Row, want: Row, ticks: number) {
  assert.equal(have.tick, want.tick, `${stage}: the seed route changed`);
  for (let i = 0; i < ticks; i++) {
    assert.deepEqual(have.sequences[have.perTick[i]!], want.sequences[want.perTick[i]!], `${stage} tick ${i}: ${HOW}`);
    assert.equal(have.hashes[i], want.hashes[i], `${stage} tick ${i}: hash differs; ${HOW}`);
  }
}
test('the headway fixture covers the stages, holds and ticks this test runs', () => {
  assert.deepEqual(Object.keys(heads.stages), Object.keys(gotHeads));
  assert.equal(heads.ticks, HEAD_TICKS);
});
for (const key of Object.keys(gotHeads))
  test(`seed stage ${key.replace('@', ' at headway hold ')}%: ${HEAD_TICKS} ticks as recorded`, () =>
    same(key, gotHeads[key]!, heads.stages[key]!, HEAD_TICKS));
