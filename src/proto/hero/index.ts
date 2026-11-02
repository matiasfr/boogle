// Prototype: play as the jointed hero (?proto=hero; the character from assets/src/hero-rig.py, src/player/hero.ts).
// Every avatar, yours and everyone else's in the tab, is dressed as the hero in its player's colour, inside the
// avatar's `inner` group, so the squash spring and the flops of src/features/feel.ts still move it. On top, code poses
// the rig each frame from motion alone (position, facing, speed, airborne), so remote players get it with no new
// presence. The movement pass follows docs/research/third-person-platformer-movement.md, recs 1, 2, 3, 5 and 7; each
// part has a switch to compare it against the first pass (=old):
//   &lean=bone|old      lean from the body bone (speed lean, a sprung kick on starts and brakes, a bank into turns)
//                       instead of tipping the whole figure (rec 1)
//   &stride=alex|old    a stride that grows with speed, feet planted on the ground through each stance, and the bob,
//                       squash and roll locked to the footfalls (recs 2 and 3)
//   &airpose=on|old     takeoff, apex, fall and land poses from vertical speed (rec 7)
//   &skid=on|old        a skid pose when you reverse at speed (rec 5)
// ?air=35 (any page, src/physics/physics.ts) tries more air control (rec 6). &hero=, &eyes=, &shade= pick the look.
// The gut question: does running and jumping as this character feel good enough to keep it?
// Serves DESIGN.md 1 (moving around is a toy) and 10 (slapstick over precision). Sync kind: Local (render only).
import * as THREE from 'three/webgpu';
import { COLORS, PLAYER_R } from '../../constants.ts';
import { clamp } from '../../math.ts';
import { springStep, stiffnessOf, dampingOf, type Spring } from '../../render/motion.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { setAvatarSkin, type Avatar } from '../../player/avatars.ts';
import { precompile } from '../../render/precompile.ts';
import type { Hero, BoneName } from '../../player/hero.ts';

const q = new URLSearchParams(location.search);
const NEW = { lean: q.get('lean') !== 'old', stride: q.get('stride') !== 'old', air: q.get('airpose') !== 'old' };
const SKID_ON = q.get('skid') !== 'old';

const LEG = 0.36; // m, hip to sole (hero-rig.py: thigh joint 0.36 m up with the default proportions)
const LEAN = {
  perSpeed: 0.6, // degrees forward per m/s
  maxSpeed: 6, // degrees
  kickStart: 8, // degrees forward for a full-strength start (25 m/s² or more)
  kickBrake: 12, // degrees back for a full-strength brake
  accelCap: 25, // m/s²
  hz: 3,
  zeta: 0.45,
  bank: 0.4, // × atan(lateral accel / 18), in radians
  maxBank: 10, // degrees
};
const STRIDE = {
  k: 0.566, // m per cycle × v^0.6 (Alexander's dynamic similarity with a 0.36 m hip)
  lift: [0.1, 0.14], // m the swinging foot rises at walk and at sprint
  bob: [0.04, 0.07], // m the body rises between footfalls at walk and at sprint
  squash: 0.05, // at each footfall (and stretch 0.03 between)
  roll: [4, 6], // degrees towards the planted foot
};
const OLD = { stride: 2.0, thigh: 40, knee: 55 }; // the first pass, for &stride=old
const ARM = { swing: 45, elbow: 35, fwd: 25, back: 40, pump: 45 }; // degrees (swing and elbow: &stride=old)
const SKID = { angle: 100, speed: 4, release: 60, stop: 2 }; // degrees, m/s
const BLINK = { every: [2.5, 5.5], ms: 110 };
const D = Math.PI / 180;

type Pose = {
  hero: Hero;
  phase: number; // 0..1 through a stride cycle (left foot down at 0, right at 0.5)
  x: Record<string, number>;
  z: Record<string, number>;
  blink: number;
  last: THREE.Vector3 | null;
  vel: THREE.Vector3; // smoothed world velocity
  acc: THREE.Vector3; // smoothed world acceleration
  kick: Spring;
  wasAir: boolean;
  landT: number; // s since landing
  skid: boolean;
};
const poses = new WeakMap<Avatar, Pose>();
const tmp = new THREE.Vector3();

// The stance part of the cycle shrinks as the hero speeds up: a walk keeps a foot down longer.
const dutyOf = (v: number) =>
  v < 1.5 ? 0.5 : v < 5.6 ? 0.5 - ((v - 1.5) / 4.1) * 0.15 : Math.max(0.25, 0.35 - ((v - 5.6) / 3.9) * 0.1);

