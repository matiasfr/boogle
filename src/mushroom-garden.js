// Mushroom garden in the game: the seed stall, planting and watering, mushroom meshes and their bouncy colliders.
// Shared state lives in src/sim/mushrooms.js and changes only through world/sync edits. Seeds and the watering can are
// hotbar items (src/inventory.js); src/hands.js calls plantFront and pour when you use them.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL, HALF, GRID_RES, REACH, SEA, PLAYER_R, HEAD_OFFSET, reducedMotion } from './constants.js';
import { heights, groundHeight } from './terrain.js';
import { scene } from './scene.js';
import { obstacles } from './props.js';
import { world, groundMat, playerMat, ballMat, GROUP } from './physics.js';
import { me } from './player.js';
import { registerOp, registerState, onTick, submitEdit } from './world/sync.js';
import { isLegacyCell, LEGACY_SHIFT } from './world/legacy-grid.js';
import { waterField } from './water-field.js';
import { dropPoint } from './flight.js';
import { splash } from './splash.js';
import { itemModel } from './item-models.js';
import { inv, take, has, roomFor, slotOf, useOne, MAX_SEEDS } from './inventory.js';
import {
  GROW_TICKS,
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
const MIN_BODY = 0.12; // a sprout this small has no collider yet
const RESHAPE = 0.03; // rebuild a growing mushroom's collider once its scale has moved this much
const PUSH = 5.5; // m/s: a growing mushroom shoves you out from under it at least this fast
const STALL = { x: 15.2, z: 13.4, yaw: 3.0 };

export const garden = createGarden();
const pourAt = { until: 0 };

const cellX = (i) => i * CELL - HALF;
const cellZ = (j) => HALF - j * CELL;

// Host check before a seed goes in: open, dry land with nothing (rock, tree, wall, cap) over the spot.
export function plantOk(i, j) {
  if (!canPlant(garden, i, j) || i < 1 || j < 1 || i > GRID_RES - 2 || j > GRID_RES - 2) return false;
  const x = cellX(i),
    z = cellZ(j),
    g = heights[i][j];
  if (g < SEA + 0.1 || waterField.surfaceAt(x, z) > g + 0.02) return false;
  return dropPoint(new THREE.Vector3(x, g + 3, z)).y < g + 0.2;
}
// A thrown seed that landed somewhere plantOk accepted (src/gifts.js `gift.toss`).
export const plantSeed = (i, j) => plant(garden, i, j);

registerOp('mush.plant', {
  validate: (e) => plantOk(e.i, e.j),
  apply: (e) => plant(garden, e.i, e.j),
});
registerOp('mush.water', {
  validate: (e) => canWater(garden, e.i, e.j),
  apply: (e) => {
    if (!water(garden, e.i, e.j)) return;
    const x = cellX(e.i),
      z = cellZ(e.j);
    splash(x, z, 0.12, groundHeight(x, z));
  },
});
// Snapshots from before the island grew are bare arrays on the old 129-cell grid; move those cells.
const migrate = (json) =>
  Array.isArray(json)
    ? json.map((v, k) => (k % 3 < 2 && isLegacyCell(json[k - (k % 3)], json[k - (k % 3) + 1]) ? v + LEGACY_SHIFT : v))
    : json;
registerState('mushrooms', {
  serialize: () => serializeGarden(garden),
  load: (json) => loadGarden(garden, migrate(json)),
  hash: () => hashGarden(garden),
});
onTick(() => tickGarden(garden));

// ---------------------------------------------------------------- physics
const mushroomMat = new CANNON.Material('mushroom');
world.addContactMaterial(new CANNON.ContactMaterial(mushroomMat, playerMat, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(mushroomMat, ballMat, { friction: 0.3, restitution: 0.95 }));

const capBodies = new Map(); // body -> visual

// Cannon shapes cannot scale, so a growing mushroom gets fresh ones every few percent of growth.
function shapeBody(v, s) {
  if (!v.body) {
    v.body = new CANNON.Body({ mass: 0, material: mushroomMat, collisionFilterGroup: GROUP.SCENERY });
    v.body.position.copy(v.root.position);
    world.addBody(v.body);
    capBodies.set(v.body, v);
  }
  const b = v.body;
  while (b.shapes.length) b.removeShape(b.shapes[0]);
  b.addShape(
    new CANNON.Cylinder(STEM_TOP_R * s, STEM_BASE_R * s, STEM_H * s, 10),
    new CANNON.Vec3(0, (STEM_H * s) / 2, 0),
  );
  b.addShape(
    new CANNON.Cylinder(CAP_R * s, CAP_R * 0.85 * s, CAP_T * s, 16),
    new CANNON.Vec3(0, (STEM_H + CAP_T / 2) * s, 0),
  );
  b.aabbNeedsUpdate = true;
  v.bodyS = s;
}

world.addEventListener('postStep', () => {
  const b = me.body;
  if (!b) return;
  for (const c of world.contacts) {
    const other = c.bi === b ? c.bj : c.bj === b ? c.bi : null;
    const vis = other && capBodies.get(other);
    if (!vis) continue;
    if (b.position.y < other.position.y + STEM_H * vis.bodyS) continue;
    b.velocity.y = BOUNCE_SPEED * (0.55 + 0.45 * Math.min(1, vis.bodyS));
    me.coyote = 0;
    vis.squishAt = performance.now();
    break;
  }
});

// A mushroom growing into you shoves you out from under its cap (you ride up and bounce if you are on top).
world.addEventListener('preStep', () => {
  const b = me.body;
  if (!b) return;
  for (const v of visuals.values()) {
    if (!v.body || v.shown >= 1) continue;
    const base = v.root.position,
      s = v.bodyS;
    const feet = b.position.y - PLAYER_R;
    if (feet > base.y + (STEM_H + CAP_T) * s - 0.1 || b.position.y + HEAD_OFFSET + PLAYER_R < base.y) continue;
    const dx = b.position.x - base.x,
      dz = b.position.z - base.z;
    const d = Math.hypot(dx, dz);
    if (d >= CAP_R * s + PLAYER_R) continue;
    const nx = d > 0.01 ? dx / d : 1,
      nz = d > 0.01 ? dz / d : 0;
    const out = b.velocity.x * nx + b.velocity.z * nz;
    if (out >= PUSH) continue;
    b.velocity.x += nx * (PUSH - out);
    b.velocity.z += nz * (PUSH - out);
    b.velocity.y = Math.max(b.velocity.y, 2.5);
    v.squishAt = performance.now();
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

const visuals = new Map(); // "i,j" -> { root, mound, sprout, shroom, body, bodyS, shown, squishAt }

function makeVisual(p) {
  const root = new THREE.Group();
  root.position.set(cellX(p.i), heights[p.i][p.j], cellZ(p.j));
  const mound = new THREE.Mesh(moundGeo, moundMat);
  mound.receiveShadow = true;
  const sprout = new THREE.Mesh(sproutGeo, sproutMat);
  sprout.position.y = 0.08;
  const shroom = makeMushroomMesh();
  shroom.scale.setScalar(0.001);
  root.add(mound, sprout, shroom);
  scene.add(root);
  return { root, mound, sprout, shroom, body: null, bodyS: 0, shown: 0, squishAt: 0 };
}

// Overshoots then settles, so the mushroom pops up.
const easeOutBack = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

function updateMushrooms(dt, now) {
  for (const p of garden.plots) {
    const key = `${p.i},${p.j}`;
    let v = visuals.get(key);
    if (!v) visuals.set(key, (v = makeVisual(p)));
    // Mushrooms grow anywhere now, sand included, so they follow the ground when someone digs beside them.
    const gy = heights[p.i][p.j];
    if (v.root.position.y !== gy) {
      v.root.position.y = gy;
      if (v.body) {
        v.body.position.y = gy;
        v.body.aabbNeedsUpdate = true;
      }
    }
    const target = p.g / GROW_TICKS;
    v.shown = reducedMotion ? target : Math.min(target, v.shown + (dt * 10) / GROW_TICKS);
    v.mound.material = p.g > 0 ? wetMat : moundMat;
    v.sprout.visible = p.g > 0 && v.shown < 0.15;
    const s = v.shown > 0 ? Math.max(0.001, easeOutBack(v.shown)) : 0.001;
    const sinceSquish = (now - v.squishAt) / 1000;
    const squish = !reducedMotion && sinceSquish < 0.5 ? Math.sin(sinceSquish * 25) * 0.18 * (1 - sinceSquish * 2) : 0;
    v.shroom.scale.set(s * (1 + squish * 0.5), s * (1 - squish), s * (1 + squish * 0.5));
    if (s >= MIN_BODY && (Math.abs(s - v.bodyS) >= RESHAPE || (v.shown >= 1 && v.bodyS !== s))) shapeBody(v, s);
  }
}

// ---------------------------------------------------------------- stall
const wood = new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.9, flatShading: true });
const woodDk = new THREE.MeshStandardMaterial({ color: '#7d5230', roughness: 0.9, flatShading: true });

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
    const bag = itemModel('seeds');
    bag.position.set(-0.95 + k * 0.25, 1.2, (k % 2) * 0.12 - 0.05);
    stall.add(bag);
  }
  const can = itemModel('can');
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

  const body = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: GROUP.SCENERY });
  body.addShape(new CANNON.Box(new CANNON.Vec3(1.4, 0.5, 0.45)), new CANNON.Vec3(0, 0.5, 0));
  body.position.set(STALL.x, y, STALL.z);
  body.quaternion.setFromEuler(0, STALL.yaw, 0);
  world.addBody(body);
  obstacles.push({ x: STALL.x, z: STALL.z, r: 1.5 });
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

