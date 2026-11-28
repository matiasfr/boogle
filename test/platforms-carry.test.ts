import { massingClearance } from '../src/entities/route-greybox/massing-clearance.ts';
// src/physics/platforms.ts carryStep's deck choice (a measured physics regression, not a feature test): riding a line-2
// car home from Ring Island past the parked track layer's flatbed, which overlaps the passing car and was registered
// first, handed the rider to the flatbed and the train drove off without them. The deck you are carried by is kept while
// it still qualifies; another takes over only once it stops qualifying.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED, PLAYER_R } from '../src/constants.ts';
const { createOwnedView } = await import('../src/render/owned-view.ts');
const { createRailheadDeck, createTableRide, deckU, placeDeck } =
  await import('../src/entities/railway/railhead-state.ts');
const { haulU } = await import('../src/sim/railway-ring-haul.ts');
const physics = await import('../src/physics/engine.ts');
const { makePlayerBody } = await import('../src/physics/physics.ts');
const { fromPlatform, toPlatform } = await import('../src/physics/platforms.ts');
const { me: player } = await import('../src/player/state.ts');
const { steerPlayer, shapeJump, groundPlayer, softWall } = await import('../src/entities/player/state.ts');
import { carry, carryStep, CARRY, registerPlatform, type Platform } from '../src/physics/platforms.ts';
import type { Body } from '../src/physics/engine.ts';
import { sourceFunction } from '../dev/level/source.ts';
import { Vector3 } from 'three';
import { lerp, angleLerp } from '../src/math.ts';

// Use the runtime clearance path with the fixture's visitors and the real Rapier overlap query.
async function clearanceFor(remotes: Map<string, { entered: boolean; avatar: { position: Vector3 } }>) {
  const { createLiftOrWait } = await import('../src/place/clearance.ts');
  return sourceFunction<typeof import('../src/entities/railway/frame-occupied.ts').standWhenClear>(
    'src/entities/railway/frame-occupied.ts',
    'standWhenClear',
    {
      frameHasRemote: sourceFunction('src/entities/railway/frame-occupied.ts', 'frameHasRemote', { remotes }),
      me: player,
      liftOrWait: createLiftOrWait(physics.capsuleOverlaps),
    },
  );
}

async function rotundaFixture(quay = false) {
  const THREE = await import('three/webgpu');
  const { definitions } = await import('../src/prefab/catalogue.ts');
  const geometry = await import('../src/place/rotunda.ts');
  const { ENGINE_WHEELS } = await import('../src/entities/railway/engine.ts');
  const { HEAD_OFFSET } = await import('../src/constants.ts');
  const { default: level } = await import('../content/built/levels/rotunda-home.json', { with: { type: 'json' } });
  const { ROTUNDA_HOME } = await import('../src/place/home-station.ts');
  const { rotundaPose, COPY_BAYS } = await import('../src/place/rotunda.ts');
  const { ORIGIN } = await import('../src/place/layout.ts');
  const site = quay ? (await import('../src/place/port-quay.ts')).ROTUNDA_PORT_QUAY : ROTUNDA_HOME;
  const artifact = quay
    ? (await import('../content/built/levels/rotunda-port-quay.json', { with: { type: 'json' } })).default
    : level;
  const remotes = new Map();
  const enabled = new Map<string, boolean>();
  const stand = await clearanceFor(remotes);
  let switching = false;
  const createRotundaView = sourceFunction<typeof import('../src/entities/railway/rotunda-view.ts').createRotundaView>(
    'src/entities/railway/rotunda-view.ts',
    'createRotundaView',
    {
      ...geometry,
      ROTUNDA_HOME,
      ORIGIN,
      ENGINE_WHEELS,
      THREE,
      HEAD_OFFSET,
      PLAYER_R,
      STEP_UP: 0.35,
      me: player,
      level,
      loadLevelArtifact: () => artifact,
      standWhenClear: (shapes: Parameters<typeof stand>[0], on: () => void) =>
        stand(shapes, () => {
          switching = true;
          try {
            on();
          } finally {
            switching = false;
          }
        }),
      remotes,
      definitions: Object.fromEntries(
        Object.entries(definitions).map(([key, def]) => [key, { colliders: def.colliders, visual: {} }]),
      ),
      instantiate: (key: string, p: { id: string; pos: [number, number, number]; rot: number[] }) => {
        const root = new THREE.Group();
        root.position.set(...p.pos);
        root.rotation.y = p.rot[0]!;
        return {
          root,
          solids: definitions[key]!.colliders.flatMap((c) => {
            if (c.shape !== 'box') return [];
            const offset = root.localToWorld(new Vector3(...c.at));
            const [hx, hy, hz] = c.half;
            return [{ kind: 'box', offset, rotation: root.quaternion, hx, hy, hz }];
          }),
          setEnabled(on: boolean) {
            if (quay && on) assert.ok(switching, p.id + ' enabled outside clearance');
            enabled.set(p.id, on);
          },
        };
      },
    },
  );
  await physics.physicsReady;
  const owner = createOwnedView();
  const view = createRotundaView(owner, undefined, { site, level: artifact });
  const copy = COPY_BAYS[1]!;
  const pose = rotundaPose(site, copy.bay);
  const local = (x: number, y: number, z: number) =>
    new Vector3(x, y, z)
      .applyAxisAngle(new Vector3(0, 1, 0), pose.yaw)
      .add(new Vector3(pose.x + ORIGIN.x, pose.y, pose.z + ORIGIN.z));
  return { owner, view, copy, pose, ORIGIN, geometry, remotes, enabled, local, definitions, HEAD_OFFSET };
}

