// The little guys of ?proto=place (owner: "little guys running around, kind of like the Boogler, but maybe a cuter version
// since the Boogler is the mayor"), so the world stops feeling dead. Round and stubby, in a few colours, the proportions of
// Castle Story's Bricktrons as our own character; four instanced meshes and a small state machine each. They work at the
// camp, the stations and the town: carrying logs, hammering at scaffolds, riding the train and the machine, waving and
// following you for a moment, and cheering at milestones. They're life, not labour: nothing they do moves the run on, and
// the village's number is how many you can see, up to a cap an iPad is happy with. No colliders; they walk round buildings
// (`feet`, ./sites.ts). The hop of the last round's villagers is their cheer. Local.
import * as THREE from 'three/webgpu';
import { mulberry32 } from '../../sim/rng.ts';
import { emit } from '../../render/particles.ts';
import { scene, camera } from '../../render/scene.ts';
import { getAudio } from '../../render/audio.ts';
import { me } from '../../player/player.ts';
import { flat } from '../flat.ts';
import { babble, CHATTER } from './chatter.ts';
import { H } from './land.ts';
import { merged } from './gifts.ts';
import { TOWN, toWorld, FORGE } from './layout.ts';
import { feet, outOf, underway, type Site } from './sites.ts';

// ---------------------------------------------------------------- the meshes
const VILLAGE_MAX = 28, // the most of the village's people you'll see at once
  CAMP = 3,
  STATION = 2,
  RIDERS = 2;
const COUNT = VILLAGE_MAX + CAMP * 2 + STATION + RIDERS * 2;
const SKIN = '#f4cfa4',
  EYE = '#1d1a20';
// Facing +z, standing on y = 0, about 0.95 m tall. Two thirds of it head and hat.
const headGeo = merged([
  ['s', 0, 0.68, 0, 0.27, 0.25, 0.26, SKIN],
  ['s', -0.1, 0.7, 0.235, 0.038, 0.05, 0.02, EYE],
  ['s', 0.1, 0.7, 0.235, 0.038, 0.05, 0.02, EYE],
  ['s', -0.17, 0.63, 0.2, 0.04, 0.025, 0.02, '#f0a58a'],
  ['s', 0.17, 0.63, 0.2, 0.04, 0.025, 0.02, '#f0a58a'],
]);
const coatGeo = merged([
  ['s', 0, 0.3, 0, 0.23, 0.26, 0.2, '#ffffff'],
  ['s', 0, 0.81, -0.01, 0.285, 0.18, 0.275, '#ffffff'],
  ['c', 0, 0.8, 0.015, 0.292, 0.05, 0.282, '#d8d8d8'],
]);
const skinMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75 });
const coatMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8 });
const heads = new THREE.InstancedMesh(headGeo, skinMat, COUNT);
const coats = new THREE.InstancedMesh(coatGeo, coatMat, COUNT);
const limbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), flat('#ffffff', 0.8), COUNT * 4);
const held = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), flat('#ffffff', 0.8), COUNT * 2);
for (const m of [heads, coats, limbs, held]) {
  m.frustumCulled = false;
  scene.add(m);
}
coats.castShadow = true; // the hat and the coat are the shadow's outline: the head inside it adds nothing but triangles
const COLORS = ['#e4574a', '#3f8ee0', '#f0c030', '#42b887', '#ef8a3a', '#a569e0'].map((c) => new THREE.Color(c));
const HAND = new THREE.Color(SKIN),
  BOOT = new THREE.Color('#4a3424'),
  LOG = new THREE.Color('#8a5a32'),
  HANDLE = new THREE.Color('#a9794c'),
  IRON = new THREE.Color('#5d6068');

