import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairRestores, expectedRestore, type Restored } from '../dev/look/restore-pair.ts';

const restored = (): Restored => ({
  position: { x: 900, y: 20, z: 14 },
  room: 'saved-room',
  interior: 'house',
  progress: { track: 160, town: 20 },
});

test('pair equal progress with at most one metre of settling in three dimensions', () => {
  const a = restored(),
    b = restored();
  assert.equal(pairRestores(a, b, restored()).pair, true);
  b.position.y += 1;
  assert.equal(pairRestores(a, b, restored()).pair, true);
  b.position.x += 0.01;
  assert.match(pairRestores(a, b, restored()).reason, /position differs/);
  assert.equal(pairRestores(a, b, restored()).pair, false);
});

test('refuse different room, interior or progress and name every measured mismatch', () => {
  const a = restored(),
    b = restored();
  b.room = 'fresh-room';
  b.interior = null;
  b.progress = { track: 0, town: 12 };
  const result = pairRestores(a, b, restored());
  assert.equal(result.pair, false);
  for (const text of ['room saved-room → fresh-room', 'interior house → outside', 'track 160 → 0', 'town 20 → 12'])
    assert.ok(result.reason.includes(text));
});

test('refuse missing, malformed and nonfinite readbacks instead of pairing two unknowns', () => {
  for (const bad of [
    null,
    {},
    { ...restored(), position: null },
    { ...restored(), room: '' },
    { ...restored(), interior: undefined },
    { ...restored(), progress: { track: NaN, town: 20 } },
    { ...restored(), position: { x: Infinity, y: 20, z: 14 } },
  ]) {
    assert.equal(pairRestores(bad, restored(), restored()).pair, false);
    assert.equal(pairRestores(restored(), bad, restored()).pair, false);
    assert.equal(pairRestores(bad, bad, restored()).pair, false);
  }
});

test('accept only negligible floating point noise in track progress', () => {
  const a = restored(),
    b = restored();
  b.progress.track += 1e-8;
  assert.equal(pairRestores(a, b, restored()).pair, true);
  b.progress.track += 0.01;
  assert.equal(pairRestores(a, b, restored()).pair, false);
});

test('two identical fresh fallbacks or relocated poses cannot masquerade as the saved moment', () => {
  const fresh = restored();
  fresh.progress = { track: 0, town: 12 };
  const mismatch = pairRestores(fresh, fresh, restored());
  assert.equal(mismatch.pair, false);
  assert.match(mismatch.reason, /before track 0 m, checkpoint 160 m/);
  assert.match(mismatch.reason, /after town 12, checkpoint 20/);
  const moved = restored();
  moved.position.y -= 2;
  assert.equal(pairRestores(moved, moved, restored()).pair, false);
  assert.equal(pairRestores(restored(), restored(), null).pair, false);
});

test('read expected progress from the selected room save; refuse unsupported or malformed checkpoints', () => {
  const value = JSON.stringify({ shared: { job: { score: { metres: 160 }, people: 20 } } });
  const save = {
    room: 'saved-room',
    query: 'proto=place',
    pose: restored().position,
    storage: { 'boogle-place-v4:saved-room': value },
  };
  assert.deepEqual(expectedRestore(save)?.progress, { track: 160, town: 20 });
  assert.equal(expectedRestore({ ...save, room: 'another-room' }), null);
  assert.equal(expectedRestore({ ...save, storage: { 'boogle-place-v4:saved-room': 'invalid' } }), null);
  assert.equal(expectedRestore({ ...save, pose: null }), null);
  assert.deepEqual(
    expectedRestore({ ...save, query: 'proto=place&coop=1', storage: { 'boogle-place-coop-v2:saved-room': value } })
      ?.progress,
    { track: 160, town: 20 },
  );
});
