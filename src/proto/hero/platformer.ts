// The platformer hero (assets/src/hero2-rig.py), the default body of ?proto=hero: legs with knees, a big separate head,
// the proportions of Ratchet or a Bricktron as our own character. Its run is built the way a hand-animated run is, in
// parts (docs/research/third-person-platformer-movement.md):
// - Stance: the foot stays where it landed while the hips pass over it. A two-bone solve finds the thigh and knee, so
//   the foot doesn't skate, and the heel rolls up to the toe at push-off.
// - Swing: hand-keyed poses (the heel folds up, passes, the knee drives) played by distance through the stride.
// - The hips drop into each stance and rise in the flight between steps; code adds the lean, hip and chest twist, arm
//   pumps, a head that stays level and looks into turns, a blink and footfall dust.
// Everything comes from motion alone (speed, airborne, position, facing), so remote players get it with no new presence.
// &steps=1 adds quiet footsteps. &lineup=<m/s> holds eight heroes through one stride cycle, for judging it from a still.
import * as THREE from 'three/webgpu';
import { COLORS, PLAYER_R, SPAWN, reducedMotion } from '../../constants.ts';
import { clamp } from '../../math.ts';
import { springStep, stiffnessOf, dampingOf, type Spring } from '../../render/motion.ts';
import { precompile } from '../../render/precompile.ts';
import { loadAsset } from '../../render/assets.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { scene } from '../../render/scene.ts';
import { onFrame } from '../../loop.ts';
import { groundHeight } from '../../island/terrain.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { setAvatarSkin, type Avatar } from '../../player/avatars.ts';
import { shadeOnce } from '../../player/hero.ts';
import { startHeroCamera } from './camera.ts';
import url from '../../../assets/built/hero2-rig.glb?url';

const q = new URLSearchParams(location.search);
const STEPS = q.get('steps') === '1';
const D = Math.PI / 180;

const LEG = { thigh: 0.25, shin: 0.27, hip: 0.66, ankle: 0.14, toe: 0.2, heel: 0.09 }; // m, from hero2-rig.py's joints
const TUNE = {
  stride: 0.74, // m per cycle × v^0.6 (Alexander, with a 0.68 m hip and this game's gravity): 2.5 m at 7.5 m/s
  sweep: 0.62, // m the hips travel over a planted foot at most (a longer one can't be reached by these legs)
  ahead: 0.42, // of the sweep lands in front of the hips
  lean: { perSpeed: 0.9, max: 10 }, // degrees of body lean
  kick: { start: 7, brake: 11, cap: 25, hz: 3, zeta: 0.45 }, // degrees; m/s²
  bank: { k: 0.4, max: 9 }, // × atan(lateral accel / 18); degrees
  twist: { hips: 9, chest: 13 }, // degrees, at a full run
  headLevel: 0.75, // of the body's lean and roll the head takes back, so the face stays up
  headTurn: { k: 0.16, max: 30 }, // of the turn rate the head looks ahead by; degrees
};
const SKID = { angle: 100, speed: 4, release: 60, stop: 2 }; // degrees, m/s
const BLINK = { every: [2.5, 5.5], ms: 110 };
const BONES = [
  'root',
  'hips',
  'body',
  'head',
  ...['arm', 'forearm', 'hand', 'thigh', 'shin', 'foot'].flatMap((b) => [b + '_l', b + '_r']),
];
// The swing, in degrees, between where stance ends and where it starts again: [thigh, knee, sole], walk then run.
const SWING = {
  walk: [
    [-8, -45, -20],
    [14, -55, -12],
    [26, -25, 6],
  ],
  run: [
    [-14, -100, -28],
    [32, -115, -16],
    [66, -85, 4],
  ],
};
type Angles = [thigh: number, knee: number, sole: number];

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Catmull-Rom through evenly spaced points at t in 0..1. */
function curve(p: number[], t: number) {
  const n = p.length - 1,
    f = clamp(t, 0, 1) * n,
    i = Math.min(n - 1, Math.floor(f)),
    u = f - i;
  const a = p[Math.max(0, i - 1)],
    b = p[i],
    c = p[i + 1],
    d = p[Math.min(n, i + 2)];
  return 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
}
/** Thigh and knee angles (degrees) that put the ankle x in front of the hip and h below it. */
function solve(x: number, h: number): [number, number] {
  const { thigh: a, shin: b } = LEG;
  const d = Math.min(Math.hypot(x, h), a + b - 0.002);
  const f = Math.acos(clamp((d * d - a * a - b * b) / (2 * a * b), -1, 1));
  return [(Math.atan2(x, h) + Math.atan2(b * Math.sin(f), a + b * Math.cos(f))) / D, -f / D];
}
const liftOf = (sole: number) => (sole < 0 ? LEG.toe * Math.sin(-sole * D) : LEG.heel * Math.sin(sole * D));