// ---------------------------------------------------------------- what each one is doing
type Job = 'stroll' | 'scaffold' | 'hauler' | 'platform' | 'camp' | 'station' | 'rider';
type Mood = 'idle' | 'walk' | 'run' | 'hammer' | 'carry' | 'wave' | 'cheer' | 'sit' | 'ride' | 'chat';
type Guy = {
  k: number;
  job: Job;
  mood: Mood;
  on: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  t: number; // phase of whatever it's doing
  wait: number;
  tx: number;
  tz: number;
  hasTarget: boolean;
  fy: number | null; // stands at this height, not on the ground (a scaffold, a platform)
  cheer: number;
  gather: boolean;
  follow: number;
  cooldown: number;
  home: { x: number; z: number };
  a: { x: number; z: number };
  b: { x: number; z: number };
  loaded: boolean;
  camp: number;
  site: Site | null;
  seat: number;
  side: number;
  far: number;
  px: number; // where it stood last frame: the stride follows how fast it really goes
  pz: number;
  chat: 0 | 1 | 2; // in an exchange: 1 saying something, 2 listening
};
const rng = mulberry32(2211);
const X = toWorld;
const guys: Guy[] = [];
function make(job: Job, x: number, z: number, extra?: Partial<Guy>): Guy {
  const g: Guy = {
    k: guys.length,
    job,
    mood: 'idle',
    on: true,
    x,
    y: H(x, z),
    z,
    yaw: rng() * 6.28,
    t: rng() * 6,
    wait: rng() * 3,
    tx: x,
    tz: z,
    hasTarget: false,
    fy: null,
    cheer: 0,
    gather: false,
    follow: 0,
    cooldown: rng() * 10,
    home: { x, z },
    a: { x, z },
    b: { x, z },
    loaded: false,
    camp: -1,
    site: null,
    seat: 0,
    side: rng() < 0.5 ? 1 : -1,
    far: 0,
    px: x,
    pz: z,
    chat: 0,
    ...extra,
  };
  guys.push(g);
  coats.setColorAt(g.k, COLORS[g.k % COLORS.length]!);
  return g;
}
// Doors: the cottages'.
const DOORS = TOWN.start.map((p) => {
  const yaw = p.yaw ?? 0,
    d = (p.d ?? 4) / 2 + 1.2;
  return { x: X(p.x) + Math.sin(yaw) * d, z: p.z + Math.cos(yaw) * d };
});
const door = (k: number) => DOORS[k % DOORS.length]!;
const WANDER = [
  [-104, 16],
  [-103, 2],
  [-92, 17],
  [-115, 4],
  [-117, 22],
  [-101, -18],
  [-112, -15],
  [-90, -13],
  [-78, -14],
  [-74, -4],
  [-97, 28],
  [-116, 34],
  [-80, 18],
  [-90, 44],
].map(([x, z]) => ({ x: X(x!), z: z! }));
const FORGE_X = X(FORGE.x),
  FORGE_Z = FORGE.z;
const FORGE_Y = H(FORGE_X, FORGE_Z);

// The village: two up on the forge's scaffold from the start, hammering where you can see them; two haulers; two on the
// platform; everybody else strolling.
for (let k = 0; k < VILLAGE_MAX; k++) {
  const d = door(k);
  const job: Job = k < 2 ? 'scaffold' : k < 4 ? 'hauler' : k < 6 ? 'platform' : 'stroll';
  const g = make(job, d.x + rng() * 1.6 - 0.8, d.z + rng() * 1.6 - 0.8, { on: false });
  if (job === 'scaffold') {
    g.x = FORGE_X + (k === 0 ? -2.6 : 2.2);
    g.z = FORGE_Z + (FORGE.d + 1.4) / 2;
    g.fy = FORGE_Y + 1.98;
    g.yaw = Math.PI;
  } else if (job === 'hauler') {
    g.a = { x: X(-77), z: -13 };
    g.b = { x: X(-81), z: -9 };
    g.x = g.a.x + k;
    g.z = g.a.z;
  }
}
const campGuys: Guy[] = [];
TOWN.camps.forEach((c, n) => {
  const near = c.asleep[0]!;
  for (let k = 0; k < CAMP; k++) {
    const g = make('camp', X(near.x + 3 + k * 2.2), near.z + 4 + (k % 2) * 1.6, { camp: n });
    g.a = { x: g.x, z: g.z };
    g.b = { x: X(near.x + 11 + k), z: near.z + 9 - k * 2 };
    campGuys.push(g);
  }
});
const stationGuys = Array.from({ length: STATION }, (_, k) => make('station', X(-6 + k), -142, { seat: k }));
const riders = Array.from({ length: RIDERS * 2 }, (_, k) =>
  make('rider', 0, 0, { on: false, seat: k % RIDERS, camp: k < RIDERS ? 0 : 1 }),
);

// ---------------------------------------------------------------- what they can see of the world (set by ./index.ts)
export type FolkEnv = {
  /** The next station's feet, where its helpers stand; null when nothing's waiting. */
  station: () => { x: number; y: number; z: number } | null;
  machineBusy: () => boolean;
  machine: () => { mesh: THREE.Object3D; top: number };
  trainCar: (line: number) => { mesh: THREE.Object3D; top: number } | null;
  /** The platform and where people gather when a line opens. */
  gather: { x: number; z: number; ux: number; uz: number; lx: number; lz: number; len: number };
  platform: { x: number; y: number; z: number; ux: number; uz: number };
  forgeLit: () => boolean;
  /** Something's on that nobody should talk over (a crate opening, a moment). */
  hush: () => boolean;
};
let env: FolkEnv | null = null;
export const setFolkEnv = (e: FolkEnv) => void (env = e);

