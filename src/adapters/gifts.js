// Island gifts in the game: fruit on the palms, things players threw, and the frisbee
// on the lighthouse deck. Shared state lives in src/world/rules/gifts.js and changes only through world/sync edits; what
// you carry is your hotbar (src/player/inventory.js).
import { land, rules } from '../world/game-world.js'; // first: the lockstep rules register before anything else
import * as THREE from 'three';
import { CELL, HALF, GRID_RES, REACH, PLAYER_R, reducedMotion } from '../constants.js';
import { groundHeight, cellX, cellZ } from './terrain.js';
import { scene } from '../render/scene.js';
import { world as physics } from '../physics/physics.js';
import { trees } from '../render/props.js';
import { me, throwFrom } from '../player/player.js';
import { ball } from '../physics/ball.js';
import { net } from '../netplay/net.js';
import { world, onApplied, submitEdit } from '../world/sync.js';
import { SEEDS, LOST } from '../world/rules/gifts.js';
import { plantOk } from './mushroom-garden.js'; // the thrower's own landing check for seeds
import { waterField } from '../physics/water-field.js';
import { GIFTS, giftIndex } from '../sim/gift-catalog.js';
import { MAX_TREES, REGROW_TICKS, DROP_OFFSETS, ON_GROUND, SRC, canDrop, treeFruit } from '../sim/gifts.js';
import { itemModel } from '../player/item-models.js';
import { STEP, flyPath, dropPoint } from '../physics/flight.js';
import { inv, take, roomFor } from '../player/inventory.js';
import { FRISBEE_SPOT } from '../pois/lighthouse/index.js';
import { splash } from '../render/splash.js';

const SHAKE_R = 2.1; // metres from a palm's base
const KNOCK_SPEED = 3; // ball speed that knocks fruit loose
const PICK_DY = 1.6; // metres between your feet and a thing you can still reach

// The gifts, their ops and tick live in world/rules/gifts.js (lockstep); this module adapts them to meshes, flights,
// the interact prompt and the hotbar. The layout (palms, perches) is the land's, filled in createGifts3d.
const { layout } = land;
const perchSpots = []; // world positions, parallel to layout.perches
export const gifts = rules.gifts.gifts;
const myId = () => net.room?.selfId ?? 'local';

const cellOf = (x, z) => [
  Math.min(GRID_RES - 2, Math.max(1, Math.round((x + HALF) / CELL))),
  Math.min(GRID_RES - 2, Math.max(1, Math.round((HALF - z) / CELL))),
];
const fx = { falling: new Map(), wobble: new Map(), leaving: [], arriving: new Map() };

// The effects of each gift op, from what its apply returned (r): the item that fell, was taken or landed.
onApplied((e, tick, r) => {
  if (e.op === 'fruit.drop') {
    if (!r) return;
    fx.falling.set(r.id, trees[e.t]?.top.y ?? 5);
    fx.wobble.set(e.t, performance.now());
  } else if (e.op === 'gift.take') {
    pending.delete(e.id);
    if (!r || e.p !== myId()) return;
    // Only steal your hand if you are not winding up a throw; with no room left it goes back on the ground.
    if (!take(GIFTS[r.kind].id, 1, !me.charging)) throwItem(r.kind, throwFrom(), new THREE.Vector3(0, 1, 0));
  } else if (e.op === 'gift.toss') {
    const fl = claimFlight(e);
    if (e.y !== LOST && e.k !== SEEDS && r) fx.arriving.set(r.id, fl);
  }
});

// Called once props exist and before the first world tick (onStart), so every client builds the same layout.
export function createGifts3d() {
  for (const t of trees.slice(0, MAX_TREES))
    layout.trees.push({ i: Math.round((t.x + HALF) / CELL), j: Math.round((HALF - t.z) / CELL) });
  // The frisbee's perch: its cell only names it in the shared state; it is drawn at the exact spot on the deck.
  const [pi, pj] = [Math.round((FRISBEE_SPOT.x + HALF) / CELL), Math.round((HALF - FRISBEE_SPOT.z) / CELL)];
  layout.perches.push({ i: pi, j: pj, kind: giftIndex('frisbee') });
  perchSpots.push(new THREE.Vector3(FRISBEE_SPOT.x, FRISBEE_SPOT.y, FRISBEE_SPOT.z));
  buildTreeFruit();
  physics.addEventListener('postStep', knockFruit);
}

