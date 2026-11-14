import test from 'node:test';
import assert from 'node:assert/strict';
import { createBooglerPresentation } from '../src/boogler/presentation.ts';
import { booglerPose, type BooglerLeg } from '../src/world/boogler-shadow.ts';

const walk: BooglerLeg = { x0: 0, z0: 0, yaw0: 0, x1: 0, z1: -30, start: 0, speed: 1.5, mode: 0 };
test('local talk holds this frame, turns locally and eases only to an attending server leg', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  const start = { ...p.pose };
  p.talk(true);
  assert.equal(p.pose.walking, false);
  for (let i = 1; i <= 20; i++) p.update(walk, 20 + i / 6, 1 / 60, false, { x: 3, z: -3 });
  assert.equal(p.pose.x, start.x);
  assert.equal(p.pose.z, start.z);
  assert.notEqual(p.pose.yaw, start.yaw);
  const stop = { ...walk, z0: -3.3, x1: 0, z1: -3.3, start: 22, speed: 0, look: 'me' };
  p.update(stop, 24, 1 / 60, false, { x: 3, z: -3 }, 'me');
  assert.ok(Math.abs(p.pose.z - start.z) < 0.1);
  for (let i = 0; i < 120; i++) p.update(stop, 24 + i / 6, 1 / 60, false, { x: 3, z: -3 }, 'me');
  assert.ok(Math.abs(p.pose.z + 3.3) < 0.001);
});

test('a mid-walk rider leg preserves the shown pose, then converges; refill places immediately', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  const before = { ...p.pose };
  const ridden = { ...walk, z0: -3.15, start: 21, speed: 2.3, mode: 2 };
  p.update(ridden, 22, 0);
  assert.equal(p.pose.z, before.z);
  for (let i = 1; i <= 120; i++) {
    const prev = p.pose.z;
    p.update(ridden, 22 + i / 6, 1 / 60);
    assert.ok(Math.abs(p.pose.z - prev) < 0.15, 'no snap underneath rider');
  }
  assert.ok(Math.abs(p.pose.z - booglerPose(ridden, 42).z) < 0.001);
  p.update(walk, 80, 0, true);
  assert.equal(p.pose.z, booglerPose(walk, 80).z);
});