// ---------------------------------------------------------------- moving
const SPEED = { walk: 1.7, run: 4.6 };
// The walk. Tune these by eye at about 10 m.
const WALK = { bob: 0.11, squash: 0.05, rock: 0.17, lean: 0.07, stride: 0.2, lift: 0.13, stepsPerMetre: 4.4 };
function steer(g: Guy, dt: number, speed: number) {
  const dx = g.tx - g.x,
    dz = g.tz - g.z,
    d = Math.hypot(dx, dz);
  if (d < 0.25) return true;
  const ux = dx / d,
    uz = dz / d;
  let want = Math.atan2(ux, uz);
  let dy = want - g.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  g.yaw += dy * Math.min(1, dt * 9);
  want = speed * dt;
  g.x += ux * want;
  g.z += uz * want;
  // Round a building, not through it: out by the shortest way, and on along its wall.
  for (let k = 0; k < feet.length; k++) {
    const f = feet[k]!;
    if (Math.abs(f.x - g.x) > 18 || Math.abs(f.z - g.z) > 18) continue;
    if (outOf(f, g, 0.38)) {
      g.x += -uz * want * 0.9 * g.side;
      g.z += ux * want * 0.9 * g.side;
    }
  }
  g.y += (H(g.x, g.z) - g.y) * Math.min(1, dt * 12);
  return false;
}

