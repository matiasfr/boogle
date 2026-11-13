import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepBooglerWalk, TURN } from '../src/world/boogler-walk.ts';

test('walk keeps main pre-turn Euler vectors at all three speeds and heading errors', () => {
  for (const speed of [1.5, 2.3, 3.4])
    for (const degrees of [0, 60, 120, 180]) {
      const yaw = (degrees * Math.PI) / 180;
      const state = { x: 0, z: 0, yaw, tx: 0, tz: -100 };
      const dt = 1 / 60;
      assert.equal(
        stepBooglerWalk(state, dt, speed, () => false),
        'walking',
      );
      assert.ok(Math.abs(state.z + speed * dt * Math.max(0, Math.cos(yaw))) < 1e-14);
      assert.ok(Math.abs(state.yaw - Math.max(0, yaw - TURN * dt)) < 1e-14);
    }
});
test('arrival and obstacles keep main stop ordering', () => {
  const near = { x: 0, z: 0, yaw: 1, tx: 0, tz: -0.29 };
  assert.equal(
    stepBooglerWalk(near, 1 / 60, 1.5, () => false),
    'arrived',
  );
  assert.equal(near.yaw, 1);
  const wall = { x: 0, z: 0, yaw: 1, tx: 0, tz: -100 };
  assert.equal(
    stepBooglerWalk(wall, 1 / 60, 1.5, () => true),
    'blocked',
  );
  assert.equal(wall.x, 0);
  assert.equal(wall.z, 0);
  assert.ok(wall.yaw < 1); // main turns even when it cannot step
});
