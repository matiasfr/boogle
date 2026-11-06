import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrainNudge } from '../src/proto/place/train-nudge.ts';

test('a full snapshot discards the correction against the replaced train position', () => {
  const nudge = createTrainNudge();
  nudge.set(6);
  assert.ok(Math.abs(nudge.step(1 / 60, false) - 0.15) < 1e-12);
  nudge.clear();
  assert.equal(nudge.step(1 / 60, false), 0);
  nudge.set(-4);
  assert.equal(nudge.step(1, false), -4);
  assert.equal(nudge.step(1, false), 0);
});

test('an elected authority cannot apply a correction from its former authority', () => {
  const nudge = createTrainNudge();
  nudge.set(8);
  assert.equal(nudge.step(1 / 60, true), 0);
  assert.equal(nudge.step(1 / 60, false), 0, 'the old correction cannot return on a later election');
  nudge.set(2);
  assert.equal(nudge.step(1, false), 2, 'a new authority sample can correct again');
});