// ---------------------------------------------------------------- their brains
const you = { x: 0, z: 0, ok: false };
let followers = 0;
function strollBrain(g: Guy, dt: number) {
  // Noticed you: a wave, then along for a few steps.
  g.cooldown -= dt;
  if (g.follow > 0) {
    g.follow -= dt;
    g.tx = you.x + Math.cos(g.k) * 2.1;
    g.tz = you.z + Math.sin(g.k) * 2.1;
    g.mood = steer(g, dt, SPEED.run * 0.82) ? 'idle' : 'run';
    if (g.follow <= 0) {
      g.hasTarget = false;
      g.cooldown = 22;
      followers = Math.max(0, followers - 1);
    }
    return;
  }
  if (g.mood === 'wave') {
    g.wait -= dt;
    g.yaw = Math.atan2(you.x - g.x, you.z - g.z);
    if (g.wait <= 0) {
      g.follow = 4 + rng() * 3;
      g.mood = 'idle';
    }
    return;
  }
  if (you.ok && g.cooldown <= 0 && followers < 2 && Math.hypot(you.x - g.x, you.z - g.z) < 7) {
    followers++;
    g.mood = 'wave';
    g.wait = 1.1;
    return;
  }
  if (g.hasTarget) {
    if (steer(g, dt, SPEED.walk)) {
      g.hasTarget = false;
      g.wait = 1.5 + rng() * 4;
      g.mood = rng() < 0.2 ? 'sit' : 'idle';
    } else g.mood = 'walk';
    return;
  }
  g.wait -= dt;
  if (g.wait <= 0) {
    const w = WANDER[Math.floor(rng() * WANDER.length)]!;
    g.tx = w.x + rng() * 4 - 2;
    g.tz = w.z + rng() * 4 - 2;
    g.hasTarget = true;
  }
}
function shuttle(g: Guy, dt: number) {
  // A log from a to b, and back for the next.
  const to = g.loaded ? g.b : g.a;
  g.tx = to.x;
  g.tz = to.z;
  if (steer(g, dt, SPEED.walk * (g.loaded ? 0.85 : 1.15))) {
    g.wait -= dt;
    g.mood = 'idle';
    if (g.wait <= 0) {
      g.loaded = !g.loaded;
      g.wait = 0.6 + rng() * 0.8;
    }
  } else g.mood = g.loaded ? 'carry' : 'walk';
}
// A hammer's tap: small, high and short, near only. These used the machine's sleeper thump (peaks near -3 dBFS, all of it
// under 120 Hz, over and over from wherever you stood at spawn) and it pushed everything else down through the master's
// compressor. Heard within TAP.reach, at most one every TAP.gap, however many are hammering.
const TAP = { reach: 16, level: 0.07, gap: 0.2 };
let tapAt = 0;
function tapSound(x: number, z: number, k: number) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const d = Math.hypot(camera.position.x - x, camera.position.z - z);
  const peak = TAP.level * Math.max(0, 1 - d / TAP.reach) ** 2;
  const t = ctx.currentTime + 0.005;
  if (peak < 0.004 || t < tapAt) return;
  tapAt = t + TAP.gap;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = 780 + (k % 5) * 90 + Math.random() * 40;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(out);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
  o.start(t);
  o.stop(t + 0.06);
}
function hammerAt(g: Guy, dt: number) {
  const prev = Math.floor(g.t);
  g.mood = 'hammer';
  g.t += dt * 1.7;
  if (Math.floor(g.t) !== prev && Math.hypot(g.x - camera.position.x, g.z - camera.position.z) < 24) {
    tapSound(g.x, g.z, g.k);
    for (let n = 0; n < 3; n++)
      emit({
        x: g.x + Math.sin(g.yaw) * 0.45,
        y: (g.fy ?? g.y) + 0.55,
        z: g.z + Math.cos(g.yaw) * 0.45,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 1 + Math.random() * 1.6,
        vz: (Math.random() - 0.5) * 2.4,
        life: 0.35,
        size: 0.05,
        color: SPARK,
        gravity: 8,
      });
  }
}
const SPARK = new THREE.Color('#ffd98a');
function brain(g: Guy, dt: number) {
  const e = env;
  if (g.cheer > 0) {
    g.cheer -= dt;
    if (g.gather && g.hasTarget) {
      if (steer(g, dt, SPEED.run)) g.hasTarget = false;
      else {
        g.mood = 'run';
        return;
      }
    }
    g.mood = 'cheer';
    g.t += dt * 6.2;
    if (g.cheer <= 0) {
      g.gather = false;
      g.hasTarget = false;
      g.mood = 'idle';
      g.wait = rng() * 2;
    }
    return;
  }
  switch (g.job) {
    case 'stroll': {
      // A building going up pulls in whoever's nearby.
      if (!g.site) {
        const b = underway();
        for (let k = 0; k < b.length; k++) {
          const s = b[k]!;
          if (Math.hypot(s.plan.x - g.x, s.plan.z - g.z) < 34 && hammering(s) < 3) {
            g.site = s;
            const n = hammering(s) - 1;
            const yaw = s.plan.yaw,
              lx = (n - 1) * (s.plan.hw * 0.7),
              lz = s.plan.hd + 1;
            g.tx = s.plan.x + lx * Math.cos(yaw) + lz * Math.sin(yaw);
            g.tz = s.plan.z - lx * Math.sin(yaw) + lz * Math.cos(yaw);
            g.hasTarget = true;
            break;
          }
        }
      }
      if (g.site) {
        if (g.site.state !== 'building') {
          g.site = null;
          g.hasTarget = false;
          return;
        }
        if (g.hasTarget) {
          if (steer(g, dt, SPEED.run)) {
            g.hasTarget = false;
            g.yaw = Math.atan2(g.site.plan.x - g.x, g.site.plan.z - g.z);
          } else g.mood = 'run';
          return;
        }
        hammerAt(g, dt);
        return;
      }
      strollBrain(g, dt);
      return;
    }
    case 'scaffold':
      if (e?.forgeLit()) {
        // Down off the poles, and out for a walk.
        g.fy = null;
        g.y = H(g.x, g.z);
        g.job = 'stroll';
        return;
      }
      hammerAt(g, dt);
      return;
    case 'hauler':
      shuttle(g, dt);
      return;
    case 'platform': {
      const p = e?.platform;
      if (!p) return;
      const s = g.k % 2 ? 6 : -4;
      g.x = p.x + p.ux * s;
      g.z = p.z + p.uz * s;
      g.fy = p.y;
      g.mood = you.ok && Math.hypot(you.x - g.x, you.z - g.z) < 9 ? 'wave' : 'idle';
      if (g.mood === 'wave') g.yaw = Math.atan2(you.x - g.x, you.z - g.z);
      return;
    }
    case 'camp':
      if (campBusy[g.camp]) shuttle(g, dt);
      else g.mood = 'sit';
      return;
    case 'station': {
      const st = e?.station();
      if (!e) return;
      if (e.machineBusy() || !st) {
        // Aboard for the stretch.
        g.mood = 'ride';
        return;
      }
      const side = g.seat ? 1.5 : -1.5;
      g.x = st.x + side;
      g.z = st.z + 1.8;
      for (let k = 0; k < feet.length; k++) {
        const f = feet[k]!;
        if (Math.abs(f.x - g.x) < 8 && Math.abs(f.z - g.z) < 8) outOf(f, g, 0.4);
      }
      g.y = H(g.x, g.z);
      g.fy = null; // down off the machine: riding it left them at deck height, floating in front of the frame
      g.mood = you.ok && Math.hypot(you.x - g.x, you.z - g.z) < 14 ? 'wave' : 'idle';
      g.yaw = you.ok ? Math.atan2(you.x - g.x, you.z - g.z) : g.yaw;
      return;
    }
    case 'rider':
      g.mood = 'ride';
      return;
  }
}
const hammering = (s: Site) => {
  let n = 0;
  for (let k = 0; k < VILLAGE_MAX; k++) if (guys[k]!.site === s) n++;
  return n;
};
const campBusy = [false, false];

