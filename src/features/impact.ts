// Ball impact pack and the face-plant. All render-only except the face-plant's movement lock on yourself:
//  - squash-and-stretch on the ball mesh, driven by the displayed ball's velocity change (so remote balls work too)
//  - a ~50 ms hit-stop on catches (freezes the ball mesh and your avatar's animation; physics never pauses)
//  - a sand puff when the ball lands on sand, and a procedural "boing" whose pitch and volume follow impact speed
//  - face-plant: a fast ball to your own head knocks you on your back for a moment with stars circling. Your client
//    decides and publishes it as the presence field `kd` (ms remaining), so everyone sees the flop.
// Local cosmetics, so Math.random is fine. Nothing here is read by the shared simulation.
import type { Avatar } from '../player/avatars.ts';
import * as THREE from 'three';
import { camera } from '../render/scene.ts';
import { emit } from '../render/particles.ts';
import { BALL_R, PLAYER_R, HEAD_OFFSET, SEA, reducedMotion } from '../constants.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { clamp, lerp } from '../math.ts';
import { ball } from '../physics/ball.ts';
import { me } from '../player/player.ts';
import { remotes, addPresenceField, onRemotePresence, type Remote } from '../netplay/net.ts';
import { onFrame } from '../loop.ts';
import { getAudio } from '../render/audio.ts';