type Gait = { stride: number; sweep: number; duty: number; run: number; toe: number };
function gaitOf(v: number): Gait {
  const stride = Math.max(0.6, TUNE.stride * Math.pow(Math.max(v, 0.3), 0.6));
  const sweep = Math.min(TUNE.sweep + 0.05 * clamp((v - 7.5) / 3, 0, 1), stride * 0.5);
  const run = clamp((v - 2.5) / 2, 0, 1);
  return { stride, sweep, duty: sweep / stride, run, toe: mix(22, 44, run) };
}
/** How far the hips sit below their standing height, over one step (u: 0 a foot lands, 1 the other does). */
function hipOf(g: Gait, u: number) {
  const end = 2 * g.duty; // where stance ends, in the step
  const walk = mix(-0.035, -0.008, Math.sin(Math.PI * u));
  let run: number;
  if (u < end / 2) run = mix(-0.065, -0.115, smooth(u / (end / 2)));
  else if (u < end) run = mix(-0.115, -0.05, smooth((u - end / 2) / (end / 2)));
  else {
    const s = (u - end) / Math.max(1e-3, 1 - end);
    run = s < 0.5 ? mix(-0.05, -0.012, smooth(s * 2)) : mix(-0.012, -0.065, smooth((s - 0.5) * 2));
  }
  return mix(walk, run, g.run);
}
function soleOf(g: Gait, s: number) {
  if (s < 0.25) return mix(12, 0, s / 0.25);
  return s < 0.55 ? 0 : -g.toe * smooth((s - 0.55) / 0.45);
}
/** One planted leg at s through its stance, with the hips offset by hip, on ground at height gy. */
function stance(g: Gait, s: number, hip: number, gy: number): Angles {
  const sole = soleOf(g, s);
  const x = g.sweep * TUNE.ahead - s * g.sweep;
  const [t, k] = solve(x, LEG.hip + hip - (LEG.ankle + liftOf(sole) + gy));
  return [t, k, sole];
}
/** One leg at u through its cycle (0: lands). */
function legAt(g: Gait, u: number, hip: number, gy: number): Angles {
  if (u < g.duty) return stance(g, u / g.duty, hip, gy);
  const s = (u - g.duty) / (1 - g.duty);
  const a = stance(g, 1, hipOf(g, Math.min(1, 2 * g.duty)), 0),
    b = stance(g, 0, hipOf(g, 0), 0);
  const out: Angles = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const keys = [a[i], 0, 0, 0, b[i]];
    for (let j = 0; j < 3; j++) keys[j + 1] = mix(SWING.walk[j][i], SWING.run[j][i], g.run);
    out[i] = curve(keys, s);
  }
  return out;
}

type Pose = {
  bones: Record<string, THREE.Object3D>;
  eyes: THREE.Object3D[];
  phase: number; // 0..1 through a stride cycle (left foot lands at 0, right at 0.5)
  x: Record<string, number>;
  y: Record<string, number>;
  z: Record<string, number>;
  hip: number;
  blink: number;
  last: THREE.Vector3 | null;
  vel: THREE.Vector3;
  acc: THREE.Vector3;
  kick: Spring;
  wasAir: boolean;
  landT: number; // s since landing
  landV: number; // how hard
  groundT: number; // s on the ground
  airLead: 'l' | 'r'; // the leg that drives up out of a jump
  skid: boolean;
  yawPrev: number;
  yawRate: number; // degrees/s, smoothed
  glance: number;
  glanceT: number;
};
const poses = new WeakMap<Avatar, Pose>();
const tmp = new THREE.Vector3();
const DUST = new THREE.Color('#d9c49a');

