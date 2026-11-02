import * as THREE from 'three';
import {
  BALL_R,
  BALL_MASS,
  BALL_DAMPING,
  BALL_SPAWN,
  REACH,
  INTERP_MS,
  HALF,
  PLAYER_R,
  HEAD_OFFSET,
} from '../constants.ts';
import { clamp, lerp, finiteArr, r2, r3 } from '../math.ts';
import { groundHeight } from '../island/terrain.ts';
import { scene } from '../render/scene.ts';
import { ballMat, teleport } from './physics.ts';
import { createBody, addBody, setMotion } from './engine.ts';
import { me, handPosition, carryPosition } from '../player/player.ts';
import { cancelCharge } from '../player/throw.ts';
import {
  net,
  remotes,
  sendPresence,
  addPresenceField,
  onRemotePresence,
  keepPresenceWhile,
  type Remote,
} from '../netplay/net.ts';
import { createSnaps } from '../netplay/snaps.ts';
import { onFrame } from '../loop.ts';

/** The ball as its owner publishes it (presence `b`). */
export type BallWire = { e: number; p: number[]; v: number[]; q: number[]; h: number };
type BallSample = { p: number[]; v: number[]; q: number[]; h: number };
/** A remote player as this module sees them: their last ball claim and its snapshots. */
type BallRemote = Remote & { ball?: BallWire | null; ballSnaps?: ReturnType<typeof createSnaps<BallSample>> };
type Owner = { peer: string; e: number; remote: BallRemote | null };

function beachBallTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
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
  body: createBody({
    mass: BALL_MASS,
    material: ballMat,
    linearDamping: BALL_DAMPING,
    angularDamping: 0.3,
    shapes: [{ kind: 'sphere', r: BALL_R }],
  }),
  mesh: new THREE.Mesh(
    new THREE.SphereGeometry(BALL_R, 32, 18),
    new THREE.MeshStandardMaterial({ map: beachBallTexture(), roughness: 0.4 }),
  ),
  e: 0, // highest ownership epoch seen anywhere
  myE: 0, // epoch of this tab's current claim
  mine: false, // this tab simulates the ball and publishes it
  held: false,
  owner: null as Owner | null, // whoever currently simulates the ball
  orphanSince: 0,
  disp: { p: new THREE.Vector3(), q: new THREE.Quaternion(), v: new THREE.Vector3() },
};
ball.mesh.castShadow = true;
scene.add(ball.mesh);
addBody(ball.body);
ball.disp.p.set(BALL_SPAWN.x, groundHeight(BALL_SPAWN.x, BALL_SPAWN.z) + BALL_R + 0.4, BALL_SPAWN.z);

// sim: dynamic and collides. ghost: kinematic, positioned by hand or by the network, no collision response.
export const setBallMode = (mode: 'sim' | 'ghost') => setMotion(ball.body, mode === 'sim' ? 'dynamic' : 'kinematic');
setBallMode('ghost');
teleport(ball.body, ball.disp.p.x, ball.disp.p.y, ball.disp.p.z);
ball.mesh.position.copy(ball.disp.p);

const hand = new THREE.Vector3();
export function ballInReach() {
  if (!me.entered) return false;
  return handPosition(hand).distanceTo(ball.disp.p) < REACH;
}
export function remoteHoldsBall() {
  return !ball.mine && !!ball.owner?.remote && ball.held;
}

export function claimBall(held: boolean) {
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
  cancelCharge();
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

// Throws the held ball from p with velocity vel (src/player/throw.ts launch('ball', charge) gives both).
export function throwBall(p: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }) {
  if (!ball.mine || !me.holding) return;
  me.holding = false;
  ball.held = false;
  setBallMode('sim');
  teleport(ball.body, p.x, p.y, p.z);
  ball.body.velocity.set(vel.x, vel.y, vel.z);
  const len = Math.hypot(vel.x, vel.z) || 1;
  ball.body.angularVelocity.set((vel.z / len) * 8, 0, (-vel.x / len) * 8);
  sendPresence();
}

// Puts the ball down at a saved spot (src/features/ball-rest.ts). A live ball elsewhere, or one in someone's hands,
// wins: then nothing moves and this returns false.
export function placeBall(x: number, y: number, z: number) {
  if (ball.owner?.remote || ball.held) return false;
  ball.disp.p.set(x, y, z);
  ball.disp.v.set(0, 0, 0);
  teleport(ball.body, x, y, z);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
  ball.mesh.position.copy(ball.disp.p);
  if (ball.mine) sendPresence();
  return true;
}

export function respawnBall() {
  if (!ball.mine) claimBall(false);
  me.holding = false;
  cancelCharge();
  ball.held = false;
  setBallMode('sim');
  teleport(ball.body, BALL_SPAWN.x, groundHeight(BALL_SPAWN.x, BALL_SPAWN.z) + 3, BALL_SPAWN.z);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
  sendPresence();
}

