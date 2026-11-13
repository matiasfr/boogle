// The beach ball's impact pack, all render-only:
//  - squash-and-stretch on the ball mesh, driven by the displayed ball's velocity change (so remote balls work too)
//  - a ~50 ms hit-stop on catches (freezes the ball mesh and your avatar's animation; physics never pauses)
//  - a sand puff when the ball lands on sand, and a boing (src/render/boing.ts) whose pitch and volume follow impact speed
// Local cosmetics, so Math.random is fine. Nothing here is read by the shared simulation.
import * as THREE from 'three';
import { emit } from '../render/particles.ts';
import { boing, farGain } from '../render/boing.ts';
import { BALL_R, PLAYER_R, HEAD_OFFSET, SEA } from '../constants.ts';
import { waterField } from '../physics/water-field.ts';
import { groundHeight } from '../island/terrain.ts';
import { clamp } from '../math.ts';
import { ball } from '../entities/ball/state.ts';
import { ballMesh } from '../entities/ball/view.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';
import { onFrame } from '../loop.ts';

// ---------------------------------------------------------------- tunables
const TUNE = {
  impactMin: 3.2, // velocity change (m/s) that counts as a hit
  hitStopMs: 55,
  catchMinSpeed: 5, // slower catches get no hit-stop
};

const tmpV = new THREE.Vector3(),
  axis = new THREE.Vector3(0, 1, 0),
  prevV = new THREE.Vector3(),
  freezeP = new THREE.Vector3(),
  freezeQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();

// ---------------------------------------------------------------- sand puff (the shared pool, src/render/particles.ts)
const PUFF = new THREE.Color('#f1dca8');
function emitPuff(x: number, y: number, z: number, k: number) {
  const n = Math.round(6 + 8 * k);
  for (let q = 0; q < n; q++) {
    const a = Math.random() * Math.PI * 2,
      sp = 0.6 + Math.random() * 1.6 * (0.5 + k);
    emit({
      x: x + Math.cos(a) * 0.3,
      y: y + 0.1,
      z: z + Math.sin(a) * 0.3,
      vx: Math.cos(a) * sp,
      vy: 0.5 + Math.random() * 1.3,
      vz: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.35,
      size: 0.14 + Math.random() * 0.16 * (0.6 + k),
      color: PUFF,
      gravity: 0.8,
      drag: 3,
      grow: [0.6, 2],
      shrink: 1 / 3,
    });
  }
}

// ---------------------------------------------------------------- ball squash and stretch
let sx = 0, // spring displacement: positive = squashed along `axis`, negative = stretched
  sv = 0;
function kick(dir: THREE.Vector3, amp: number) {
  axis.copy(dir).normalize();
  sx = Math.max(sx, amp);
  sv = 0;
}
function stepSpring(dt: number) {
  let n = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / n;
  while (n--) {
    sv += (-420 * sx - 15 * sv) * h;
    sx += sv * h;
  }
}
function applySquash() {
  const m = ballMesh;
  let ax = axis,
    sa = 1;
  if (Math.abs(sx) > 0.012 || Math.abs(sv) > 0.1) {
    sa = clamp(1 - sx, 0.55, 1.4);
  } else {
    const sp = ball.pose.v.length();
    if (sp > 6 && !ball.held) {
      ax = tmpV.copy(ball.pose.v).normalize();
      sa = 1 + Math.min(sp * 0.006, 0.1);
    }
  }
  if (sa === 1) {
    m.matrixAutoUpdate = true;
    return;
  }
  const sp = 1 / Math.sqrt(sa);
  m.matrixAutoUpdate = false;
  tmpM.makeRotationFromQuaternion(m.quaternion);
  const e = tmpM.elements;
  for (let c = 0; c < 3; c++) {
    const o = c * 4;
    const d = ax.x * e[o]! + ax.y * e[o + 1]! + ax.z * e[o + 2]!;
    for (let r = 0; r < 3; r++) e[o + r] = sp * e[o + r]! + (sa - sp) * d * ax.getComponent(r);
  }
  tmpM.setPosition(m.position);
  m.matrix.copy(tmpM);
  m.matrixWorldNeedsUpdate = true;
}

