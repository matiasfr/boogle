// The chop and the back of ?proto=place. The swing starts on the frame you press, the axe meets the bark about 60 ms later,
// the tree shakes and logs fly straight to your back. All of it Local, in this file: no waiting on the host, no spill and
// rest and notice (the delay the owner felt). docs/research/harvest-feel.md, summary 1-3. Your back is the game's bundle,
// drawn from a count kept here through `backSeam`, with rails strapped upright behind it, stone in a sack and a big thing on
// your shoulder.
// What you hit, round 4: trees with an orange band (nearby ones run out), rocks with one, and one great tree whose trunk you
// shoulder. Felled trees stay felled. The axe and the back are the ladder's first two rungs (`AXE2`, `PACK`, ./ladder.ts);
// which rung you're on comes from `job.rung`.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { removeBody, type Body } from '../../physics/engine.ts';
import { input } from '../../player/input-state.ts';
import { me } from '../../player/player.ts';
import { backSeam, myBundleNext } from '../../features/haul-stack.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { knock, pop } from '../minis/common.ts';
import { flat } from '../flat.ts';
import { H, addStatic } from './land.ts';
import { count, job, personalSlice, sharedSlice } from './job.ts';
import { LOOK, STEEL, paint } from './look.ts';
import { AXE2, GREAT, GREAT_TREE, GROVES, OAK, ORIGIN, PACK, ROCKS, ROCK_WORK, TUNE } from './layout.ts';
import { RAIL_SIZE, chips, dustRing, send } from './pieces.ts';
import { shakeView } from './celebrate.ts';
import { addFoot } from './sites.ts';
import { packFrameMesh } from './gifts.ts';

// ---------------------------------------------------------------- your back
/** One big thing on your shoulder: it fills your back, and you can't sprint with it. */
export type BigThing = 'beam' | 'boiler' | null;
export const carryNow = () => (job.rung.pack ? PACK.carry : TUNE.carry);
export const back = {
  logs: 0,
  rails: 0,
  stone: 0,
  beam: 0,
  big: null as BigThing,
  incoming: 0, // pieces in the air on their way here
  room: () => (back.big ? 0 : carryNow() - back.logs - back.rails - back.stone - back.incoming),
  empty: () => back.logs + back.rails + back.stone + back.incoming === 0 && !back.big,
};
backSeam.flyIns = false;
backSeam.count = () => back.logs;
personalSlice('back', {
  get: () => ({ logs: back.logs, rails: back.rails, stone: back.stone, big: back.big }),
  set: (v) => {
    const j = (v ?? {}) as Partial<typeof back>;
    back.logs = count(j.logs, 64) ? j.logs : 0;
    back.rails = count(j.rails, 64) ? j.rails : 0;
    back.stone = count(j.stone, 64) ? j.stone : 0;
    back.big = j.big === 'beam' || j.big === 'boiler' ? j.big : null;
    back.beam = back.big === 'beam' ? 1 : 0;
    back.incoming = 0;
  },
});