async function withRotunda(check: (fixture: Awaited<ReturnType<typeof rotundaFixture>>) => void) {
  const previous = player.body;
  const fixture = await rotundaFixture();
  try {
    check(fixture);
  } finally {
    player.body = previous;
    fixture.owner.dispose();
  }
}

function checkCopyClearance(remoteInside: boolean) {
  return withRotunda(({ owner, view, copy, pose, ORIGIN, geometry, remotes, enabled }) => {
    view.show(3, 6);
    const copies = [{ line: copy.line, long: false, flatbed: false }];
    if (remoteInside) {
      const position = new Vector3(
        pose.x + ORIGIN.x + Math.sin(pose.yaw) * geometry.COPY_AT.engine,
        pose.y + PLAYER_R,
        pose.z + Math.cos(pose.yaw) * geometry.COPY_AT.engine,
      );
      const body = makePlayerBody(true);
      owner.addBody(body);
      physics.teleport(body, position.x, position.y, position.z);
      remotes.set('peer', { entered: true, body, avatar: { position } });
      player.body = makePlayerBody(false);
      owner.addBody(player.body);
      physics.teleport(player.body, position.x + 20, position.y, position.z);
      view.copies(copies);
      assert.equal(enabled.get(`rotunda-home.copy-${copy.bay}`), false, 'copy solid must wait for the visiting player');
      return;
    }
    view.copies(copies);
    const x = pose.x + ORIGIN.x + Math.sin(pose.yaw) * 14.2;
    const z = pose.z + Math.cos(pose.yaw) * 14.2;
    const rider = makePlayerBody(false);
    owner.addBody(rider);
    physics.teleport(rider, x, pose.y + PLAYER_R, z);
    player.body = rider;
    view.copies([]);
    const moved = Math.hypot(rider.position.x - x, rider.position.z - z);
    assert.ok(moved < 0.001, `closing door displaced player ${moved} m sideways`);
  });
}
test('bringing a copy does not move a player standing in its open bay doorway', () => checkCopyClearance(false));
test('a bay copy waits for a remote player inside its engine', () => checkCopyClearance(true));

test('a withdrawn bay door is removed from heldSolids', () =>
  withRotunda(({ owner, view, copy, local }) => {
    view.show(3, 6);
    const copies = [{ line: copy.line, long: false, flatbed: false }];
    view.copies(copies);
    const me = local(0, PLAYER_R, 14.2);
    player.body = owner.addBody(makePlayerBody(false));
    physics.teleport(player.body, me.x, me.y, me.z);
    view.copies([]);
    const door = 'door-210';
    assert.ok(view.inspect().heldSolids.includes(door));
    view.copies(copies);
    assert.ok(!view.inspect().standing.includes(door));
    assert.ok(!view.inspect().heldSolids.includes(door), 'withdrawn door is still reported as pending');
  }));

test('a blocked open leaf keeps the waiting engine solid under the local player', () =>
  withRotunda(({ owner, view, copy, remotes, enabled, local }) => {
    view.show(0, 1);
    const engine = `rotunda-home.waiting-${copy.bay}`;
    assert.equal(enabled.get(engine), true);
    remotes.set('peer', { entered: true, avatar: { position: local(2.03, PLAYER_R, 15.2) } });
    const me = local(0, 3.3 + PLAYER_R, 18.5);
    player.body = owner.addBody(makePlayerBody(false));
    physics.teleport(player.body, me.x, me.y, me.z);
    view.show(1, 1);
    assert.equal(enabled.get(`rotunda-home.open-${copy.bay}`), false);
    assert.equal(enabled.get(engine), true, 'the original engine must keep supporting the local player');
  }));

