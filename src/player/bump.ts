// Bump: a volleyball dig, the main action's empty-handed half (src/player/hands.ts). Knocks the ball up and a little
// forward without grabbing it, when it is within reach (a bit more generous than grab reach, and fine while it is
// airborne). If someone else owns the ball we claim it first (claimBall, the normal epoch path) and apply the impulse in
// our own sim so it resolves immediately.
import { BALL_R, SEA } from '../constants.ts';
import { groundHeight } from '../island/heights.ts';
import { me, cam } from './state.ts';
import { ball, claimBall, setBallVelocity } from '../entities/ball/state.ts';
import { sendPresence } from '../netplay/net.ts';

const TUNE = {
  reach: 3.4, // metres from the chest to the ball centre (grab reach is 2.4)
  up: 9.2, // m/s; about 2.4 m of rise, ~1 s of hang time: time for a teammate to run under it
  forward: 3.4, // m/s toward where the camera looks
  keep: 0.25, // share of the ball's old velocity kept, so a hard shot still carries a little
  maxSpeed: 10.4, // keeps a bump under the face-plant speed
  cooldownMs: 300,
  airClear: 0.4, // m between the ball and the ground (or sea) for it to count as in the air
  airSpeed: 0.5, // m/s; slower than this it is lying on something
};

let lastBump = -1e9;

// Whether a bump would reach the ball. A held ball can't be dug: someone else's you steal, and yours is on your back.
export function canBump() {
  if (!me.entered || !me.body || me.down || me.charging || ball.held) return false;
  const b = me.body.position,
    p = ball.pose.p;
  return Math.hypot(p.x - b.x, p.y - (b.y + 0.55), p.z - b.z) <= TUNE.reach;
}

// Flying, not lying somewhere: the touch main button bumps this and grabs the rest (src/player/hands.ts).
export function ballInTheAir() {
  const p = ball.pose.p;
  const floor = Math.max(groundHeight(p.x, p.z), SEA);
  return p.y - BALL_R - floor > TUNE.airClear && ball.pose.v.length() > TUNE.airSpeed;
}

export function bump() {
  const now = performance.now();
  if (!canBump() || now - lastBump < TUNE.cooldownMs) return false;
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
  setBallVelocity(vx, vy, vz);
  body.angularVelocity.set(fz * 5, 0, -fx * 5);
  sendPresence();
  return true;
}