// ---------------------------------------------------------------- drawing
const base = new THREE.Matrix4(),
  m = new THREE.Matrix4(),
  p = new THREE.Vector3(),
  q = new THREE.Quaternion(),
  s = new THREE.Vector3(),
  e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
for (let k = 0; k < COUNT * 4; k++) limbs.setColorAt(k, k % 4 < 2 ? BOOT : HAND); // before the first frame compiles them
for (let k = 0; k < COUNT * 2; k++) held.setColorAt(k, LOG);
const limb = (k: number, part: number, x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
  const n = k * 4 + part;
  limbs.setMatrixAt(n, m.compose(p.set(x, y, z), q.identity(), s.set(rx, ry, rz)).premultiply(base));
};
// Who's drawn this frame go in the first `slot` instances: someone indoors or behind you costs nothing.
let slot = 0;
function pose(g: Guy) {
  const k = slot++;
  coats.setColorAt(k, COLORS[g.k % COLORS.length]!);
  const t = g.t;
  let hop = 0,
    tilt = 0,
    pitch = 0,
    sq = 1,
    fl = 0,
    fr = 0,
    hl = [-0.25, 0.28, 0.02],
    hr = [0.25, 0.28, 0.02];
  let itemA = false,
    itemB = false;
  let lift = 0,
    liftL = 0,
    liftR = 0;
  switch (g.mood) {
    case 'walk':
    case 'run': {
      // A waddle you can read from across the street: a big rock from foot to foot, up over each step and down onto the
      // next, feet that lift, hands swinging against them, leaning into it. All of it from one phase, on shared instances.
      const f = g.mood === 'run' ? 1.45 : 1,
        step = Math.sin(t);
      hop = Math.abs(step) * WALK.bob * f;
      sq = 1 - (1 - Math.abs(step)) * WALK.squash; // low and wide as each foot lands
      tilt = step * WALK.rock * f;
      pitch = g.mood === 'run' ? 0.24 : WALK.lean;
      fl = step * WALK.stride * f;
      fr = -fl;
      liftL = Math.max(0, Math.cos(t)) * WALK.lift * f;
      liftR = Math.max(0, -Math.cos(t)) * WALK.lift * f;
      hl = [-0.27, 0.3 + Math.max(0, -step) * 0.05, -fl * 0.8];
      hr = [0.27, 0.3 + Math.max(0, step) * 0.05, fl * 0.8];
      break;
    }
    case 'chat': {
      // The one talking talks with a hand; the other just takes it in.
      const w = Math.sin(t * 3);
      if (g.chat === 1) hr = [0.28, 0.5 + w * 0.09, 0.14];
      else tilt = 0.05 * g.side;
      break;
    }
    case 'carry':
      hop = Math.abs(Math.sin(t)) * 0.05;
      tilt = Math.sin(t) * 0.1;
      pitch = -0.05;
      fl = Math.sin(t) * 0.15;
      fr = -fl;
      liftL = Math.max(0, Math.cos(t)) * WALK.lift * 0.8;
      liftR = Math.max(0, -Math.cos(t)) * WALK.lift * 0.8;
      hl = [-0.18, 0.42, 0.22];
      hr = [0.18, 0.42, 0.22];
      itemA = true;
      break;
    case 'hammer': {
      const u = t % 1,
        down = u < 0.3 ? 1 - u / 0.3 : (u - 0.3) / 0.7; // up, then a quick strike
      lift = down;
      pitch = 0.2 - down * 0.25;
      hr = [0.22, 0.42 + down * 0.5, 0.26 - down * 0.1];
      hl = [-0.25, 0.3, 0.05];
      itemB = true;
      break;
    }
    case 'wave': {
      const w = Math.sin(t * 2.2);
      tilt = w * 0.08;
      hr = [0.3 + w * 0.07, 0.86, 0.02];
      break;
    }
    case 'cheer': {
      // The hop, from the last round's villagers.
      const h = Math.abs(Math.sin(t));
      hop = h * 0.78;
      sq = h < 0.15 ? 1 - (0.15 - h) * 1.6 : 1 + h * 0.08;
      hl = [-0.32, 0.86, 0];
      hr = [0.32, 0.86, 0];
      fl = fr = 0;
      break;
    }
    case 'sit':
      hop = -0.14;
      sq = 0.9;
      hl = [-0.22, 0.34, 0.14];
      hr = [0.22, 0.34, 0.14];
      fl = 0.26;
      fr = 0.26;
      break;
    case 'ride':
      hop = -0.14;
      sq = 0.92 + Math.sin(t) * 0.01;
      fl = 0.22;
      fr = 0.22;
      hl = [-0.24, 0.34, 0.1];
      hr = [0.3, 0.74 + Math.sin(t * 1.4) * 0.05, 0.04];
      break;
    default:
      sq = 1 + Math.sin(t * 0.8) * 0.02;
  }
  // Saying something: a quick bob and a nod, so you can see who it is, whatever else they're doing.
  if (g.chat === 1) {
    const talk = Math.abs(Math.sin(t * 4.2));
    hop += talk * 0.05;
    pitch += talk * 0.1;
    sq *= 1 + talk * 0.05;
  }
  const gy = g.fy ?? g.y;
  q.setFromEuler(e.set(pitch, g.yaw, tilt, 'YXZ'));
  base.compose(p.set(g.x, gy + hop, g.z), q, s.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)));
  heads.setMatrixAt(k, base);
  coats.setMatrixAt(k, base);
  limb(k, 0, -0.13, 0.06 + liftL, fl + 0.02, 0.1, 0.07, 0.14);
  limb(k, 1, 0.13, 0.06 + liftR, fr + 0.02, 0.1, 0.07, 0.14);
  limb(k, 2, hl[0]!, hl[1]!, hl[2]!, 0.075, 0.075, 0.075);
  limb(k, 3, hr[0]!, hr[1]!, hr[2]!, 0.075, 0.075, 0.075);
  const i0 = k * 2,
    i1 = k * 2 + 1;
  if (itemA) {
    held.setMatrixAt(i0, m.compose(p.set(0, 0.44, 0.3), q.identity(), s.set(0.95, 0.16, 0.16)).premultiply(base));
    held.setColorAt(i0, LOG);
    held.setMatrixAt(i1, ZERO);
  } else if (itemB) {
    const a = 0.5 - lift * 1.5;
    e.set(a, 0, 0, 'XYZ');
    q.setFromEuler(e);
    p.set(hr[0]!, hr[1]!, hr[2]!);
    held.setMatrixAt(
      i0,
      m
        .compose(p, q, s.set(0.05, 0.05, 0.42))
        .premultiply(base)
        .multiply(tr.makeTranslation(0, 0, 0.5)),
    );
    held.setColorAt(i0, HANDLE);
    held.setMatrixAt(
      i1,
      m
        .compose(p, q, s.set(0.18, 0.13, 0.13))
        .premultiply(base)
        .multiply(tr.makeTranslation(0, 0, 3.1)),
    );
    held.setColorAt(i1, IRON);
  } else {
    held.setMatrixAt(i0, ZERO);
    held.setMatrixAt(i1, ZERO);
  }
}
const tr = new THREE.Matrix4();
const NEAR_CAM = 2.5; // m
const BEHIND = 6; // m behind the camera's plane before someone isn't drawn: past their shadow's reach into the view
const look = new THREE.Vector3();
const wp = new THREE.Vector3();
function ride(g: Guy, car: { mesh: THREE.Object3D; top: number }, x: number, z: number, yaw: number) {
  car.mesh.updateWorldMatrix(false, false);
  wp.set(x, 0, z).applyMatrix4(car.mesh.matrixWorld);
  g.x = wp.x;
  g.z = wp.z;
  g.fy = wp.y + car.top + 0.14; // the car's `top`: its deck over the mesh's origin
  g.yaw = car.mesh.rotation.y + yaw;
}

