// Mushroom garden in the game: the seed stall, planting and watering, mushroom meshes and their bouncy colliders.
// Shared state lives in src/world/rules/mushrooms.ts and changes only through world/sync edits. Seeds and the watering can are
// hotbar items (src/player/inventory.js); src/player/hands.js calls plantFront and pour when you use them.
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL, HALF, REACH, SEA, PLAYER_R, HEAD_OFFSET, reducedMotion } from '../constants.js';
import { heights, groundHeight, cellX, cellZ } from './terrain.js';
import { scene } from '../render/scene.js';
import { obstacles } from '../render/props.js';
import { groundMat, GROUP } from '../physics/physics.js';
import { material, createBody, setShapes, addBody, onPreStep, onPostStep, forEachContact } from '../physics/engine.ts';
import { me } from '../player/player.js';
import { setEnv, onApplied, submitEdit } from '../world/sync.ts';
import { waterField } from '../physics/water-field.js';
import { dropPoint } from '../physics/flight.js';
import { splash } from '../render/splash.js';
import { itemModel } from '../player/item-models.js';
import { inv, take, has, roomFor, slotOf, useOne, MAX_SEEDS } from '../player/inventory.js';
import { GROW_TICKS } from '../sim/mushrooms.ts';

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
export const STALL = { x: 15.2, z: 13.4, yaw: 3.0 };

// The garden, its ops and growth live in world/rules/mushrooms.ts (lockstep); this module adapts it to meshes,
// colliders, the stall and the hotbar.
export const garden = rules.mushrooms.garden;
const pourAt = { until: 0 };

// The render side of the host's plant check (env.canPlantAt): dry land with nothing (rock, tree, wall, cap) over it.
function spotOk(i, j) {
  const x = cellX(i),
    z = cellZ(j),
    g = heights[i][j];
  if (g < SEA + 0.1 || waterField.surfaceAt(x, z) > g + 0.02) return false;
  return dropPoint(new THREE.Vector3(x, g + 3, z)).y < g + 0.2;
}
const env = { canPlantAt: spotOk };
setEnv(env);

// Open, dry land with room in the garden: where a seed may go in (the host runs this same check on mush.plant).
export const plantOk = (i, j) => rules.mushrooms.plantOk(i, j, env);

onApplied((e, t, r) => {
  if (e.op !== 'mush.water' || !r) return;
  const x = cellX(e.i),
    z = cellZ(e.j);
  splash(x, z, 0.12, groundHeight(x, z));
});

// ---------------------------------------------------------------- physics
const mushroomMat = material('mushroom', { friction: 0.5, restitution: 1.73 }); // x ball: 0.3, 0.95

const capBodies = new Map(); // body -> visual

// Physics shapes cannot scale, so a growing mushroom gets fresh ones every few percent of growth.
function shapeBody(v, s) {
  if (!v.body) {
    v.body = createBody({ material: mushroomMat, group: GROUP.SCENERY, position: v.root.position });
    addBody(v.body);
    capBodies.set(v.body, v);
  }
  setShapes(v.body, [
    {
      kind: 'cylinder',
      rTop: STEM_TOP_R * s,
      rBottom: STEM_BASE_R * s,
      h: STEM_H * s,
      segments: 10,
      offset: { x: 0, y: (STEM_H * s) / 2, z: 0 },
    },
    {
      kind: 'cylinder',
      rTop: CAP_R * s,
      rBottom: CAP_R * 0.85 * s,
      h: CAP_T * s,
      segments: 16,
      offset: { x: 0, y: (STEM_H + CAP_T / 2) * s, z: 0 },
    },
  ]);
  v.bodyS = s;
}

onPostStep(() => {
  const b = me.body;
  if (!b) return;
  forEachContact(b, (nx, ny, nz, other) => {
    const vis = capBodies.get(other);
    if (!vis || b.position.y < other.position.y + STEM_H * vis.bodyS) return false;
    b.velocity.y = BOUNCE_SPEED * (0.55 + 0.45 * Math.min(1, vis.bodyS));
    me.coyote = 0;
    vis.squishAt = performance.now();
    return true;
  });
});