type Worn = { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } };
const frameOf = () => {
  const u = me.avatar?.userData as Worn | undefined;
  return u?.loadFit?.frame ?? u?.inner ?? null;
};
const MAX_WORN = PACK.carry;
const railsWorn = new THREE.InstancedMesh(
  new THREE.BoxGeometry(RAIL_SIZE.x * 0.6, RAIL_SIZE.z * 0.5, RAIL_SIZE.y * 0.6),
  LOOK.mats ? paint(STEEL) : flat('#4c5058', 0.6),
  MAX_WORN,
);
railsWorn.castShadow = true;
railsWorn.frustumCulled = false;
railsWorn.count = 0;
const worn = new THREE.Object3D();
for (let k = 0; k < MAX_WORN; k++) {
  worn.position.set((k % 4) * 0.12 - 0.18, 0.9, 0.62 + Math.floor(k / 4) * 0.11);
  worn.rotation.x = 0.12;
  worn.updateMatrix();
  railsWorn.setMatrixAt(k, worn.matrix);
}
// Stone: lumps in a sack on your back.
const stoneWorn = new THREE.InstancedMesh(
  new THREE.DodecahedronGeometry(0.16, 0),
  new THREE.MeshStandardNodeMaterial({ color: '#a8a498', roughness: 0.95, flatShading: true }),
  MAX_WORN,
);
stoneWorn.castShadow = true;
stoneWorn.frustumCulled = false;
stoneWorn.count = 0;
for (let k = 0; k < MAX_WORN; k++) {
  worn.rotation.set(k, k * 2, 0);
  worn.position.set((k % 3) * 0.2 - 0.2, 0.4 + Math.floor(k / 6) * 0.22, 0.48 + (Math.floor(k / 3) % 2) * 0.2);
  worn.updateMatrix();
  stoneWorn.setMatrixAt(k, worn.matrix);
}
// The trunk on your shoulder, or the boiler in your arms.
const beamWorn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 5.4, 8).rotateX(Math.PI / 2), flat('#7a5430'));
beamWorn.castShadow = true;
beamWorn.position.set(0.32, 1.05, 0.2);
beamWorn.visible = false;
const boilerWorn = new THREE.Group();
const boilerBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.55, 1.5, 12).rotateX(Math.PI / 2),
  flat('#c83a2a'),
);
const boilerBand = new THREE.Mesh(
  new THREE.CylinderGeometry(0.57, 0.57, 0.14, 12).rotateX(Math.PI / 2),
  flat('#d9a23a'),
);
const boilerStack = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), flat('#24262c'));
boilerStack.position.set(0, 0.62, -0.4);
boilerWorn.add(boilerBody, boilerBand, boilerStack);
boilerWorn.traverse((o) => void (o.castShadow = true));
boilerWorn.position.set(0, 1.55, 0.05);
boilerWorn.visible = false;
/** A boiler to stand by the forge, the shape you'll carry. */
export const boilerShape = () => {
  const g = boilerWorn.clone();
  g.visible = true;
  g.position.set(0, 0.55, 0);
  return g;
};
// A low canvas pack with a rolled top: the upgrade stays below the shoulders, clear of the follow view.
const packFrame = new THREE.Group();
packFrame.position.z = 0.43;
packFrame.visible = false;

// ---------------------------------------------------------------- what you can hit
export type Tree = {
  index: number;
  x: number;
  y: number;
  z: number;
  size: number;
  great: boolean;
  strokes: number;
  shake: number; // 1 on a hit, decaying
  fall: number; // s since it was felled, -1 standing
  fallYaw: number;
  at: THREE.Vector3;
  body: Body | null; // standing: its trunk; felled: the trunk on the ground
  stump: Body | null;
};

const rng = mulberry32(77);
function makeTree(x: number, z: number, size: number, great = false): Tree {
  const y = H(x, z);
  return {
    index: 0,
    x,
    y,
    z,
    size,
    great,
    strokes: 0,
    shake: 0,
    fall: -1,
    fallYaw: 0,
    at: new THREE.Vector3(x, y + 1.7, z),
    body: null,
    stump: null,
  };
}
export const TREES: Tree[] = GROVES.flatMap((g) => {
  const out: Tree[] = [];
  for (let k = 0; k < g.n; k++) {
    const a = (k / g.n) * Math.PI * 2 + rng() * 0.5,
      r = g.r * (0.35 + rng() * 0.65);
    out.push(makeTree(g.x + Math.cos(a) * r + ORIGIN.x, g.z + Math.sin(a) * r + ORIGIN.z, 0.9 + rng() * 0.3));
  }
  return out;
});
TREES.push(makeTree(OAK.x + ORIGIN.x, OAK.z + ORIGIN.z, 1.1));
export const greatTree = makeTree(GREAT_TREE.x + ORIGIN.x, GREAT_TREE.z + ORIGIN.z, 2.1, true);
TREES.push(greatTree);
TREES.forEach((t, k) => (t.index = k));
const strokesFor = (t: Tree) => (t.great ? GREAT.strokes : job.rung.axe ? AXE2.strokes : TUNE.strokes);
const logsPerStroke = () => (job.rung.axe ? AXE2.logsPerStroke : TUNE.logsPerStroke);
/** The most strokes anything takes, for checking another tab's message. */
export const MOST_STROKES = Math.max(GREAT.strokes, TUNE.strokes);

// ---------------------------------------------------------------- solid: standing, and where it lies
/** The great tree's trunk has been shouldered. */
const trunk = { taken: false };
const AXIS_Y = new THREE.Vector3(0, 1, 0),
  lie = new THREE.Quaternion();
