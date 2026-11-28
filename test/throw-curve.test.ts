import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindToySweep, clearToyRelease } from '../src/physics/toy-clearance.ts';
import { chargeOf } from '../src/player/throw-curve.ts';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { BALL_R, PLAYER_R, GRAVITY, ROOM_GROUP } from '../src/constants.ts';
import { me, handPosition, throwFrom } from '../src/player/state.ts';
import { definitions } from '../src/prefab/catalogue.ts';

test('elapsed time cannot undercharge or overcharge a throw', () => {
  assert.equal(chargeOf(5000), 1);
  assert.equal(chargeOf(-20), 0);
});

test('the ball releases on the player side of the Boathouse back wall', () => {
  const wall = definitions['town.room-plot3-hulls-0']!.colliders[0]!;
  assert.ok(wall.shape === 'box');
  const face = wall.at[2] + wall.half[2];
  const previous = { body: me.body, yaw: me.yaw };
  try {
    me.yaw = 0;
    const position = new THREE.Vector3(0, 0.6, face + PLAYER_R + 0.01);
    me.body = {
      position,
      interpolatedPosition: position,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      force: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
    };
    bindToySweep((from, to, radius, options) => {
      if (!(options.mask & ROOM_GROUP) || options.thin !== 'skip' || to.z - radius >= face) return -1;
      const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
      return (length * (from.z - radius - face)) / (from.z - to.z);
    });
    const release = sourceFunction<typeof import('../src/player/throw.ts').releasePoint>(
      'src/player/throw.ts',
      'releasePoint',
      { handPosition, throwFrom, me, BALL_R, clearToyRelease },
    );
    assert.ok(release('ball').z - BALL_R >= face, 'the released sphere crosses the solid wall');
    assert.ok(release('frisbee').z - 0.275 >= face, 'the released disc crosses the solid wall');
    position.z += 3;
    assert.deepEqual(release('ball'), handPosition());
    assert.deepEqual(release('frisbee'), throwFrom());
  } finally {
    bindToySweep(() => -1);
    Object.assign(me, previous);
  }
});

test('a live disc tests the Boathouse wall before advancing through it', () => {
  const wall = definitions['town.room-plot3-hulls-0']!.colliders[0]!;
  assert.ok(wall.shape === 'box' && wall.group === 'room');
  const face = wall.at[2] + wall.half[2];
  const hit = { hitPointWorld: new THREE.Vector3(0, 1, face), hitNormalWorld: new THREE.Vector3(0, 0, 1) };
  const flight = sourceModule<typeof import('../src/physics/flight.ts')>(
    readFileSync(new URL('../src/physics/flight.ts', import.meta.url), 'utf8'),
    {
      THREE,
      GRAVITY,
      GROUP: { SCENERY: 2 },
      ROOM_GROUP,
      rayHit: () => hit,
      raycastClosest: (a: THREE.Vector3, b: THREE.Vector3, options: { mask: number }) =>
        (options.mask & ROOM_GROUP) !== 0 && a.z > face && b.z < face,
    },
  );
  const p = new THREE.Vector3(0, 1, face + 0.1);
  flight.stepFlight(p, new THREE.Vector3(0, 0, -15), true, 1 / 60, true);
  assert.ok(p.z >= face, 'the disc crossed the back wall');
});
