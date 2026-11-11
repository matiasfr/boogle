// A saved room's shape (docs/plans/ecs-migration-railway.md, M0): test/fixtures/railway-v26-snapshot.json is the
// `world.snapshot()` of the `q6-done` stage, recorded on world v26. It must keep loading through railwayCheck and
// hash the same, and saving it again must give the same JSON. A refactor never changes this file. At the next
// WORLD_NS bump this test and its fixture are DELETED, not re-recorded (owner, 10 November: "Don't priotiize save
// guards. we can do a full wipe at any time in development."); nothing more is spent on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildSeedWorld } from '../src/sim/railway-seeds.ts';
import { createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { worldOf } from './railway-live.ts';

const FILE = new URL('./fixtures/railway-v26-snapshot.json', import.meta.url);
type Fixture = { worldNs: string; stage: string; hash: number; snapshot: unknown };

// Built at module scope, outside the 5 s test timeout.
const built = worldOf(buildSeedWorld('q6-done').s);
if (process.env.GOLDEN === '1') {
  const f: Fixture = { worldNs: 'v26', stage: 'q6-done', hash: built.hash(), snapshot: built.snapshot() };
  writeFileSync(FILE, JSON.stringify(f) + '\n');
}
const fixture = JSON.parse(readFileSync(FILE, 'utf8')) as Fixture;

test('the v26 snapshot loads through railwayCheck and hashes as recorded', () => {
  const w = createRailwayWorld({ audit: true });
  w.load(JSON.parse(JSON.stringify(fixture.snapshot)), railwayCheck);
  assert.equal(w.hash(), fixture.hash);
});

test('the loaded v26 snapshot saves back to the same JSON', () => {
  const w = createRailwayWorld();
  w.load(JSON.parse(JSON.stringify(fixture.snapshot)), railwayCheck);
  assert.deepEqual(JSON.parse(JSON.stringify(w.snapshot())), fixture.snapshot);
});

test('a fresh q6-done build still hashes as the recorded snapshot', () => {
  assert.equal(built.hash(), fixture.hash);
});