// What grabbing at the stall would do: { label, button, run }, { text } when there is no room, or null.
export function stallTarget() {
  if (!me.entered) return null;
  const pick = nearestPickup();
  if (pick?.kind === 'seeds') {
    if (inv.slots[slotOf('seeds')]?.n >= MAX_SEEDS) return null;
    if (roomFor('seeds') < 0) return { text: 'Hotbar full' };
    return { label: 'take seeds', button: 'Take', run: () => take('seeds', SEEDS_PER_VISIT) };
  }
  if (pick?.kind === 'can' && !has('can')) {
    if (roomFor('can') < 0) return { text: 'Hotbar full' };
    return { label: 'take the can', button: 'Take', run: () => take('can') };
  }
  return null;
}

function plantCell() {
  const p = me.body.interpolatedPosition;
  const x = p.x - Math.sin(me.yaw) * 0.9,
    z = p.z - Math.cos(me.yaw) * 0.9;
  return { i: Math.round((x + HALF) / CELL), j: Math.round((HALF - z) / CELL) };
}

let plantedAt = -1e9; // a seed in flight to the host is not in the garden yet: no second one on its heels
// { i, j } where a seed would go in front of you, or { text } saying why not.
export function plantTarget() {
  if (!me.body) return null;
  const { i, j } = plantCell();
  if (plantOk(i, j) && performance.now() - plantedAt > 500) return { i, j };
  return { text: "Can't plant here" };
}

export function plantFront() {
  const t = plantTarget();
  if (!t || t.text) return false;
  if (!submitEdit({ op: 'mush.plant', i: t.i, j: t.j })) return false;
  plantedAt = performance.now();
  useOne();
  return true;
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

// Tips the can (src/features/hotbar.js draws it pouring) and waters the nearest buried seed, if there is one.
export function pour() {
  if (!me.body) return false;
  pourAt.until = performance.now() + 600;
  const plot = plotToWater();
  if (plot) submitEdit({ op: 'mush.water', i: plot.i, j: plot.j });
  return true;
}
export const pouring = () => performance.now() < pourAt.until;

export function updateGarden(dt, now) {
  updateMushrooms(dt, now);
}