function solidTree(t: Tree) {
  if (t.body) removeBody(t.body);
  if (t.stump) removeBody(t.stump);
  t.body = t.stump = null;
  const h = 5 * t.size;
  if (t.fall < 0) {
    t.body = addStatic(
      { kind: 'cylinder', rTop: 0.38 * t.size, rBottom: 0.38 * t.size, h, segments: 6 },
      { x: t.x, y: t.y + h / 2, z: t.z },
    );
    return;
  }
  t.stump = addStatic(
    { kind: 'cylinder', rTop: 0.46 * t.size, rBottom: 0.46 * t.size, h: 0.6, segments: 6 },
    { x: t.x, y: t.y + 0.3, z: t.z },
  );
  // The great tree's trunk goes on your shoulder; it isn't in the way after that.
  if (t.great && trunk.taken) return;
  lie.setFromAxisAngle(AXIS_Y, t.fallYaw);
  t.body = addStatic(
    { kind: 'box', hx: 0.3 * t.size, hy: 0.3 * t.size, hz: h / 2 },
    {
      x: t.x + Math.sin(t.fallYaw) * (h / 2 + 0.2),
      y: H(t.x + Math.sin(t.fallYaw) * h * 0.5, t.z + Math.cos(t.fallYaw) * h * 0.5) + 0.3 * t.size,
      z: t.z + Math.cos(t.fallYaw) * (h / 2 + 0.2),
    },
    lie,
  );
}
const leaf = new THREE.Color('#4f9c44'),
  leaf2 = new THREE.Color('#3f8a3a');
/** The crown comes apart as it lands: what stays is a bare trunk, solid, and you can see how much you've cut. */
function shedCrown(t: Tree) {
  for (let k = 0; k < 70 * t.size; k++) {
    const along = (5 + Math.random() * 7) * t.size,
      a = Math.random() * Math.PI * 2,
      sp = 1 + Math.random() * 3;
    emit({
      x: t.x + Math.sin(t.fallYaw) * along + Math.cos(a) * Math.random() * 1.8,
      y: t.y + 0.4 + Math.random() * 2,
      z: t.z + Math.cos(t.fallYaw) * along + Math.sin(a) * Math.random() * 1.8,
      vx: Math.cos(a) * sp,
      vy: 1.5 + Math.random() * 3,
      vz: Math.sin(a) * sp,
      life: 0.9 + Math.random() * 0.8,
      size: 0.18 + Math.random() * 0.16,
      color: k % 2 ? leaf : leaf2,
      gravity: 4,
      drag: 1.4,
      shrink: 0.5,
    });
  }
}

const n = TREES.length;
const parts = {
  trunk: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.46, 5, 6), flat('#7a5430'), n),
  crown: new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6.5, 6), flat('#3f8a3a'), n),
  crown2: new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 4.6, 6), flat('#4f9c44'), n),
  ribbon: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.48, 0.36, 8), flat('#f0752c'), n),
  stump: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.44, 0.5, 0.6, 6), flat('#c9a06a'), n),
};
for (const m of Object.values(parts)) {
  m.castShadow = true;
  m.frustumCulled = false;
  scene.add(m);
}
const base = new THREE.Matrix4(),
  turn = new THREE.Matrix4(),
  local = new THREE.Matrix4(),
  out4 = new THREE.Matrix4(),
  e = new THREE.Euler(),
  sv = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const Q0 = new THREE.Quaternion(),
  S1 = new THREE.Vector3(),
  P1 = new THREE.Vector3();
