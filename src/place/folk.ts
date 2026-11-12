// The little guys of the village (owner: "little guys running around, kind of like the Boogler, but maybe a cuter
// version"), so the world stops feeling dead. Round and stubby, in a few colours, the proportions of
// Castle Story's Bricktrons as our own character; four instanced meshes and a small state machine each. They work at the
// camp, the stations and the town: carrying logs, hammering at scaffolds, riding the train and the machine, waving and
// following you for a moment, and cheering at milestones. They're life, not labour: nothing they do moves the run on, and
// the village's number is how many you can see, up to a cap an iPad is happy with. No colliders; they walk round buildings
// (`feet`, ./sites.ts). The hop of the last round's villagers is their cheer. Local.
import * as THREE from 'three/webgpu';
import { mulberry32 } from '../sim/rng.ts';
import { RAIL_LINES, RAIL_TRAINS } from '../sim/railway-lines.ts';
import { emit } from '../render/particles.ts';
import { camera } from '../render/scene.ts';
import { getAudio } from '../render/audio.ts';
import { me } from '../player/player.ts';
import { flat } from '../render/flat.ts';
import { babble, CHATTER } from './chatter.ts';
import { H } from './land.ts';
import { MACHINE_CHAIR_SEAT } from '../entities/railway/machine-model.ts';
import { merged } from '../render/part-geometry.ts';
import type { OwnedView } from '../render/owned-view.ts';
import { TOWN, toWorld, FORGE } from './layout.ts';
import { feet, outOf, underway, type Foot, type Site } from './sites.ts';

// ---------------------------------------------------------------- the meshes
const VILLAGE_MAX = 28, // the most of the village's people you'll see at once
  CAMP = 3,
  STATION = 2,
  RIDERS = 2,
  COMMUTERS = 5,
  PUSHERS = 2,
  RESIDENTS = 6,
  ISLAND_FOLK = 8; // Ring Island's square (src/entities/ring-folk): six crew and Hooter, one spare
// A driver a train: the little guy at the engine's controls, on his tall stool (docs/plans/engine-previz.md).
const DRIVERS = RAIL_TRAINS.length;
const COUNT = VILLAGE_MAX + CAMP * 2 + STATION + RIDERS * 2 + DRIVERS + COMMUTERS + PUSHERS + RESIDENTS + ISLAND_FOLK;
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
for (const m of [heads, coats, limbs, held]) m.frustumCulled = false; // mountFolk gives them to the view's owner
coats.castShadow = true; // the hat and the coat are the shadow's outline: the head inside it adds nothing but triangles
const COLORS = ['#e4574a', '#3f8ee0', '#f0c030', '#42b887', '#ef8a3a', '#a569e0'].map((c) => new THREE.Color(c));
const HAND = new THREE.Color(SKIN),
  BOOT = new THREE.Color('#4a3424'),
  LOG = new THREE.Color('#8a5a32'),
  HANDLE = new THREE.Color('#a9794c'),
  IRON = new THREE.Color('#5d6068');

