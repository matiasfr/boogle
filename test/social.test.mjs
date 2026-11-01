import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePing,
  createLimiter,
  createChordDetector,
  honkFreq,
  honkNotes,
  honkChord,
  honkShape,
  HONK_CHORD_S,
} from '../src/sim/social.ts';

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

test('honks take tones from one shared chord', () => {
  for (const t of [0, HONK_CHORD_S * 1.5, HONK_CHORD_S * 2.2, HONK_CHORD_S * 3.9, HONK_CHORD_S * 7]) {
    const chord = honkChord(t);
    for (let c = 0; c < 8; c++)
      for (let v = 0; v < 4; v++) {
        const [f, f2] = honkNotes(c, t, v);
        assert.ok(chord.includes(f) && chord.includes(f2), `colour ${c} shape ${v} at ${t}s is in the chord`);
      }
    // no two voices a semitone (or major seventh) apart: any set of honks is consonant
    for (const a of chord)
      for (const b of chord) {
        const st = ((Math.round(Math.log2(a / b) * 12) % 12) + 12) % 12;
        assert.ok(st !== 1 && st !== 11, `${a} and ${b} clash`);
      }
  }
  assert.notDeepEqual(honkChord(0), honkChord(HONK_CHORD_S));
  assert.notEqual(honkNotes(0, 0, 0)[0], honkNotes(0, 0, 1)[0]); // a honk isn't always the same note
  assert.equal(honkShape({ t: 'honk', v: 2 }), 2);
  for (const bad of [{ t: 'honk' }, { v: 9 }, { v: 1.5 }, { v: '1' }, null]) assert.equal(honkShape(bad), 0);
});
