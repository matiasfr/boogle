// The jump-in catalog (docs/plans/playtest-jump-in.md): every row a buildable seed, in route order, and room names the
// shared world can never match.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JUMPS, JUMP_ROOM_RE, jumpRoomName, OFFERED_STAGES } from '../src/world/railway-jump.ts';
import { SEED_STAGES, TRAIN_STAGES } from '../src/sim/railway-seeds.ts';
import { WORKS_STAGES } from '../src/sim/railway-seed-works.ts';
import { RAILWAY_PLAY_NS, railwayRoomId } from '../src/world/railway-namespace.ts';
import { DEFAULT_ROOM } from '../src/constants.ts';

const seeds: readonly string[] = SEED_STAGES;

test('jump-in rows are unique, buildable and in route order', () => {
  assert.equal(new Set(JUMPS.map((j) => j.stage)).size, JUMPS.length);
  assert.equal(new Set(JUMPS.map((j) => j.label)).size, JUMPS.length);
  assert.equal(JUMPS[0]!.stage, 'start');
  for (const j of JUMPS) assert.ok(j.stage === 'start' || seeds.includes(j.stage), j.stage);
  const order = OFFERED_STAGES.map((s) => seeds.indexOf(s));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
});

test('the seed catalog holds every train and works stage', () => {
  assert.equal(new Set(seeds).size, seeds.length);
  for (const s of [...TRAIN_STAGES, ...WORKS_STAGES]) assert.ok(seeds.includes(s), s);
});

test('jump room names stay readable and never match the shared room', () => {
  for (const stage of ['start', ...seeds]) {
    const name = jumpRoomName(stage, 'abc123');
    assert.match(name, JUMP_ROOM_RE, stage);
    assert.ok(name.length <= 22, name);
    assert.equal(railwayRoomId(name), `${RAILWAY_PLAY_NS}-${name}`);
  }
  assert.equal(JUMP_ROOM_RE.test(DEFAULT_ROOM), false);
});
