// src/physics/platforms.ts carryStep's deck choice (a measured physics regression, not a feature test): riding a line-2
// car home from Ring Island past the parked track layer's flatbed, which overlaps the passing car and was registered
// first, handed the rider to the flatbed and the train drove off without them. The deck you are carried by is kept while
// it still qualifies; another takes over only once it stops qualifying.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED, PLAYER_R } from '../src/constants.ts';
const { Group } = await import('three/webgpu');
const { createOwnedView } = await import('../src/render/owned-view.ts');
const { makeCar, snapCar } = await import('../src/entities/railway/car.ts');
const { deckProfile } = await import('../src/entities/railway/railhead-shape.ts');
const { deckU, deckYaw, placeDeck } = await import('../src/entities/railway/railhead-state.ts');
const { haulU } = await import('../src/sim/railway-ring-haul.ts');
const physics = await import('../src/physics/engine.ts');
const { makePlayerBody } = await import('../src/physics/physics.ts');
const { fromPlatform, toPlatform } = await import('../src/physics/platforms.ts');
const { me: player } = await import('../src/player/state.ts');
const { steerPlayer, shapeJump, groundPlayer, softWall } = await import('../src/entities/player/state.ts');
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

let driveRider = false;
physics.onPreStep(
  () => {
    if (driveRider) shapeJump();
  },
  { order: 30 },
);
physics.onPostStep(() => {
  if (driveRider) groundPlayer();
});
physics.onPreStep(
  () => {
    if (driveRider) steerPlayer();
  },
  { order: 40 },
);
async function traveller() {
  await physics.physicsReady;
  const wall = softWall.at;
  softWall.at = Infinity;
  const owner = createOwnedView(),
    profile = deckProfile();
  let goal = 120,
    opening = true;
  const car = makeCar(
    profile.spec,
    new Group(),
    () => {
      placeDeck(deck, goal, opening, player.body, player.coyote, () => {
        throw Error('unexpected initial overlap');
      });
      opening = false;
    },
    { shapes: [profile.surface] },
    owner,
  );
  const deck = { car, snap: () => snapCar(car), drive: () => {} };
  car.platform.topAt = profile.topAt;
  car.speedLimit = 7.5;
  car.yaw = deckYaw;
  deck.snap();
  const rider = makePlayerBody(false);
  owner.addBody(rider);
  const point = (z: number, y: number, drawn = false) =>
    fromPlatform(car.platform, { x: 0, y, z, yaw: 0 }, drawn, { x: 0, y: 0, z: 0, yaw: 0 });
  return {
    car,
    rider,
    point,
    goal(u: number) {
      goal = u;
    },
    board(z = 0, down = 0) {
      const pos = point(z, profile.topAt(0, z) + PLAYER_R - down);
      physics.teleport(rider, pos.x, pos.y, pos.z);
      rider.velocity.set(0, 0, 0);
      player.body = rider;
      player.coyote = 0.1;
      driveRider = true;
    },
    close() {
      driveRider = false;
      softWall.at = wall;
      player.body = null;
      carry.x = carry.y = carry.z = 0;
      owner.dispose();
    },
    local() {
      return toPlatform(car.platform, rider.position, 0, { x: 0, y: 0, z: 0, yaw: 0 });
    },
  };
}
test('a rider keeps their place within 1 mm for the 20 m railhead haul', async () => {
  const run = await traveller();
  try {
    physics.stepFixed();
    run.board();
    for (let frame = 0; frame < 60; frame++) physics.stepFixed();
    const at = run.local();
    let worst = 0;
    for (let frame = 0; frame <= 300; frame++) {
      run.goal(haulU({ set: 2, from: 12000, moved: 0 }, 70 + frame / 6) / 100);
      physics.stepFixed();
      const here = run.local();
      worst = Math.max(worst, Math.hypot(here.x - at.x, here.y - at.y, here.z - at.z));
      assert.ok(carry.on === run.car.platform, 'rider lost railhead');
    }
    assert.ok(Math.abs(deckU(run.car.body.position) - 140) < 0.001);
    assert.ok(
      worst < 0.001,
      `maximum rider drift ${worst} m; start ${JSON.stringify(at)}, end ${JSON.stringify(run.local())}`,
    );
  } finally {
    run.close();
  }
});
test('drawn railhead agrees with a remote rider between fixed steps', async () => {
  const run = await traveller();
  try {
    physics.stepFixed();
    run.goal(120.08);
    physics.stepFixed();
    for (const alpha of [0.25, 0.5, 0.75]) {
      physics.setPhysicsClock({ time: physics.physicsTime(), acc: 0 });
      physics.stepPhysics(alpha * FIXED);
      const u = deckU(run.car.body.interpolatedPosition);
      assert.ok(Math.abs(u - 120 - 0.08 * alpha) < 0.001);
      assert.ok(Math.abs(deckU(run.point(3, 1, true)) - u - 3) < 0.001);
    }
  } finally {
    run.close();
  }
});
test('Q7 first-step interpolation never shows the parked deck or its old heading', async () => {
  const run = await traveller();
  try {
    physics.stepFixed();
    physics.setPhysicsClock({ time: physics.physicsTime(), acc: 0 });
    physics.stepPhysics(FIXED / 4);
    assert.ok(Math.abs(deckU(run.point(3, 1, true)) - 123) < 0.001);
    assert.ok(run.car.body.interpolatedPosition.y > 0);
  } finally {
    run.close();
  }
});
test('a standing player ahead of the railhead is lifted onto the deck', async () => {
  const run = await traveller();
  try {
    physics.stepFixed();
    run.board(13, 0.9);
    run.goal(120.08);
    physics.stepFixed();
    assert.ok(carry.on === run.car.platform, 'rider lost railhead');
    assert.ok(run.local().z < 12.5);
    assert.ok(run.local().y > 0.45);
  } finally {
    run.close();
  }
});
test('a correction beyond the railhead speed limit relocates the rider with it', async () => {
  const run = await traveller();
  try {
    physics.stepFixed();
    run.board(3);
    for (let frame = 0; frame < 40; frame++) physics.stepFixed();
    const before = run.local();
    run.goal(160);
    physics.stepFixed();
    const after = run.local();
    assert.ok(carry.on === run.car.platform, 'rider lost railhead');
    assert.ok(Math.abs(deckU(run.car.body.position) - 160) < 0.001);
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) < 0.001);
  } finally {
    run.close();
  }
});

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
