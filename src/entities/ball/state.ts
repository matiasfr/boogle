// The beach ball's body and rules: who may move it from this tab, claiming and throwing, the pose everything else reads,
// surf. No scene, DOM or HUD here: game code imports this file, and test/entity-state-node.test.ts holds it to that.
import * as THREE from 'three';
import {
  BALL_R,
  BALL_MASS,
  BALL_DAMPING,
  BALL_SPAWN,
  REACH,
  GRAVITY,
  HALF,
  SEA,
  PLAYER_R,
  HEAD_OFFSET,
} from '../../constants.ts';
import { clamp } from '../../math.ts';
import { groundHeight } from '../../island/heights.ts';
import { ballMat, catchFallThrough, groundProbe } from '../../physics/physics.ts';
import { createBody, physicsTime, setMotion, teleport } from '../../physics/engine.ts';
import { waterField } from '../../physics/water-field.ts';
import { me, handPosition } from '../../player/state.ts';
import { sendPresence } from '../../netplay/net.ts';
import { createOwnerSync } from '../../netplay/owner-sync.ts';

export const ball = {
  body: createBody({
    mass: BALL_MASS,
    material: ballMat,
    linearDamping: BALL_DAMPING,
    angularDamping: 0.3,
    shapes: [{ kind: 'sphere', r: BALL_R }],
  }),
  e: 0, // highest ownership epoch seen anywhere
  myE: 0, // epoch of this tab's current claim
  mine: false, // this tab simulates the ball and publishes it
  held: false,
  remoteOwned: false, // another tab simulates it (ballOwner works out which)
  // Where the ball is for gameplay and display. One writer a frame: the body when mine, the owner's snapshots when not.
  pose: { p: new THREE.Vector3(), q: new THREE.Quaternion(), v: new THREE.Vector3() },
};
ball.pose.p.set(BALL_SPAWN.x, groundHeight(BALL_SPAWN.x, BALL_SPAWN.z) + BALL_R + 0.4, BALL_SPAWN.z);

// Every change of authority ends here. sim: dynamic and collides. ghost: kinematic, positioned by hand or by the
// network, no collision response.
export const setBallMode = (mode: 'sim' | 'ghost') => setMotion(ball.body, mode === 'sim' ? 'dynamic' : 'kinematic');
setBallMode('ghost');
teleport(ball.body, ball.pose.p.x, ball.pose.p.y, ball.pose.p.z);

/** The ball as its owner publishes it (presence `b`, ./sync.ts). */
export type BallWire = { e: number; p: number[]; v: number[]; q: number[]; h: number };

export const remoteHoldsBall = () => ball.remoteOwned && ball.held;

const tmpQa = new THREE.Quaternion(),
  tmpQb = new THREE.Quaternion();
// Who simulates the ball. Only ./sync.ts and ./headless.ts use this directly: anything else claims and releases below.
export const ballOwner = createOwnerSync<BallWire>(ball, {
  setMode: setBallMode,
  loadBody() {
    const { p, q, v } = ball.pose;
    teleport(ball.body, p.x, p.y, p.z);
    ball.body.quaternion.set(q.x, q.y, q.z, q.w);
    ball.body.velocity.set(v.x, v.y, v.z);
  },
  writePose(p, a, b, u) {
    ball.pose.p.set(p[0]!, p[1]!, p[2]!);
    tmpQa.set(a.q[0]!, a.q[1]!, a.q[2]!, a.q[3]!).normalize();
    tmpQb.set(b.q[0]!, b.q[1]!, b.q[2]!, b.q[3]!).normalize();
    ball.pose.q.slerpQuaternions(tmpQa, tmpQb, u);
    ball.pose.v.set(b.v[0]!, b.v[1]!, b.v[2]!);
  },
  adoptOrphan: () => claimBall(false),
  onRelease() {
    ball.held = false;
    me.holding = false;
    me.charging = false;
    me.lostBallAt = performance.now();
  },
  // Its holder is gone, or the holder's claim says so. Even a hidden tab that won't adopt it has to hear this.
  onOwner: (claim) => void (ball.held = !!claim?.h),
  extrapolateMs: 150,
});

const hand = new THREE.Vector3();
export function ballInReach() {
  if (!me.entered) return false;
  return handPosition(hand).distanceTo(ball.pose.p) < REACH;
}

export function claimBall(held: boolean) {
  ball.held = held;
  ballOwner.claim(held ? 'ghost' : 'sim');
}

export const releaseBall = () => ballOwner.release();

export function grabBall() {
  if (ball.mine) {
    setBallMode('ghost');
    ball.held = true;
  } else {
    claimBall(true);
  }
  me.holding = true;
  sendPresence();
}

// Throws the held ball from p with velocity vel (src/player/throw.ts launch('ball', charge) gives both).
export function throwBall(p: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }) {
  if (!ball.mine || !me.holding) return;
  waterField.invalidate('ball');
  me.holding = false;
  ball.held = false;
  setBallMode('sim');
  teleport(ball.body, p.x, p.y, p.z);
  ball.body.velocity.set(vel.x, vel.y, vel.z);
  const len = Math.hypot(vel.x, vel.z) || 1;
  ball.body.angularVelocity.set((vel.z / len) * 8, 0, (-vel.x / len) * 8);
  sendPresence();
}