function pose(t: Tree, now: number) {
  let a = 0,
    b = 0;
  if (t.fall >= 0) {
    const u = Math.min(1, t.fall / 0.75);
    a = (u * u * Math.PI) / 2 - 0.04 * u;
  } else if (t.shake > 0) {
    a = Math.sin(now * 0.05) * t.shake * 0.1;
    b = Math.cos(now * 0.043) * t.shake * 0.06;
  }
  base.makeTranslation(t.x, t.y, t.z);
  turn.makeRotationY(t.fallYaw).multiply(local.makeRotationFromEuler(e.set(a, 0, b)));
  base.multiply(turn);
  sv.setScalar(t.size);
  const at = (y: number) =>
    out4
      .copy(base)
      .multiply(local.makeTranslation(0, y * t.size, 0))
      .scale(sv);
  const taken = t.great && trunk.taken;
  parts.trunk.setMatrixAt(t.index, taken ? ZERO : at(2.5));
  const bare = t.fall >= 0.75;
  parts.crown.setMatrixAt(t.index, bare ? ZERO : at(7.2));
  parts.crown2.setMatrixAt(t.index, bare ? ZERO : at(10));
  parts.ribbon.setMatrixAt(t.index, taken ? ZERO : at(1.15));
  parts.stump.setMatrixAt(
    t.index,
    t.fall >= 0 ? local.compose(P1.set(t.x, t.y + 0.3, t.z), Q0, S1.setScalar(t.size)) : ZERO,
  );
  for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
}
export const trunkDown = () => greatTree.fall >= 0.75 && !trunk.taken;
export const trunkAt = () => {
  const h = 5 * greatTree.size * 0.5;
  return new THREE.Vector3(
    greatTree.x + Math.sin(greatTree.fallYaw) * h,
    greatTree.y + 1.4,
    greatTree.z + Math.cos(greatTree.fallYaw) * h,
  );
};
export function resetTrees() {
  trunk.taken = false;
  for (const t of TREES) {
    t.strokes = 0;
    t.shake = 0;
    t.fall = -1;
    pose(t, 0);
    solidTree(t);
  }
}
/** Trees already down, by index: what a reload keeps. */
export const fellenList = () => TREES.filter((t) => t.fall >= 0).map((t) => t.index);
export function restoreFellen(list: number[]) {
  for (const k of list) {
    const t = TREES[k];
    if (!t || t.fall >= 0) continue;
    t.fall = 1;
    t.strokes = strokesFor(t);
    if (!t.fallYaw) t.fallYaw = (k * 2.4) % 6.28;
    pose(t, 0);
    solidTree(t);
  }
}
export const standing = (t: Tree) => t.fall < 0;

// ---------------------------------------------------------------- rocks
export type Rock = {
  index: number;
  x: number;
  y: number;
  z: number;
  r: number;
  strokes: number;
  shake: number;
  at: THREE.Vector3;
  body: Body | null;
};
export const ROCK_LIST: Rock[] = ROCKS.map((q, k) => {
  const x = q.x + ORIGIN.x,
    z = q.z + ORIGIN.z,
    y = H(x, z);
  return { index: k, x, y, z, r: q.r, strokes: 0, shake: 0, at: new THREE.Vector3(x, y + 1, z), body: null };
});
const LUMPS = 5; // what a rock's made of: each stroke takes one off
const lumpGeo = new THREE.DodecahedronGeometry(1, 0);
const lumpMesh = new THREE.InstancedMesh(
  lumpGeo,
  new THREE.MeshStandardNodeMaterial({ color: '#b0ab9d', roughness: 0.95, flatShading: true }),
  ROCK_LIST.length * LUMPS,
);
const bandMesh = new THREE.InstancedMesh(
  new THREE.TorusGeometry(1, 0.1, 5, 14).rotateX(Math.PI / 2),
  flat('#f0752c'),
  ROCK_LIST.length,
);
lumpMesh.castShadow = bandMesh.castShadow = true;
lumpMesh.frustumCulled = bandMesh.frustumCulled = false;
scene.add(lumpMesh, bandMesh);
const lp = new THREE.Vector3(),
  lq = new THREE.Quaternion(),
  ls = new THREE.Vector3(),
  le = new THREE.Euler();
