// The haul wave's timetable (src/proto/haul/wave-time.ts): every tab must agree on it from shared time alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WAVE, gapOf, wavePhase } from '../src/proto/haul/wave-time.ts';

test('gaps stay within 60-90 s and depend on the seed', () => {
  for (let n = 0; n < 500; n++) {
    const g = gapOf(n, 20261028);
    assert.ok(g >= WAVE.gapMin && g < WAVE.gapMax, `gap ${n}: ${g}`);
  }
  const a = Array.from({ length: 20 }, (_, n) => gapOf(n, 1));
  const b = Array.from({ length: 20 }, (_, n) => gapOf(n, 2));
  assert.notDeepEqual(a, b);
});

test('phases run calm, warn, sweep, recede, and the first crest is at WAVE.first', () => {
  assert.equal(wavePhase(0, 7).phase, 'calm');
  assert.equal(wavePhase(WAVE.first - WAVE.warn + 0.1, 7).phase, 'warn');
  const s = wavePhase(WAVE.first + 1, 7);
  assert.equal(s.phase, 'sweep');
  assert.equal(s.n, 0);
  assert.equal(wavePhase(WAVE.first + WAVE.sweep + 1, 7).phase, 'recede');
  const next = wavePhase(WAVE.first + WAVE.sweep + WAVE.recede + 0.01, 7);
  assert.equal(next.n, 1);
  assert.equal(next.at, WAVE.first + gapOf(0, 7));
});

test('the answer does not depend on the order of the questions (a tab that joins late, a clock that jumps back)', () => {
  const seed = 99;
  const times = Array.from({ length: 200 }, (_, k) => k * 37.3);
  const forward = times.map((t) => wavePhase(t, seed));
  const backward = [...times].reverse().map((t) => wavePhase(t, seed));
  assert.deepEqual(forward, backward.reverse());
  const late = wavePhase(5000, seed);
  wavePhase(10, 3); // another room's seed in between
  assert.deepEqual(wavePhase(5000, seed), late);
});