/**
 * One leg's angles (degrees) at cycle phase u (0..1, the foot lands at 0): during stance the foot stays where it landed
 * while the hip passes over it, so the thigh angle comes from where the foot is (asin(dx / LEG)); during swing it
 * travels forward on a lifted arc. Returns thigh, knee (negative folds back) and how high the hip should sit.
 */
function leg(u: number, stride: number, duty: number, lift: number) {
  const reach = (duty * stride) / 2; // the foot lands this far ahead of the hip and leaves this far behind
  let dx: number, h: number;
  if (u < duty) {
    dx = reach - (u / duty) * 2 * reach;
    h = 0;
  } else {
    const s = (u - duty) / (1 - duty); // 0..1 through the swing
    const e = s * s * (3 - 2 * s);
    dx = -reach + e * 2 * reach;
    h = lift * Math.sin(Math.PI * s);
  }
  const thigh = Math.asin(clamp(dx / LEG, -0.95, 0.95)) / D;
  const knee = -Math.acos(clamp(1 - h / 0.3, -1, 1)) / D; // shin and foot (~0.3 m) fold back to lift the sole
  return { thigh, knee, stance: u < duty };
}

function animate(a: Avatar, speed: number, airborne: boolean, dt: number) {
  const p = poses.get(a);
  if (!p || dt <= 0) return;
  const inner = a.userData.inner;

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
  const v = speed;
  const vy = p.vel.y;
  const yaw = a.rotation.y;
  const fx = -Math.sin(yaw),
    fz = -Math.cos(yaw); // facing
  const aF = p.acc.x * fx + p.acc.z * fz, // acceleration along facing, and towards the figure's left (+x local)
    aL = p.acc.x * -fz + p.acc.z * fx;

  // Landing and skidding states.
  if (p.wasAir && !airborne) p.landT = 0;
  p.wasAir = airborne;
  p.landT += dt;
  const along = v > 0.1 ? (p.vel.x * fx + p.vel.z * fz) / Math.max(1e-3, Math.hypot(p.vel.x, p.vel.z)) : 1;
  const off = Math.acos(clamp(along, -1, 1)) / D; // degrees between facing and travel
  if (a === me.avatar && me.skid)
    p.skid = SKID_ON; // ?ctl=odyssey: you face your run while you skid, so ask it
  else if (!SKID_ON || airborne) p.skid = false;
  else if (!p.skid && off > SKID.angle && v > SKID.speed) p.skid = true;
  else if (p.skid && (v < SKID.stop || off < SKID.release)) p.skid = false;

  // Targets, in degrees per bone: x swings a hanging limb forward (and tips the body back), z swings it out to its own
  // side (the sign per side is applied below).
  const x: Partial<Record<BoneName, number>> = {};
  const z: Partial<Record<BoneName, number>> = {};
  let ease = 0.06; // s
  const m = clamp(v / 6, 0, 1.3);

  if (airborne && NEW.air) {
    ease = 0.03; // the first frame is already the pose: no wind-up before the jump
    if (vy > 3)
      Object.assign(x, { arm_l: -10, arm_r: -10, thigh_l: -10, thigh_r: -18, shin_l: -20, shin_r: -30, body: -3 });
    else if (vy > -1.6)
      Object.assign(x, { thigh_l: 55, thigh_r: 40, shin_l: -60, shin_r: -60, forearm_l: 20, forearm_r: 20 });
    else Object.assign(x, { thigh_l: 12, thigh_r: -4, shin_l: -8, shin_r: -14, foot_l: 10, foot_r: 10, body: -5 });
    const flutter = vy < -3 ? 8 * Math.sin(performance.now() * 0.001 * 2 * Math.PI * 2.5) : 0;
    Object.assign(z, { arm_l: vy > 3 ? 30 : 70 + flutter, arm_r: vy > 3 ? 30 : 70 - flutter });
  } else if (airborne) {
    Object.assign(x, { arm_l: -10, arm_r: -10, forearm_l: 15, forearm_r: 15, thigh_l: 35, shin_l: -60, thigh_r: -8 });
    Object.assign(x, { shin_r: -20, foot_l: 20, body: -4 });
    Object.assign(z, { arm_l: 70, arm_r: 70 });
  } else if (p.skid) {
    ease = 0.05;
    Object.assign(x, {
      body: 15,
      thigh_l: 35,
      shin_l: -10,
      foot_l: -25,
      thigh_r: -20,
      shin_r: -30,
      arm_l: 50,
      arm_r: 50,
    });
    Object.assign(z, { arm_l: 50, arm_r: 50 });
  } else if (NEW.stride) {
    // A stride that grows with speed, feet pinned through stance, arms counter-swinging.
    const stride = Math.max(0.3, STRIDE.k * Math.pow(Math.max(v, 0.2), 0.6));
    p.phase = (p.phase + (v * dt) / stride) % 1;
    const duty = dutyOf(v),
      t = clamp((v - 5.6) / 3.9, 0, 1),
      walking = clamp(v / 1.5, 0, 1);
    const lift = (STRIDE.lift[0] + (STRIDE.lift[1] - STRIDE.lift[0]) * t) * walking;
    const L = leg(p.phase, stride, duty, lift),
      R = leg((p.phase + 0.5) % 1, stride, duty, lift);
    const k = walking; // at rest the legs settle straight
    Object.assign(x, { thigh_l: L.thigh * k, shin_l: L.knee * k, thigh_r: R.thigh * k, shin_r: R.knee * k });
    x.foot_l = -(x.thigh_l! + x.shin_l!) * 0.8; // soles stay near level
    x.foot_r = -(x.thigh_r! + x.shin_r!) * 0.8;
    const s = Math.sin(2 * Math.PI * p.phase);
    // Arm pumps: the upper arm swings back further than forward, and the elbow bends more as the arm comes forward, so
    // the mitt rises in front of the chest instead of reaching out straight.
    for (const [arm, fore, dir] of [
      ['arm_l', 'forearm_l', -1],
      ['arm_r', 'forearm_r', 1],
    ] as const) {
      const fwd = dir * s; // -1 back .. 1 forward
      x[arm] = m * (fwd > 0 ? ARM.fwd : ARM.back) * fwd;
      x[fore] = 15 + m * (ARM.elbow + ARM.pump * Math.max(0, fwd));
    }
    Object.assign(z, { arm_l: 6 + 10 * m, arm_r: 6 + 10 * m });
    // Bob, squash and roll locked to the footfalls: lowest and squashed as a foot lands, up and stretched between.
    const c = (1 + Math.cos(4 * Math.PI * p.phase)) / 2; // 1 at each footfall
    const bob = (STRIDE.bob[0] + (STRIDE.bob[1] - STRIDE.bob[0]) * t) * walking;
    inner.position.y = bob * (1 - c);
    const sy = 1 - STRIDE.squash * c * walking + 0.03 * (1 - c) * walking;
    inner.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    z.body = -(STRIDE.roll[0] + (STRIDE.roll[1] - STRIDE.roll[0]) * t) * walking * s;
    if (v < 0.3) {
      const sway = Math.sin(performance.now() / 900);
      x.arm_l = 3 * sway;
      x.arm_r = -3 * sway;
      z.body = 2 * sway;
    }
  } else {
    // The first pass (&stride=old).
    p.phase = (p.phase + (v * dt) / OLD.stride) % 1;
    const s = Math.sin(2 * Math.PI * p.phase),
      c = Math.cos(2 * Math.PI * p.phase);
    const idle = 1 - Math.min(1, m * 3);
    const sway = Math.sin(performance.now() / 900) * idle;
    Object.assign(x, {
      thigh_l: OLD.thigh * m * s,
      thigh_r: -OLD.thigh * m * s,
      shin_l: -OLD.knee * m * Math.max(0, c),
      shin_r: -OLD.knee * m * Math.max(0, -c),
      arm_l: -ARM.swing * m * s + 3 * sway,
      arm_r: ARM.swing * m * s - 3 * sway,
      forearm_l: 15 + ARM.elbow * m,
      forearm_r: 15 + ARM.elbow * m,
    });
    x.foot_l = -0.6 * (x.thigh_l! + x.shin_l!);
    x.foot_r = -0.6 * (x.thigh_r! + x.shin_r!);
    Object.assign(z, { arm_l: 6 + 10 * m, arm_r: 6 + 10 * m, body: 4 * m * s + 2 * sway });
  }

  // A short landing pose (knees bent, arms down), left the moment the hero moves off.
  if (NEW.air && !airborne && p.landT < 0.12 && v < 2) {
    Object.assign(x, {
      thigh_l: 30,
      thigh_r: 30,
      shin_l: -45,
      shin_r: -45,
      foot_l: 15,
      foot_r: 15,
      arm_l: 0,
      arm_r: 0,
    });
    ease = 0.03;
  }

  // Lean from the body bone (the feet stay put) and a bank into turns from the soles (rec 1).
  if (NEW.lean) {
    a.userData.leanScale = 0;
    inner.rotation.x = 0;
    const f = clamp(aF, -LEAN.accelCap, LEAN.accelCap) / LEAN.accelCap;
    springStep(
      p.kick,
      (f > 0 ? LEAN.kickStart : LEAN.kickBrake) * f,
      stiffnessOf(LEAN.hz),
      dampingOf(LEAN.hz, LEAN.zeta),
      dt,
    );
    const lean = airborne ? 0 : Math.min(LEAN.maxSpeed, LEAN.perSpeed * v) + p.kick.x;
    x.body = (x.body ?? 0) - lean; // negative x tips the body forward
    const bank = airborne ? 0 : clamp((LEAN.bank * Math.atan(aL / 18)) / D, -LEAN.maxBank, LEAN.maxBank);
    z.root = -bank;
  } else a.userData.leanScale = 1;

  const k = 1 - Math.exp(-dt / ease);
  for (const [name, bone] of Object.entries(p.hero.bones) as [BoneName, THREE.Object3D][]) {
    const out = name.endsWith('_r') ? -1 : 1;
    p.x[name] = (p.x[name] ?? 0) + ((x[name] ?? 0) - (p.x[name] ?? 0)) * k;
    p.z[name] = (p.z[name] ?? 0) + ((z[name] ?? 0) * (name.startsWith('arm') ? out : 1) - (p.z[name] ?? 0)) * k;
    bone.rotation.set(p.x[name] * D, 0, p.z[name] * D);
  }

  // Blink: the eyes vanish for a moment, leaving the smooth face, which reads as closed.
  p.blink -= dt * 1000;
  const shut = p.blink < 0;
  for (const e of p.hero.eyeParts) e.visible = !shut;
  if (p.blink < -BLINK.ms) p.blink = (BLINK.every[0] + Math.random() * (BLINK.every[1] - BLINK.every[0])) * 1000;
}