function poseRock(q: Rock) {
  const left = LUMPS - Math.ceil((q.strokes / ROCK_WORK.strokes) * LUMPS);
  const sh = q.shake * 0.05;
  for (let k = 0; k < LUMPS; k++) {
    const a = (k / LUMPS) * Math.PI * 2 + q.index,
      top = k === 0,
      s = q.r * (top ? 0.62 : 0.55);
    lp.set(
      q.x + (top ? 0 : Math.cos(a) * q.r * 0.55) + (Math.random() - 0.5) * sh,
      q.y + (top ? q.r * 0.95 : q.r * 0.35),
      q.z + (top ? 0 : Math.sin(a) * q.r * 0.55) + (Math.random() - 0.5) * sh,
    );
    lq.setFromEuler(le.set(k, k * 1.7, k * 0.5));
    // The top lump goes first, then round the bottom.
    const gone = k < LUMPS - left;
    lumpMesh.setMatrixAt(q.index * LUMPS + k, gone ? ZERO : local.compose(lp, lq, ls.setScalar(s)));
  }
  const unbroken = q.strokes < ROCK_WORK.strokes;
  bandMesh.setMatrixAt(
    q.index,
    unbroken ? local.compose(lp.set(q.x, q.y + q.r * 0.5, q.z), lq.identity(), ls.setScalar(q.r * 1.02)) : ZERO,
  );
  lumpMesh.instanceMatrix.needsUpdate = bandMesh.instanceMatrix.needsUpdate = true;
}
function solidRock(q: Rock) {
  if (q.body) removeBody(q.body);
  q.body = null;
  if (q.strokes >= ROCK_WORK.strokes) return;
  q.body = addStatic(
    { kind: 'cylinder', rTop: q.r * 0.8, rBottom: q.r * 0.8, h: q.r * 1.4, segments: 7 },
    { x: q.x, y: q.y + q.r * 0.7, z: q.z },
  );
}
for (const q of ROCK_LIST) {
  poseRock(q);
  solidRock(q);
  addFoot(q.x, q.z, 0, q.r, q.r);
}
export const whole = (q: Rock) => q.strokes < ROCK_WORK.strokes;
export function resetRocks() {
  for (const q of ROCK_LIST) {
    q.strokes = 0;
    poseRock(q);
    solidRock(q);
  }
}

// ---------------------------------------------------------------- the axes
function makeAxe(handleLen: number, headW: number, headH: number, col: string, shine: number) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, handleLen, 0.07), flat('#a9794c'));
  handle.position.y = handleLen * 0.44;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, headH, headW), flat(col, shine));
  head.position.set(0, handleLen * 0.86, -headW * 0.41);
  g.add(handle, head);
  g.traverse((o) => void (o.castShadow = true));
  return g;
}
// The first one's a poor old thing. The proper one is bigger, brighter and rings.
const AXES = [makeAxe(0.8, 0.26, 0.17, '#6b6f78', 0.7), makeAxe(1.08, 0.52, 0.34, '#dfe4ec', 0.25)];
const edge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.36, 0.06), flat('#f2b134', 0.4));
edge.position.set(0, 1.08 * 0.86, -0.52 * 0.76);
AXES[1]!.add(edge);
// The multi-axe's pick, on the back of whichever head: it breaks rocks.
const PICKS = AXES.map((a, k) => {
  const len = k ? 1.08 : 0.8;
  const pick = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, k ? 0.42 : 0.3, 6).rotateX(-Math.PI / 2),
    flat('#8d929c', 0.5),
  );
  pick.position.set(0, len * 0.86, k ? 0.3 : 0.2);
  pick.castShadow = true;
  a.add(pick);
  return pick;
});
const axe = new THREE.Group();
axe.add(AXES[0]!, AXES[1]!);
axe.visible = false;

const swing = { t: 99, target: null as Tree | null, rock: null as Rock | null, hit: true };
const RAISED = 1.5,
  STRUCK = -1.35;
const bundleTo = new THREE.Vector3(),
  bundleRot = new THREE.Quaternion(),
  popOut = new THREE.Vector3();
let logsLanded = 0;