test('a newly opened bay leaf cannot lift a player into the existing roof', () =>
  withRotunda(({ owner, view, copy, pose, local, definitions, HEAD_OFFSET }) => {
    view.show(3, 6);
    const x = 2.03,
      z = 15.2;
    const start = local(x, 4.26 + PLAYER_R, z);
    player.body = owner.addBody(makePlayerBody(false));
    physics.teleport(player.body, start.x, start.y, start.z);
    const roof = definitions['roundhouse.bay']!.colliders.find((c) => c.at[2] === 15.6)!;
    assert.ok(roof.shape === 'box' && roof.rot);
    const gap = (y: number) => {
      const q = new Vector3(x, y - pose.y + HEAD_OFFSET, z)
        .sub(new Vector3(...roof.at))
        .applyAxisAngle(new Vector3(1, 0, 0), -roof.rot![1]);
      return q.distanceTo(q.clone().clamp(new Vector3(...roof.half).negate(), new Vector3(...roof.half)));
    };
    assert.ok(gap(start.y) > PLAYER_R, 'head starts clear of the roof');
    view.copies([{ line: copy.line, long: false, flatbed: false }]);
    const clearance = gap(player.body.position.y);
    assert.ok(clearance >= PLAYER_R - 0.02, `head centre only ${clearance.toFixed(3)} m from roof`);
  }));

function parkedRiderFixture() {
  const platform = deck('railway:train9-steel', 0, 0, 1, 2);
  platform.body.position.y = platform.body.interpolatedPosition.y = -60;
  const sample = { l: [0, 1, 0], r: 0 };
  const remote = {
    target: new Vector3(0, 10, 0),
    yaw: 0,
    ride: {
      id: platform.id,
      snaps: { sample: () => ({ a: sample, b: sample, u: 1 }) },
      l: {},
      world: new Vector3(0, 10, 0),
      worldYaw: 0,
      on: true,
      drawn: true,
      leaving: false,
      boarding: false,
      blendLeft: 0,
      drawOffset: { x: 0, y: 0, z: 0, yaw: 0 },
      bodyW: 0,
      lastSeen: 1000,
    },
  };
  const place = sourceFunction<(peer: typeof remote, time: number, draw: boolean, dt: number) => boolean>(
    'src/entities/remote-player/index.ts',
    'placeRider',
    {
      platformById: () => platform,
      lerp,
      angleLerp,
      fromPlatform,
      rideAt: {},
      rideV: new Vector3(),
      RIDE_TRUST: 1.5,
      INTERP_MS: 100,
      RIDE_BLEND_S: 0.2,
      RIDE_MAX_AGE_MS: 1000,
      setDrawOffset: sourceFunction('src/entities/remote-player/index.ts', 'setDrawOffset', { angleLerp }),
    },
  );
  return { place, remote, platform };
}
test('a remote rider stays above ground when its Strong flatbed is parked before the next presence packet', () => {
  const { place, remote } = parkedRiderFixture();
  place(remote, 1000, true, 1 / 60);
  assert.ok(remote.target.y >= 0, `avatar rendered at y=${remote.target.y}`);
});

test('parking a car during a remote car change keeps the rider between the drawn and world poses', () => {
  const { place, remote, platform } = parkedRiderFixture();
  // A fresh ID while already riding starts a blend, with boarding false. This tab's car is ahead of its peer's.
  remote.ride.drawn = remote.ride.on = false;
  platform.body.position.x = platform.body.interpolatedPosition.x = 12;
  platform.body.position.y = platform.body.interpolatedPosition.y = 9;
  place(remote, 1000, true, 1 / 60);
  const last = remote.target.x;
  assert.ok(last > 0 && last < 12);
  platform.body.position.y = platform.body.interpolatedPosition.y = -60;
  place(remote, 1017, true, 1 / 60);
  assert.ok(
    remote.target.x >= remote.ride.world.x && remote.target.x <= last,
    `world x=0, last drawn x=${last.toFixed(2)}, parked x=${remote.target.x.toFixed(2)}`,
  );
});

const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