// ---------------------------------------------------------------- what each one is doing
type Job =
  | 'stroll'
  | 'scaffold'
  | 'hauler'
  | 'platform'
  | 'camp'
  | 'station'
  | 'rider'
  | 'driver'
  | 'commuter'
  | 'pusher'
  | 'resident'
  | 'greeter'
  | 'looker';
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
  stride: number; // distance-driven feet, independent of idle/hammer time
  poseMood: Mood;
  poseTime: number;
  gaze: number; // Local head turn; never steers the route
  wait: number;
  tx: number;
  tz: number;
  hasTarget: boolean;
  fy: number | null; // stands at this height, not on the ground (a scaffold, a platform)
  rideUp: number; // m a rider's root sits above the deck it rides on: a chair's seat, feet still on the deck
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
  px: number; // where it stood last frame: the stride follows how fast it really goes
  pz: number;
  chat: 0 | 1 | 2; // in an exchange: 1 saying something, 2 listening
  route: Route;
  act: Mood; // a resident: what they're doing when you're not there
  tint: THREE.Color | null;
};
// Where steer() is taking it: the goal it was given (r), that goal clear of footprints (g), the corner it's rounding (w),
// the corner before that (p), and the s it has left; below 0, nothing's planned.
type Route = {
  rx: number;
  rz: number;
  gx: number;
  gz: number;
  wx: number;
  wz: number;
  px: number;
  pz: number;
  way: boolean;
  left: number;
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
    stride: 0,
    poseMood: 'idle',
    poseTime: 0,
    gaze: 0,
    wait: rng() * 3,
    tx: x,
    tz: z,
    hasTarget: false,
    fy: null,
    rideUp: 0,
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
    px: x,
    pz: z,
    chat: 0,
    route: { rx: 0, rz: 0, gx: 0, gz: 0, wx: 0, wz: 0, px: 0, pz: 0, way: false, left: -1 },
    act: 'idle',
    tint: null,
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
  [-103, 24],
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
// One driver a train (`camp` its line, `seat` which of the line's trains), on whenever there's an engine's stool to sit
// on (FolkEnv.driver).
RAIL_LINES.forEach((l, line) => {
  for (let k = 0; k < l.trains; k++) make('driver', 0, 0, { seat: k, camp: line });
});

// Once a path's open they use it: a few of them walk the new track, there and back, all day. The first time they run.
const commuters = Array.from({ length: COMMUTERS }, (_, k) =>
  make('commuter', 0, 0, { on: false, seat: k, side: k % 2 ? 1 : -1, tx: 0 }),
);
// The depot's cart: two of them shoving it along, a real but small job (./depot.ts).
const pushers = Array.from({ length: PUSHERS }, (_, k) => make('pusher', 0, 0, { on: false, seat: k }));

/** Someone who lives in a building and stays put (./residents.ts): same on every tab, so two people can talk to them at once. */
export function addResident(x: number, y: number, z: number, yaw: number, act: Mood, color: string) {
  return make('resident', x, z, { on: false, fy: y, yaw, act, a: { x: yaw, z: 0 }, tint: new THREE.Color(color) });
}
/** The shore worker uses the same meshes/poses, directed locally by residents.ts. */
export function addGreeter(x: number, y: number, z: number) {
  return make('greeter', x, z, { fy: y, yaw: -Math.PI / 2, tint: new THREE.Color('#f0c030') });
}
/** One of Ring Island's folk (src/entities/ring-folk/view.ts): placed, moved, faced and talked to by its owner; the kit only
 * draws it and, like the greeter, never steers it. */
export function addLooker(x: number, y: number, z: number, yaw: number, color: string) {
  return make('looker', x, z, { fy: y, yaw, tint: new THREE.Color(color) });
}
export type { Guy, Mood };

// ---------------------------------------------------------------- what they can see of the world (set by ./index.ts)
export type FolkEnv = {
  /** The next station's feet, where its helpers stand; null when nothing's waiting. */
  station: () => { x: number; y: number; z: number } | null;
  machineBusy: () => boolean;
  /** A player holds the machine chair this station hand rides in (0 left, 1 right): they wait at the station. */
  chairTaken?: (seat: number) => boolean;
  machine: () => { mesh: THREE.Object3D; top: number };
  trainCar: (line: number) => { mesh: THREE.Object3D; top: number } | null;
  /** The engine's driving stool on a line's `k`th train, in its car's frame: `top` is his footrest (his feet rest on
   * it), `up` the seat over it, `x`, `z` and `yaw` where he sits and faces; null while that engine has no driver. */
  driver?: (
    line: number,
    k: number,
  ) => { mesh: THREE.Object3D; top: number; up: number; x: number; z: number; yaw: number } | null;
  /** Local drawn car envelopes; walkers give way without changing the train or its physics. */
  traffic: readonly { mesh: THREE.Object3D; spec: { hx: number; hz: number }; hy: number }[];
  /** The platform and where people gather when a line opens. */
  gather: { x: number; z: number; ux: number; uz: number; lx: number; lz: number; len: number };
  platform: { x: number; y: number; z: number; ux: number; uz: number; up: () => boolean };
  forgeLit: () => boolean;
  /** A place along the first path: `u` 0 the village end to 1 the far end; null until it's open. */
  path: ((u: number, lat: number) => { x: number; y: number; z: number; yaw: number } | null) | null;
  /** The cart they push: null while it's at rest. */
  cart: () => { mesh: THREE.Object3D; top: number; hz: number } | null;
  /** Something's on that nobody should talk over (a crate opening, a moment). */
  hush: () => boolean;
};
let env: FolkEnv | null = null;
/** The same local cast, attached to the production view's lifetime. */
export function mountFolk(owner: OwnedView, next: FolkEnv) {
  resetFolk();
  env = next;
  owner.add(heads, coats, limbs, held);
  owner.cleanup(() => {
    resetFolk();
    env = null;
  });
}

// ---------------------------------------------------------------- moving
const SPEED = { walk: 1.7, run: 4.6 };
// The walk. Tune these by eye at about 10 m.
const WALK = { bob: 0.035, squash: 0.035, rock: 0.09, lean: 0.07, lift: 0.12, stepsPerMetre: 5.8 };
// Round a building, not through it. They head straight for where they're going until a footprint's on the line, then for
// the corner of it that makes the shorter way round. Plots count before they're built, so nobody's standing there when a
// building rises. A goal that takes far longer than the walk should is given up on, as if they'd got there.
const WALL = 0.38, // m they keep from a wall
  CORNER = WALL + 0.3, // m they take a corner wide by
  PATIENCE = 2.5; // times the straight walk's time, plus GRACE s, before they give up
const GRACE = 3;
/** How far along the line a footprint starts, 0 to 1; Infinity if the line misses it. A hair inside WALL: walking along it isn't hitting it. */
function hits(f: Foot, ax: number, az: number, bx: number, bz: number) {
  const r = WALL - 0.02,
    dx = ax - f.x,
    dz = az - f.z,
    ex = bx - ax,
    ez = bz - az;
  let t0 = 0,
    t1 = 1;
  for (let axis = 0; axis < 2; axis++) {
    const half = (axis ? f.hd : f.hw) + r,
      l = axis ? dx * f.s + dz * f.c : dx * f.c - dz * f.s,
      v = axis ? ex * f.s + ez * f.c : ex * f.c - ez * f.s;
    if (Math.abs(v) < 1e-6) {
      if (Math.abs(l) >= half) return Infinity;
      continue;
    }
    const a = (-half - l) / v,
      b = (half - l) / v;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }
  return t0 < t1 ? t0 : Infinity;
}
const spot = { x: 0, z: 0 };
const inAFoot = (x: number, z: number) => {
  spot.x = x;
  spot.z = z;
  return feet.some((f) => outOf(f, spot, WALL));
};
function detour(g: Guy, toX: number, toZ: number) {
  let f: Foot | null = null,
    first = Infinity;
  for (let k = 0; k < feet.length; k++) {
    const t = hits(feet[k]!, g.x, g.z, toX, toZ);
    if (t < first) {
      first = t;
      f = feet[k]!;
    }
  }
  if (!f) return;
  let best = Infinity;
  for (let k = 0; k < 4; k++) {
    const nx = (k & 1 ? 1 : -1) * (f.hw + CORNER),
      nz = (k & 2 ? 1 : -1) * (f.hd + CORNER),
      x = f.x + nx * f.c + nz * f.s,
      z = f.z - nx * f.s + nz * f.c,
      there = Math.hypot(x - g.x, z - g.z);
    // There now, just came from it (they'd pace a wall between two corners), or round the far side.
    if (there < 0.4 || Math.hypot(x - g.route.px, z - g.route.pz) < 0.4 || hits(f, g.x, g.z, x, z) !== Infinity)
      continue;
    const way = there + Math.hypot(toX - x, toZ - z) + (inAFoot(x, z) ? 40 : 0);
    if (way < best) {
      best = way;
      g.route.wx = x;
      g.route.wz = z;
      g.route.way = true;
    }
  }
}
function steer(g: Guy, dt: number, speed: number) {
  const r = g.route;
  if (r.left < 0 || Math.hypot(g.tx - r.rx, g.tz - r.rz) > 1.5) {
    // A new goal, moved out of any footprint it's in.
    r.rx = spot.x = g.tx;
    r.rz = spot.z = g.tz;
    for (let k = 0; k < feet.length; k++) outOf(feet[k]!, spot, WALL);
    r.gx = spot.x;
    r.gz = spot.z;
    r.way = false;
    r.px = r.pz = Infinity;
    r.left = (Math.hypot(r.gx - g.x, r.gz - g.z) / speed) * PATIENCE + GRACE;
  }
  r.left -= dt;
  if (Math.hypot(r.gx - g.x, r.gz - g.z) < 0.25 || r.left <= 0) {
    r.left = -1;
    return true;
  }
  if (r.way && Math.hypot(r.wx - g.x, r.wz - g.z) < 0.4) {
    r.way = false;
    r.px = r.wx;
    r.pz = r.wz;
  }
  detour(g, r.way ? r.wx : r.gx, r.way ? r.wz : r.gz);
  const dx = (r.way ? r.wx : r.gx) - g.x,
    dz = (r.way ? r.wz : r.gz) - g.z,
    d = Math.max(Math.hypot(dx, dz), 0.001),
    ux = dx / d,
    uz = dz / d;
  let dy = Math.atan2(ux, uz) - g.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  g.yaw += dy * Math.min(1, dt * 9);
  g.x += ux * speed * dt;
  g.z += uz * speed * dt;
  for (let k = 0; k < feet.length; k++) {
    const f = feet[k]!;
    if (Math.abs(f.x - g.x) > 18 || Math.abs(f.z - g.z) > 18) continue;
    outOf(f, g, WALL);
  }
  g.y += (H(g.x, g.z) - g.y) * Math.min(1, dt * 12);
  return false;
}

// ---------------------------------------------------------------- their brains
const you = { x: 0, z: 0, ok: false };
// Who's waving at you or tagging along right now. Counted, not kept: a cheer or a building site can cut a wave short.
function greeters() {
  let n = 0;
  for (let k = 0; k < VILLAGE_MAX; k++) {
    const g = guys[k]!;
    if (
      g.on &&
      (g.job === 'stroll' || (g.job === 'platform' && !env?.platform.up())) &&
      (g.follow > 0 || g.mood === 'wave')
    )
      n++;
  }
  return n;
}
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
  if (you.ok && g.cooldown <= 0 && Math.hypot(you.x - g.x, you.z - g.z) < 7 && greeters() < 2) {
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
/** A stamp coming down on a leaf: a little tap and no sparks. */
function stampAt(g: Guy, dt: number) {
  const prev = Math.floor(g.t);
  g.mood = 'hammer';
  g.t += dt * 0.9;
  if (Math.floor(g.t) !== prev) tapSound(g.x, g.z, g.k);
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
  if (crewBrain(g, dt)) return;
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
      // A building going up pulls in whoever's nearby, once they've finished saying hello.
      if (!g.site && g.follow <= 0 && g.mood !== 'wave') {
        const b = underway();
        for (let k = 0; k < b.length; k++) {
          const s = b[k]!;
          if (s.state !== 'building') continue; // underway can still contain this frame's just-finished site
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
          // A paid building finished: one pleased response, with no say in when it completes.
          if (g.site.state === 'done') g.cheer = 1.3;
          g.site = null;
          g.hasTarget = false;
          g.mood = 'idle';
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
      if (!p || !p.up()) {
        g.fy = null;
        strollBrain(g, dt);
        return;
      }
      const s = g.k % 2 ? 6 : -4;
      g.x = p.x + p.ux * s;
      g.z = p.z + p.uz * s;
      g.fy = p.y;
      g.mood = you.ok && Math.hypot(you.x - g.x, you.z - g.z) < 9 ? 'wave' : 'idle';
      if (g.mood === 'wave') g.yaw = Math.atan2(you.x - g.x, you.z - g.z);
      return;
    }
    case 'camp': {
      const at = bolt?.guys.indexOf(g) ?? -1;
      if (bolt && at >= 0) {
        // Bolting the boiler on: run to your side of the saddle, then face it and hammer.
        g.tx = bolt.x + (at ? 0.9 : -0.9);
        g.tz = bolt.z;
        if (!bolt.here[at] && !steer(g, dt, SPEED.run)) {
          g.mood = 'run';
          return;
        }
        if (!bolt.here[at]) {
          bolt.here[at] = true;
          bolt.left = Math.max(bolt.left, 2);
        }
        g.yaw = Math.atan2(bolt.x - g.x, bolt.z - g.z);
        hammerAt(g, dt);
        return;
      }
      if (campBusy[g.camp]) shuttle(g, dt);
      else g.mood = 'sit';
      return;
    }
    case 'station': {
      const st = e?.station();
      if (!e) return;
      const given = !!e.chairTaken?.(g.seat);
      if ((e.machineBusy() || !st) && !given) {
        // Aboard for the stretch.
        g.mood = 'ride';
        return;
      }
      if (!st) {
        // A player sat in their chair with no station to wait at: stand on the ground beside that side of the deck.
        const car = e.machine();
        car.mesh.updateWorldMatrix(true, false);
        wp.set(g.seat ? 1.7 : -1.7, 0, -1.1).applyMatrix4(car.mesh.matrixWorld);
        g.x = wp.x;
        g.z = wp.z;
        g.y = H(g.x, g.z);
        g.fy = null;
        g.mood = 'idle';
        return;
      }
      // Otherwise (or when a player sat in their chair) they see it off from the station.
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
    case 'driver':
      g.mood = 'ride';
      return;
    case 'commuter': {
      const q = e?.path?.(g.a.x, g.side * (0.45 + (g.seat % 3) * 0.35));
      if (!q) return;
      // There and back along it; `a.x` is where along, `a.z` which way. The first run out's at a run.
      const speed = commuteRun > 0 ? SPEED.run : SPEED.walk * 1.3;
      g.a.x += (g.a.z * speed * dt) / PATH_LEN;
      if (g.a.x > 1 || g.a.x < 0) {
        g.a.z = -g.a.z;
        g.a.x = Math.max(0, Math.min(1, g.a.x));
      }
      g.x = q.x;
      g.z = q.z;
      g.fy = q.y;
      g.yaw = q.yaw + (g.a.z > 0 ? 0 : Math.PI);
      g.mood = commuteRun > 0 ? 'run' : 'walk';
      return;
    }
    case 'pusher':
      g.mood = 'walk';
      return;
    case 'greeter':
    case 'looker':
      return;
    case 'resident': {
      // They look up when you come close, and go back to it when you've gone. Local: nobody else's copy has to agree.
      const close = you.ok && Math.hypot(you.x - g.x, you.z - g.z) < 3.4;
      const face = close ? Math.atan2(you.x - g.x, you.z - g.z) : g.a.x;
      let dy = face - g.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      g.yaw += dy * Math.min(1, dt * 5);
      if (g.chat || close) g.mood = 'chat';
      else if (g.act === 'hammer') stampAt(g, dt);
      else g.mood = g.act;
      return;
    }
  }
}
const PATH_LEN = 190;
let commuteRun = 0;
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
  if (slot >= COUNT) return;
  const k = slot++;
  coats.setColorAt(k, g.tint ?? COLORS[g.k % COLORS.length]!);
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
  const walking = g.mood === 'walk' || g.mood === 'run' || g.mood === 'carry';
  if (walking) {
    // Stance travels backwards at root speed; only the returning foot lifts. One half-cycle is pi / stepsPerMetre m.
    const reach = Math.PI / (2 * WALK.stepsPerMetre);
    for (let foot = 0; foot < 2; foot++) {
      const u = ((g.stride / Math.PI + foot) % 2) / 2;
      const swing = Math.max(0, (u - 0.5) * 2);
      const z = u < 0.5 ? reach * (1 - 4 * u) : reach * (-1 + 2 * swing * swing * (3 - 2 * swing));
      const up = Math.sin(swing * Math.PI) * WALK.lift;
      if (foot === 0) {
        fl = z;
        liftL = up;
      } else {
        fr = z;
        liftR = up;
      }
    }
  }
  switch (g.mood) {
    case 'walk':
    case 'run': {
      // A waddle you can read from across the street: a big rock from foot to foot, up over each step and down onto the
      // next, feet that lift, hands swinging against them, leaning into it. All of it from one phase, on shared instances.
      const f = g.mood === 'run' ? 1.45 : 1,
        step = Math.sin(g.stride);
      hop = Math.abs(step) * WALK.bob * f;
      sq = 1 - (1 - Math.abs(step)) * WALK.squash; // low and wide as each foot lands
      tilt = step * WALK.rock * f;
      pitch = g.mood === 'run' ? 0.24 : WALK.lean;
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
      hop = Math.abs(Math.sin(g.stride)) * 0.025;
      tilt = Math.sin(g.stride) * 0.06;
      pitch = -0.05;
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
      const reach = Math.min(1, g.poseTime / 0.22);
      tilt = w * 0.08;
      hr = [0.3 + (0.1 + w * 0.03) * reach, 0.28 + 0.58 * reach, 0.02];
      break;
    }
    case 'cheer': {
      // Staggered anticipation, one small ballistic hop, a landing and a grounded arm cheer.
      const u = Math.max(0, g.poseTime - (g.k % 4) * 0.07) % 1.3;
      const air = Math.max(0, Math.min(1, (u - 0.18) / 0.5));
      hop = 4 * air * (1 - air) * 0.32 * Math.min(1, g.cheer / 0.22);
      const crouch =
        u < 0.18 ? Math.sin((u / 0.18) * Math.PI) : u < 0.88 && u >= 0.68 ? Math.sin(((u - 0.68) / 0.2) * Math.PI) : 0;
      sq = 1 - crouch * 0.16;
      const hands = Math.min(1, u / 0.25);
      hl = [-0.4, 0.36 + hands * 0.5, 0];
      hr = [0.4, 0.36 + hands * 0.5, 0];
      fl = fr = 0;
      break;
    }
    case 'sit':
      hop = -0.035;
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
      tilt = Math.sin(t * 0.35 + g.k) * 0.035;
      pitch = Math.sin(t * 0.5 + g.k) * 0.025;
  }
  // Saying something: a quick bob and a nod, so you can see who it is, whatever else they're doing.
  if (g.chat === 1) {
    const talk = Math.abs(Math.sin(t * 4.2));
    hop += talk * 0.05;
    pitch += talk * 0.1;
    sq *= 1 + talk * 0.05;
  }
  const gy = g.fy ?? H(g.x, g.z);
  q.setFromEuler(e.set(pitch, g.yaw, tilt, 'YXZ'));
  base.compose(p.set(g.x, gy + hop, g.z), q, s.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)));
  coats.setMatrixAt(k, base);
  heads.setMatrixAt(k, m.copy(base).multiply(tr.makeRotationY(g.gaze)));
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
  // Torso rock, breath and chat never lift a planted boot. Sample each sole on slopes; decks supply their own height.
  const airborne = g.mood === 'cheer' ? hop : 0;
  const seatDrop = g.mood === 'ride' ? -0.14 - g.rideUp : 0; // ride() raises the seated root above its deck
  q.setFromEuler(e.set(0, g.yaw, 0));
  base.compose(p.set(g.x, gy + airborne, g.z), q, s.set(1, 1, 1));
  for (let foot = 0; foot < 2; foot++) {
    const x = foot === 0 ? -0.13 : 0.13,
      z = (foot === 0 ? fl : fr) + 0.02;
    const ground =
      g.fy ?? H(g.x + x * Math.cos(g.yaw) + z * Math.sin(g.yaw), g.z - x * Math.sin(g.yaw) + z * Math.cos(g.yaw));
    limb(k, foot, x, ground - gy + seatDrop + 0.07 + (foot === 0 ? liftL : liftR), z, 0.1, 0.07, 0.14);
  }
}
const tr = new THREE.Matrix4();
const NEAR_CAM = 2.5; // m
const SLEEP = 150; // m from the camera past which they stop updating and aren't drawn
const BEHIND = 6; // m behind the camera's plane before someone isn't drawn: past their shadow's reach into the view
const look = new THREE.Vector3();
const wp = new THREE.Vector3();
function ride(g: Guy, car: { mesh: THREE.Object3D; top: number }, x: number, z: number, yaw: number, up = 0) {
  g.rideUp = up;
  car.mesh.updateWorldMatrix(true, false);
  wp.set(x, car.top + 0.14 + up, z).applyMatrix4(car.mesh.matrixWorld);
  g.x = wp.x;
  g.z = wp.z;
  g.fy = wp.y; // Follow the actual roof through pitch and wake shudder, including its local height.
  car.mesh.getWorldQuaternion(q);
  g.yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z)) + yaw;
}
const trafficFoot: Foot = { x: 0, z: 0, c: 1, s: 0, hw: 0, hd: 0 };
function clearTraffic(g: Guy) {
  const ground = g.fy ?? H(g.x, g.z);
  for (const car of env?.traffic ?? []) {
    if (!car.mesh.visible) continue;
    const at = car.mesh.position;
    // A car on a trestle must not displace someone walking underneath it.
    if (ground + 0.95 < at.y - car.hy || ground > at.y + car.hy + 0.4) continue;
    trafficFoot.x = at.x;
    trafficFoot.z = at.z;
    trafficFoot.c = Math.cos(car.mesh.rotation.y);
    trafficFoot.s = Math.sin(car.mesh.rotation.y);
    trafficFoot.hw = car.spec.hx + 0.15; // include the side racks
    trafficFoot.hd = car.spec.hz + 0.25;
    if (outOf(trafficFoot, g, WALL)) g.route.left = -1;
  }
}