// A mushroom growing into you shoves you out from under its cap (you ride up and bounce if you are on top). The shove
// works from the size it is drawn at (v.drawS), and its collider doesn't grow while you are under it (updateGarden), so
// the mushroom pushes you out sideways instead of a new collider appearing around you, which each physics engine
// resolves its own way (Rapier would pop you up onto the cap).
function underCap(b, v, s) {
  const base = v.root.position;
  const feet = b.position.y - PLAYER_R;
  if (feet > base.y + (STEM_H + CAP_T) * s - 0.1 || b.position.y + HEAD_OFFSET + PLAYER_R < base.y) return 0;
  const d = Math.hypot(b.position.x - base.x, b.position.z - base.z);
  return d < CAP_R * s + PLAYER_R ? Math.max(d, 1e-6) : 0;
}
// Whether the player's body would intersect this mushroom's collider at scale s (its full height, with a margin).
function overlaps(b, v, s) {
  const base = v.root.position;
  if (b.position.y - PLAYER_R > base.y + (STEM_H + CAP_T) * s + 0.05) return false;
  if (b.position.y + HEAD_OFFSET + PLAYER_R < base.y) return false;
  return Math.hypot(b.position.x - base.x, b.position.z - base.z) < CAP_R * s + PLAYER_R + 0.05;
}
onPreStep(() => {
  const b = me.body;
  if (!b) return;
  for (const v of visuals.values()) {
    const s = v.drawS ?? 0;
    if (s < MIN_BODY || v.shown >= 1) continue;
    const d = underCap(b, v, s);
    if (!d) continue;
    const base = v.root.position;
    const nx = d > 0.01 ? (b.position.x - base.x) / d : 1,
      nz = d > 0.01 ? (b.position.z - base.z) / d : 0;
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

export function updateGarden(dt, now) {
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
    v.drawS = s;
    const grow = Math.abs(s - v.bodyS) >= RESHAPE || (v.shown >= 1 && v.bodyS !== s);
    if (s >= MIN_BODY && grow && !(me.body && overlaps(me.body, v, s))) shapeBody(v, s); // never around you: the shove first
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

  addBody(
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position: { x: STALL.x, y, z: STALL.z },
      rotation: { x: 0, y: Math.sin(STALL.yaw / 2), z: 0, w: Math.cos(STALL.yaw / 2) },
      shapes: [{ kind: 'box', hx: 1.4, hy: 0.5, hz: 0.45, offset: { x: 0, y: 0.5, z: 0 } }],
    }),
  );
  obstacles.push({ x: STALL.x, z: STALL.z, r: 1.5 });
}

// ---------------------------------------------------------------- actions
// What interacting at the stall could do (see interactTarget in src/player/hands.js): for each pickup in reach
// { id, verb, at, run }, or { id, verb, at, blocked } when there is no room. The can is left out while you hold one, and
// the seeds while your stack is full; the other pickup stays on offer.
export function stallTargets() {
  if (!me.entered || !me.body) return [];
  const p = me.body.interpolatedPosition;
  const out = [];
  for (const pick of pickups) {
    if (!pick.world || Math.hypot(pick.world.x - p.x, pick.world.z - p.z) >= REACH + 0.6) continue;
    if (pick.kind === 'can' && has('can')) continue;
    if (pick.kind === 'seeds' && inv.slots[slotOf('seeds')]?.n >= MAX_SEEDS) continue;
    const at = pick.world.clone().setY(pick.world.y + 0.35);
    const t = { id: `stall-${pick.kind}`, verb: 'Take', at };
    if (roomFor(pick.kind) < 0) out.push({ ...t, blocked: 'Hotbar full' });
    else out.push({ ...t, run: () => (pick.kind === 'seeds' ? take('seeds', SEEDS_PER_VISIT) : take('can')) });
  }
  return out;
}

function plantCell() {
  const p = me.body.interpolatedPosition;
  const x = p.x - Math.sin(me.yaw) * 0.9,
    z = p.z - Math.cos(me.yaw) * 0.9;
  return { i: Math.round((x + HALF) / CELL), j: Math.round((HALF - z) / CELL) };
}

let plantedAt = -1e9; // a seed in flight to the host is not in the garden yet: no second one on its heels
// { i, j } where a seed would go in front of you, { text } saying why not, or null just after a planting.
export function plantTarget() {
  if (!me.body) return null;
  const { i, j } = plantCell();
  if (!plantOk(i, j)) return { text: "Can't plant here" };
  return performance.now() - plantedAt > 500 ? { i, j } : null;
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