test('parking a car preserves the displayed rider across the next prePhysics sample', () => {
  const { place, remote, platform } = parkedRiderFixture();
  const avatar = { position: remote.target.clone(), rotation: { y: remote.yaw } };
  Object.assign(remote, { avatar });
  const frame = (time: number) => {
    remote.target.set(0, 10, 0); // samplePose reads this peer's stationary presence before each physics step.
    remote.yaw = 0;
    place(remote, time, false, 0);
    place(remote, time, true, 1 / 60);
    avatar.position.copy(remote.target);
    avatar.rotation.y = remote.yaw;
  };
  platform.body.position.x = platform.body.interpolatedPosition.x = 4;
  platform.body.position.y = platform.body.interpolatedPosition.y = 9;
  frame(1000);
  assert.equal(avatar.position.x, 4);
  platform.body.position.y = platform.body.interpolatedPosition.y = -60;
  frame(1017);
  assert.ok(avatar.position.x > 3 && avatar.position.x < 4, `rider jumped from 4 to ${avatar.position.x} m`);
});
test('parking halfway through first boarding eases from the rider already drawn', () => {
  const { place, remote, platform } = parkedRiderFixture();
  remote.ride.on = remote.ride.drawn = false;
  remote.ride.boarding = true;
  const avatar = { position: remote.target.clone(), rotation: { y: 0 } };
  Object.assign(remote, { avatar });
  platform.body.position.x = platform.body.interpolatedPosition.x = 4;
  platform.body.position.y = platform.body.interpolatedPosition.y = 9;
  const frame = (time: number) => {
    remote.target.set(0, 10, 0);
    remote.yaw = 0;
    place(remote, time, false, 0);
    place(remote, time, true, 1 / 60);
    avatar.position.copy(remote.target);
    avatar.rotation.y = remote.yaw;
  };
  for (let i = 0; i < 6; i++) frame(1000 + (i * 1000) / 60);
  const before = avatar.position.x;
  assert.ok(Math.abs(before - 2) < 1e-6, 'rider is halfway from presence to the deck');
  platform.body.position.y = platform.body.interpolatedPosition.y = -60;
  frame(1100);
  assert.ok(
    avatar.position.x > 1 && avatar.position.x < before,
    `parked rider jumped from ${before} to ${avatar.position.x}`,
  );
});

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
  const owner = createOwnedView();
  let goal = 120,
    opening = true;
  const deck = createRailheadDeck(owner),
    { car } = deck;
  deck.drive(() => {
    placeDeck(deck, goal, opening, player.body, player.coyote, () => {
      throw Error('unexpected initial overlap');
    });
    opening = false;
  });
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
      const pos = point(z, car.platform.topAt!(0, z, 0) + PLAYER_R - down);
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
// Review (railhead-deck-car): placeDeck's mount clearance hands the deck's footprint to siteExit, whose nearest edge
// is a long side for anyone more than 2.9 m from either end. On the sea half of the walkway that edge is the sea:
// a player standing there when the deck mounts (a reload or late join where the deck now stands) lands at lat 6.95,
// past the walkway's outer edge (SIDE.lat1 6.3), in the water. Only the track side, an end or the deck top is safe.
test('a player on the sea half of the walkway when the railhead mounts is never moved over the sea', async () => {
  await physics.physicsReady;
  const { sourceFunction } = await import('../dev/level/source.ts');
  const outOf = sourceFunction<typeof import('../src/place/sites.ts').outOf>('src/place/sites.ts', 'outOf', {});
  const { RING_S, line2World, line2Y } = await import('../src/entities/railway/line2-path.ts');
  const { SIDE } = await import('../src/entities/railway/railhead-shape.ts');
  const owner = createOwnedView();
  try {
    const deck = createRailheadDeck(owner);
    const rider = makePlayerBody(false);
    owner.addBody(rider);
    const sideMid = (SIDE.lat0 + SIDE.lat1) / 2;
    const at = line2World(RING_S + 110, 5.5, { x: 0, z: 0 });
    physics.teleport(rider, at.x, line2Y(RING_S + 110) + PLAYER_R + 0.01, at.z);
    placeDeck(deck, 120, true, rider, 0.1, outOf);
    // The deck's local -x is the sea side (lat 6.3 is local x -2.25).
    const lat = sideMid - toPlatform(deck.car.platform, rider.position, 0, { x: 0, y: 0, z: 0, yaw: 0 }).x;
    assert.ok(lat <= SIDE.lat1, `moved from lat 5.5 to lat ${lat.toFixed(2)}: over the sea`);
  } finally {
    owner.dispose();
  }
});
// The ends: only the back one leads onto built walkway; ahead of the face is the open gap.
test('nobody standing anywhere under the mounting railhead is cleared past the walkway edge or the face', async () => {
  await physics.physicsReady;
  const { sourceFunction } = await import('../dev/level/source.ts');
  const outOf = sourceFunction<typeof import('../src/place/sites.ts').outOf>('src/place/sites.ts', 'outOf', {});
  const { RING_S, line2World, line2Y } = await import('../src/entities/railway/line2-path.ts');
  const { SIDE } = await import('../src/entities/railway/railhead-shape.ts');
  const sideMid = (SIDE.lat0 + SIDE.lat1) / 2;
  const owner = createOwnedView();
  try {
    const deck = createRailheadDeck(owner);
    const rider = makePlayerBody(false);
    owner.addBody(rider);
    const bad: string[] = [];
    for (let u = 100; u <= 118; u += 2)
      for (let lat = 2.2; lat <= 6.0 + 1e-9; lat += 0.2) {
        const at = line2World(RING_S + u, lat, { x: 0, z: 0 });
        physics.teleport(rider, at.x, line2Y(RING_S + u) + PLAYER_R + 0.01, at.z);
        placeDeck(deck, 120, true, rider, 0.1, outOf);
        const local = toPlatform(deck.car.platform, rider.position, 0, { x: 0, y: 0, z: 0, yaw: 0 });
        const inside = Math.abs(local.x) < deck.car.platform.hx && Math.abs(local.z) < deck.car.platform.hz;
        if (sideMid - local.x > SIDE.lat1 || local.z > deck.car.platform.hz || inside)
          bad.push(
            `u ${u} lat ${lat.toFixed(1)} -> lat ${(sideMid - local.x).toFixed(2)} local z ${local.z.toFixed(2)}`,
          );
      }
    assert.deepEqual(bad, []);
  } finally {
    owner.dispose();
  }
});