// ---------------------------------------------------------------- what the rest of the prototype tells them
let wanted = 0;
/** The village's number: how many you can see, up to the cap. */
export function setPopulation(n: number) {
  wanted = Math.min(VILLAGE_MAX, n);
}
/** Everyone in the village: out of doors, to the track, cheering. */
export function pourOut(seconds = 9) {
  const gr = env?.gather;
  for (let k = 0; k < VILLAGE_MAX; k++) {
    const g = guys[k]!;
    if (!g.on || g.job === 'scaffold' || g.job === 'platform') {
      g.cheer = seconds;
      continue;
    }
    if (g.follow > 0) followers = Math.max(0, followers - 1);
    g.cheer = seconds + rng();
    g.gather = true;
    g.hasTarget = !!gr;
    g.site = null;
    g.follow = 0;
    g.loaded = false;
    if (gr) {
      const along = ((k * 0.618) % 1) * gr.len,
        out = 1.4 + ((k * 0.37) % 1) * 3.6;
      g.tx = gr.x + gr.ux * along + gr.lx * out;
      g.tz = gr.z + gr.uz * along + gr.lz * out;
    }
  }
}
/** Everyone in sight of a smaller moment hops where they stand. */
export function cheerAround(x: number, z: number, r: number, seconds = 5) {
  for (const g of guys) if (g.on && Math.hypot(g.x - x, g.z - z) < r) g.cheer = seconds;
}
export function setCamp(k: number, busy: boolean) {
  campBusy[k] = busy;
}
export function setRiders(line: number, on: boolean) {
  for (const g of riders) if (g.camp === line) g.on = on;
}
/** Start over. */
export function resetFolk() {
  endTalk();
  rest = TALK.firstAfter;
  wanted = 0;
  followers = 0;
  for (let k = 0; k < VILLAGE_MAX; k++) {
    const g = guys[k]!;
    g.on = false;
    g.cheer = 0;
    g.gather = false;
    g.site = null;
    g.follow = 0;
    if (k < 2) {
      g.job = 'scaffold';
      g.x = FORGE_X + (k === 0 ? -2.6 : 2.2);
      g.z = FORGE_Z + (FORGE.d + 1.4) / 2;
      g.fy = FORGE_Y + 1.98;
      g.yaw = Math.PI;
    }
  }
  setRiders(0, false);
  setRiders(1, false);
  campBusy[0] = campBusy[1] = false;
}

