import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePing, createLimiter, createChordDetector, honkFreq } from '../src/sim/social.js';

test('validatePing accepts good pings and rejects junk', () => {
  assert.deepEqual(validatePing({ t: 'ping', x: 1.234, y: 2, z: -3, k: 'ball' }), { x: 1.2, y: 2, z: -3, k: 'ball' });
  for (const bad of [
    null,
    { t: 'ping', x: NaN, y: 0, z: 0, k: 'ball' },
    { t: 'ping', x: 1, y: 0, z: 0, k: 'toString' },
    { t: 'ping', x: 999, y: 0, z: 0, k: 'look' },
    { t: 'ping', x: 0, y: 0, z: 0, k: 'dig' }, // retired kind
    { t: 'ping', x: '1', y: 0, z: 0, k: 'look' },
    { t: 'ping', x: 1, y: 0, z: 0 },
  ])
    assert.equal(validatePing(bad), null);
});

test('limiter allows N per window per sender', () => {
  const l = createLimiter(3, 1000);
  assert.deepEqual(
    [0, 100, 200, 300].map((t) => l.allow('a', t)),
    [true, true, true, false],
  );
  assert.equal(l.allow('b', 300), true);
  assert.equal(l.allow('a', 1001), true);
});

test('chord needs 3 different players within a second', () => {
  const d = createChordDetector();
  assert.equal(d.add('a', 0), null);
  assert.equal(d.add('a', 100), null); // same player twice is not two players
  assert.equal(d.add('b', 200), null);
  assert.deepEqual(d.add('c', 900)?.sort(), ['a', 'b', 'c']);
  assert.equal(d.add('d', 1000), null); // cooling down, and old honks were consumed
  const e = createChordDetector();
  e.add('a', 0);
  e.add('b', 500);
  assert.equal(e.add('c', 1600), null); // a and b are too old
});

test('honk pitch is stable per colour', () => {
  assert.equal(honkFreq(2), honkFreq(2));
  assert.ok(honkFreq(5) > honkFreq(0));
  for (const [k, s] of [0, 2, 4, 7, 9, 12, 14, 16].entries()) {
    const want = 261.63 * 2 ** (s / 12); // major pentatonic from C4
    assert.ok(Math.abs(honkFreq(k) - want) <= 0.01, `honkFreq(${k}) = ${honkFreq(k)}, want ${want}`);
    assert.equal(honkFreq(k + 8), honkFreq(k));
  }
});