// ---------------------------------------------------------------- tunables
const TUNE = {
  impactMin: 3.2, // velocity change (m/s) that counts as a hit
  faceplantSpeed: 11, // ball speed (m/s) that flops a head
  downMs: 800,
  immuneMs: 1000, // after getting up
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

// ---------------------------------------------------------------- boing
let lastBoing = 0,
  boingBurst = 0,
  boingBurstAt = 0;
export function boing(speed: number, vol: number, low: boolean) {
  const a = getAudio();
  if (!a) return;
  const now = performance.now();
  if (now - lastBoing < 60) return;
  if (now - boingBurstAt > 300) boingBurst = 0;
  if (boingBurst >= 4) return;
  boingBurst++;
  boingBurstAt = lastBoing = now;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.003;
  const f0 = (low ? 110 : 160) + clamp(speed, 0, 24) * 13 * (0.96 + Math.random() * 0.08);
  // a bit subtler (2026-11-02 audit): about 4 dB down, an 8 ms onset, shorter tails, a gentler wobble and the
  // triangle's top rounded off
  const dur = 0.13 + clamp(speed / 24, 0, 1) * 0.14;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol * 0.62, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  g.connect(lp).connect(out);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f0 * 0.75, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 1.45, t + 0.035);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur);
  const lfo = ctx.createOscillator(); // the wobble that makes it a boing
  lfo.frequency.value = 24;
  const lg = ctx.createGain();
  lg.gain.setValueAtTime(f0 * 0.045, t);
  lg.gain.exponentialRampToValueAtTime(0.01, t + dur);
  lfo.connect(lg).connect(o.frequency);
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(f0 * 1.5, t);
  o2.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + dur);
  const g2 = ctx.createGain();
  g2.gain.value = 0.35;
  o2.connect(g2).connect(g);
  o.connect(g);
  for (const n of [o, o2, lfo]) {
    n.start(t);
    n.stop(t + dur + 0.03);
  }
}
const farGain = (x: number, z: number) => 1 / (1 + ((camera.position.x - x) ** 2 + (camera.position.z - z) ** 2) / 300);

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
  const m = ball.mesh;
  let ax = axis,
    sa = 1;
  if (Math.abs(sx) > 0.012 || Math.abs(sv) > 0.1) {
    sa = clamp(1 - sx, 0.55, 1.4);
  } else {
    const sp = ball.disp.v.length();
    if (sp > 6 && !ball.held) {
      ax = tmpV.copy(ball.disp.v).normalize();
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
    const d = ax.x * e[o] + ax.y * e[o + 1] + ax.z * e[o + 2];
    for (let r = 0; r < 3; r++) e[o + r] = sp * e[o + r] + (sa - sp) * d * ax.getComponent(r);
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
  if (ball.mine && me.holding) lastHeldByMe = now;
  const held = ball.held;
  const p = ball.disp.p;
  if (held) {
    if (!wasHeld && prevSpeed > TUNE.catchMinSpeed) {
      freezeUntil = now + TUNE.hitStopMs;
      freezeMine = !!me.holding;
      freezeP.copy(ball.mesh.position);
      freezeQ.copy(ball.mesh.quaternion);
      kick(prevV.lengthSq() > 0.01 ? prevV : axis, clamp(prevSpeed / 40, 0.08, 0.3));
      boing(prevSpeed * 0.5, 0.08 * farGain(p.x, p.z), false);
    }
    wasHeld = true;
    return;
  }
  wasHeld = false;
  const v = ball.disp.v;
  const dvx = v.x - prevV.x,
    dvy = v.y - prevV.y,
    dvz = v.z - prevV.z;
  const m = Math.hypot(dvx, dvy, dvz);
  if (m > TUNE.impactMin && now - lastImpact > 90) {
    const gh = groundHeight(p.x, p.z);
    const onGround = p.y - gh < BALL_R + 0.3;
    const inWater = gh < SEA - 0.1 && p.y - BALL_R < SEA + 0.2;
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
  // Face-plant: judged against the speed the ball had the frame before the collision slowed it down.
  const speed = v.length();
  checkFaceplant(now, Math.max(prevSpeed, speed));
  prevV.copy(v);
  prevSpeed = speed;
}

// ---------------------------------------------------------------- face-plant
let downUntil = 0,
  immuneUntil = 0;
function checkFaceplant(now: number, speed: number) {
  if (!me.body || !me.entered) return;
  if (me.down) {
    if (now >= downUntil) {
      me.down = false;
      immuneUntil = now + TUNE.immuneMs;
    }
    return;
  }
  if (now < immuneUntil || speed < TUNE.faceplantSpeed || ball.held) return;
  if (now - lastHeldByMe < 700 || now - (me.bumpAt ?? -1e9) < 700 || me.holding || me.charging) return; // your own throws never flop you
  const b = me.body.position;
  const head = tmpV.set(b.x, b.y + HEAD_OFFSET, b.z);
  const d = head.distanceTo(ball.disp.p);
  if (d > PLAYER_R + BALL_R + 0.12 || ball.disp.p.y < b.y + HEAD_OFFSET * 0.4) return;
  me.down = true;
  downUntil = now + TUNE.downMs;
  me.holding = me.charging = false;
  shake = reducedMotion ? 0 : 1;
  boing(18, 0.35, true);
}
addPresenceField('kd', () => (me.down ? Math.max(1, Math.round(downUntil - performance.now())) : null));
onRemotePresence((r, pr) => {
  const kd = pr.kd as number;
  // Temporary: tabs on builds before b0a3a7b never clear kd, so they repeat their last value forever. A live kd
  // counts down between packets, so an exact repeat is stale. Remove once every tab runs b0a3a7b or later.
  if (kd === r.kdLast) return;
  r.kdLast = kd;
  if (Number.isFinite(kd) && kd > 0 && kd <= 2000) {
    const now = performance.now();
    if (!((r.kdUntil ?? -Infinity) > now)) onRemoteDown(r);
    r.kdUntil = now + kd;
  }
});
function onRemoteDown(r: Remote) {
  boing(16, 0.25 * farGain(r.target.x, r.target.z), true);
}

// ---------------------------------------------------------------- flop + stars
const starTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffd84a';
  g.strokeStyle = '#b37a00';
  g.lineWidth = 3;
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 ? 11 : 28,
      a = -Math.PI / 2 + (k * Math.PI) / 5;
    g[k ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * r, 33 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.stroke();
  return new THREE.CanvasTexture(c);
})();
const starMat = new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false });
const ents = new WeakMap<THREE.Object3D, { amt: number; stars: THREE.Group }>(); // avatar -> its flop state
function entOf(avatar: THREE.Object3D) {
  let e = ents.get(avatar);
  if (!e) {
    const stars = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(starMat);
      s.scale.set(0.3, 0.3, 1);
      s.renderOrder = 11;
      stars.add(s);
    }
    stars.visible = false;
    avatar.add(stars);
    e = { amt: 0, stars };
    ents.set(avatar, e);
  }
  return e;
}
function flop(avatar: Avatar, down: boolean, left: number, dt: number, t: number) {
  const e = entOf(avatar);
  const u = avatar.userData;
  e.amt = lerp(e.amt, down ? 1 : 0, 1 - Math.exp(-dt * (down ? 22 : 14)));
  if (e.amt > 0.002) {
    u.inner.rotation.x = lerp(u.inner.rotation.x, Math.PI / 2, e.amt);
    u.inner.position.y = lerp(u.inner.position.y, PLAYER_R, e.amt);
    u.inner.scale.set(1, 1, 1);
  }
  e.stars.visible = down && left > 0;
  if (e.stars.visible) {
    // Head ends up behind the feet (+z in avatar space) when lying on the back.
    const sp = e.stars.children.length;
    e.stars.children.forEach((s, k) => {
      const a = t * 5 + (k * Math.PI * 2) / sp;
      s.position.set(Math.cos(a) * 0.5, 1.0 + Math.sin(a * 2) * 0.05, HEAD_OFFSET + 0.2 + Math.sin(a) * 0.5);
    });
  }
}

let shake = 0;
const saved = { y: 0, rx: 0, sx: 1, sy: 1, sz: 1 };

onFrame(
  ({ now, dt }) => {
    detect(now);
    stepSpring(dt);
  },
  { phase: 'world' },
);

onFrame(
  ({ now, dt, elapsed }) => {
    // Hit-stop: hold the ball mesh, and your own avatar's pose, for a few frames. Physics keeps running.
    const frozen = now < freezeUntil;
    if (frozen) {
      ball.mesh.position.copy(freezeP);
      ball.mesh.quaternion.copy(freezeQ);
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

    if (me.avatar) flop(me.avatar, me.down, downUntil - now, dt, elapsed);
    for (const r of remotes.values())
      if (r.avatar) flop(r.avatar, (r.kdUntil ?? 0) > now, (r.kdUntil ?? 0) - now, dt, elapsed);

    if (shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * 0.12 * shake;
      camera.position.y += (Math.random() - 0.5) * 0.12 * shake;
      shake *= Math.exp(-dt * 6);
    }
  },
  { phase: 'late', order: -10 },
);