// ---------------------------------------------------------------- what the rest of the prototype tells them
let wanted = 0;
/** The village's number: how many you can see, up to the cap. */
export function setPopulation(n: number) {
  wanted = Math.min(VILLAGE_MAX, n);
}
/** Everyone in sight of a smaller moment hops where they stand. */
export function cheerAround(x: number, z: number, r: number, seconds = 5) {
  for (const g of guys) if (g.on && Math.hypot(g.x - x, g.z - z) < r) g.cheer = seconds;
}
export function setCamp(k: number, busy: boolean) {
  campBusy[k] = busy;
}
// Two of the camp's little guys bolting the boiler on (docs/plans/boiler-first-choice.md, step 8). Local, a few seconds.
let bolt: { x: number; z: number; y: number; left: number; guys: Guy[]; here: boolean[] } | null = null;
/** The two camp-0 little guys nearest (x, z) run to 0.9 m either side of it and hammer there for `seconds` (never less
 * than 2 s after they arrive), then go back to their work. Fewer than two about: whoever there is. */
export function boltAt(x: number, z: number, y: number, seconds = 5) {
  const near = campGuys
    .filter((g) => g.on && g.camp === 0)
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
    .slice(0, 2)
    .sort((a, b) => a.x - b.x);
  bolt = near.length ? { x, z, y, left: seconds, guys: near, here: near.map(() => false) } : null;
  for (const g of near) {
    g.cheer = 0;
    g.gather = false;
    g.route.left = -1;
  }
}
// The forge's roof crew (docs/plans/works-late-game.md, step 6): two strolling village little guys, sent to a point
// each in turn by the forge's finish (src/entities/railway/forge-finish.ts). Local, about twenty seconds.
let crew: {
  guys: Guy[];
  at: { x: number; z: number }[];
  here: boolean[];
  carrying: boolean;
  face: { x: number; z: number };
} | null = null;
/** Take up to `n` village guys: the two hammering on the forge's scaffold first (they climb down), then the strollers
 * nearest (x, z); returns how many came. */
