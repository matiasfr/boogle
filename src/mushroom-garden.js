// Mushroom garden in the game: the seed stall, the watering can, mushroom meshes and their bouncy colliders.
// Shared state lives in src/sim/mushrooms.js and changes only through world/sync edits.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL, HALF, REACH, isTouch, reducedMotion } from './constants.js';
import { heights, groundHeight } from './terrain.js';
import { scene } from './scene.js';
import { obstacles } from './props.js';
import { world, groundMat, playerMat, ballMat } from './physics.js';
import { me } from './player.js';
import { registerOp, registerState, onTick, submitEdit } from './world/sync.js';
import { isLegacyCell, LEGACY_SHIFT } from './world/legacy-grid.js';
import {
  GROW_TICKS,
  inPatch,
  createGarden,
  canPlant,
  plant,
  canWater,
  water,
  tickGarden,
  serializeGarden,
  loadGarden,
  hashGarden,
} from './sim/mushrooms.js';

const SEEDS_PER_VISIT = 5;
const BOUNCE_SPEED = 15;
const STEM_H = 0.85;
const STEM_TOP_R = 0.32;
const STEM_BASE_R = 0.42;
const CAP_R = 1.9;
const CAP_T = 0.35;
const STALL = { x: 15.2, z: 13.4, yaw: 3.0 };

const garden = createGarden();
const tool = { kind: null, seeds: 0, pourUntil: 0 };

registerOp('mush.plant', {
  validate: (e) => canPlant(garden, e.i, e.j),
  apply: (e) => plant(garden, e.i, e.j),
});
registerOp('mush.water', {
  validate: (e) => canWater(garden, e.i, e.j),
  apply: (e) => water(garden, e.i, e.j),
});
registerState('mushrooms', {
  serialize: () => serializeGarden(garden),
  load: (json) =>
    loadGarden(
      garden,
      Array.isArray(json)
        ? json.map((v, k) =>
            k % 3 < 2 && isLegacyCell(json[k - (k % 3)], json[k - (k % 3) + 1]) ? v + LEGACY_SHIFT : v,
          )
        : json,
    ),
  hash: () => hashGarden(garden),
});
onTick(() => tickGarden(garden));

const cellX = (i) => i * CELL - HALF;
const cellZ = (j) => HALF - j * CELL;

// ---------------------------------------------------------------- physics
const mushroomMat = new CANNON.Material('mushroom');
world.addContactMaterial(new CANNON.ContactMaterial(mushroomMat, playerMat, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(mushroomMat, ballMat, { friction: 0.3, restitution: 0.95 }));

const capBodies = new Map(); // body -> visual

function addMushroomBody(x, y, z) {
  const body = new CANNON.Body({ mass: 0, material: mushroomMat });
  body.addShape(new CANNON.Cylinder(STEM_TOP_R, STEM_BASE_R, STEM_H, 10), new CANNON.Vec3(0, STEM_H / 2, 0));
  body.addShape(new CANNON.Cylinder(CAP_R, CAP_R * 0.85, CAP_T, 16), new CANNON.Vec3(0, STEM_H + CAP_T / 2, 0));
  body.position.set(x, y, z);
  world.addBody(body);
  return body;
}

world.addEventListener('postStep', () => {
  const b = me.body;
  if (!b) return;
  for (const c of world.contacts) {
    const other = c.bi === b ? c.bj : c.bj === b ? c.bi : null;
    const vis = other && capBodies.get(other);
    if (!vis) continue;
    if (b.position.y < other.position.y + STEM_H) continue;
    b.velocity.y = BOUNCE_SPEED;
    me.coyote = 0;
    vis.squishAt = performance.now();
    break;
  }
});

// ---------------------------------------------------------------- meshes
const capProfile = [
  [0, 0],
  [CAP_R * 0.85, 0],
  [CAP_R, CAP_T * 0.45],
  [CAP_R * 0.97, CAP_T * 0.85],
  [CAP_R * 0.85, CAP_T],
  [0, CAP_T * 1.05],
].map(([x, y]) => new THREE.Vector2(x, y));
const capGeo = new THREE.LatheGeometry(capProfile, 20);
const stemGeo = new THREE.CylinderGeometry(STEM_TOP_R, STEM_BASE_R, STEM_H, 12).translate(0, STEM_H / 2, 0);
// All six cap spots in one geometry: one draw per mushroom instead of six.
const spotGeo = mergeGeometries(
  [
    [0.3, 0.55, 0.22],
    [2.2, 0.9, 0.18],
    [3.9, 0.75, 0.2],
    [5.3, 1.15, 0.15],
    [1.3, 1.25, 0.14],
    [0, 0, 0.2],
  ].map(([a, r, s]) =>
    new THREE.SphereGeometry(s, 8, 4)
      .scale(1, 0.25, 1)
      .translate(Math.cos(a) * r, CAP_T * (r > 1.1 ? 0.95 : 1.02), Math.sin(a) * r),
  ),
);
const moundGeo = new THREE.SphereGeometry(0.42, 10, 6).scale(1, 0.35, 1);
const sproutGeo = new THREE.ConeGeometry(0.07, 0.35, 5).translate(0, 0.17, 0);
const capMat = new THREE.MeshStandardMaterial({ color: '#e5483b', roughness: 0.6, flatShading: true });
const stemMat = new THREE.MeshStandardMaterial({ color: '#f6ead2', roughness: 0.8 });
const spotMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.7 });
const moundMat = new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 1, flatShading: true });
const wetMat = new THREE.MeshStandardMaterial({ color: '#46301d', roughness: 0.6, flatShading: true });
const sproutMat = new THREE.MeshStandardMaterial({ color: '#7fd14a', roughness: 0.8 });

