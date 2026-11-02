// The platformer hero (assets/src/hero2-rig.py), the default body of ?proto=hero: long legs with knees, a separate head,
// the proportions of Ratchet or a Bricktron as our own character. Its run is pose-to-pose: hand-keyed tables of leg
// angles over the stride cycle (contact, down, passing, push-off, the way a run is animated by hand), played by distance
// so the stride matches the ground. Code adds the lean, hip twist, bob, arm pumps and a head that stays level.
// Everything comes from motion alone (speed, airborne, position, facing), so remote players get it with no new presence.
// &lineup=<m/s> holds eight heroes through one stride cycle, to judge the cycle from a still (debug).
import * as THREE from 'three/webgpu';
import { COLORS, PLAYER_R, SPAWN } from '../../constants.ts';
import { clamp } from '../../math.ts';
import { springStep, stiffnessOf, dampingOf, type Spring } from '../../render/motion.ts';
import { precompile } from '../../render/precompile.ts';
import { loadAsset } from '../../render/assets.ts';
import { scene } from '../../render/scene.ts';
import { onFrame } from '../../loop.ts';
import { groundHeight } from '../../island/terrain.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { setAvatarSkin, type Avatar } from '../../player/avatars.ts';
import { shadeOnce } from '../../player/hero.ts';
import url from '../../../assets/built/hero2-rig.glb?url';

type Key = [u: number, thigh: number, knee: number, sole: number]; // sole: the foot's angle to the ground (+ toes up)
const RUN_KEYS: Key[] = [
  [0, 35, -10, 15], // contact: the leg reaches forward, heel first
  [0.1, 18, -35, 0], // down: the knee takes the weight
  [0.25, -2, -12, 0], // passing: the leg straightens under the body
  [0.38, -32, -6, -35], // push-off: up on the toes, the hips at their highest
  [0.5, -38, -35, -50], // the other foot lands; this one trails
  [0.62, -18, -85, -35], // the heel folds up
  [0.75, 18, -105, -20], // passing, folded tight
  [0.88, 52, -70, 0], // the knee drives forward and up
];
const WALK_KEYS: Key[] = [
  [0, 24, -4, 18],
  [0.12, 14, -12, 0],
  [0.3, -6, -6, 0],
  [0.5, -24, -8, -18],
  [0.62, -14, -40, -30],
  [0.78, 14, -50, -10],
  [0.92, 28, -18, 8],
];
const BOB_KEYS = [
  [0, -0.02],
  [0.2, -0.06],
  [0.5, 0],
  [0.76, 0.06],
  [1, -0.02],
]; // m, over one step: lowest just after a foot lands, highest in the push-off
const TUNE = {
  stride: 0.74, // m per cycle × v^0.6 (Alexander, with a 0.68 m hip and this game's gravity): 2.1 m at 5.6 m/s
  sprint: 7.5, // m/s where the legs start reaching further
  lean: { perSpeed: 0.55, max: 5 }, // degrees of body lean
  kick: { start: 8, brake: 12, cap: 25, hz: 3, zeta: 0.45 }, // degrees; m/s²
  bank: { k: 0.4, max: 10 }, // × atan(lateral accel / 18); degrees
  twist: { hips: 8, chest: 10 }, // degrees
  headLevel: 0.7, // of the body's lean and roll the head takes back, so the face stays up
};
const SKID = { angle: 100, speed: 4, release: 60, stop: 2 }; // degrees, m/s
const BLINK = { every: [2.5, 5.5], ms: 110 };
const D = Math.PI / 180;
const BONES = [
  'root',
  'hips',
  'body',
  'head',
  ...['arm', 'forearm', 'hand', 'thigh', 'shin', 'foot'].flatMap((b) => [b + '_l', b + '_r']),
];

function sampleKeys(keys: Key[], u: number): [number, number, number] {
  let i = keys.length - 1;
  while (i > 0 && keys[i][0] > u) i--;
  const a = keys[i],
    b = keys[(i + 1) % keys.length];
  const span = (b[0] <= a[0] ? b[0] + 1 : b[0]) - a[0];
  const t = (u - a[0]) / span,
    e = t * t * (3 - 2 * t);
  return [a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e, a[3] + (b[3] - a[3]) * e];
}
function sampleBob(u: number) {
  let i = 0;
  while (i < BOB_KEYS.length - 2 && BOB_KEYS[i + 1][0] <= u) i++;
  const [ta, va] = BOB_KEYS[i],
    [tb, vb] = BOB_KEYS[i + 1];
  const t = (u - ta) / (tb - ta);
  return va + (vb - va) * t * t * (3 - 2 * t);
}