export function crewStart(x: number, z: number, n = 2) {
  const rank = (g: Guy) => (g.job === 'scaffold' ? -1e6 : Math.hypot(g.x - x, g.z - z));
  const near = guys
    .filter((g) => g.on && (g.job === 'scaffold' || (g.job === 'stroll' && g.fy === null)))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, n);
  for (const g of near) {
    if (g.job === 'scaffold') {
      // Down off the poles (as when Place's forge lit) and on with the roof.
      g.fy = null;
      g.y = H(g.x, g.z);
      g.job = 'stroll';
    }
    g.cheer = 0;
    g.gather = false;
    g.site = null;
    g.follow = 0;
    g.route.left = -1;
  }
  crew = near.length
    ? { guys: near, at: near.map(() => ({ x, z })), here: near.map(() => false), carrying: false, face: { x, z } }
    : null;
  return near.length;
}
/** Send the crew: guy k to `at[k]`, facing `face` once there; `carrying` walks them under a load (the carry pose). */
export function crewSend(at: readonly { x: number; z: number }[], carrying: boolean, face: { x: number; z: number }) {
  if (!crew) return;
  crew.at = crew.guys.map((_, k) => at[k % at.length]!);
  crew.here = crew.guys.map(() => false);
  crew.carrying = carrying;
  crew.face = face;
  for (const g of crew.guys) g.route.left = -1;
}
/** Where the crew is and who has arrived (null without a crew). */
export const crewState = () =>
  crew ? crew.guys.map((g, k) => ({ x: g.x, y: g.y, z: g.z, here: crew!.here[k]! })) : null;