// ---------------------------------------------------------------- impact detection
let lastImpact = 0,
  wasHeld = false,
  lastHeldByMe = -1e9,
  prevSpeed = 0,
  freezeUntil = 0,
  freezeMine = false;

function nearestPerson(p: THREE.Vector3) {
  // Is the ball touching a player's body? Returns { me: bool } or null.
  const test = (px: number, py: number, pz: number) => {
    const dy = clamp(p.y - py, 0, HEAD_OFFSET);
    return Math.hypot(p.x - px, p.y - (py + dy), p.z - pz) < PLAYER_R + BALL_R + 0.3;
  };
  if (me.body && test(me.body.position.x, me.body.position.y, me.body.position.z)) return { me: true };
  for (const r of remotes.values()) if (r.avatar && test(r.target.x, r.target.y, r.target.z)) return { me: false };
  return null;
}

function detect(now: number) {
  const held = ball.held;
  if (ball.mine && held) lastHeldByMe = now;
  const p = ball.pose.p;
  if (held) {
    if (!wasHeld && prevSpeed > TUNE.catchMinSpeed) {
      freezeUntil = now + TUNE.hitStopMs;
      freezeMine = ball.mine;
      freezeP.copy(ballMesh.position);
      freezeQ.copy(ballMesh.quaternion);
      kick(prevV.lengthSq() > 0.01 ? prevV : axis, clamp(prevSpeed / 40, 0.08, 0.3));
      boing(prevSpeed * 0.5, 0.08 * farGain(p.x, p.z), false);
    }
    wasHeld = true;
    return;
  }
  wasHeld = false;
  const v = ball.pose.v;
  const dvx = v.x - prevV.x,
    dvy = v.y - prevV.y,
    dvz = v.z - prevV.z;
  const m = Math.hypot(dvx, dvy, dvz);
  if (m > TUNE.impactMin && now - lastImpact > 90) {
    const gh = groundHeight(p.x, p.z);
    const onGround = p.y - gh < BALL_R + 0.3;
    const water = waterField.sampleAt('ball', p);
    const level = waterField.moving ? water.height : SEA;
    const bed = waterField.moving ? water.bedHeight : gh;
    const inWater = bed < level - 0.1 && p.y - BALL_R < level + 0.2;
    const person = nearestPerson(p);
    const mine = person?.me && now - lastHeldByMe < 700;
    if ((onGround || inWater || person) && !mine) {
      lastImpact = now;
      kick(tmpV.set(dvx, dvy, dvz), clamp(m / 36, 0.07, 0.4));
      const k = clamp(m / 16, 0.05, 1);
      boing(m, 0.3 * k * farGain(p.x, p.z), inWater && !person);
      if (onGround && !inWater && gh > 0.25 && !person) emitPuff(p.x, gh, p.z, k);
    }
  }
  prevV.copy(v);
  prevSpeed = v.length();
}

const saved = { y: 0, rx: 0, sx: 1, sy: 1, sz: 1 };

onFrame(
  ({ now, dt }) => {
    detect(now);
    stepSpring(dt);
  },
  { phase: 'world' },
);

onFrame(
  ({ now }) => {
    // Hit-stop: hold the ball mesh, and your own avatar's pose, for a few frames. Physics keeps running.
    const frozen = now < freezeUntil;
    if (frozen) {
      ballMesh.position.copy(freezeP);
      ballMesh.quaternion.copy(freezeQ);
    }
    const inner = me.avatar?.userData.inner;
    if (inner) {
      if (frozen && freezeMine) {
        inner.position.y = saved.y;
        inner.rotation.x = saved.rx;
        inner.scale.set(saved.sx, saved.sy, saved.sz);
      } else {
        saved.y = inner.position.y;
        saved.rx = inner.rotation.x;
        saved.sx = inner.scale.x;
        saved.sy = inner.scale.y;
        saved.sz = inner.scale.z;
      }
    }
    applySquash();
  },
  { phase: 'late', order: -10 },
);
