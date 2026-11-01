import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chargeOf, profileFor, launchVelocity, PROFILES } from '../src/player/throw-curve.ts';

test('the charge runs 0 to 1 over 900 ms and clamps', () => {
  assert.equal(chargeOf(0), 0);
  assert.equal(chargeOf(450), 0.5);
  assert.equal(chargeOf(5000), 1);
  assert.equal(chargeOf(-20), 0);
});

test('each held thing picks its flight', () => {
  assert.equal(profileFor('frisbee').flight, 'glide');
  assert.equal(profileFor('can').flight, 'plain');
  assert.equal(profileFor('seeds').flight, 'plain');
  assert.equal(profileFor('ball').flight, 'ball');
  assert.equal(profileFor(null).flight, 'plain');
  assert.equal(PROFILES.item.power0, PROFILES.ball.power0, 'the ball and items throw alike');
});

// The formula this module replaced (throwVelocity and aimDirection in src/player/player.ts), for a unit aim `d`.
function oldVelocity(c: number, d: { x: number; y: number; z: number }, body: { x: number; z: number }, flat: boolean) {
  const y = d.y + (flat ? 0.03 : 0.12);
  const len = Math.sqrt(d.x * d.x + y * y + d.z * d.z);
  const power = flat ? 9 + c * 15 : 8 + c * 20;
  return {
    x: (d.x / len) * power + body.x * 0.5,
    y: (y / len) * power + (flat ? 0.5 : 1.5),
    z: (d.z / len) * power + body.z * 0.5,
  };
}

test('launchVelocity matches the old throw formula to 1e-9', () => {
  const dir = { x: 0.3, y: -0.1, z: -0.9 };
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
  const unit = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
  const body = { x: 2, y: 0, z: -1 };
  for (const c of [0, 0.5, 1]) {
    for (const [id, flat] of [
      ['ball', false],
      ['can', false],
      ['frisbee', true],
    ] as const) {
      const got = launchVelocity(profileFor(id), c, unit, body);
      const want = oldVelocity(c, unit, body, flat);
      for (const k of ['x', 'y', 'z'] as const) assert.ok(Math.abs(got[k] - want[k]) < 1e-9, `${id} c=${c} ${k}`);
    }
  }
});