type Pose = {
  bones: Record<string, THREE.Object3D>;
  eyes: THREE.Object3D[];
  phase: number; // 0..1 through a stride cycle
  x: Record<string, number>;
  y: Record<string, number>;
  z: Record<string, number>;
  blink: number;
  last: THREE.Vector3 | null;
  vel: THREE.Vector3;
  acc: THREE.Vector3;
  kick: Spring;
  wasAir: boolean;
  landT: number;
  skid: boolean;
};
const poses = new WeakMap<Avatar, Pose>();
const tmp = new THREE.Vector3();

function animate(a: Avatar, speed: number, airborne: boolean, dt: number) {
  const p = poses.get(a);
  if (!p || dt <= 0) return;
  const inner = a.userData.inner;
  inner.position.y = 0;
  inner.rotation.x = 0;
  inner.scale.set(1, 1, 1);

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
  const fx = -Math.sin(a.rotation.y),
    fz = -Math.cos(a.rotation.y);
  const aF = p.acc.x * fx + p.acc.z * fz,
    aL = p.acc.x * -fz + p.acc.z * fx;
  if (p.wasAir && !airborne) p.landT = 0;
  p.wasAir = airborne;
  p.landT += dt;
  const along = v > 0.1 ? (p.vel.x * fx + p.vel.z * fz) / Math.max(1e-3, Math.hypot(p.vel.x, p.vel.z)) : 1;
  const off = Math.acos(clamp(along, -1, 1)) / D;
  if (a === me.avatar && me.skid)
    p.skid = true; // ?ctl=odyssey: you face your run while you skid, so ask it
  else if (airborne) p.skid = false;
  else if (!p.skid && off > SKID.angle && v > SKID.speed) p.skid = true;
  else if (p.skid && (v < SKID.stop || off < SKID.release)) p.skid = false;

  // Targets in degrees per bone: x swings a hanging limb forward (and tips the body back), z swings an arm out to its
  // side, y twists.
  const x: Record<string, number> = {},
    y: Record<string, number> = {},
    z: Record<string, number> = {};
  let ease = 0.04;
  const leg = (side: 'l' | 'r', thigh: number, knee: number, sole: number) => {
    x['thigh_' + side] = thigh;
    x['shin_' + side] = knee;
    x['foot_' + side] = sole - thigh - knee;
  };
  if (airborne) {
    ease = 0.05;
    if (vy > 2.5) {
      // Rising: one knee driven up, the other leg trailing, one mitt punching up.
      leg('l', 75, -95, 10);
      leg('r', -22, -30, -40);
      Object.assign(x, { arm_r: 20, forearm_r: 30, arm_l: -25, forearm_l: 50, body: -4 });
      Object.assign(z, { arm_r: 120, arm_l: 25 });
    } else if (vy > -2.5) {
      // The top: both knees tucked, arms out.
      leg('l', 60, -90, 0);
      leg('r', 35, -70, -10);
      Object.assign(x, { forearm_l: 25, forearm_r: 25 });
      Object.assign(z, { arm_l: 75, arm_r: 75 });
    } else {
      // Falling: legs reaching down for the ground, arms up and flared.
      const flutter = 7 * Math.sin(performance.now() * 0.016);
      leg('l', 18, -22, 10);
      leg('r', -6, -30, 0);
      Object.assign(x, { forearm_l: 15, forearm_r: 15, body: -3 });
      Object.assign(z, { arm_l: 115 + flutter, arm_r: 115 - flutter });
    }
  } else if (p.skid) {
    leg('l', 45, -15, 20);
    leg('r', -5, -70, 0);
    Object.assign(x, { body: 16, arm_l: 55, arm_r: 45, forearm_l: 20, forearm_r: 20 });
    Object.assign(z, { arm_l: 45, arm_r: 45 });
    inner.position.y = -0.1;
  } else {
    const stride = Math.max(0.5, TUNE.stride * Math.pow(Math.max(v, 0.3), 0.6));
    p.phase = (p.phase + (v * dt) / stride) % 1;
    const run = clamp((v - 2) / 2.5, 0, 1),
      moving = clamp(v / 0.8, 0, 1),
      reach = 1 + 0.15 * clamp((v - TUNE.sprint) / 3, 0, 1);
    for (const [side, u] of [
      ['l', p.phase],
      ['r', (p.phase + 0.5) % 1],
    ] as const) {
      const w = sampleKeys(WALK_KEYS, u),
        r = sampleKeys(RUN_KEYS, u);
      leg(
        side,
        (w[0] + (r[0] * reach - w[0]) * run) * moving,
        (w[1] + (r[1] - w[1]) * run) * moving,
        (w[2] + (r[2] - w[2]) * run) * moving,
      );
    }
    // Arms pump against the legs: further back than forward, the elbow closing as the arm comes forward.
    const s = Math.sin(2 * Math.PI * p.phase);
    const m = run * 0.75 + 0.25 * moving;
    for (const [arm, fore, dir] of [
      ['arm_l', 'forearm_l', -1],
      ['arm_r', 'forearm_r', 1],
    ] as const) {
      const fwd = dir * s;
      x[arm] = m * (fwd > 0 ? 30 : 48) * fwd;
      x[fore] = 15 + m * (50 + 45 * Math.max(0, fwd));
    }
    Object.assign(z, { arm_l: 5 + 8 * m, arm_r: 5 + 8 * m });
    // The hips twist with the forward leg, the chest against them; the bob comes twice a cycle.
    y.hips = TUNE.twist.hips * m * s;
    y.body = -(TUNE.twist.hips + TUNE.twist.chest) * m * s;
    z.body = -3 * m * s;
    inner.position.y = sampleBob((p.phase * 2) % 1) * (0.35 + 0.65 * run) * moving;
    if (v < 0.3) {
      const sway = Math.sin(performance.now() / 900);
      z.body = 1.5 * sway;
      x.arm_l = 3 * sway;
      x.arm_r = -3 * sway;
      x.forearm_l = x.forearm_r = 12;
      z.arm_l = z.arm_r = 6;
    }
  }
  // Landing: the knees give for a moment, gone as soon as you move off.
  if (!airborne && p.landT < 0.14 && v < 2.5) {
    leg('l', 40, -65, 0);
    leg('r', 40, -65, 0);
    inner.position.y = -0.16 * (1 - p.landT / 0.14);
    ease = 0.03;
  }
  // Lean from the body, a sprung kick on starts and brakes, a bank into turns from the soles; the head stays level.
  const K = TUNE.kick;
  const f = clamp(aF, -K.cap, K.cap) / K.cap;
  springStep(p.kick, (f > 0 ? K.start : K.brake) * f, stiffnessOf(K.hz), dampingOf(K.hz, K.zeta), dt);
  if (!airborne) {
    const lean = Math.min(TUNE.lean.max, TUNE.lean.perSpeed * v) + p.kick.x;
    x.body = (x.body ?? 0) - lean;
    z.root = -clamp((TUNE.bank.k * Math.atan(aL / 18)) / D, -TUNE.bank.max, TUNE.bank.max);
  }
  x.head = -(x.body ?? 0) * TUNE.headLevel;
  z.head = -(z.body ?? 0) * TUNE.headLevel;
  y.head = -(y.body ?? 0) * 0.5 - (y.hips ?? 0) * 0.5;

  const k = 1 - Math.exp(-dt / ease);
  for (const name of BONES) {
    const out = name.startsWith('arm') && name.endsWith('_r') ? -1 : 1;
    p.x[name] = (p.x[name] ?? 0) + ((x[name] ?? 0) - (p.x[name] ?? 0)) * k;
    p.y[name] = (p.y[name] ?? 0) + ((y[name] ?? 0) - (p.y[name] ?? 0)) * k;
    p.z[name] = (p.z[name] ?? 0) + ((z[name] ?? 0) * out - (p.z[name] ?? 0)) * k;
    p.bones[name].rotation.set(p.x[name] * D, p.y[name] * D, p.z[name] * D);
  }
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
  await precompile(kit.instance('hero'));
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);

  const lineup = Number(new URLSearchParams(location.search).get('lineup'));
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
          animate(av, lineup, false, dt);
          poses.get(av)!.phase = i / 8;
        }),
      { phase: 'update', order: 42 },
    );
  }
}