// The view's own driver (railhead-view.ts hands driveDeck the adapter's read): a real room at `gap-footed`, whose last
// pair stamped the haul from railhead 6 to 7, with the rule clock set back to the stamp and run forward through the
// haul at the game's rate. The deck follows the row, not a target the test sets. An idle rider is held by placeDeck's
// pin (the 1 mm case above); this one proves the driver carries them on the deck from rest to rest.
test("the view's driver hauls the deck and its rider from the row and the clock", async () => {
  await physics.physicsReady;
  const { buildSeedWorld } = await import('./helpers/rail.ts');
  const { railRoom } = await import('./helpers/rail-room.ts');
  const { aperture } = await import('../src/sim/railway-rows.ts');
  const { haulEnd, HAUL } = await import('../src/sim/railway-ring-haul.ts');
  const { driveDeck } = await import('../src/entities/railway/railhead-state.ts');
  const room = railRoom(buildSeedWorld('gap-footed'));
  const read = room.join('a', 'a').adapter.read;
  room.ready();
  const row = aperture(read.world());
  assert.ok(row.moved >= 0 && haulU(row, row.moved + 1000) - row.from >= 2000, 'the seed stamped a 20 m haul');
  const wall = softWall.at;
  softWall.at = Infinity;
  const owner = createOwnedView();
  try {
    const deck = createRailheadDeck(owner);
    let tick = row.moved,
      clock = -1;
    const clocked = { world: () => read.world(), whole: () => read.whole(), tickNow: () => tick };
    deck.drive(() => {
      clock = driveDeck(deck, clocked, clock, () => false);
    });
    const rider = makePlayerBody(false);
    owner.addBody(rider);
    physics.stepFixed();
    const from = row.from / 100;
    assert.ok(Math.abs(deckU(deck.car.body.position) - from) < 0.001, 'the deck waits where the haul starts');
    const board = fromPlatform(
      deck.car.platform,
      { x: 0, y: deck.car.platform.topAt!(0, 0, 0) + PLAYER_R, z: 0, yaw: 0 },
      false,
      { x: 0, y: 0, z: 0, yaw: 0 },
    );
    physics.teleport(rider, board.x, board.y, board.z);
    rider.velocity.set(0, 0, 0);
    player.body = rider;
    player.coyote = 0.1;
    driveRider = true;
    for (let frame = 0; frame < 30; frame++) physics.stepFixed();
    const at = toPlatform(deck.car.platform, rider.position, 0, { x: 0, y: 0, z: 0, yaw: 0 });
    let moved = false;
    while (tick < haulEnd(row) + 10) {
      tick += FIXED * 10;
      physics.stepFixed();
      moved ||= deckU(deck.car.body.position) > from + 0.01;
      assert.ok(carry.on === deck.car.platform, `rider lost the railhead at tick ${tick.toFixed(2)}`);
      if (clock <= row.moved + HAUL.after + HAUL.ready)
        assert.ok(
          Math.abs(deckU(deck.car.body.position) - from) < 0.001,
          `still while the span goes down and it is told: u ${deckU(deck.car.body.position)} at clock ${clock - row.moved}`,
        );
    }
    const here = toPlatform(deck.car.platform, rider.position, 0, { x: 0, y: 0, z: 0, yaw: 0 });
    assert.ok(moved, 'the deck hauled');
    assert.ok(Math.abs(deckU(deck.car.body.position) - haulU(row, tick) / 100) < 0.001, 'at rest at the new head');
    assert.ok(
      Math.hypot(here.x - at.x, here.y - at.y, here.z - at.z) < 0.01,
      `rider drifted ${JSON.stringify([at, here])}`,
    );
  } finally {
    driveRider = false;
    softWall.at = wall;
    player.body = null;
    carry.x = carry.y = carry.z = 0;
    owner.dispose();
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

// Review (recheck 2 of the table ride): the deck's pose marker (railhead-state.ts createTableRide, a 1 cm box 0.2 m
// under the deck's top at its centre) has collision mask 0, but it is still a registered platform, so carryStep's
// stands() takes it as a floor. While the deck turns it has no static boxes and the riding copy waits parked; a player
// whose feet come down through the deck's middle short of its top (a short hop from the pit floor, apex 0.75 to 1.2 m
// over it) must drop to the pit, not stand inside the deck on the marker.
test("a player dropping through the turning table deck's middle is not held up by its pose marker", async () => {
  await physics.physicsReady;
  const wall = softWall.at;
  softWall.at = Infinity;
  const owner = createOwnedView();
  const top = 100; // in open air: no land under it, only the marker could hold them
  const ride = createTableRide(owner, { x: 0, z: 0 }, 8, top);
  const rider = makePlayerBody(false);
  owner.addBody(rider);
  try {
    let yaw = 0;
    ride.update(yaw, FIXED);
    physics.stepFixed();
    const y0 = top - 0.1 + PLAYER_R; // feet 0.1 m under the deck's top: inside it, short of a ride's start
    physics.teleport(rider, 0.05, y0, 0.05);
    rider.velocity.set(0, -1, 0);
    player.body = rider;
    player.coyote = 0;
    driveRider = true;
    let held = 0;
    for (let frame = 0; frame < 30; frame++) {
      yaw += 0.05; // a turn's fast part, 3 rad/s
      ride.update(yaw, FIXED);
      physics.stepFixed();
      if (carry.on && carry.on.hx < 0.01) held++;
    }
    const fell = y0 - rider.position.y;
    assert.ok(
      held === 0 && fell > 0.5,
      `held by the marker in ${held} of 30 steps; fell ${fell.toFixed(3)} m in 0.5 s (feet now ${(rider.position.y - PLAYER_R - top).toFixed(3)} m from the deck's top)`,
    );
  } finally {
    driveRider = false;
    softWall.at = wall;
    player.body = null;
    carry.on = null;
    carry.x = carry.y = carry.z = 0;
    owner.dispose();
  }
});

test('a Quay bay wall waits when a visitor occupies its pier at mount', async () => {
  const { owner, view, local, remotes, enabled, copy } = await rotundaFixture(true);
  try {
    remotes.set('visitor', { entered: true, avatar: { position: local(2.12, PLAYER_R, 14.2) } });
    view.show(0, 0);
    const { ROTUNDA_PORT_QUAY } = await import('../src/place/port-quay.ts');
    const { rotundaPieces } = await import('../src/place/rotunda.ts');
    const piece = rotundaPieces(ROTUNDA_PORT_QUAY).find((p) => p.turn === copy.bay && p.id.startsWith('bay-'))!;
    assert.notEqual(enabled.get('rotunda-port-quay.' + piece.id), true);
    remotes.clear();
    view.copies([{ line: copy.line, long: true, flatbed: true }]);
    for (const id of view.inspect().standing) assert.equal(enabled.get('rotunda-port-quay.' + id), true, id);
    assert.equal(enabled.get('rotunda-port-quay.' + piece.id), true);
    assert.equal(enabled.get('rotunda-port-quay.flatbed-' + copy.bay), true);
  } finally {
    owner.dispose();
  }
});

test('Home displays its existing busy-table and upgrade copy', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync('src/entities/railway/roundhouse-view.ts', 'utf8');
  assert.ok(source.includes('The table\u2019s busy') && source.includes('Line 2\u2019s trains take it at the Village'));
});

test('a bridge mounted over a player in the pit waits or lifts them', async () => {
  const { loadLevelArtifact } = await import('../src/prefab/validate.ts');
  const { definitions } = await import('../src/prefab/catalogue.ts');
  const { default: level } = await import('../content/built/levels/quay.json', { with: { type: 'json' } });
  const bridge = loadLevelArtifact(level, definitions).placements.find((p) => p.id.endsWith('roundhouse-bridge'))!;
  const THREE = await import('three/webgpu');
  const owner = createOwnedView();
  const previous = player.body;
  const body = owner.addBody(makePlayerBody(false));
  player.body = body;
  let enabled = false;
  try {
    const [x, , z] = bridge.pos;
    physics.teleport(body, x, 3 + PLAYER_R, z);
    const draw = sourceFunction<typeof import('../src/entities/route-greybox/boxes.ts').drawGreyBoxes>(
      'src/entities/route-greybox/boxes.ts',
      'drawGreyBoxes',
      {
        compiled: { prefabs: definitions },
        massingClearance,
        standWhenClear: await clearanceFor(new Map()),
        createPrefabBatch: () => ({
          mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 1),
        }),
        instantiate: () => ({
          bodies: [{}],
          solids: [
            {
              kind: 'box',
              hx: bridge.scale![0] / 2,
              hy: bridge.scale![1] / 2,
              hz: bridge.scale![2] / 2,
              offset: { x, y: bridge.pos[1], z },
              rotation: new THREE.Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), bridge.rot![0]),
            },
          ],
          setEnabled(on: boolean) {
            enabled = on;
          },
        }),
        gorgeSurfaces: () => new Map(),
      },
    );
    const batch = await draw(owner, [bridge]);
    assert.ok(!enabled || body.position.y >= 3.95 + PLAYER_R);
    assert.equal(enabled, false);
    physics.teleport(body, x, 3.85 + PLAYER_R, z);
    batch.update();
    assert.equal(enabled, true);
    assert.ok(body.position.y >= 3.95 + PLAYER_R - 0.005);
  } finally {
    player.body = previous;
    owner.dispose();
  }
});