function itemPos(it, out) {
  if (it.src === SRC.PERCH) {
    const k = layout.perches.findIndex((p) => p.i === it.i && p.j === it.j);
    if (k >= 0) return out.copy(perchSpots[k]);
  }
  const x = cellX(it.i),
    z = cellZ(it.j);
  return out.set(x, it.y === ON_GROUND || it.src === SRC.PERCH ? groundHeight(x, z) : it.y / 100, z);
}

// A twinkle over the frisbee on its perch, so it is easy to spot from afar.
const sparkleMat = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,250,220,0.7)');
  grad.addColorStop(1, 'rgba(255,250,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#ffffff';
  g.fillRect(30, 4, 4, 56);
  g.fillRect(4, 30, 56, 4);
  const t = new THREE.CanvasTexture(c);
  return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
})();

// ---------------------------------------------------------------- tree fruit (instanced, one mesh per fruit kind)
const HANG = { coconut: 3, mango: 2, banana: 1, pomegranate: 2, apricot: 3 };
const fruitMeshes = new Map(); // kind -> { mesh, slots: [{ t, x, y, z }] }
const m4 = new THREE.Matrix4(),
  q4 = new THREE.Quaternion(),
  e4 = new THREE.Euler(),
  v4 = new THREE.Vector3(),
  s4 = new THREE.Vector3();

function buildTreeFruit() {
  const slotsByKind = new Map();
  trees.slice(0, MAX_TREES).forEach((tree, t) => {
    const kind = treeFruit(t);
    const list = slotsByKind.get(kind) ?? [];
    slotsByKind.set(kind, list);
    for (let k = 0; k < HANG[GIFTS[kind].id]; k++) {
      const a = tree.hang[k];
      list.push({ t, x: tree.top.x + Math.cos(a) * 0.3, y: tree.top.y - 0.5, z: tree.top.z + Math.sin(a) * 0.3, a });
    }
  });
  for (const [kind, slots] of slotsByKind) {
    const src = itemModel(GIFTS[kind].id).children[0];
    const mesh = new THREE.InstancedMesh(src.geometry, src.material, slots.length);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    mesh.userData.base = { r: src.rotation.clone(), s: src.scale.clone() };
    scene.add(mesh);
    fruitMeshes.set(kind, { mesh, slots });
  }
}