// ---------------------------------------------------------------- chatter (docs/research/little-guys.md: rare, nearby, one at a time)
export const TALK = {
  firstAfter: 10, // s into the run before anybody says anything
  rest: [20, 38], // s of quiet after an exchange
  hear: 11, // m from you: they only strike one up this close
  meet: 3.6, // m apart to talk as they are
  stroll: 7, // m apart for a stroller to wander over first
  lines: [2, 4], // lines an exchange runs to, turn about
  gap: 0.28, // s between one line and its answer
};
type Exchange = {
  a: Guy;
  b: Guy;
  left: number; // lines still to say
  t: number; // s till the next thing
  stop: () => void;
  walking: number; // s left to walk over; 0 once they're talking
};
let ex: Exchange | null = null,
  rest: number = TALK.firstAfter,
  lineNo = Math.floor(rng() * 12);
const canTalk = (g: Guy) =>
  g.on &&
  g.cheer <= 0 &&
  g.follow <= 0 &&
  !g.site &&
  !g.chat &&
  (g.job === 'stroll' || g.job === 'platform' || g.job === 'camp' || g.job === 'station') &&
  (g.mood === 'idle' || g.mood === 'sit' || g.mood === 'walk' || (g.job === 'station' && g.mood === 'ride'));
function endTalk() {
  if (!ex) return;
  ex.stop();
  for (const g of [ex.a, ex.b]) {
    g.chat = 0;
    if (g.mood === 'chat') g.mood = 'idle';
    g.wait = 0.4 + rng() * 2;
  }
  ex = null;
  rest = TALK.rest[0]! + rng() * (TALK.rest[1]! - TALK.rest[0]!);
}
function strikeUp() {
  let best: Guy | null = null,
    other: Guy | null = null,
    bd = Infinity;
  for (const g of guys) {
    if (!canTalk(g) || Math.hypot(g.x - you.x, g.z - you.z) > TALK.hear) continue;
    for (const h of guys) {
      if (h === g || !canTalk(h)) continue;
      const d = Math.hypot(g.x - h.x, g.z - h.z);
      const reach = h.job === 'stroll' && g.job === 'stroll' ? TALK.stroll : TALK.meet;
      if (d < reach && d < bd) {
        bd = d;
        best = g;
        other = h;
      }
    }
  }
  if (!best || !other) return false;
  const lines = TALK.lines[0]! + Math.floor(rng() * (TALK.lines[1]! - TALK.lines[0]! + 1));
  ex = { a: best, b: other, left: lines, t: 0, stop: () => {}, walking: bd > TALK.meet ? 4 : 0 };
  best.chat = 2;
  other.chat = 2;
  folk.chats++;
  return true;
}
function chatBrain(g: Guy, dt: number) {
  const o = ex ? (ex.a === g ? ex.b : ex.a) : null;
  if (!o) return;
  if (ex!.walking > 0 && g === ex!.b) {
    // Over to the other one, and stop a step short.
    const d = Math.hypot(o.x - g.x, o.z - g.z);
    g.tx = g.x + ((o.x - g.x) / Math.max(d, 0.01)) * Math.max(0, d - 1.5);
    g.tz = g.z + ((o.z - g.z) / Math.max(d, 0.01)) * Math.max(0, d - 1.5);
    g.mood = steer(g, dt, SPEED.walk) ? 'chat' : 'walk';
    return;
  }
  g.mood = 'chat';
  // A step back if they've met nose to nose.
  const apart = Math.hypot(o.x - g.x, o.z - g.z);
  if (apart < 1.25 && apart > 0.01) {
    g.x -= ((o.x - g.x) / apart) * dt * 0.9;
    g.z -= ((o.z - g.z) / apart) * dt * 0.9;
  }
  let dy = Math.atan2(o.x - g.x, o.z - g.z) - g.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  g.yaw += dy * Math.min(1, dt * 7);
}
function updateTalk(dt: number) {
  if (!ex) {
    rest -= dt;
    if (rest > 0 || !you.ok || env?.hush()) return;
    if (!strikeUp()) rest = 1.5; // nobody near: look again in a moment
    return;
  }
  const { a, b } = ex;
  // Anything bigger than a chat ends it: a cheer, a crate, you wandering off, a stroller noticing you doesn't (it can't).
  const away = Math.hypot(a.x - you.x, a.z - you.z) > CHATTER.earshot + 4;
  if (!a.on || !b.on || a.cheer > 0 || b.cheer > 0 || env?.hush() || away) return endTalk();
  if (ex.walking > 0) {
    ex.walking -= dt;
    if (Math.hypot(a.x - b.x, a.z - b.z) < 1.9) ex.walking = 0;
    return;
  }
  ex.t -= dt;
  if (ex.t > 0) return;
  if (ex.left <= 0) return endTalk();
  // Turn about, starting with whoever was there first.
  const who = ex.left % 2 ? a : b,
    other = who === a ? b : a;
  who.chat = 1;
  other.chat = 2;
  const said = babble(lineNo++, who.k, who.x, who.z);
  ex.stop = said.stop;
  folk.lines++;
  ex.left--;
  ex.t = said.ms / 1000 + TALK.gap;
}