/** Back to their walks. */
export function crewEnd() {
  crew = null;
}
function crewBrain(g: Guy, dt: number) {
  const k = crew ? crew.guys.indexOf(g) : -1;
  if (!crew || k < 0) return false;
  g.tx = crew.at[k]!.x;
  g.tz = crew.at[k]!.z;
  if (!crew.here[k]) {
    if (!steer(g, dt, crew.carrying ? SPEED.run * 0.8 : SPEED.run)) {
      g.mood = crew.carrying ? 'carry' : 'run';
      return true;
    }
    crew.here[k] = true;
  }
  g.yaw = Math.atan2(crew.face.x - g.x, crew.face.z - g.z);
  if (crew.carrying) g.mood = 'carry';
  else hammerAt(g, dt);
  return true;
}
/** Who is bolting now (for the evals). */
export const bolting = () =>
  bolt ? { left: bolt.left, guys: bolt.guys.length, here: bolt.here.filter(Boolean).length } : null;
function setRiders(line: number, on: boolean) {
  for (const g of riders) if (g.camp === line) g.on = on;
}
/** The path's open: they come out onto it. `run`: s they run for, the first time. */
export function setCommuters(on: boolean, run = 0) {
  commuteRun = run;
  commuters.forEach((g, k) => {
    if (on && !g.on) {
      g.a = { x: run ? -0.02 * k : (k * 0.37) % 1, z: 1 };
      if (g.a.x < 0) g.a.x = 0;
    }
    g.on = on;
  });
}
const setPushers = (on: boolean) => {
  for (const g of pushers) g.on = on;
};
/** Start over. */
function resetFolk() {
  endTalk();
  rest = TALK.firstAfter;
  wanted = 0;
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
  setCommuters(false);
  setPushers(false);
  campBusy[0] = campBusy[1] = false;
  bolt = null;
  crew = null;
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

export function updateFolk(dt: number) {
  commuteRun = Math.max(0, commuteRun - dt);
  if (bolt && (bolt.left -= dt) <= 0) bolt = null;
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
  let looked = false;
  slot = 0;
  for (const g of guys) {
    if (!g.on) continue;
    const d2 = (g.x - cx) ** 2 + (g.z - cz) ** 2;
    const far = d2 > SLEEP * SLEEP;
    // Past what the camera can pick out they sleep: no brain, no matrices, frozen where they stood (nothing shared reads
    // them: folk are local to each client, drawn only here). They are drawn from the same distance, so waking is unseen.
    // Riders and pushers follow a vehicle, so they keep their place there but aren't posed.
    if (far && g.mood !== 'ride' && g.job !== 'rider' && g.job !== 'driver' && g.job !== 'pusher') {
      g.px = g.x;
      g.pz = g.z;
      continue;
    }
    if (g.mood === 'walk' || g.mood === 'carry' || g.mood === 'run') {
      const moved = Math.min(0.5, Math.hypot(g.x - g.px, g.z - g.pz));
      g.t += moved * WALK.stepsPerMetre;
      g.stride += moved * WALK.stepsPerMetre;
    } else g.t += dt * (g.mood === 'hammer' ? 0 : 3);
    g.px = g.x;
    g.pz = g.z;
    if (
      g.chat &&
      g.job !== 'station' &&
      g.job !== 'rider' &&
      g.job !== 'driver' &&
      g.job !== 'resident' &&
      g.job !== 'greeter' &&
      g.job !== 'looker'
    )
      chatBrain(g, dt);
    else brain(g, dt);
    if (e_ && g.job === 'station' && g.mood === 'ride') {
      const car = e_.machine();
      // On the track layer's chair, bottom on the seat top (a sitting guy's root is 3.5 cm under it, as in the sit pose).
      ride(g, car, g.seat ? 0.55 : -0.55, -1.15, g.seat ? -0.7 : 0.7, MACHINE_CHAIR_SEAT - 0.035);
    } else if (e_ && g.job === 'rider') {
      const car = e_.trainCar(g.camp);
      if (!car) continue;
      ride(g, car, g.seat ? 0.42 : -0.42, -1.1, g.seat ? 0.9 : -0.9);
    } else if (g.job === 'driver') {
      const seat = e_?.driver?.(g.camp, g.seat);
      if (!seat) continue;
      ride(g, seat, seat.x, seat.z, seat.yaw, seat.up);
    } else if (e_ && g.job === 'pusher') {
      const car = e_.cart();
      if (!car) continue;
      ride(g, car, g.seat ? 0.35 : -0.35, -car.hz - 0.5, 0);
    } else clearTraffic(g);
    g.poseTime = g.poseMood === g.mood ? g.poseTime + dt : 0;
    g.poseMood = g.mood;
    let glance = 0;
    if (you.ok && !g.chat && g.mood !== 'hammer' && Math.hypot(you.x - g.x, you.z - g.z) < 6) {
      const angle = Math.atan2(you.x - g.x, you.z - g.z) - g.yaw;
      const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
      if (Math.abs(wrapped) < 1.4) glance = Math.max(-0.55, Math.min(0.55, wrapped));
    }
    g.gaze += (glance - g.gaze) * (1 - Math.exp(-dt * 5));
    if (far) continue;
    // Never in the lens: anyone within a couple of metres of the camera isn't drawn.
    const nx = g.x - cx,
      ny = (g.fy ?? g.y) + 0.5 - camera.position.y,
      nz = g.z - cz;
    if (nx * nx + ny * ny + nz * nz < NEAR_CAM * NEAR_CAM) continue;
    if (!looked) {
      camera.getWorldDirection(look);
      looked = true;
    }
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
  bolting,
  chats: 0, // exchanges and lines so far, for the evals
  lines: 0,
  talking: () => (ex ? [ex.a, ex.b] : null),
  talkSoon: () => void (rest = 0),
};