function makeMushroomMesh() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(stemGeo, stemMat);
  const cap = new THREE.Group();
  cap.position.y = STEM_H;
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.castShadow = capMesh.receiveShadow = stem.castShadow = stem.receiveShadow = true;
  const spots = new THREE.Mesh(spotGeo, spotMat); // sits on the cap, so its shadow would never show
  spots.receiveShadow = true;
  cap.add(capMesh, spots);
  g.add(stem, cap);
  return g;
}

const visuals = new Map(); // "i,j" -> { root, mound, sprout, shroom, body, shown, squishAt }

function makeVisual(p) {
  const x = cellX(p.i),
    z = cellZ(p.j),
    y = heights[p.i][p.j];
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const mound = new THREE.Mesh(moundGeo, moundMat);
  mound.receiveShadow = true;
  const sprout = new THREE.Mesh(sproutGeo, sproutMat);
  sprout.position.y = 0.08;
  const shroom = makeMushroomMesh();
  shroom.scale.setScalar(0.001);
  root.add(mound, sprout, shroom);
  scene.add(root);
  return { root, mound, sprout, shroom, body: null, shown: 0, squishAt: 0 };
}

// Overshoots then settles, so the mushroom pops up.
const easeOutBack = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

function updateMushrooms(dt, now) {
  for (const p of garden.plots) {
    const key = `${p.i},${p.j}`;
    let v = visuals.get(key);
    if (!v) visuals.set(key, (v = makeVisual(p)));
    const target = p.g / GROW_TICKS;
    v.shown = reducedMotion ? target : Math.min(target, v.shown + (dt * 10) / GROW_TICKS);
    v.mound.material = p.g > 0 ? wetMat : moundMat;
    v.sprout.visible = p.g > 0 && v.shown < 0.15;
    const s = v.shown > 0 ? Math.max(0.001, easeOutBack(v.shown)) : 0.001;
    const sinceSquish = (now - v.squishAt) / 1000;
    const squish = !reducedMotion && sinceSquish < 0.5 ? Math.sin(sinceSquish * 25) * 0.18 * (1 - sinceSquish * 2) : 0;
    v.shroom.scale.set(s * (1 + squish * 0.5), s * (1 - squish), s * (1 + squish * 0.5));
    if (p.g >= GROW_TICKS && !v.body) {
      v.body = addMushroomBody(v.root.position.x, v.root.position.y, v.root.position.z);
      capBodies.set(v.body, v);
    }
  }
}

