// The rule tick's order (docs/plans/ecs-migration-railway.md, M3): which systems `railTick` runs on each tick, in
// what order, and the world hash after each tick, on several seed stages. The fixture was recorded once on the
// hand-coded tick (six `w.run` calls in a row) before M3 made it a schedule, so the schedule is proved to run the same
// systems in the same order with the same result on every tick, not only after 1,200 (the hash golden).
//
// A refactor step must NEVER re-record test/fixtures/railway-tick-order.json. Only a deliberate change to the tick's
// systems or rules (which also bumps WORLD_NS) may: `TICK_ORDER=1 node --test test/railway-tick-order.test.ts`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import type { World } from '../src/ecs/index.ts';
import { buildSeedWorld, type SeedStage } from '../src/sim/railway-seeds.ts';
import { railTick } from '../src/sim/railway-systems.ts';
import { createRailwayWorld } from '../src/sim/railway-world.ts';
import { worldOf } from './railway-live.ts';

const FILE = new URL('./fixtures/railway-tick-order.json', import.meta.url);
const TICKS = 300;
/** Line one laying, the depot cart, line two laying, the trains waking, the kiln casting, the wagon, the crossing. */
const STAGES: readonly SeedStage[] = [
  'q1-done',
  'q2-arriving',
  'q4-arriving',
  'trains-on',
  'works-lit',
  'wagon-on',
  'crossing-finishing',
];
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

// Built at module scope, outside the 5 s test timeout (as test/helpers/railway-golden.ts does).
const got: Record<string, Row> = {};
for (const stage of STAGES) {
  const seed = buildSeedWorld(stage);
  const w = createRailwayWorld();
  w.load(JSON.parse(JSON.stringify(worldOf(seed.s).snapshot())));
  const row: Row = { tick: seed.t, sequences: [], perTick: [], hashes: [] };
  let t = seed.t;
  for (let i = 0; i < TICKS; i++) {
    const names: string[] = [];
    railTick(recording(w, names), ++t);
    let k = row.sequences.findIndex((s) => s.join() === names.join());
    if (k < 0) k = row.sequences.push(names) - 1;
    row.perTick.push(k);
    row.hashes.push(w.hash());
  }
  got[stage] = row;
}
if (process.env.TICK_ORDER === '1') writeFileSync(FILE, JSON.stringify({ ticks: TICKS, stages: got }) + '\n');
const fixture = JSON.parse(readFileSync(FILE, 'utf8')) as Fixture;

const HOW =
  'the tick runs other systems, in another order, or with another result than the hand-coded tick did: undo it';
test('the fixture covers the stages and ticks this test runs', () => {
  assert.deepEqual(Object.keys(fixture.stages), [...STAGES]);
  assert.equal(fixture.ticks, TICKS);
});
for (const stage of STAGES)
  test(`seed stage ${stage}: each of ${TICKS} ticks runs the recorded systems in order and hashes as recorded`, () => {
    const want = fixture.stages[stage]!,
      have = got[stage]!;
    assert.equal(have.tick, want.tick, `${stage}: the seed route changed`);
    for (let i = 0; i < TICKS; i++) {
      assert.deepEqual(
        have.sequences[have.perTick[i]!],
        want.sequences[want.perTick[i]!],
        `${stage} tick ${i}: ${HOW}`,
      );
      assert.equal(have.hashes[i], want.hashes[i], `${stage} tick ${i}: hash differs; ${HOW}`);
    }
  });