function dust(a: Avatar, n: number, spread: number, kick: number) {
  if (reducedMotion) return;
  const fx = -Math.sin(a.rotation.y),
    fz = -Math.cos(a.rotation.y);
  for (let i = 0; i < n; i++)
    emit({
      x: a.position.x + (Math.random() - 0.5) * 0.3,
      y: a.position.y - PLAYER_R + 0.05,
      z: a.position.z + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * spread - fx * kick,
      vy: 0.5 + Math.random() * 0.9,
      vz: (Math.random() - 0.5) * spread - fz * kick,
      life: 0.25 + Math.random() * 0.25,
      size: 0.1,
      alpha: 0.7,
      color: DUST,
      gravity: 5,
    });
}
function stepSound(v: number) {
  const au = getAudio('sfx');
  if (!au) return;
  const { ctx, out } = au;
  const t = ctx.currentTime,
    o = ctx.createOscillator(),
    g = ctx.createGain();
  o.frequency.setValueAtTime(150 + Math.random() * 30, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
  g.gain.setValueAtTime(0.05 + 0.006 * v, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.08);
}

function animate(a: Avatar, speed: number, airborne: boolean, dt: number) {
  const p = poses.get(a);
  if (!p || dt <= 0) return;
  const inner = a.userData.inner;
  inner.rotation.x = 0;
  inner.scale.set(1, 1, 1);

  // Motion from where the avatar is drawn: velocity and acceleration, smoothed (remote positions arrive at 20 Hz).
  if (!p.last) p.last = a.position.clone();
  tmp.subVectors(a.position, p.last).divideScalar(dt);
  p.last.copy(a.position);
  const kv = 1 - Math.exp(-dt / 0.05);
  const ax = (tmp.x - p.vel.x) / dt,
    az = (tmp.z - p.vel.z) / dt;
  p.vel.lerp(tmp, kv);
  p.acc.x += (ax * kv - p.acc.x) * (1 - Math.exp(-dt / 0.06));
  p.acc.z += (az * kv - p.acc.z) * (1 - Math.exp(-dt / 0.06));
  const v = speed,
    vy = p.vel.y;
  const yaw = a.rotation.y,
    fx = -Math.sin(yaw),
    fz = -Math.cos(yaw);
  const aF = p.acc.x * fx + p.acc.z * fz,
    aL = p.acc.x * -fz + p.acc.z * fx;
  const dYaw = Math.atan2(Math.sin(yaw - p.yawPrev), Math.cos(yaw - p.yawPrev)) / D / dt;
  p.yawPrev = yaw;
  p.yawRate += (dYaw - p.yawRate) * (1 - Math.exp(-dt / 0.08));

  if (airborne && !p.wasAir) p.airLead = p.phase < 0.5 ? 'r' : 'l'; // the leg that's behind drives up
  if (p.wasAir && !airborne) {
    p.landT = 0;
    p.landV = -Math.min(vy, 0);
    p.groundT = 0;
    p.phase = p.phase < 0.25 || p.phase > 0.75 ? 0 : 0.5; // land on the nearer foot
    dust(a, p.landV > 8 ? 8 : 4, 2.2, 0);
  }
  p.wasAir = airborne;
  p.landT += dt;
  p.groundT = airborne ? 0 : p.groundT + dt;
  const along = v > 0.1 ? (p.vel.x * fx + p.vel.z * fz) / Math.max(1e-3, Math.hypot(p.vel.x, p.vel.z)) : 1;
  const off = Math.acos(clamp(along, -1, 1)) / D;
  if (a === me.avatar && me.skid)
    p.skid = true; // ?ctl=odyssey: you face your run while you skid, so ask it
  else if (airborne) p.skid = false;
  else if (!p.skid && off > SKID.angle && v > SKID.speed) p.skid = true;
  else if (p.skid && (v < SKID.stop || off < SKID.release)) p.skid = false;

  // Targets in degrees per bone: x swings a hanging limb forward (and tips the body back), z swings an arm out to its
  // side, y twists. Legs follow exactly while running (a lag would make planted feet skate); anything else eases in.
  const x: Record<string, number> = {},
    y: Record<string, number> = {},
    z: Record<string, number> = {};
  const leg = (side: 'l' | 'r', [thigh, knee, sole]: Angles) => {
    x['thigh_' + side] = thigh;
    x['shin_' + side] = knee;
    x['foot_' + side] = sole - thigh - knee;
  };
  let ease = 0.04,
    hip = 0;

  if (airborne) {
    ease = 0.05;
    const lead = p.airLead,
      trail = lead === 'l' ? 'r' : 'l';
    if (vy > 2.5) {
      // Rising: the lead knee driven up, the other leg trailing; the opposite mitt punches forward and up, clear of the
      // face, the other arm sweeps back.
      leg(lead, [78, -100, 8]);
      leg(trail, [-24, -32, -40]);
      x['arm_' + trail] = 72;
      x['forearm_' + trail] = 42;
      z['arm_' + trail] = 24;
      x['arm_' + lead] = -48;
      x['forearm_' + lead] = 38;
      z['arm_' + lead] = 26;
      x.body = -6;
    } else if (vy > -2.5) {
      // The top: both knees tucked, arms out, hanging for a beat.
      leg(lead, [62, -95, 0]);
      leg(trail, [36, -72, -12]);
      x.forearm_l = x.forearm_r = 28;
      z.arm_l = z.arm_r = 72;
      x.body = -2;
      ease = 0.08;
    } else {
      // Falling: legs reaching down for the ground, arms up and flared, a little flutter.
      const flutter = 6 * Math.sin(performance.now() * 0.016);
      leg(lead, [22, -24, 10]);
      leg(trail, [-8, -34, -4]);
      x.forearm_l = x.forearm_r = 18;
      z.arm_l = 108 + flutter;
      z.arm_r = 108 - flutter;
      x.body = 3;
      ease = 0.09;
    }
  } else if (p.skid) {
    // Braced against the slide: the lead leg stuck out in front, hips low, leaning back, arms flung forward.
    hip = -0.15;
    leg('l', [...solve(0.34, LEG.hip + hip - LEG.ankle - 0.03), 18]);
    leg('r', [...solve(-0.06, LEG.hip + hip - LEG.ankle), 0]);
    Object.assign(x, { body: 17, arm_l: 58, arm_r: 48, forearm_l: 22, forearm_r: 22 });
    Object.assign(z, { arm_l: 42, arm_r: 42 });
    if (Math.random() < 0.5) dust(a, 1, 1.6, -2);
  } else {
    // Your own legs answer the stick at once, before the body has sped up.
    const wish = a === me.avatar ? Math.min(1, Math.hypot(me.wish.x, me.wish.z)) * 5 : 0;
    const legV = Math.max(v, wish);
    const g = gaitOf(legV);
    const prev = p.phase;
    p.phase = (p.phase + (legV * dt) / g.stride) % 1;
    if ((prev < 0.5 && p.phase >= 0.5) || p.phase < prev) {
      if (legV > 6) dust(a, legV > 8.5 ? 3 : 1, 1.2, 0.8);
      if (STEPS && legV > 0.8) stepSound(legV);
    }
    const moving = clamp(legV / 0.7, 0, 1),
      s = Math.cos(2 * Math.PI * (p.phase - 0.05)); // the arms lag the legs a touch
    const stepU = (p.phase * 2) % 1;
    hip = hipOf(g, stepU) * moving - 0.018 * (1 - moving);
    // On slopes each planted foot finds its ground; the hips drop for a downhill foot.
    const onSlope = (u: number, sx: number) => {
      if (u >= g.duty) return 0;
      const fwd = g.sweep * TUNE.ahead - (u / g.duty) * g.sweep,
        lx = sx * 0.16;
      const wx = a.position.x + fx * fwd + -fz * lx,
        wz = a.position.z + fz * fwd + fx * lx;
      const dy = groundHeight(wx, wz) - (a.position.y - PLAYER_R);
      return Math.abs(dy) < 0.3 ? dy : 0; // further off, it isn't this ground we're on (a deck, a rail)
    };
    const uL = p.phase,
      uR = (p.phase + 0.5) % 1;
    const gyL = onSlope(uL, 1),
      gyR = onSlope(uR, -1);
    hip += Math.min(0, gyL, gyR);
    for (const [side, u, gy] of [
      ['l', uL, gyL],
      ['r', uR, gyR],
    ] as const) {
      const stand = solve(side === 'l' ? 0.015 : -0.015, LEG.hip - 0.018 - LEG.ankle);
      const go = legAt(g, u, hip, gy);
      leg(side, [mix(stand[0], go[0], moving), mix(stand[1], go[1], moving), go[2] * moving]);
    }
    // Feet come in towards the line of travel at a run.
    const inward = 3.5 * g.run;
    z.thigh_l = -inward;
    z.thigh_r = inward;
    // Arms pump against the legs: further back than forward, the elbow closing as the arm comes forward.
    const m = g.run * 0.8 + 0.2 * moving,
      big = 1 + 0.2 * clamp((legV - 7.5) / 3, 0, 1);
    for (const [arm, fore, dir] of [
      ['arm_l', 'forearm_l', -1],
      ['arm_r', 'forearm_r', 1],
    ] as const) {
      const fwd = dir * s;
      x[arm] = m * big * (fwd > 0 ? 34 : 50) * fwd;
      x[fore] = 14 + m * (46 + 50 * Math.max(0, fwd));
      z[arm] = 6 + 7 * m;
    }
    // The hips turn with the forward leg, the chest against them; the body rolls over the planted foot.
    const c = Math.cos(2 * Math.PI * p.phase);
    y.hips = TUNE.twist.hips * m * c;
    y.body = -(TUNE.twist.hips + TUNE.twist.chest) * m * c;
    z.body = -3.5 * m * Math.cos(2 * Math.PI * (p.phase - 0.12));
    if (v < 0.3 && wish === 0) {
      // Standing: a slow breath and sway, and now and then a glance around.
      const t = performance.now() / 1000;
      hip += 0.006 * Math.sin(t * 2.1);
      z.body = 1.2 * Math.sin(t * 0.8);
      x.arm_l = 2.5 * Math.sin(t * 1.1);
      x.arm_r = -2.5 * Math.sin(t * 1.1);
      x.forearm_l = x.forearm_r = 12;
      z.arm_l = z.arm_r = 7;
      ease = 0.1;
    }
  }
  // Landing: the knees give and spring back, gone as soon as you run off.
  if (!airborne && !p.skid && p.landT < 0.2 && v < 2.5) {
    const u = p.landT / 0.2,
      give = Math.min(0.2, 0.08 + p.landV * 0.012) * Math.sin(Math.PI * Math.min(1, u * 1.2));
    hip = -give - 0.018;
    const h = LEG.hip + hip - LEG.ankle;
    leg('l', [...solve(0.06, h), 0]);
    leg('r', [...solve(-0.06, h), 0]);
    x.arm_l = x.arm_r = -10;
    z.arm_l = z.arm_r = 26;
    ease = 0.03;
  }

  // Lean from the body, a sprung kick on starts and brakes, a bank into turns from the soles (rec 1).
  const K = TUNE.kick;
  const f = clamp(aF, -K.cap, K.cap) / K.cap;
  springStep(p.kick, (f > 0 ? K.start : K.brake) * f, stiffnessOf(K.hz), dampingOf(K.hz, K.zeta), dt);
  if (!airborne) {
    const lean = Math.min(TUNE.lean.max, TUNE.lean.perSpeed * v) + p.kick.x;
    x.body = (x.body ?? 0) - lean;
    z.root = -clamp((TUNE.bank.k * Math.atan(aL / 18)) / D, -TUNE.bank.max, TUNE.bank.max);
  }
  // The head stays level, faces forward through the twist, and looks into turns.
  p.glanceT -= dt;
  if (p.glanceT < 0) {
    p.glance = Math.random() < 0.5 ? 0 : (Math.random() - 0.5) * 50;
    p.glanceT = 1.5 + Math.random() * 3;
  }
  const look =
    clamp(p.yawRate * TUNE.headTurn.k, -TUNE.headTurn.max, TUNE.headTurn.max) + (v < 0.3 && !airborne ? p.glance : 0);
  x.head = -(x.body ?? 0) * TUNE.headLevel;
  z.head = -(z.body ?? 0) * TUNE.headLevel;
  y.head = -((y.body ?? 0) + (y.hips ?? 0)) * 0.8 + look;

  const k = 1 - Math.exp(-dt / ease);
  const planted = !airborne && !p.skid && p.groundT > 0.1 && v > 0.7; // legs and hips exactly on their solve
  for (const name of BONES) {
    const out = name.startsWith('arm') && name.endsWith('_r') ? -1 : 1;
    const isLeg = name.startsWith('thigh') || name.startsWith('shin') || name.startsWith('foot');
    const kk = planted && isLeg ? 1 : name === 'head' ? 1 - Math.exp(-dt / 0.08) : k;
    p.x[name] = (p.x[name] ?? 0) + ((x[name] ?? 0) - (p.x[name] ?? 0)) * kk;
    p.y[name] = (p.y[name] ?? 0) + ((y[name] ?? 0) - (p.y[name] ?? 0)) * kk;
    p.z[name] = (p.z[name] ?? 0) + ((z[name] ?? 0) * out - (p.z[name] ?? 0)) * kk;
    p.bones[name].rotation.set(p.x[name] * D, p.y[name] * D, p.z[name] * D);
  }
  p.hip += (hip - p.hip) * (planted ? 1 : k);
  // feel.ts squashes the whole avatar about its origin, 0.45 m above the soles: keep the soles on the ground.
  inner.position.y = p.hip - PLAYER_R / Math.max(0.2, a.scale.y) + PLAYER_R;

  // Blink: the eyes vanish for a moment.
  p.blink -= dt * 1000;
  const shut = p.blink < 0;
  for (const e of p.eyes) e.visible = !shut;
  if (p.blink < -BLINK.ms) p.blink = (BLINK.every[0] + Math.random() * (BLINK.every[1] - BLINK.every[0])) * 1000;
}

export async function startPlatformerHero() {
  const kit = await loadAsset(url);
  shadeOnce(kit.gltf.scene);
  const dress = (a: Avatar, colorIdx: number) => {
    if (poses.has(a)) return;
    const holder = kit.instance('hero');
    const root = holder.children[0];
    const shared = (root.getObjectByName('torso_part') as THREE.Mesh).material as THREE.MeshStandardNodeMaterial;
    const mat = shared.clone();
    mat.color.set(COLORS[colorIdx]);
    const eyes: THREE.Object3D[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material === shared) m.material = mat;
      if (o.name.startsWith('eyes_') && !o.name.includes('_blush_')) eyes.push(o);
    });
    for (const child of a.userData.inner.children) child.visible = false; // the capsule and its eyes
    holder.position.y = -PLAYER_R;
    a.userData.inner.add(holder);
    a.userData.mat = mat as unknown as THREE.MeshStandardMaterial;
    a.userData.leanScale = 0;
    poses.set(a, {
      bones: Object.fromEntries(BONES.map((n) => [n, root.getObjectByName(n)!])),
      eyes,
      phase: 0,
      x: {},
      y: {},
      z: {},
      hip: 0,
      blink: 1500 + Math.random() * 3000,
      last: null,
      vel: new THREE.Vector3(),
      acc: new THREE.Vector3(),
      kick: { x: 0, v: 0 },
      wasAir: false,
      landT: 1,
      landV: 0,
      groundT: 1,
      airLead: 'l',
      skid: false,
      yawPrev: a.rotation.y,
      yawRate: 0,
      glance: 0,
      glanceT: 2 + Math.random() * 3,
    });
  };
  await precompile(kit.instance('hero'));
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);
  startHeroCamera();

  const lineup = Number(q.get('lineup'));
  if (lineup > 0) {
    const row: Avatar[] = [];
    for (let i = 0; i < 8; i++) {
      const av = new THREE.Group() as unknown as Avatar;
      const inner = new THREE.Group();
      av.add(inner);
      av.userData = { inner, mat: null as never, phase: 0, colorIdx: i % COLORS.length };
      dress(av, i % COLORS.length);
      const px = SPAWN.x - 5.25 + i * 1.5,
        pz = SPAWN.z + 5;
      av.position.set(px, groundHeight(px, pz) + PLAYER_R, pz);
      av.rotation.y = -Math.PI / 2;
      scene.add(av);
      row.push(av);
    }
    onFrame(
      ({ dt }) =>
        row.forEach((av, i) => {
          const pose = poses.get(av)!;
          pose.groundT = 1;
          animate(av, lineup, false, dt);
          pose.phase = i / 8;
        }),
      { phase: 'update', order: 42 },
    );
  }
}