// ---------------------------------------------------------------- stall
const wood = new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.9, flatShading: true });
const woodDk = new THREE.MeshStandardMaterial({ color: '#7d5230', roughness: 0.9, flatShading: true });
const canMat = new THREE.MeshStandardMaterial({ color: '#4fa3d9', roughness: 0.35, metalness: 0.3 });
const bagMat = new THREE.MeshStandardMaterial({ color: '#d8b98a', roughness: 1, flatShading: true });

function stripedAwning() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 8;
  const g = c.getContext('2d');
  for (let k = 0; k < 8; k++) {
    g.fillStyle = k % 2 ? '#fffaf0' : '#e5483b';
    g.fillRect(k * 16, 0, 16, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide });
}

function makeCan() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.34, 14).translate(0, 0.17, 0), canMat));
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 8), canMat);
  spout.position.set(0, 0.24, -0.27);
  spout.rotation.x = -0.9;
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.05, 10), canMat);
  rose.position.set(0, 0.39, -0.44);
  rose.rotation.x = -0.9;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), canMat);
  handle.position.set(0, 0.34, 0.02);
  handle.rotation.y = Math.PI / 2;
  g.add(spout, rose, handle);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

function makeSeedBag() {
  const g = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6).scale(1, 1.15, 0.8), bagMat);
  bag.position.y = 0.16;
  const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.08, 8), woodDk);
  tie.position.y = 0.33;
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), capMat);
  label.position.set(0, 0.17, -0.13);
  label.rotation.y = Math.PI;
  g.add(bag, tie, label);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

const stall = new THREE.Group();
const pickups = []; // { kind, local: Vector3, world: Vector3 }
{
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    stall.add(m);
    return m;
  };
  box(2.8, 0.9, 0.9, wood, 0, 0.45, 0);
  box(2.9, 0.08, 1.0, woodDk, 0, 0.92, 0);
  for (const sx of [-1.35, 1.35]) box(0.12, 2.4, 0.12, woodDk, sx, 1.2, 0.35);
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), stripedAwning());
  awning.position.set(0, 2.35, -0.05);
  awning.rotation.x = -Math.PI / 2 + 0.45;
  awning.castShadow = true;
  stall.add(awning);
  box(0.9, 0.3, 0.6, woodDk, -0.7, 1.11, 0);
  for (let k = 0; k < 3; k++) {
    const bag = makeSeedBag();
    bag.position.set(-0.95 + k * 0.25, 1.2, (k % 2) * 0.12 - 0.05);
    stall.add(bag);
  }
  const can = makeCan();
  can.position.set(0.75, 0.96, 0);
  can.rotation.y = 0.6;
  stall.add(can);
  pickups.push({ kind: 'seeds', local: new THREE.Vector3(-0.7, 1.2, 0) });
  pickups.push({ kind: 'can', local: new THREE.Vector3(0.75, 1.1, 0) });

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), signMaterial());
  sign.position.set(0, 1.95, -0.48);
  sign.rotation.y = Math.PI;
  stall.add(sign);
}

function signMaterial() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7d5230';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#fffaf0';
  g.font = '400 36px "Lilita One", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Mushroom seeds', 128, 34, 240);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

export function createStall() {
  const y = groundHeight(STALL.x, STALL.z) - 0.05;
  stall.position.set(STALL.x, y, STALL.z);
  stall.rotation.y = STALL.yaw;
  scene.add(stall);
  stall.updateMatrixWorld(true);
  for (const p of pickups) p.world = stall.localToWorld(p.local.clone());

  const body = new CANNON.Body({ mass: 0, material: groundMat });
  body.addShape(new CANNON.Box(new CANNON.Vec3(1.4, 0.5, 0.45)), new CANNON.Vec3(0, 0.5, 0));
  body.position.set(STALL.x, y, STALL.z);
  body.quaternion.setFromEuler(0, STALL.yaw, 0);
  world.addBody(body);
  obstacles.push({ x: STALL.x, z: STALL.z, r: 1.5 });
}

// ---------------------------------------------------------------- held tool
const heldCan = makeCan();
const heldBag = makeSeedBag();
heldCan.visible = heldBag.visible = false;
scene.add(heldCan, heldBag);