const inner = () => (me.avatar?.userData as Worn | undefined)?.inner;
function startSwing(x: number, z: number) {
  swing.t = 0;
  swing.hit = false;
  // Square up to it: you hit what you meant to.
  const p = me.body!.position;
  me.yaw = Math.atan2(-(x - p.x), -(z - p.z));
  const i = inner();
  if (i) i.rotation.x = 0.28; // the wind-up, for this one frame's start
}
/** Press: the swing starts now. False while the last one is still going. */
export function chop(t: Tree) {
  if (swing.t < TUNE.swingS || !me.body) return false;
  swing.target = t;
  swing.rock = null;
  startSwing(t.x, t.z);
  return true;
}
export function breakRock(q: Rock) {
  if (swing.t < TUNE.swingS || !me.body) return false;
  swing.target = null;
  swing.rock = q;
  startSwing(q.x, q.z);
  return true;
}
/** Under `&coop=1`, ./coop.ts tells the other tab about each stroke. */
export const chopHooks = {
  stroke: null as ((t: Tree) => void) | null,
  rock: null as ((q: Rock) => void) | null,
};
function contact(t: Tree) {
  if (!me.body || t.fall >= 0) return; // someone else's stroke can fell it mid-swing
  t.strokes++;
  t.shake = 1;
  const p = me.body.position;
  const dx = t.x - p.x,
    dz = t.z - p.z,
    d = Math.hypot(dx, dz) || 1;
  const bark = popOut.set(t.x - (dx / d) * 0.4, t.y + 1.1, t.z - (dz / d) * 0.4);
  const good = !!job.rung.axe;
  // The proper axe rings, and it bites.
  knock((good ? 0.8 : 0.5) + t.strokes * 0.12, good ? 1.5 : 1.05);
  if (good) clank(t.x, t.z);
  chips(bark.x, bark.y, bark.z, good ? 22 : 10);
  if (good) shakeView(0.035);
  const i = inner();
  if (i) i.rotation.x = -0.5; // the lean into it; the walk's spring brings it back
  const yields = t.great ? 0 : Math.min(logsPerStroke(), back.room());
  for (let k = 0; k < yields; k++) {
    back.incoming++;
    send('log', bark, bark, {
      dur: TUNE.flyS + k * 0.03,
      apex: 1.1 + k * 0.15,
      aim: (to) => {
        if (myBundleNext(back.logs, bundleTo, bundleRot)) to.copy(bundleTo);
      },
      land: () => {
        back.incoming--;
        back.logs++;
        pop(Math.min(7, logsLanded++ % 8), 0.5);
      },
    });
  }
  if (t.strokes >= strokesFor(t)) {
    t.fall = 0;
    t.fallYaw = Math.atan2(dx, dz);
    logsLanded = 0;
    if (t.body) removeBody(t.body);
    t.body = null;
    if (t.great) placeSound('treeFall', t.x, t.z);
    else thump(t.x, t.z);
  }
  chopHooks.stroke?.(t);
}
const spark = new THREE.Color('#ffe2a0');
function contactRock(q: Rock) {
  if (!me.body || !whole(q)) return;
  q.strokes++;
  q.shake = 1;
  knock(1.4, 1.2);
  clank(q.x, q.z);
  chips(q.x, q.y + q.r, q.z, 8);
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2;
    emit({
      x: q.x,
      y: q.y + q.r,
      z: q.z,
      vx: Math.cos(a) * 3,
      vy: 2 + Math.random() * 3,
      vz: Math.sin(a) * 3,
      life: 0.4,
      size: 0.07,
      color: spark,
      gravity: 10,
    });
  }
  const i = inner();
  if (i) i.rotation.x = -0.5;
  const yields = Math.min(ROCK_WORK.stonePerStroke, back.room());
  popOut.set(q.x, q.y + q.r, q.z);
  for (let k = 0; k < yields; k++) {
    back.incoming++;
    send('stone', popOut, popOut, {
      dur: TUNE.flyS + k * 0.04,
      apex: 1.2,
      aim: (to) => {
        if (me.body) to.set(me.body.position.x, me.body.position.y + 0.7, me.body.position.z);
      },
      land: () => {
        back.incoming--;
        back.stone++;
        pop(3, 0.5);
      },
    });
  }
  poseRock(q);
  if (!whole(q)) {
    dustRing(q.x, q.y + 0.2, q.z, 10, 2.4, 0.4);
    placeSound('rockBreak', q.x, q.z);
    solidRock(q);
  }
  chopHooks.rock?.(q);
}
/** From another tab: a rock hit there. */
export function rockStruck(q: Rock, strokes: number) {
  q.strokes = Math.max(q.strokes, strokes);
  chips(q.x, q.y + q.r, q.z, 6);
  poseRock(q);
  solidRock(q);
}
/** Trade whatever's on your back for the one big thing. */
export function shoulder(what: Exclude<BigThing, null>) {
  back.logs = back.rails = back.stone = 0;
  back.big = what;
  back.beam = what === 'beam' ? 1 : 0;
  if (what === 'beam') {
    setTrunkTaken(true);
    const p = me.body?.position;
    if (p) placeSound('shoulder', p.x, p.z);
  }
}
export function setTrunkTaken(v: boolean) {
  trunk.taken = v;
  solidTree(greatTree);
  pose(greatTree, 0);
}
export const trunkTaken = () => trunk.taken;
export const putDownBig = () => {
  back.big = null;
  back.beam = 0;
};