export function respawnBall() {
  waterField.invalidate('ball');
  if (!ball.mine) claimBall(false);
  me.holding = false;
  me.charging = false;
  ball.held = false;
  setBallMode('sim');
  teleport(ball.body, BALL_SPAWN.x, groundHeight(BALL_SPAWN.x, BALL_SPAWN.z) + 3, BALL_SPAWN.z);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
  sendPresence();
}

// Before the step, after the player's intent: a carried ball goes to your hand, another tab's to its pose.
let waterAuthority = '';
export function prepareBall() {
  const authority = `${ball.e}/${ball.mine}/${ball.held}`;
  if (authority !== waterAuthority) {
    waterField.invalidate('ball');
    waterAuthority = authority;
  }
  if (ball.mine && ball.held && me.body) {
    const h = handPosition();
    teleport(ball.body, h.x, h.y, h.z);
  } else if (!ball.mine) {
    teleport(ball.body, ball.pose.p.x, ball.pose.p.y, ball.pose.p.z);
  }
}

// Each physics step: rolling friction, then the sea and ponds.
export function surfBall(dt: number) {
  if (!ball.mine || ball.held) return;
  const bb = ball.body;
  if (bb.position.y - groundProbe.under(bb.position.x, bb.position.y, bb.position.z) < BALL_R + 0.08) {
    const k = 1 - (Math.hypot(bb.velocity.x, bb.velocity.z) < 0.5 ? 10 : 1.2) * dt;
    bb.velocity.x *= k;
    bb.velocity.z *= k;
    bb.angularVelocity.set(bb.angularVelocity.x * k, bb.angularVelocity.y * k, bb.angularVelocity.z * k);
  }
  // Surf: the surface bobs with the same waves the sea shader draws, and a slow, smoothly varying
  // current runs along the shore. A gentle, surging inward drift keeps the ball washing in eventually.
  const t = physicsTime();
  const px = bb.position.x,
    pz = bb.position.z;
  const pondSurf = waterField.surfaceAt(px, pz);
  const water = waterField.sampleAt('ball', bb.position);
  const still = waterField.moving ? water.body === 'pond' : pondSurf > SEA + 0.06;
  // Keep the original sine sea on the default path until graduation step 7; the opt-in uses the rendered kernel.
  const surf = waterField.moving
    ? water.height
    : still
      ? pondSurf
      : SEA + Math.sin(px * 0.21 + t * 1.3) * 0.06 + Math.cos(pz * 0.17 - t * 1.1) * 0.06;
  const sub = clamp((surf - (bb.position.y - BALL_R)) / (2 * BALL_R), 0, 1);
  if (sub > 0) {
    let cx = 0,
      cz = 0,
      grip: number;
    if (still) {
      // pulled to a stop, more firmly the deeper the water
      grip = Math.max(
        sub,
        Math.min(1, (surf - (waterField.moving ? water.bedHeight : groundHeight(px, pz))) / 0.2) * 0.6,
      );
    } else {
      const rr = Math.hypot(px, pz) || 1;
      const nx = waterField.moving ? water.normal[0] : px / rr,
        nz = waterField.moving ? water.normal[1] : pz / rr;
      const along = 0.9 * Math.sin(t * 0.045 + 1.3) + 0.5 * Math.sin(t * 0.13 + rr * 0.05);
      const inward = 0.28 + 0.22 * Math.sin(t * 0.35 + rr * 0.1) + 0.12 * Math.sin(t * 0.11);
      cx = -nx * inward - nz * along;
      cz = -nz * inward + nx * along;
      grip = sub;
    }
    bb.force.y += BALL_MASS * GRAVITY * 3.2 * sub - BALL_MASS * 2.5 * (bb.velocity.y - water.verticalVelocity) * sub;
    bb.force.x += (cx - bb.velocity.x) * 0.9 * BALL_MASS * grip;
    bb.force.z += (cz - bb.velocity.z) * 0.9 * BALL_MASS * grip;
  }
}

// Each physics step, after it: anything that fell through the ground comes back up.
export function netBall() {
  if (ball.mine && !ball.held) catchFallThrough(ball.body, BALL_R);
}

// Right after the physics step: an owned ball that left the island respawns, then the pose follows the body.
export function settleBall() {
  if (!ball.mine) return;
  const bp = ball.body.position;
  if (!ball.held && (Math.abs(bp.x) > HALF - 3 || Math.abs(bp.z) > HALF - 3 || bp.y < -15)) respawnBall();
  const ip = ball.held ? bp : ball.body.interpolatedPosition;
  ball.pose.p.set(ip.x, ip.y, ip.z);
  const q = ball.body.quaternion;
  ball.pose.q.set(q.x, q.y, q.z, q.w);
  const v = ball.body.velocity;
  ball.pose.v.set(v.x, v.y, v.z);
}

// After the player's fall respawn (src/entities/player/, -290): walking into a slow ball takes ownership so the push
// resolves in this tab's simulation.
export function walkIntoBall(now: number) {
  if (!me.body) return;
  if (ball.remoteOwned && !ball.held && now - me.lostBallAt > 400 && ball.pose.v.length() < 5) {
    const p = me.body.position;
    const bpos = ball.pose.p;
    const dy = clamp(bpos.y - p.y, 0, HEAD_OFFSET);
    const d = Math.hypot(bpos.x - p.x, bpos.y - (p.y + dy), bpos.z - p.z);
    if (d < PLAYER_R + BALL_R + 0.08) claimBall(false);
  }
}
