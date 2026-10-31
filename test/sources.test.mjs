// Sources (src/sim/sources.js): charges per source for the current age, takes spend them, R1 refills all, the R2
// trickle refills one empty source on schedule (the same one for the same seed and tick), and a new age resets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSources,
  sync,
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

const layout = { trees: Array.from({ length: 5 }, (_, k) => ({ i: 10 + k, j: 10 })) };

test('a take spends a charge and yields a handful; an empty source gives nothing', () => {
  const s = createSources();
  sync(s, 0, layout);
  assert.equal(s.c.length, 5);
  for (let k = 0; k < FULL; k++) assert.equal(take(s, 2), YIELD);
  assert.equal(take(s, 2), 0);
  assert.equal(chargesOf(s, 2), 0);
  assert.equal(take(s, 99), 0);
  refillAll(s);
  assert.equal(chargesOf(s, 2), FULL);
});

test('the trickle refills one empty source on its tick, the same one for the same seed', () => {
  const run = () => {
    const s = createSources();
    sync(s, 0, layout);
    for (let id = 0; id < 5; id++) while (take(s, id));
    assert.equal(trickle(s, TRICKLE_EVERY + 1, 7), -1, 'off schedule');
    return [trickle(s, TRICKLE_EVERY, 7), trickle(s, 2 * TRICKLE_EVERY, 7), s.c.join()];
  };
  const a = run();
  assert.ok(a[0] >= 0 && a[1] >= 0 && a[0] !== a[1]);
  assert.deepEqual(run(), a);
});

test('a new age keeps only its own sources (none past wood yet)', () => {
  const s = createSources();
  sync(s, 0, layout);
  take(s, 0);
  sync(s, 1, layout);
  assert.equal(s.a, 1);
  assert.equal(s.c.length, 0);
});

test('serialize/load round-trips with the same hash; bad data throws', () => {
  const s = createSources();
  sync(s, 0, layout);
  take(s, 3);
  const t = createSources();
  loadSources(t, JSON.parse(JSON.stringify(serializeSources(s))));
  assert.equal(hashSources(t), hashSources(s));
  assert.throws(() => loadSources(t, { a: 0, c: [FULL + 1] }));
  assert.throws(() => loadSources(t, { a: -1, c: [] }));
});
