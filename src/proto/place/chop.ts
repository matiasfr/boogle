// The chop and the back of ?proto=place. The swing starts on the frame you press, the axe meets the bark about 60 ms later,
// the tree shakes and logs fly straight to your back. All of it Local, in this file: no waiting on the host, no spill and
// rest and notice (the delay the owner felt). Three strokes, four logs a stroke, and the third fells the tree.
// docs/research/harvest-feel.md, summary 1-3. Your back is the game's bundle, drawn from a count kept here through
// `backSeam`, and a few rails strapped upright behind it once you carry rails.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { me } from '../../player/player.ts';
import { backSeam, myBundleNext } from '../../features/haul-stack.ts';
import { thump } from '../../render/machine-sfx.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { knock, pop } from '../minis/common.ts';
import { flat } from '../flat.ts';
import { H } from './land.ts';
import { LOOK, STEEL, paint } from './look.ts';
import { GROVES, ORIGIN, TUNE } from './layout.ts';
import { RAIL_SIZE, chips, dustRing, send } from './pieces.ts';

// ---------------------------------------------------------------- your back
export const back = {
  logs: 0,
  rails: 0,
  incoming: 0, // pieces in the air on their way here
  room: () => TUNE.carry - back.logs - back.rails - back.incoming,
};
backSeam.flyIns = false;
backSeam.count = () => back.logs;

type Worn = { inner?: THREE.Object3D; loadFit?: { frame: THREE.Object3D } };
const frameOf = () => {
  const u = me.avatar?.userData as Worn | undefined;
  return u?.loadFit?.frame ?? u?.inner ?? null;
};
const railsWorn = new THREE.InstancedMesh(
  new THREE.BoxGeometry(RAIL_SIZE.x * 0.6, RAIL_SIZE.z * 0.5, RAIL_SIZE.y * 0.6),
  LOOK.mats ? paint(STEEL) : flat('#4c5058', 0.6),
  TUNE.carry,
);
railsWorn.castShadow = true;
railsWorn.frustumCulled = false;
railsWorn.count = 0;
const worn = new THREE.Object3D();
for (let k = 0; k < TUNE.carry; k++) {
  worn.position.set((k % 4) * 0.12 - 0.18, 0.9, 0.62 + Math.floor(k / 4) * 0.11);
  worn.rotation.x = 0.12;
  worn.updateMatrix();
  railsWorn.setMatrixAt(k, worn.matrix);
}

// ---------------------------------------------------------------- the trees
export type Tree = {
  index: number;
  x: number;
  y: number;
  z: number;
  size: number;
  strokes: number;
  shake: number; // 1 on a hit, decaying
  fall: number; // s since it was felled, -1 standing
  fallYaw: number;
  at: THREE.Vector3;
};

const rng = mulberry32(77);
export const TREES: Tree[] = GROVES.flatMap((g) => {
  const out: Tree[] = [];
  for (let k = 0; k < g.n; k++) {
    const a = (k / g.n) * Math.PI * 2 + rng() * 0.5,
      r = g.r * (0.35 + rng() * 0.65);
    const x = g.x + Math.cos(a) * r + ORIGIN.x,
      z = g.z + Math.sin(a) * r + ORIGIN.z;
    const y = H(x, z);
    out.push({
      index: 0,
      x,
      y,
      z,
      size: 0.9 + rng() * 0.3,
      strokes: 0,
      shake: 0,
      fall: -1,
      fallYaw: 0,
      at: new THREE.Vector3(x, y + 1.7, z),
    });
  }
  return out;
});
TREES.forEach((t, k) => (t.index = k));

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
  parts.trunk.setMatrixAt(t.index, at(2.5));
  parts.crown.setMatrixAt(t.index, at(7.2));
  parts.crown2.setMatrixAt(t.index, at(10));
  parts.ribbon.setMatrixAt(t.index, at(1.15));
  parts.stump.setMatrixAt(t.index, t.fall >= 0 ? local.makeTranslation(t.x, t.y + 0.3, t.z) : ZERO);
  for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
}
export function resetTrees() {
  for (const t of TREES) {
    t.strokes = 0;
    t.shake = 0;
    t.fall = -1;
    pose(t, 0);
  }
}
/** Trees already down, by index: what a reload keeps. */
export const fellenList = () => TREES.filter((t) => t.fall >= 0).map((t) => t.index);
export function restoreFellen(list: number[]) {
  for (const k of list) {
    const t = TREES[k];
    if (!t) continue;
    t.fall = 1;
    t.strokes = TUNE.strokes;
    pose(t, 0);
  }
}
export const standing = (t: Tree) => t.fall < 0;

