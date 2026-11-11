// The glider's port from Place keeps its feel (docs/brainstorms/glider-placement.md, call 3): 10 m/s at full stick, a
// 3.2 m/s sink reached in 0.1 s with no overshoot, the canopy armed while rising, and no lift from reopening.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOVE } from '../src/place/tech-layout.ts';
import { closeGlide, createGlide, openGlide, rearmGlide, stepGlide } from '../src/entities/railway/glide-step.ts';

const fly = (steps: number, v: { x: number; y: number; z: number }, wish = { x: 0, z: 1 }) => {
  const g = createGlide();
  openGlide(g);
  for (let k = 0; k < steps; k++) stepGlide(g, { x: v.x, z: v.z }, v, wish, MOVE);
  return g;
};
test('the canopy reaches the sink in glideDeploy and never overshoots or lifts', () => {
  const v = { x: 0, y: -14, z: 0 };
  const g = createGlide();
  openGlide(g);
  const ys: number[] = [];
  for (let k = 0; k < 12; k++) {
    stepGlide(g, { x: v.x, z: v.z }, v, { x: 0, z: 1 }, MOVE);
    ys.push(v.y);
  }
  assert.ok(Math.abs(ys[5]! + MOVE.glideSink) < 1e-9, `sink by 0.1 s: ${ys[5]}`);
  for (const y of ys) assert.ok(y <= 0 && y >= -14, `no lift and no overshoot: ${y}`);
  assert.equal(g.flights, 1);
});
test('full stick cruises at glideSpeed; letting go brakes to a hover-free fall', () => {
  const v = { x: 0, y: -3.2, z: 0 };
  fly(120, v);
  assert.ok(Math.abs(Math.hypot(v.x, v.z) - MOVE.glideSpeed) < 1e-6);
  const g = createGlide();
  openGlide(g);
  for (let k = 0; k < 120; k++) stepGlide(g, { x: v.x, z: v.z }, v, { x: 0, z: 0 }, MOVE);
  assert.equal(Math.hypot(v.x, v.z), 0);
  assert.ok(Math.abs(v.y + MOVE.glideSink) < 1e-9);
});
test('rising, the canopy stays armed and keeps the jump; an air jump re-arms it', () => {
  const g = createGlide();
  openGlide(g);
  const v = { x: 0, y: 4, z: 0 };
  assert.equal(stepGlide(g, { x: 0, z: 0 }, v, { x: 0, z: 0 }, MOVE), false);
  assert.equal(v.y, 4);
  v.y = -1;
  assert.equal(stepGlide(g, { x: 0, z: 0 }, v, { x: 0, z: 0 }, MOVE), true);
  assert.ok(g.holding);
  rearmGlide(g);
  assert.ok(g.open && !g.holding);
  closeGlide(g);
  rearmGlide(g);
  assert.ok(!g.open && !g.holding);
});
test('faster than the glide (off a train) settles with no boost', () => {
  const v = { x: 0, y: -3.2, z: 16 };
  let last = 16;
  const g = createGlide();
  openGlide(g);
  for (let k = 0; k < 120; k++) {
    stepGlide(g, { x: v.x, z: v.z }, v, { x: 0, z: 1 }, MOVE);
    assert.ok(v.z <= last + 1e-9);
    last = v.z;
  }
  assert.ok(Math.abs(v.z - MOVE.glideSpeed) < 1e-6);
});