let frame = 0;
export function updateFolk(dt: number) {
  frame++;
  const b = me.body;
  you.ok = !!b;
  if (b) {
    you.x = b.position.x;
    you.z = b.position.z;
  }
  // Someone new in the village comes out of a door.
  let on = 0;
  for (let k = 0; k < VILLAGE_MAX; k++) if (guys[k]!.on) on++;
  for (let k = 0; k < VILLAGE_MAX && on < wanted; k++) {
    const g = guys[k]!;
    if (g.on) continue;
    g.on = true;
    on++;
    g.hasTarget = false;
    g.wait = rng() * 2;
    if (g.job === 'stroll') {
      const d = door(k);
      g.x = d.x;
      g.z = d.z;
      g.y = H(d.x, d.z);
    }
  }
  updateTalk(dt);
  const cx = camera.position.x,
    cz = camera.position.z;
  const e_ = env;
  camera.getWorldDirection(look);
  slot = 0;
  for (const g of guys) {
    if (!g.on) continue;
    const d2 = (g.x - cx) ** 2 + (g.z - cz) ** 2;
    const far = d2 > 150 * 150;
    // Out of sight of the camera, they're looked at less often.
    if (far && g.mood !== 'ride' && g.job !== 'rider') {
      g.far += dt;
      if ((frame + g.k) % 8 === 0) {
        brain(g, Math.min(0.5, g.far));
        g.far = 0;
      }
      continue;
    }
    if (g.mood === 'walk' || g.mood === 'carry' || g.mood === 'run') {
      const moved = Math.min(0.5, Math.hypot(g.x - g.px, g.z - g.pz));
      g.t += moved * WALK.stepsPerMetre;
    } else g.t += dt * (g.mood === 'hammer' ? 0 : 3);
    g.px = g.x;
    g.pz = g.z;
    if (g.chat && g.job !== 'station' && g.job !== 'rider') chatBrain(g, dt);
    else brain(g, dt);
    if (e_ && g.job === 'station' && g.mood === 'ride') {
      const car = e_.machine();
      ride(g, car, g.seat ? 0.62 : -0.62, -1.15, g.seat ? -0.7 : 0.7);
    } else if (e_ && g.job === 'rider') {
      const car = e_.trainCar(g.camp);
      if (!car) continue;
      ride(g, car, g.seat ? 0.42 : -0.42, -1.1, g.seat ? 0.9 : -0.9);
    }
    // Never in the lens: anyone within a couple of metres of the camera isn't drawn.
    const nx = g.x - cx,
      ny = (g.fy ?? g.y) + 0.5 - camera.position.y,
      nz = g.z - cz;
    if (nx * nx + ny * ny + nz * nz < NEAR_CAM * NEAR_CAM) continue;
    if (nx * look.x + ny * look.y + nz * look.z < -BEHIND) continue;
    pose(g);
  }
  heads.count = coats.count = slot;
  limbs.count = slot * 4;
  held.count = slot * 2;
  if (coats.instanceColor) coats.instanceColor.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = coats.instanceMatrix.needsUpdate = true;
  limbs.instanceMatrix.needsUpdate = held.instanceMatrix.needsUpdate = true;
  if (held.instanceColor) held.instanceColor.needsUpdate = true;
}
export const folk = {
  guys,
  count: () => guys.filter((g) => g.on).length,
  stationGuys,
  campGuys,
  riders,
  chats: 0, // exchanges and lines so far, for the evals
  lines: 0,
  talking: () => (ex ? [ex.a, ex.b] : null),
  talkSoon: () => void (rest = 0),
};