// Owner state (DESIGN.md): the tab that simulates the ball publishes it as `b: { e, p, v, q, h }` (epoch, position,
// velocity, quaternion, held); a held ball reports its holder's velocity. Other tabs keep each peer's last claim on
// its remote record (r.ball, r.ballSnaps) and smooth only the owner's.
addPresenceField('b', () => {
  if (!ball.mine) return null;
  const bp = ball.body.position,
    bq = ball.body.quaternion;
  const bv = ball.held && me.body ? me.body.velocity : ball.body.velocity;
  return {
    e: ball.myE,
    p: [r2(bp.x), r2(bp.y), r2(bp.z)],
    v: [r2(bv.x), r2(bv.y), r2(bv.z)],
    q: [r3(bq.x), r3(bq.y), r3(bq.z), r3(bq.w)],
    h: ball.held ? 1 : 0,
  };
});
onRemotePresence((rr, pr, time) => {
  const r = rr as BallRemote;
  const b = pr.b as BallWire | undefined;
  r.ballSnaps ??= createSnaps<BallSample>();
  if (b && Number.isFinite(b.e) && finiteArr(b.p, 3) && finiteArr(b.v, 3) && finiteArr(b.q, 4)) {
    r.ball = b;
    r.ballSnaps.push(time, { p: b.p, v: b.v, q: b.q, h: b.h });
  } else {
    r.ball = null;
    r.ballSnaps.clear();
  }
});

// The owner keeps publishing the ball even from the title screen.
keepPresenceWhile(() => ball.mine);

// Highest epoch wins; a tie goes to the lexically larger peer label, so every tab picks the same owner.
export function resolveBallOwner(now: number) {
  let best: Owner | null = ball.mine ? { peer: net.myPeer ?? '', e: ball.myE, remote: null } : null;
  for (const r of remotes.values() as Iterable<BallRemote>) {
    const b = r.ball;
    if (!b) continue;
    if (!best || b.e > best.e || (b.e === best.e && r.peer > best.peer)) best = { peer: r.peer, e: b.e, remote: r };
    ball.e = Math.max(ball.e, b.e);
  }
  if (ball.mine && best?.remote) releaseBall();
  ball.owner = best;
  if (best?.remote) ball.held = !!best.remote.ball?.h;
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
  const r = ball.owner?.remote;
  const s = r?.ball && r.ballSnaps?.length ? r.ballSnaps.sample(performance.now() - INTERP_MS) : null;
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
    const h = carryPosition();
    teleport(ball.body, h.x, h.y, h.z);
  } else if (!ball.mine) {
    updateBallDisplayFromRemote();
    teleport(ball.body, ball.disp.p.x, ball.disp.p.y, ball.disp.p.z);
  }
}

// Frame hooks; the order numbers are listed at the top of src/loop.ts.
// world -300, right after the physics step: an owned ball that left the island respawns, then the display follows it.
onFrame(
  () => {
    if (!ball.mine) return;
    const bp = ball.body.position;
    if (!ball.held && (Math.abs(bp.x) > HALF - 3 || Math.abs(bp.z) > HALF - 3 || bp.y < -15)) respawnBall();
    const ip = ball.held ? bp : ball.body.interpolatedPosition;
    ball.disp.p.set(ip.x, ip.y, ip.z);
    const q = ball.body.quaternion;
    ball.disp.q.set(q.x, q.y, q.z, q.w);
    const v = ball.body.velocity;
    ball.disp.v.set(v.x, v.y, v.z);
  },
  { phase: 'world', order: -300 },
);

// world -280, after the player's fall respawn (player.js, -290): walking into a slow ball takes ownership so the push
// resolves in this tab's simulation.
onFrame(
  ({ now }) => {
    if (!me.body) return;
    if (!ball.mine && ball.owner && !ball.held && now - me.lostBallAt > 400 && ball.disp.v.length() < 5) {
      const p = me.body.position;
      const bpos = ball.disp.p;
      const dy = clamp(bpos.y - p.y, 0, HEAD_OFFSET);
      const d = Math.hypot(bpos.x - p.x, bpos.y - (p.y + dy), bpos.z - p.z);
      if (d < PLAYER_R + BALL_R + 0.08) claimBall(false);
    }
  },
  { phase: 'world', order: -280 },
);

// update -300, first visual sync, before the camera: the owner shows its body (or the carry spot), others smooth in.
onFrame(
  ({ dt }) => {
    if (ball.mine) {
      if (ball.held) carryPosition(ball.mesh.position);
      else ball.mesh.position.copy(ball.disp.p);
      ball.mesh.quaternion.copy(ball.disp.q);
    } else {
      const k = 1 - Math.exp(-dt * 25);
      ball.mesh.position.lerp(ball.disp.p, k);
      ball.mesh.quaternion.slerp(ball.disp.q, k);
    }
  },
  { phase: 'update', order: -300 },
);
