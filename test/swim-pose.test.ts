// Focused regression requested for the Round 4 swimming nit; no three.js or physics dependency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swimPoseGrace } from '../src/player/buddy/swim-pose.ts';

test('wave threshold gaps keep the swim pose across repeated cycles', () => {
  let grace = 0;
  // The longest observed passive gap was 216 ms; falling bob velocity must not trigger a fall pose.
  for (let cycle = 0; cycle < 6; cycle++) {
    grace = swimPoseGrace(grace, true, false, 1.4, 1 / 60);
    for (let frame = 0; frame < 14; frame++) {
      grace = swimPoseGrace(grace, false, true, frame < 4 ? 1.4 : -1.1, 1 / 60);
      assert.ok(grace > 0);
    }
  }
});

test('real water jumps leave immediately and stay airborne through the apex and descent', () => {
  let grace = swimPoseGrace(0, true, false, 4.3, 1 / 60);
  for (const vy of [3.99, 2, 0, -2, -6]) {
    grace = swimPoseGrace(grace, false, true, vy, 1 / 60);
    assert.equal(grace, 0);
  }
  assert.ok(swimPoseGrace(grace, true, false, -1, 1 / 60) > 0);
});

test('falling into water stays airborne until entry; ground and sustained exits clear grace', () => {
  for (const vy of [0, -2, -14, -20]) assert.equal(swimPoseGrace(0, false, true, vy, 1 / 60), 0);
  const grace = swimPoseGrace(0, true, false, -20, 1 / 60);
  assert.ok(grace > 0);
  assert.equal(swimPoseGrace(grace, false, false, 0, 1 / 60), 0);
  assert.equal(swimPoseGrace(grace, false, true, -1, 0.31), 0);
});