test('the Quay yard ring waits for a player on the apron, then stands once they leave', async () => {
  const { loadLevelArtifact } = await import('../src/prefab/validate.ts');
  const { definitions } = await import('../src/prefab/catalogue.ts');
  const { default: level } = await import('../content/built/levels/quay.json', { with: { type: 'json' } });
  const ring = loadLevelArtifact(level, definitions).placements.find((p) => p.id === 'quay.yard-ring')!;
  const THREE = await import('three/webgpu');
  const solids = definitions[ring.prefab]!.colliders.map((c) => {
    assert.equal(c.shape, 'box');
    if (c.shape !== 'box') throw Error('expected a ring segment');
    return {
      kind: 'box' as const,
      hx: c.half[0],
      hy: c.half[1],
      hz: c.half[2],
      offset: new Vector3(...ring.pos).add(new Vector3(...c.at)),
      rotation: new THREE.Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), c.rot?.[0] ?? 0),
    };
  });
  assert.equal(solids.length, 48);
  const owner = createOwnedView();
  const previous = player.body;
  const body = owner.addBody(makePlayerBody(false));
  player.body = body;
  let enabled = false;
  try {
    const { x, z } = solids[0]!.offset;
    physics.teleport(body, x, 3.02 + PLAYER_R, z);
    const draw = sourceFunction<typeof import('../src/entities/route-greybox/boxes.ts').drawGreyBoxes>(
      'src/entities/route-greybox/boxes.ts',
      'drawGreyBoxes',
      {
        compiled: { prefabs: definitions },
        massingClearance,
        standWhenClear: await clearanceFor(new Map()),
        createPrefabBatch: () => ({
          mesh: new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 1),
        }),
        instantiate: () => ({
          solids,
          bodies: [],
          setEnabled(on: boolean) {
            enabled = on;
          },
        }),
        gorgeSurfaces: () => new Map(),
      },
    );
    const batch = await draw(owner, [ring]);
    assert.equal(enabled, false, 'yard ring switched on through the apron visitor');
    physics.teleport(body, x + 50, 3.02 + PLAYER_R, z);
    batch.update();
    assert.equal(enabled, true);
  } finally {
    player.body = previous;
    owner.dispose();
  }
});

