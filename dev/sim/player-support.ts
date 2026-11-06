// Regression for Q6's persistent 1.6 mm solver separation. Real facade/Rapier, no browser harness.
import assert from 'node:assert/strict';
import {
  addBody,
  createBody,
  physicsReady,
  stepFixed,
  forEachContact,
  removeBody,
  teleport,
  type Body,
} from '../../src/physics/engine.ts';
import { GRAVITY, PLAYER_R, WALKABLE_NY } from '../../src/constants.ts';
await physicsReady;
const { groundPlayer } = await import('../../src/entities/player/state.ts');
const { me } = await import('../../src/player/state.ts');
const floor = createBody({ position: { x: 1374, y: 19.5, z: -182 }, shapes: [{ kind: 'box', hx: 2, hy: 0.5, hz: 2 }] });
addBody(floor);
const player = createBody({
  mass: 70,
  fixedRotation: true,
  position: { x: 1374, y: 20 + PLAYER_R + 0.0016, z: -182 },
  shapes: [
    { kind: 'sphere', r: PLAYER_R },
    { kind: 'sphere', r: PLAYER_R, offset: { x: 0, y: 0.8, z: 0 } },
  ],
});
addBody(player);
me.body = player;
const grounded = (body: Body, support = true) => {
  let yes = false;
  forEachContact(
    body,
    (_x, y) => {
      if (y > WALKABLE_NY) yes = true;
    },
    { sinceStepStart: true, support },
  );
  return yes;
};
// Hold the measured current-pose separation, as the Q6 solver did. No cached distance can rescue the old strict query.
for (let i = 0; i < 120; i++) {
  player.force.y = 70 * GRAVITY;
  stepFixed();
  me.coyote = -1;
  groundPlayer();
  assert.equal(me.coyote, 0.1, 'controller accepts solver-margin resting support');
  assert.ok(grounded(player), 'solver-margin resting support');
  assert.ok(!grounded(player, false), 'strict overlap remains strict for bounce consumers');
}
player.velocity.y = 7.6;
stepFixed();
me.coyote = -1;
groundPlayer();
assert.ok(me.coyote < 0, 'launch cannot renew coyote');
assert.ok(!grounded(player), 'launch cannot renew support');
for (const gap of [0.0025, 0.006, 0.12]) {
  teleport(player, 1374, 20 + PLAYER_R + gap, -182);
  player.velocity.set(0, 0, 0);
  for (let i = 0; i < 2; i++) {
    player.force.y = 70 * GRAVITY;
    stepFixed();
  }
  assert.ok(!grounded(player), `air gap ${gap} rejected`);
}
// A nearby vertical face has a contact but never a walkable normal.
teleport(player, 1376 + PLAYER_R + 0.0016, 19.5, -182);
player.velocity.set(0, 0, 0);
for (let i = 0; i < 2; i++) {
  player.force.y = 70 * GRAVITY;
  stepFixed();
}
assert.ok(!grounded(player), 'wall is not support');
removeBody(player);
removeBody(floor);
console.log('player support: 120 resting frames; launch, 3 airborne gaps and wall rejected');