function updateTreeFruit(now) {
  for (const { mesh, slots } of fruitMeshes.values()) {
    const { r, s } = mesh.userData.base;
    slots.forEach((sl, k) => {
      const left = gifts.ripeAt[sl.t] - world.tick;
      const grow = left <= 0 ? 1 : 0.25 + 0.55 * (1 - left / REGROW_TICKS);
      const wob = (now - (fx.wobble.get(sl.t) ?? -1e9)) / 1000;
      const shake = !reducedMotion && wob < 0.5 ? Math.sin(wob * 40) * 0.25 * (1 - wob * 2) : 0;
      e4.set(r.x + shake, r.y + sl.a, r.z + shake * 0.5);
      q4.setFromEuler(e4);
      m4.compose(v4.set(sl.x, sl.y, sl.z), q4, s4.copy(s).multiplyScalar(grow));
      mesh.setMatrixAt(k, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- flights
// Everything in the air, for everyone: { mesh, points, t0, rest, lost, nonce, done }. The thrower starts a flight the
// moment they let go; everyone else replays it from the launch when the `gift.toss` edit arrives.
const flights = [];
const seedGeo = new THREE.SphereGeometry(0.07, 8, 6);
const seedMat = new THREE.MeshStandardMaterial({ color: '#7d5230', roughness: 0.9 });

function startFlight(kind, p, v, nonce) {
  const glide = GIFTS[kind].id === 'frisbee';
  const path = flyPath(p, v, glide);
  const mesh = kind === SEEDS ? new THREE.Mesh(seedGeo, seedMat) : itemModel(GIFTS[kind].id);
  mesh.position.copy(p);
  scene.add(mesh);
  const fl = { mesh, glide, nonce, t0: performance.now(), done: false, ...path };
  flights.push(fl);
  return fl;
}

function claimFlight(e) {
  const mine = e.p === myId() && flights.find((f) => f.nonce === e.n);
  if (mine) return mine;
  const [x, y, z, vx, vy, vz] = e.l.map((v) => v / 100);
  return startFlight(e.k, new THREE.Vector3(x, y, z), new THREE.Vector3(vx, vy, vz), e.n);
}

function endFlight(fl) {
  fl.done = true;
  scene.remove(fl.mesh);
  flights.splice(flights.indexOf(fl), 1);
  if (fl.lost) splash(fl.rest.x, fl.rest.z, 0.5, waterField.surfaceAt(fl.rest.x, fl.rest.z));
}

function updateFlights(now) {
  for (let k = flights.length - 1; k >= 0; k--) {
    const fl = flights[k];
    const t = Math.max(0, (now - fl.t0) / 1000 / STEP); // a frame's timestamp can predate a flight started mid-frame
    const n = Math.floor(t);
    if (n >= fl.points.length - 1) {
      endFlight(fl);
      continue;
    }
    fl.mesh.position.lerpVectors(fl.points[n], fl.points[n + 1], t - n);
    const age = t * STEP;
    if (fl.glide) fl.mesh.rotation.set(0.12, age * 18, 0.08);
    else fl.mesh.rotation.set(age * 9, age * 4, age * 6);
  }
}

// The shared item's height once a flight is snapped to cell (i, j): whatever lies under the cell's centre.
function landingY(kind, fl, i, j) {
  if (fl.lost) return LOST;
  if (kind === SEEDS) return plantOk(i, j) ? ON_GROUND : LOST;
  const x = cellX(i),
    z = cellZ(j);
  const under = dropPoint(new THREE.Vector3(x, fl.rest.y + 0.4, z));
  if (waterField.surfaceAt(x, z) > under.y + 0.05) return LOST;
  return under.y - groundHeight(x, z) < 0.15 ? ON_GROUND : Math.round(under.y * 100);
}

// Throws `kind` from p with velocity v: it flies for everyone and lands as a shared item, or a seed plants itself where
// it lands. Returns false if the edit could not be sent (the caller keeps the item).
export function throwItem(kind, p, v) {
  const nonce = (Math.random() * 2 ** 30) | 0;
  const fl = startFlight(kind, p, v, nonce);
  const [i, j] = cellOf(fl.rest.x, fl.rest.z);
  const y = landingY(kind, fl, i, j);
  const l = [p.x, p.y, p.z, v.x, v.y, v.z].map((c) => Math.round(c * 100));
  if (submitEdit({ op: 'gift.toss', i, j, k: kind, y, n: nonce, l })) return true;
  endFlight(fl);
  return false;
}

// ---------------------------------------------------------------- ground items
const visuals = new Map(); // id -> { root, sparkle, phase, y, vy, flight, slide }
const PI = Math.PI;
const at = new THREE.Vector3();

function makeVisual(it) {
  const root = new THREE.Group();
  root.add(itemModel(GIFTS[it.kind].id));
  root.rotation.y = ((it.id * 2.399) % (PI * 2)) - PI;
  let sparkle = null;
  if (it.src === SRC.PERCH) {
    sparkle = new THREE.Sprite(sparkleMat);
    sparkle.position.y = 0.6;
    root.add(sparkle);
  }
  scene.add(root);
  const from = fx.falling.get(it.id);
  fx.falling.delete(it.id);
  const flight = fx.arriving.get(it.id) ?? null;
  fx.arriving.delete(it.id);
  return { root, sparkle, phase: it.id * 1.7, y: from ?? null, vy: 0, flight, slide: 1 };
}

function updateItems(dt, now, target) {
  const live = new Set();
  for (const it of gifts.items) {
    live.add(it.id);
    let v = visuals.get(it.id);
    if (!v) visuals.set(it.id, (v = makeVisual(it)));
    // A thrown thing stays hidden until its flight comes down, then slides from there onto its cell.
    v.root.visible = !v.flight || v.flight.done;
    if (!v.root.visible) continue;
    if (v.flight) {
      v.slide = 0;
      v.from = v.flight.rest;
      v.flight = null;
    }
    const { x, y: gy, z } = itemPos(it, at);
    let y = gy;
    if (v.y !== null) {
      v.vy -= 18 * dt;
      v.y += v.vy * dt;
      if (v.y <= gy) {
        v.y = gy;
        v.vy = Math.abs(v.vy) > 2 ? -v.vy * 0.35 : 0;
        if (!v.vy) v.y = null;
      }
      y = v.y ?? gy;
    }
    v.root.position.set(x, y, z);
    if (v.slide < 1) {
      v.slide = Math.min(1, v.slide + dt / 0.18);
      v.root.position.lerpVectors(v.from, v.root.position, 1 - (1 - v.slide) ** 2);
    }
    const pulse = target === it.id && !reducedMotion ? 1.15 + Math.sin(now / 120) * 0.08 : 1;
    v.root.scale.setScalar(pulse);
    if (v.sparkle) {
      const tw = 0.5 + 0.5 * Math.sin(now / 260 + v.phase * 3);
      v.sparkle.scale.setScalar(reducedMotion ? 0.35 : 0.15 + tw * 0.4);
    }
  }
  for (const [id, v] of visuals) {
    if (live.has(id)) continue;
    visuals.delete(id);
    fx.leaving.push({ v, t: 0 });
  }
  for (let k = fx.leaving.length - 1; k >= 0; k--) {
    const l = fx.leaving[k];
    l.t += dt / 0.22;
    if (l.t >= 1 || reducedMotion) {
      scene.remove(l.v.root);
      fx.leaving.splice(k, 1);
      continue;
    }
    l.v.root.position.y += dt * 2.5;
    l.v.root.scale.setScalar(1 - l.t);
  }
}

// ---------------------------------------------------------------- actions
const pending = new Map(); // item id -> submitted at (ms)
const knockedAt = new Map();

function playerAt() {
  return me.entered && me.body ? me.body.interpolatedPosition : null;
}

// The fruit lands on the side of the palm that x, z (the shaker, or the ball) is on.
function dropEdit(t, x, z) {
  const { i, j } = layout.trees[t];
  const a = Math.atan2(z - cellZ(j), x - cellX(i));
  const d = (Math.round(a / (Math.PI / 4)) + DROP_OFFSETS.length) % DROP_OFFSETS.length;
  return submitEdit({ op: 'fruit.drop', i, j, t, d });
}

// What interacting could do here (see interactTarget in src/player/hands.js): for each item in reach { id, verb, at, item, run }
// to pick it up, or { id, verb, at, item, blocked } when your hotbar has no room for it, and { id, verb, at, run } to
// shake each ripe palm in reach. The pick, not distance alone, decides between them, so a shell behind you does not hide
// the palm you face.
const reachAt = new THREE.Vector3();
export function giftTargets() {
  const p = playerAt();
  if (!p) return [];
  const out = [];
  const now = performance.now();
  const full = inv.slots.filter((s) => !s).length <= pending.size;
  for (const it of gifts.items) {
    // Not one you already asked to take, nor a thrown one still in the air.
    if (now - (pending.get(it.id) ?? -1e9) < 2000 || visuals.get(it.id)?.root.visible === false) continue;
    const pos = itemPos(it, reachAt);
    if (Math.abs(p.y - PLAYER_R - pos.y) > PICK_DY || Math.hypot(pos.x - p.x, pos.z - p.z) >= REACH) continue;
    const at = new THREE.Vector3(pos.x, pos.y + 0.35, pos.z);
    const t = { id: `item${it.id}`, verb: 'Pick up', at, item: it.id };
    if (full || roomFor(GIFTS[it.kind].id) < 0) out.push({ ...t, blocked: 'Hotbar full' });
    else
      out.push({
        ...t,
        run: () => {
          if (submitEdit({ op: 'gift.take', i: it.i, j: it.j, id: it.id })) pending.set(it.id, performance.now());
        },
      });
  }
  layout.trees.forEach((_, t) => {
    const { x, z } = trees[t];
    if (!canDrop(gifts, t, world.tick) || Math.hypot(x - p.x, z - p.z) >= SHAKE_R) return;
    const at = new THREE.Vector3(x, groundHeight(x, z) + 1.7, z);
    out.push({ id: `palm${t}`, verb: 'Shake', at, run: () => dropEdit(t, me.body.position.x, me.body.position.z) });
  });
  return out;
}

// The ball knocks ripe fruit loose when it hits a palm. Only the ball's owner reports it.
const treeOfBody = new Map();
function knockFruit() {
  if (!ball.mine || ball.held) return;
  if (!treeOfBody.size) trees.forEach((t, k) => k < layout.trees.length && treeOfBody.set(t.body, k));
  for (const c of physics.contacts) {
    const other = c.bi === ball.body ? c.bj : c.bj === ball.body ? c.bi : null;
    const t = other ? treeOfBody.get(other) : undefined;
    if (t === undefined || !canDrop(gifts, t, world.tick)) continue;
    const now = performance.now();
    if (now - (knockedAt.get(t) ?? -1e9) < 1500) continue;
    // Contacts are read after the bounce; disp.v still has the previous frame's (pre-bounce) velocity.
    if (ball.body.velocity.length() < KNOCK_SPEED && ball.disp.v.length() < KNOCK_SPEED) continue;
    knockedAt.set(t, now);
    dropEdit(t, ball.body.position.x, ball.body.position.z);
  }
}

// `target` is the item id the interact prompt is on (see giftTargets), highlighted; null for none.
export function updateGifts(dt, now, target = null) {
  if (!fruitMeshes.size) return;
  for (const [id, at] of pending) if (now - at > 4000) pending.delete(id);
  updateTreeFruit(now);
  updateFlights(now);
  updateItems(dt, now, target);
}