test('two failed extras loads keep the base resident, back off and release an in-flight attempt on unmount', async () => {
  const { readFileSync } = await import('node:fs');
  const { sourceModule } = await import('../dev/level/source.ts');
  const owners: ReturnType<typeof createOwnedView>[] = [];
  let tick!: () => void;
  let building!: Promise<void>;
  let now = 0,
    bases = 0,
    attempts = 0;
  let finish!: () => void;
  const areas = new Map();
  const camera = { position: { x: 500, z: 0 } };
  let lifted = false;
  const quay = {
    id: 'quay',
    centre: { x: 0, z: 0 },
    build() {
      bases++;
      return [];
    },
    async extras() {
      if (++attempts <= 2) throw Error('chunk failed');
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { solids: 0, update() {} };
    },
  };
  const far = { centre: { x: 9999, z: 9999 } };
  sourceModule(
    readFileSync('src/entities/route-greybox/index.ts', 'utf8'),
    {
      defineKind() {},
      productionRailway: true,
      location: { search: '' },
      routeAreas: areas,
      returnArea: { platform: { x: 0, z: 0 } },
      coverLifted: () => lifted,
      physicsReady: Promise.resolve(),
      rendererReady: Promise.resolve(),
      performance: { now: () => now },
      precompile() {},
      routeSceneryMounted() {},
      despawn() {},
      saltpanArea: far,
      quayArea: quay,
      notchAreas: [],
      wallAreas: [],
      canopyArea: far,
      AREA_CENTRES: { canopy: far.centre, gorge: far.centre, bell: far.centre, west: far.centre },
      gorgePlacements: [],
      bellExtras() {},
      bellMassing() {},
      westExtras() {},
      westMassing() {},
      canopyExtras() {},
      canopyMassing() {},
      canopyNear: 1,
      camera,
      me: {},
      MOUNT_NEAR: 1,
      FREE_MORE: 1,
      resident: (d: number) => d < 1,
      createOwnedView() {
        const owner = createOwnedView();
        owners.push(owner);
        return owner;
      },
      spawn(entity: { update(): void }) {
        if (entity.update) tick = entity.update;
        return entity;
      },
      background(job: Promise<void>) {
        building = job.catch(() => {});
      },
    },
    [],
  );
  async function frame(time: number) {
    now = time;
    tick();
    await building;
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
  await building;
  assert.equal(areas.get('quay').mounted, true, 'the saved destination mounts before the first frame at Home');
  camera.position.x = 0;
  lifted = true;
  await frame(0);
  assert.equal(areas.get('quay').mounted, true, 'extras failure tore down the base');
  assert.equal(owners[0]!.alive, true);
  assert.equal(attempts, 1);
  assert.equal(owners[1]!.alive, false);
  await frame(2999);
  assert.equal(attempts, 1);
  await frame(3000);
  assert.equal(attempts, 2);
  assert.equal(owners[2]!.alive, false);
  await frame(8999);
  assert.equal(attempts, 2);
  assert.equal(bases, 1);
  assert.equal(areas.get('quay').mounted, true);
  now = 9000;
  tick();
  const pending = building;
  now = 60000;
  tick();
  assert.equal(attempts, 3);
  camera.position.x = 500;
  tick();
  assert.equal(areas.get('quay').mounted, false);
  assert.ok(owners.every((o) => !o.alive));
  finish();
  await pending;
  assert.equal(areas.get('quay').mounted, false);
});
test('local footing on the Notch deck survives a visitor sixteen metres away', async () => {
  const { default: level } = await import('../content/built/levels/notch.json', { with: { type: 'json' } });
  const { definitions } = await import('../src/prefab/catalogue.ts');
  const { loadLevelArtifact } = await import('../src/prefab/validate.ts');
  const { Quaternion } = await import('three');
  const deck = loadLevelArtifact(level, definitions).placements.find((p) => p.id === 'notch.platform--1')!;
  const centre = new Vector3(...deck.pos);
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), deck.rot![0]);
  const [w, h, d] = deck.scale!;
  const shape = { kind: 'box' as const, hx: w / 2, hy: h / 2, hz: d / 2, offset: centre, rotation };
  const position = new Vector3(0, h / 2 + PLAYER_R, 0).add(centre);
  const visitor = new Vector3(0, -0.1, 16).applyQuaternion(rotation).add(position);
  const stand = await clearanceFor(new Map([['visitor', { entered: true, avatar: { position: visitor } }]]));
  const owner = createOwnedView();
  const previous = player.body;
  const body = owner.addBody(makePlayerBody(false));
  try {
    player.body = body;
    physics.teleport(body, position.x, position.y, position.z);
    assert.ok(stand([shape], () => owner.addBody(physics.createBody({ type: 'static', shapes: [shape] }))));
    for (let i = 0; i < 15; i++) physics.stepFixed();
    assert.ok(Math.abs(body.position.y - position.y) < 0.03, 'the local body lost the deck');
  } finally {
    player.body = previous;
    owner.dispose();
  }
});