function leftHand(out) {
  const p = me.body.interpolatedPosition;
  const s = Math.sin(me.yaw),
    c = Math.cos(me.yaw);
  return out.set(p.x - s * 0.55 - c * 0.55, p.y + 0.35, p.z - c * 0.55 + s * 0.55);
}

function updateHeld(now) {
  heldCan.visible = !!me.body && tool.kind === 'can';
  heldBag.visible = !!me.body && tool.kind === 'seeds';
  const held = heldCan.visible ? heldCan : heldBag.visible ? heldBag : null;
  if (!held) return;
  leftHand(held.position);
  held.rotation.set(0, me.yaw, 0);
  if (held === heldCan && now < tool.pourUntil) held.rotateX(-0.9);
}

// ---------------------------------------------------------------- actions
function nearestPickup() {
  if (!me.body) return null;
  const at = me.body.interpolatedPosition;
  let best = null,
    bestD = REACH + 0.6;
  for (const p of pickups) {
    if (!p.world) continue;
    const d = Math.hypot(p.world.x - at.x, p.world.z - at.z);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

function plantCell() {
  const p = me.body.interpolatedPosition;
  const x = p.x - Math.sin(me.yaw) * 0.9,
    z = p.z - Math.cos(me.yaw) * 0.9;
  return { i: Math.round((x + HALF) / CELL), j: Math.round((HALF - z) / CELL) };
}

function plotToWater() {
  const p = me.body.interpolatedPosition;
  let best = null,
    bestD = REACH;
  for (const plot of garden.plots) {
    if (plot.g !== 0) continue;
    const d = Math.hypot(cellX(plot.i) - p.x, cellZ(plot.j) - p.z);
    if (d < bestD) {
      best = plot;
      bestD = d;
    }
  }
  return best;
}

// Returns { label, run } for what a click would do right now, or null.
function currentAction() {
  if (!me.entered || !me.body) return null;
  const pick = nearestPickup();
  if (pick?.kind === 'seeds' && !(tool.kind === 'seeds' && tool.seeds >= SEEDS_PER_VISIT)) {
    return {
      label: 'take mushroom seeds',
      button: 'Take',
      run: () => Object.assign(tool, { kind: 'seeds', seeds: SEEDS_PER_VISIT }),
    };
  }
  if (pick?.kind === 'can' && tool.kind !== 'can') {
    return { label: 'take the watering can', button: 'Take', run: () => (tool.kind = 'can') };
  }
  if (tool.kind === 'seeds') {
    const { i, j } = plantCell();
    if (!canPlant(garden, i, j)) return null;
    return {
      label: 'bury a seed',
      button: 'Plant',
      run: () => {
        if (submitEdit({ op: 'mush.plant', i, j }) && --tool.seeds <= 0) tool.kind = null;
      },
    };
  }
  if (tool.kind === 'can') {
    const plot = plotToWater();
    if (!plot) return null;
    return {
      label: 'water the seed',
      button: 'Water',
      run: () => {
        if (submitEdit({ op: 'mush.water', i: plot.i, j: plot.j })) tool.pourUntil = performance.now() + 600;
      },
    };
  }
  return null;
}

export function gardenAction() {
  const a = currentAction();
  if (!a) return false;
  a.run();
  return true;
}

export function gardenHint() {
  const a = currentAction();
  if (a) return { text: `${isTouch ? `Tap ${a.button}` : 'Click'} to ${a.label}`, button: a.button };
  if (tool.kind === 'seeds') {
    const { i, j } = plantCell();
    return { text: inPatch(i, j) ? 'Too close to another mushroom' : 'Bury seeds in the dirt by the stall' };
  }
  if (tool.kind === 'can') return { text: 'Water a buried seed to grow it' };
  return null;
}

export const seedCount = () => (tool.kind === 'seeds' ? tool.seeds : 0);
export function giveSeed() {
  if (seedCount() <= 0) return false;
  if (--tool.seeds <= 0) tool.kind = null;
  return true;
}

export function toolLabel() {
  if (tool.kind === 'seeds') return `Mushroom seeds ×${tool.seeds}`;
  if (tool.kind === 'can') return 'Watering can';
  return '';
}

export function updateGarden(dt, now) {
  updateMushrooms(dt, now);
  updateHeld(now);
}