sharedSlice('felled', {
  get: () => ({
    trees: fellenList(),
    yaw: TREES.filter((t) => t.fall >= 0).map((t) => +t.fallYaw.toFixed(3)),
    rocks: ROCK_LIST.map((q) => q.strokes),
    trunk: trunk.taken,
  }),
  set: (v) => {
    const j = (v ?? {}) as { trees?: unknown; yaw?: unknown; rocks?: unknown; trunk?: unknown };
    resetTrees();
    resetRocks();
    trunk.taken = j.trunk === true;
    if (Array.isArray(j.trees))
      j.trees.forEach((k, m) => {
        if (!count(k, TREES.length - 1)) return;
        const y = Array.isArray(j.yaw) ? (j.yaw[m] as unknown) : 0;
        TREES[k]!.fallYaw = typeof y === 'number' && Number.isFinite(y) ? y : 0;
        restoreFellen([k]);
      });
    if (Array.isArray(j.rocks))
      j.rocks.forEach((s, k) => {
        const q = ROCK_LIST[k];
        if (!q || !count(s, ROCK_WORK.strokes)) return;
        q.strokes = s;
        poseRock(q);
        solidRock(q);
      });
  },
});

export const felled = { n: 0 };
/** Each frame. */
export function updateChop(dt: number, now: number) {
  const f = frameOf();
  if (f && axe.parent !== f) {
    f.add(axe);
    axe.position.set(0.42, 0.72, -0.2);
    // Build after the prototype's modules have loaded; gifts and the carry view share the mesh.
    if (!packFrame.children.length) {
      const pack = packFrameMesh();
      pack.castShadow = pack.receiveShadow = true;
      packFrame.add(pack);
    }
    f.add(railsWorn, stoneWorn, beamWorn, boilerWorn, packFrame);
  }
  railsWorn.count = Math.max(0, Math.min(railsWorn.instanceMatrix.count, back.rails));
  railsWorn.visible = back.rails > 0;
  stoneWorn.count = Math.max(0, Math.min(stoneWorn.instanceMatrix.count, back.stone));
  stoneWorn.visible = back.stone > 0;
  beamWorn.visible = back.big === 'beam';
  boilerWorn.visible = back.big === 'boiler';
  packFrame.visible = !!job.rung.pack;
  if (back.big) input.sprint = false; // you can't run with that
  AXES[0]!.visible = !job.rung.axe;
  AXES[1]!.visible = !!job.rung.axe;
  for (const p of PICKS) p.visible = job.rung.multi;
  swing.t += dt;
  const c = TUNE.contactS;
  axe.visible = swing.t < 0.9;
  if (swing.t < c) axe.rotation.x = RAISED + (STRUCK - RAISED) * (swing.t / c);
  else if (swing.t < 0.3) axe.rotation.x = STRUCK + (0.2 - STRUCK) * ((swing.t - c) / (0.3 - c));
  else axe.rotation.x = 0.2;
  if (!swing.hit && swing.t >= c) {
    swing.hit = true;
    if (swing.target) contact(swing.target);
    else if (swing.rock) contactRock(swing.rock);
  }
  for (const t of TREES) {
    if (t.shake > 0) {
      t.shake = Math.max(0, t.shake - dt * 3.2);
      pose(t, now);
    }
    if (t.fall >= 0 && t.fall < 0.8) {
      t.fall += dt / (t.great ? 1.7 : 1);
      pose(t, now);
      if (t.fall >= 0.75) {
        t.fall = 1;
        felled.n++;
        if (t.great) placeSound('treeLand', t.x, t.z);
        else thump(t.x, t.z);
        dustRing(
          t.x + Math.sin(t.fallYaw) * 5,
          t.y + 0.2,
          t.z + Math.cos(t.fallYaw) * 5,
          t.great ? 40 : 16,
          t.great ? 6 : 3.4,
          t.great ? 1 : 0.6,
        );
        shedCrown(t);
        if (t.great) {
          shakeView(0.3);
        }
        pose(t, now);
        solidTree(t);
      }
    }
  }
  for (const q of ROCK_LIST)
    if (q.shake > 0) {
      q.shake = Math.max(0, q.shake - dt * 5);
      if (whole(q)) poseRock(q);
    }
}
for (const t of TREES) {
  pose(t, 0);
  solidTree(t);
}
