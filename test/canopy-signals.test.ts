import test from 'node:test';
import assert from 'node:assert/strict';
import { chimeCalls, townAnswer } from '../src/entities/town/signal-timing.ts';

test('overlapping chimes finish their own four notes', () => {
  const c = chimeCalls(),
    notes: number[] = [];
  c.pull(0, 'one');
  c.update(999, (beat) => notes.push(beat));
  c.pull(1000, 'two');
  c.update(1000, (beat) => notes.push(beat));
  c.update(1260, (beat) => notes.push(beat));
  c.update(2260, (beat) => notes.push(beat));
  assert.deepEqual(notes, [0, 1, 2, 0, 3, 1, 2, 3]);
  assert.equal(c.harmonizes(3999, 'one'), true);
  assert.equal(c.harmonizes(4000, 'one'), false);
});
test('a distant town waits 800 ms and accepts one call per four seconds', () => {
  const a = townAnswer();
  a.call(0);
  a.call(700);
  assert.equal(a.update(799), false);
  assert.equal(a.update(800), true);
  a.call(3999);
  assert.equal(a.update(4000), false);
  a.call(4000);
  assert.equal(a.update(4799), false);
  assert.equal(a.update(4800), true);
});
