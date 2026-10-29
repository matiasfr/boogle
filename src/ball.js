import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BALL_R, BALL_MASS, BALL_SPAWN, REACH } from './constants.js';
import { lerp } from './math.js';
import { groundHeight } from './terrain.js';
import { scene } from './scene.js';
import { world, ballMat, teleport } from './physics.js';
import { me, handPosition, throwVelocity, chargeAmount } from './player.js';
import { net, remotes, sendPresence } from './net.js';

function beachBallTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  ['#ff4f4f', '#ffffff', '#2f8cff', '#ffffff', '#ffcf33', '#ffffff'].forEach((col, k) => {
    g.fillStyle = col;
    g.fillRect((k * 512) / 6, 0, 512 / 6 + 1, 256);
  });
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 512, 20);
  g.fillRect(0, 236, 512, 20);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const ball = {
  body: new CANNON.Body({ mass: BALL_MASS, material: ballMat, linearDamping: 0.12, angularDamping: 0.3 }),
  mesh: new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 32, 18),
    new THREE.MeshStandardMaterial({ map: beachBallTexture(), roughness: 0.4 }),
  ),
  e: 0, // highest ownership epoch seen anywhere
  myE: 0, // epoch of this tab's current claim
  mine: false, // this tab simulates the ball and publishes it
  held: false,
  owner: null, // { peer, e, remote } of whoever currently simulates the ball
  orphanSince: 0,
  disp: { p: new THREE.Vector3(), q: new THREE.Quaternion(), v: new THREE.Vector3() },
};
ball.body.addShape(new CANNON.Sphere(BALL_R));
ball.mesh.castShadow = true;
scene.add(ball.mesh);
world.addBody(ball.body);
ball.disp.p.set(BALL_SPAWN.x, groundHeight(BALL_SPAWN.x, BALL_SPAWN.z) + BALL_R + 0.4, BALL_SPAWN.z);

// sim: dynamic and collides. ghost: kinematic, positioned by hand or by the network, no collision response.
export function setBallMode(mode) {
  const b = ball.body;
  if (mode === 'sim') {
    b.type = CANNON.Body.DYNAMIC;
    b.collisionResponse = true;
  } else {
    b.type = CANNON.Body.KINEMATIC;
    b.collisionResponse = false;
    b.velocity.setZero();
    b.angularVelocity.setZero();
  }
}
setBallMode('ghost');
teleport(ball.body, ball.disp.p.x, ball.disp.p.y, ball.disp.p.z);
ball.mesh.position.copy(ball.disp.p);

export function ballInReach() {
  if (!me.entered) return false;
  return handPosition().distanceTo(ball.disp.p) < REACH;
}
export function remoteHoldsBall() {
  return !ball.mine && !!ball.owner?.remote && ball.held;
}

export function claimBall(held) {
  ball.myE = ball.e + 1;
  ball.e = ball.myE;
  ball.mine = true;
  ball.held = held;
  ball.owner = { peer: net.myPeer ?? '', e: ball.myE, remote: null };
  ball.orphanSince = 0;
  const { p, q, v } = ball.disp;
  teleport(ball.body, p.x, p.y, p.z);
  ball.body.quaternion.set(q.x, q.y, q.z, q.w);
  if (held) {
    setBallMode('ghost');
  } else {
    setBallMode('sim');
    ball.body.velocity.set(v.x, v.y, v.z);
  }
  sendPresence();
}

export function releaseBall() {
  if (!ball.mine) return;
  ball.mine = false;
  ball.held = false;
  me.holding = false;
  me.charging = false;
  me.lostBallAt = performance.now();
  setBallMode('ghost');
  sendPresence();
}

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

export function throwBall(c) {
  if (!ball.mine || !me.holding) return;
  const hand = handPosition();
  const vel = throwVelocity(c, hand);
  me.holding = false;
  ball.held = false;
  setBallMode('sim');
  teleport(ball.body, hand.x, hand.y, hand.z);
  ball.body.velocity.set(vel.x, vel.y, vel.z);
  const len = Math.hypot(vel.x, vel.z) || 1;
  ball.body.angularVelocity.set((vel.z / len) * 8, 0, (-vel.x / len) * 8);
  sendPresence();
}

export function respawnBall() {
  if (!ball.mine) claimBall(false);
  me.holding = false;
  me.charging = false;
  ball.held = false;
  setBallMode('sim');
  teleport(ball.body, BALL_SPAWN.x, groundHeight(BALL_SPAWN.x, BALL_SPAWN.z) + 3, BALL_SPAWN.z);
  ball.body.velocity.setZero();
  ball.body.angularVelocity.setZero();
  sendPresence();
}

export function actionDown() {
  if (!me.entered) return;
  if (me.holding) {
    me.charging = true;
    me.chargeStart = performance.now();
    return;
  }
  if (ballInReach()) {
    grabBall();
    me.suppressUp = true;
  }
}

export function actionUp() {
  if (me.suppressUp) {
    me.suppressUp = false;
    return;
  }
  if (me.charging) {
    me.charging = false;
    throwBall(chargeAmount());
  }
}

// Highest epoch wins; a tie goes to the lexically larger peer label, so every tab picks the same owner.
export function resolveBallOwner(now) {
  let best = ball.mine ? { peer: net.myPeer ?? '', e: ball.myE, remote: null } : null;
  for (const r of remotes.values()) {
    const b = r.ball;
    if (!b) continue;
    if (!best || b.e > best.e || (b.e === best.e && r.peer > best.peer)) best = { peer: r.peer, e: b.e, remote: r };
    ball.e = Math.max(ball.e, b.e);
  }
  if (ball.mine && best?.remote) releaseBall();
  ball.owner = best;
  if (best?.remote) ball.held = !!best.remote.ball.h;
  if (best) {
    ball.orphanSince = 0;
    return;
  }

  if (net.state === 'solo') {
    claimBall(false);
    return;
  }
  if (!net.room) return;
  if (!ball.orphanSince) ball.orphanSince = now;
  if (now - ball.orphanSince < 600 || now - net.readyAt < 1500 || !net.myPeer || document.hidden) return;
  let lowest = net.myPeer;
  for (const r of remotes.values()) if (r.visible && r.peer < lowest) lowest = r.peer;
  if (lowest === net.myPeer) claimBall(false);
}

const tmpQa = new THREE.Quaternion(),
  tmpQb = new THREE.Quaternion();

function updateBallDisplayFromRemote() {
  const s = ball.owner?.remote?.ballSample;
  if (!s) return;
  const { a, b, u, over } = s;
  const ex = Math.min(over, 150) / 1000;
  ball.disp.p.set(
    lerp(a.p[0], b.p[0], u) + b.v[0] * ex,
    lerp(a.p[1], b.p[1], u) + b.v[1] * ex,
    lerp(a.p[2], b.p[2], u) + b.v[2] * ex,
  );
  tmpQa.set(a.q[0], a.q[1], a.q[2], a.q[3]).normalize();
  tmpQb.set(b.q[0], b.q[1], b.q[2], b.q[3]).normalize();
  ball.disp.q.slerpQuaternions(tmpQa, tmpQb, u);
  ball.disp.v.set(b.v[0], b.v[1], b.v[2]);
}

export function prepareBall() {
  if (ball.mine && ball.held && me.body) {
    const h = handPosition();
    teleport(ball.body, h.x, h.y, h.z);
  } else if (!ball.mine) {
    updateBallDisplayFromRemote();
    teleport(ball.body, ball.disp.p.x, ball.disp.p.y, ball.disp.p.z);
  }
}
