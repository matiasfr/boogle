// Sources (src/sim/sources.js): charges per source for the current age, takes spend them, R1 refills all, the R2
// trickle refills one empty source on schedule (the same one for the same seed and tick), and a new age starts full.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSources,
  matchAge,
  take,
  chargesOf,
  refillAll,
  trickle,
  serializeSources,
  loadSources,
  hashSources,
  FULL,
  YIELD,
  TRICKLE_EVERY,
} from '../src/sim/sources.js';

const N = 5;

test('a take spends a charge and yields a handful; an empty or unknown source gives nothing', () => {
  const s = createSources();
  assert.equal(chargesOf(s, 0, N, 2), FULL);
  for (let k = 0; k < FULL; k++) assert.equal(take(s, 0, N, 2), YIELD);
  assert.equal(take(s, 0, N, 2), 0);
  assert.equal(chargesOf(s, 0, N, 2), 0);
  assert.equal(take(s, 0, N, N), 0);
  refillAll(s);
  assert.equal(chargesOf(s, 0, N, 2), FULL);
});

test('the trickle refills one empty source on its tick, the same one for the same seed', () => {
  const run = () => {
    const s = createSources();
    for (let id = 0; id < N; id++) while (take(s, 0, N, id));
    assert.equal(trickle(s, TRICKLE_EVERY + 1, 7), -1, 'off schedule');
    return [trickle(s, TRICKLE_EVERY, 7), trickle(s, 2 * TRICKLE_EVERY, 7), serializeSources(s).s.join()];
  };
  const a = run();
  assert.ok(a[0] >= 0 && a[1] >= 0 && a[0] !== a[1]);
  assert.deepEqual(run(), a);
});

test('a new age reads full, and forgets the old counts once it is matched', () => {
  const s = createSources();
  take(s, 0, N, 0);
  assert.equal(chargesOf(s, 1, N, 0), FULL, 'reading never changes state');
  assert.equal(s.a, 0);
  matchAge(s, 1);
  assert.equal(s.spent.size, 0);
});

test('serialize/load round-trips with the same hash; bad data throws', () => {
  const s = createSources();
  take(s, 0, N, 3);
  take(s, 0, N, 1);
  const t = createSources();
  loadSources(t, JSON.parse(JSON.stringify(serializeSources(s))));
  assert.equal(hashSources(t), hashSources(s));
  assert.notEqual(hashSources(createSources()), hashSources(s));
  assert.throws(() => loadSources(t, { a: 0, s: [1, FULL + 1] }));
  assert.throws(() => loadSources(t, { a: -1, s: [] }));
});
