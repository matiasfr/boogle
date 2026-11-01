// Bump (V, pad RT): a volleyball dig. Knocks the ball up and a little forward without grabbing it, when it is within reach
// (a bit more generous than grab reach, and fine while it is airborne). If someone else owns the ball we claim it
// first (claimBall, the normal epoch path) and apply the impulse in our own sim so it resolves immediately.
import './bump.css';
import { me, cam } from '../player/player.ts';
import { ball, claimBall } from '../physics/ball.ts';
import { sendPresence } from '../netplay/net.ts';
import { onStart } from '../loop.ts';
import { registerAction } from '../player/controls.ts';

const TUNE = {
  reach: 3.4, // metres from the chest to the ball centre (grab reach is 2.4)
  up: 9.2, // m/s; about 2.4 m of rise, ~1 s of hang time: time for a teammate to run under it
  forward: 3.4, // m/s toward where the camera looks
  keep: 0.25, // share of the ball's old velocity kept, so a hard shot still carries a little
  maxSpeed: 10.4, // keeps a bump under the face-plant speed
  cooldownMs: 300,
};

let lastBump = -1e9;

function bump() {
  const now = performance.now();
  if (!me.entered || !me.body || me.down || me.holding || me.charging) return false;
  if (now - lastBump < TUNE.cooldownMs) return false;
  if (ball.held && !ball.mine) return false; // can't dig a ball someone is holding; steal it instead
  const b = me.body.position,
    p = ball.disp.p;
  if (Math.hypot(p.x - b.x, p.y - (b.y + 0.55), p.z - b.z) > TUNE.reach) return false;
  lastBump = now;
  me.bumpAt = now;
  if (!ball.mine) claimBall(false);
  const body = ball.body;
  const fx = -Math.sin(cam.yaw),
    fz = -Math.cos(cam.yaw);
  let vx = body.velocity.x * TUNE.keep + fx * TUNE.forward,
    vz = body.velocity.z * TUNE.keep + fz * TUNE.forward;
  let vy = TUNE.up;
  const sp = Math.hypot(vx, vy, vz);
  if (sp > TUNE.maxSpeed) {
    const k = TUNE.maxSpeed / sp;
    vx *= k;
    vy *= k;
    vz *= k;
  }
  body.velocity.set(vx, vy, vz);
  body.angularVelocity.set(fz * 5, 0, -fx * 5);
  ball.disp.v.set(vx, vy, vz);
  sendPresence();
  return true;
}

onStart(() => {
  registerAction('bump', {
    pad: 'rt',
    key: 'KeyV',
    touch: { label: 'Bump', className: 'bump' },
    label: 'Bump the ball up',
    detail: 'Like a volleyball dig',
    group: 'ball',
    order: 1,
    down: bump,
  });
});
