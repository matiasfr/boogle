// src/physics/platforms.ts carryStep's deck choice (a measured physics regression, not a feature test): riding a line-2
// car home from Ring Island past the parked track layer's flatbed, which overlaps the passing car and was registered
// first, handed the rider to the flatbed and the train drove off without them. The deck you are carried by is kept while
// it still qualifies; another takes over only once it stops qualifying.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_R } from '../src/constants.ts';
import { carry, carryStep, CARRY, registerPlatform, type Platform } from '../src/physics/platforms.ts';
import type { Body } from '../src/physics/engine.ts';

const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
const body = (x: number, y: number, z: number) =>
  ({
    position: v3(x, y, z),
    velocity: v3(),
    angularVelocity: v3(),
    force: v3(),
    interpolatedPosition: v3(x, y, z),
    quaternion: { x: 0, y: 0, z: 0, w: 1, set: () => undefined },
  }) as unknown as Body;
// Level decks, top 1 m over their body, the rider's sphere resting on it.
const deck = (id: string, x: number, z: number, hx: number, hz: number): Platform => ({
  body: body(x, 0, z),
  hx,
  hz,
  top: 1,
  move: () => undefined,
  id,
});
const riderAt = (x: number, z: number) => body(x, 1 + PLAYER_R, z);
const me = { coyote: 0.1, swimming: false };

test('a rider carried by a moving deck stays on it over a stationary deck registered before it', () => {
  const flatbed = deck('flatbed', 0, 0, 1.3, 2.4);
  const car = deck('car', 0, -6, 1.3, 1.8);
  const off = [registerPlatform(flatbed), registerPlatform(car)];
  try {
    const rider = riderAt(0, -6);
    carryStep(rider, me);
    assert.equal(carry.on?.id, 'car');
    // The car drives on through the flatbed's footprint at 5 m/s, its rider aboard: both decks now qualify.
    car.body.velocity.z = 5;
    for (let z = -6; z <= 6; z += 0.5) {
      car.body.position.z = z;
      rider.position.z = z - 0.01;
      carryStep(rider, me);
      assert.equal(carry.on?.id, 'car', `still on the car at z ${z}`);
    }
  } finally {
    for (const f of off) f();
  }
});

test('a rider who walks off their deck onto an overlapping one transfers to it', () => {
  // Two cars nose to tail, 0.3 m apart: within the edge allowance of both.
  const a = deck('car-a', 0, 0, 1.3, 1.8);
  const b = deck('car-b', 0, 3.9, 1.3, 1.8);
  const off = [registerPlatform(b), registerPlatform(a)];
  try {
    const rider = riderAt(0, 1);
    carryStep(rider, me);
    assert.equal(carry.on?.id, 'car-a');
    rider.position.z = 1.95; // over b's edge allowance, still inside a's: kept on a
    carryStep(rider, me);
    assert.equal(carry.on?.id, 'car-a');
    rider.position.z = 1.8 + CARRY.edge + 0.05; // past a's edge allowance, inside b's
    carryStep(rider, me);
    assert.equal(carry.on?.id, 'car-b');
  } finally {
    for (const f of off) f();
  }
});