async function start() {
  const { loadHeroKit } = await import('../../player/hero.ts');
  const kit = await loadHeroKit();
  await precompile(kit.make(COLORS[0]).holder); // shaders compile now, not when the first player appears
  const dress = (a: Avatar, colorIdx: number) => {
    if (poses.has(a)) return;
    const hero = kit.make(COLORS[colorIdx]);
    for (const child of a.userData.inner.children) child.visible = false; // the capsule and its eyes
    hero.holder.position.y = -PLAYER_R; // the avatar's origin is the centre of its foot sphere
    a.userData.inner.add(hero.holder);
    // Colour changes (a remote's presence, the rename card) set the avatar's material: make that the hero's body.
    a.userData.mat = hero.mat as unknown as THREE.MeshStandardMaterial;
    poses.set(a, {
      hero,
      phase: 0,
      x: {},
      z: {},
      blink: 1500 + Math.random() * 3000,
      last: null,
      vel: new THREE.Vector3(),
      acc: new THREE.Vector3(),
      kick: { x: 0, v: 0 },
      wasAir: false,
      landT: 1,
      skid: false,
    });
  };
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);

  // &lineup=<m/s>: eight heroes beside spawn, each held at one eighth of the way through the stride cycle at that speed,
  // for a still that shows the whole cycle (a motion sheet's frame rate aliases a 3-4 Hz cycle). Debug only.
  const lineup = Number(q.get('lineup'));
  if (lineup > 0) {
    const { scene } = await import('../../render/scene.ts');
    const { groundHeight } = await import('../../adapters/terrain.ts');
    const { SPAWN } = await import('../../constants.ts');
    const row: Avatar[] = [];
    for (let i = 0; i < 8; i++) {
      const a = new THREE.Group() as unknown as Avatar;
      const inner = new THREE.Group();
      a.add(inner);
      a.userData = { inner, mat: null as never, phase: 0, colorIdx: i % COLORS.length };
      dress(a, i % COLORS.length);
      const x = SPAWN.x - 5.25 + i * 1.5,
        z = SPAWN.z + 5;
      a.position.set(x, groundHeight(x, z) + PLAYER_R, z);
      a.rotation.y = -Math.PI / 2; // facing +x, seen side-on from the south
      scene.add(a);
      row.push(a);
    }
    const { onFrame } = await import('../../loop.ts');
    onFrame(
      ({ dt }) =>
        row.forEach((a, i) => {
          const p = poses.get(a)!;
          animate(a, lineup, false, dt);
          p.phase = i / 8;
        }),
      { phase: 'update', order: 42 },
    );
  }
}

void start(); // gated by src/features/proto-hero.ts