// ---------------------------------------------------------------- the axe
const axe = new THREE.Group();
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.07), flat('#a9794c'));
handle.position.y = 0.42;
const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.34), flat('#6b6f78', 0.5));
head.position.set(0, 0.82, -0.14);
axe.add(handle, head);
axe.traverse((o) => void (o.castShadow = true));
axe.visible = false;

const swing = { t: 99, target: null as Tree | null, hit: true };
const RAISED = 1.5,
  STRUCK = -1.35;
const bundleTo = new THREE.Vector3(),
  bundleRot = new THREE.Quaternion(),
  popOut = new THREE.Vector3();
let logsLanded = 0;

/** Press: the swing starts now. False while the last one is still going. */
export function chop(t: Tree) {
  if (swing.t < TUNE.swingS || !me.body) return false;
  swing.t = 0;
  swing.target = t;
  swing.hit = false;
  // Square up to the tree: you hit what you meant to.
  const p = me.body.position;
  me.yaw = Math.atan2(-(t.x - p.x), -(t.z - p.z));
  const inner = (me.avatar?.userData as Worn | undefined)?.inner;
  if (inner) inner.rotation.x = 0.28; // the wind-up, for this one frame's start
  return true;
}
function contact(t: Tree) {
  if (!me.body) return;
  t.strokes++;
  t.shake = 1;
  const p = me.body.position;
  const dx = t.x - p.x,
    dz = t.z - p.z,
    d = Math.hypot(dx, dz) || 1;
  const bark = popOut.set(t.x - (dx / d) * 0.4, t.y + 1.1, t.z - (dz / d) * 0.4);
  knock(0.55 + t.strokes * 0.15, 1.1);
  chips(bark.x, bark.y, bark.z, 12);
  const inner = (me.avatar?.userData as Worn | undefined)?.inner;
  if (inner) inner.rotation.x = -0.5; // the lean into it; the walk's spring brings it back
  const count = Math.min(TUNE.logsPerStroke, back.room());
  for (let k = 0; k < count; k++) {
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
  if (t.strokes >= TUNE.strokes) {
    t.fall = 0;
    t.fallYaw = Math.atan2(dx, dz);
    logsLanded = 0;
    thump(t.x, t.z);
  }
}
export const felled = { n: 0 };
/** Each frame. */
export function updateChop(dt: number, now: number) {
  const f = frameOf();
  if (f && axe.parent !== f) {
    f.add(axe);
    axe.position.set(0.42, 0.72, -0.2);
    f.add(railsWorn);
  }
  railsWorn.count = back.rails;
  railsWorn.visible = back.rails > 0;
  swing.t += dt;
  const c = TUNE.contactS;
  axe.visible = swing.t < 0.9;
  if (swing.t < c) axe.rotation.x = RAISED + (STRUCK - RAISED) * (swing.t / c);
  else if (swing.t < 0.3) axe.rotation.x = STRUCK + (0.2 - STRUCK) * ((swing.t - c) / (0.3 - c));
  else axe.rotation.x = 0.2;
  if (!swing.hit && swing.t >= c && swing.target) {
    swing.hit = true;
    contact(swing.target);
  }
  for (const t of TREES) {
    if (t.shake > 0) {
      t.shake = Math.max(0, t.shake - dt * 3.2);
      pose(t, now);
    }
    if (t.fall >= 0 && t.fall < 0.8) {
      t.fall += dt;
      pose(t, now);
      if (t.fall >= 0.75) {
        t.fall = 1;
        felled.n++;
        thump(t.x, t.z);
        dustRing(t.x + Math.sin(t.fallYaw) * 5, t.y + 0.2, t.z + Math.cos(t.fallYaw) * 5, 16, 3.4, 0.6);
        pose(t, now);
      }
    }
  }
}
for (const t of TREES) pose(t, 0);
