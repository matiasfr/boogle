// Focused regression requested for the Round 4 swimming nit; no three.js or physics dependency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepWater, swimPoseGrace, waterColumn } from '../src/player/buddy/swim-pose.ts';

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

test('waves and a sloping bed at the float depth do not toggle wade and swim', () => {
  const FLOAT = 0.8;
  const c = waterColumn();
  const seen: boolean[] = [];
  // Wade out along a slope: the bed falls 0.4 m/s under a 0.25 m, 1.6 s swell.
  for (let f = 0; f < 600; f++) {
    const t = f / 120;
    const bed = -0.2 - Math.min(t, 3) * 0.4;
    seen.push(deepWater(c, 0.25 * Math.sin(t * 4), bed, FLOAT, 1 / 120));
  }
  const flips = seen.filter((d, i) => i > 0 && d !== seen[i - 1]).length;
  assert.equal(flips, 1);
  assert.equal(seen.at(-1), true);
  // Holding still in the band keeps what you were doing.
  for (let f = 0; f < 600; f++) deepWater(c, 0.12 * Math.sin(f / 20), -FLOAT + 0.05, FLOAT, 1 / 120);
  assert.equal(c.deep, true);
  for (let f = 0; f < 600; f++) deepWater(c, 0, -0.5, FLOAT, 1 / 120);
  assert.equal(c.deep, false);
});
