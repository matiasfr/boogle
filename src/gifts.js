// Island gifts in the game: fruit on the palms, things washed up on the beach, and your pocket.
// Shared state lives in src/sim/gifts.js and changes only through world/sync edits. The pocket is yours alone
// (DESIGN.md: personal rewards) and stays in localStorage.
import * as THREE from 'three';
import { CELL, HALF, GRID_RES, REACH, isTouch, reducedMotion } from './constants.js';
import { heights, groundHeight } from './terrain.js';
import { scene } from './scene.js';
import { world as physics } from './physics.js';
import { trees, obstacles } from './props.js';
import { me } from './player.js';
import { ball } from './ball.js';
import { net } from './net.js';
import { world, registerOp, registerState, onTick, submitEdit } from './world/sync.js';
import { PATCH } from './sim/mushrooms.js';
import { GIFTS } from './gift-catalog.js';
import {
  MAX_TREES,
  REGROW_TICKS,
  DROP_OFFSETS,
  createGifts,
  canDrop,
  dropFruit,
  findItem,
  takeItem,
  treeFruit,
  tickGifts,
  serializeGifts,
  loadGifts,
  hashGifts,
} from './sim/gifts.js';

export const POCKET_MAX = 6;
const SHAKE_R = 2.1; // metres from a palm's base
const KNOCK_SPEED = 3; // ball speed that knocks fruit loose
const SHORE_MIN_CM = 12;
const SHORE_MAX_CM = 70;

const layout = { trees: [], shore: [] };
export const gifts = createGifts(layout);
const myId = () => net.room?.selfId ?? 'local';
const cellX = (i) => i * CELL - HALF;
const cellZ = (j) => HALF - j * CELL;
const fx = { falling: new Map(), wobble: new Map(), leaving: [] };

registerOp('fruit.drop', {
  validate: (e) => canDrop(gifts, e.t, world.tick, e.d),
  apply: (e, tick) => {
    const it = dropFruit(gifts, e.t, tick, e.d);
    if (!it) return;
    fx.falling.set(it.id, trees[e.t]?.top.y ?? 5);
    fx.wobble.set(e.t, performance.now());
  },
});
registerOp('gift.take', {
  validate: (e) => Number.isSafeInteger(e.id) && !!findItem(gifts, e.id),
  apply: (e) => {
    pending.delete(e.id);
    const it = takeItem(gifts, e.id);
    if (it && e.p === myId()) addToPocket(it.kind);
  },
});
registerState('gifts', {
  serialize: () => serializeGifts(gifts),
  load: (json) => loadGifts(gifts, json),
  hash: () => hashGifts(gifts),
});
onTick((t) => tickGifts(gifts, t, world.seed));

// Called once props exist and before the first world tick (onStart), so every client builds the same layout.
export function createGifts3d() {
  for (const t of trees.slice(0, MAX_TREES))
    layout.trees.push({ i: Math.round((t.x + HALF) / CELL), j: Math.round((HALF - t.z) / CELL) });
  for (let i = 0; i < GRID_RES; i++)
    for (let j = 0; j < GRID_RES; j++) {
      const cm = Math.round(heights[i][j] * 100);
      if (cm < SHORE_MIN_CM || cm > SHORE_MAX_CM) continue;
      if (i >= PATCH.i0 - 3 && i < PATCH.i0 + PATCH.w + 3 && j >= PATCH.j0 - 3 && j < PATCH.j0 + PATCH.h + 3) continue;
      const x = cellX(i),
        z = cellZ(j);
      if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.8)) continue;
      layout.shore.push([i, j]);
    }
  buildTreeFruit();
  physics.addEventListener('postStep', knockFruit);
}

// ---------------------------------------------------------------- pocket
const pocket = [];
let pocketVersion = 0;
try {
  const saved = JSON.parse(localStorage.getItem('boogle.pocket') ?? '[]');
  if (Array.isArray(saved))
    for (const k of saved) if (Number.isInteger(k) && GIFTS[k] && pocket.length < POCKET_MAX) pocket.push(k);
} catch {
  // storage unavailable or corrupt: start with empty pockets
}
function savePocket() {
  pocketVersion++;
  try {
    localStorage.setItem('boogle.pocket', JSON.stringify(pocket));
  } catch {
    // storage unavailable; the pocket lasts until reload
  }
}
function addToPocket(kind) {
  if (pocket.length >= POCKET_MAX) return;
  pocket.push(kind);
  savePocket();
}
export const pocketItems = () => pocket.map((kind) => ({ kind, label: GIFTS[kind].name }));
export function takeFromPocket(kind) {
  const k = pocket.indexOf(kind);
  if (k < 0) return false;
  pocket.splice(k, 1);
  savePocket();
  return true;
}

// ---------------------------------------------------------------- models
const matCache = new Map();
function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache.has(key))
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, flatShading: true, ...extra }));
  return matCache.get(key);
}
function add(g, geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], m } = {}) {
  const mesh = new THREE.Mesh(geo, m ?? mat(color));
  mesh.position.set(...p);
  mesh.rotation.set(...r);
  mesh.scale.set(...s);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
const sphere = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n);
const PI = Math.PI;
const glass = (color, opacity) => ({
  m: mat(color, { transparent: true, opacity, roughness: 0.15, flatShading: false }),
});

// Each builder fills a group resting on y = 0.
const BUILD = {
  coconut: (g) => add(g, sphere(0.2), '#6b4423', { p: [0, 0.18, 0], s: [1, 0.92, 1] }),
  mango: (g) => {
    add(g, sphere(0.15), '#ffb02e', { p: [0, 0.13, 0], s: [1, 0.85, 1.35] });
    add(g, new THREE.ConeGeometry(0.04, 0.12, 4), '#4e9a3d', { p: [0, 0.26, 0.12], r: [0.6, 0, 0] });
  },
  banana: (g) => {
    for (const [k, y] of [
      [-0.06, 0.05],
      [0, 0.09],
      [0.06, 0.05],
    ])
      add(g, new THREE.TorusGeometry(0.2, 0.05, 6, 10, PI * 0.7), '#ffe066', { p: [k, y, -0.1], r: [PI / 2, 0, 0.6] });
  },
  pomegranate: (g) => {
    add(g, sphere(0.16), '#c8243a', { p: [0, 0.15, 0] });
    add(g, cyl(0.035, 0.05, 0.07, 6), '#8a1a28', { p: [0, 0.32, 0] });
  },
  apricot: (g) => add(g, sphere(0.11, 9, 7), '#ff9a4a', { p: [0, 0.1, 0] }),
  shell: (g) => {
    add(g, new THREE.ConeGeometry(0.16, 0.34, 7), '#ffc7c2', { p: [0, 0.13, 0], r: [0, 0, PI / 2] });
    add(g, sphere(0.12), '#fff0ec', { p: [-0.15, 0.1, 0], s: [0.4, 1, 1] });
  },
  starfish: (g) => {
    add(g, sphere(0.08), '#ff7b4a', { p: [0, 0.03, 0], s: [1, 0.4, 1] });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2;
      add(g, new THREE.ConeGeometry(0.06, 0.24, 4), '#ff7b4a', {
        p: [Math.cos(a) * 0.15, 0.03, -Math.sin(a) * 0.15],
        r: [0, a, -PI / 2],
        s: [1, 1, 0.45],
      });
    }
  },
  driftwood: (g) => {
    add(g, cyl(0.06, 0.09, 0.9, 6), '#9c8a74', { p: [0, 0.07, 0], r: [0, 0.3, PI / 2] });
    add(g, cyl(0.03, 0.04, 0.32, 5), '#8b7a64', { p: [0.15, 0.08, 0.12], r: [0, -0.9, PI / 2] });
  },
  seaweed: (g) => {
    for (const [a, c] of [
      [0, '#3b7d3a'],
      [1.1, '#4f9a46'],
      [2.3, '#2f6a35'],
    ])
      add(g, sphere(1, 6, 4), c, { p: [0, 0.04, 0], r: [0, a, 0], s: [0.3, 0.07, 0.1] });
  },
  flipflop: (g) => {
    add(g, box(0.14, 0.03, 0.32), '#3dc7ff', { p: [0, 0.015, 0] });
    add(g, new THREE.TorusGeometry(0.055, 0.012, 4, 10, PI), '#ffffff', { p: [0, 0.03, -0.05], r: [0, PI / 2, 0] });
  },
  boot: (g) => {
    add(g, box(0.18, 0.11, 0.32), '#6b4a2e', { p: [0, 0.055, 0.06] });
    add(g, box(0.18, 0.34, 0.15), '#6b4a2e', { p: [0, 0.17, -0.08] });
    add(g, box(0.2, 0.04, 0.17), '#4f3520', { p: [0, 0.34, -0.08] });
  },
  duck: (g) => {
    add(g, sphere(0.13), '#ffd23f', { p: [0, 0.11, 0], s: [1.25, 0.9, 1] });
    add(g, sphere(0.085), '#ffd23f', { p: [0.1, 0.25, 0] });
    add(g, new THREE.ConeGeometry(0.035, 0.08, 6), '#ff8a2b', { p: [0.2, 0.24, 0], r: [0, 0, -PI / 2] });
    for (const z of [-0.045, 0.045]) add(g, sphere(0.015, 6, 4), '#13243f', { p: [0.16, 0.28, z] });
  },
  sunglasses: (g) => {
    for (const x of [-0.08, 0.08]) add(g, cyl(0.065, 0.065, 0.02, 14), '#1d1d2b', { p: [x, 0.012, 0] });
    add(g, box(0.05, 0.015, 0.015), '#ff4fa3', { p: [0, 0.015, -0.02] });
    for (const x of [-0.145, 0.145]) add(g, box(0.012, 0.012, 0.2), '#ff4fa3', { p: [x, 0.012, 0.09] });
  },
  sponge: (g) => add(g, box(0.22, 0.12, 0.16), '#ffe14d', { p: [0, 0.06, 0] }),
  float: (g) => {
    add(g, sphere(0.17, 14, 10), '', { p: [0, 0.17, 0], ...glass('#6ec6ff', 0.75) });
    for (const ry of [0, PI / 2])
      add(g, new THREE.TorusGeometry(0.172, 0.012, 4, 16), '#c9b48a', { p: [0, 0.17, 0], r: [0, ry, 0] });
  },
  bottle: (g) => {
    add(g, cyl(0.07, 0.07, 0.26, 10), '', { p: [0, 0.07, 0], r: [0, 0, PI / 2], ...glass('#4fae6d', 0.55) });
    add(g, cyl(0.03, 0.05, 0.08, 8), '', { p: [0.17, 0.07, 0], r: [0, 0, PI / 2], ...glass('#4fae6d', 0.55) });
    add(g, cyl(0.032, 0.032, 0.05, 8), '#b07a45', { p: [0.23, 0.07, 0], r: [0, 0, PI / 2] });
    add(g, cyl(0.045, 0.045, 0.18, 8), '#fffaf0', { p: [0, 0.07, 0], r: [0, 0, PI / 2] });
  },
  card: (g) => {
    add(g, box(0.2, 0.012, 0.12), '#f4f1e8', { p: [0, 0.006, 0] });
    add(g, box(0.2, 0.014, 0.03), '#ff6b5a', { p: [0, 0.007, 0.03] });
  },
  melon: (g) => add(g, sphere(0.2, 12, 8), '#e8d36a', { p: [0, 0.17, 0], s: [1, 0.85, 1.5] }),
  teacup: (g) => {
    const prof = [
      [0, 0],
      [0.055, 0],
      [0.07, 0.015],
      [0.13, 0.095],
      [0.12, 0.1],
      [0.06, 0.025],
      [0, 0.025],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    add(g, new THREE.LatheGeometry(prof, 18), '', {
      m: mat('#f7f7f2', { side: THREE.DoubleSide, flatShading: false }),
    });
    add(g, new THREE.TorusGeometry(0.115, 0.008, 4, 20), '#2f6bd8', { p: [0, 0.08, 0], r: [PI / 2, 0, 0] });
  },
  book: (g) => {
    add(g, box(0.26, 0.06, 0.34), '#2f8cff', { p: [0, 0.03, 0] });
    add(g, box(0.25, 0.05, 0.32), '#f6f0dc', { p: [0.012, 0.03, 0] });
  },
  abacus: (g) => {
    for (const z of [-0.12, 0.12]) add(g, box(0.4, 0.03, 0.03), '#b5763a', { p: [0, 0.02, z] });
    for (const x of [-0.19, 0.19]) add(g, box(0.03, 0.03, 0.27), '#b5763a', { p: [x, 0.02, 0] });
    for (let r = 0; r < 4; r++) {
      const z = -0.08 + r * 0.055;
      add(g, cyl(0.005, 0.005, 0.36, 4), '#7d5230', { p: [0, 0.02, z], r: [0, 0, PI / 2] });
      for (let b = 0; b < 4; b++)
        add(g, sphere(0.022, 6, 4), b % 2 ? '#ffcf33' : '#e5483b', { p: [-0.13 + b * 0.05 + (r % 2) * 0.1, 0.02, z] });
    }
  },
  doppi: (g) => {
    add(g, cyl(0.16, 0.18, 0.12, 4), '#1f2a24', { p: [0, 0.06, 0], r: [0, PI / 4, 0] });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * PI * 2;
      add(g, sphere(0.035, 6, 4), '#fffaf0', {
        p: [Math.sin(a) * 0.13, 0.06, Math.cos(a) * 0.13],
        r: [0, a, 0],
        s: [0.6, 1, 0.3],
      });
    }
  },
};

const templates = new Map();
function makeModel(kind) {
  const id = GIFTS[kind].id;
  if (!templates.has(id)) {
    const g = new THREE.Group();
    (BUILD[id] ?? BUILD.coconut)(g);
    templates.set(id, g);
  }
  return templates.get(id).clone();
}

// A twinkle over washed-up things, so they are easy to spot from up the beach.
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
    const src = makeModel(kind).children[0];
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

// ---------------------------------------------------------------- ground items
const visuals = new Map(); // id -> { root, sparkle, phase, y, vy, settled }

function makeVisual(it) {
  const root = new THREE.Group();
  root.add(makeModel(it.kind));
  root.rotation.y = ((it.id * 2.399) % (PI * 2)) - PI;
  let sparkle = null;
  if (it.src === 0) {
    sparkle = new THREE.Sprite(sparkleMat);
    sparkle.position.y = 0.6;
    root.add(sparkle);
  }
  scene.add(root);
  const from = fx.falling.get(it.id);
  fx.falling.delete(it.id);
  return { root, sparkle, phase: it.id * 1.7, y: from ?? null, vy: 0 };
}

function updateItems(dt, now, target) {
  const live = new Set();
  for (const it of gifts.items) {
    live.add(it.id);
    let v = visuals.get(it.id);
    if (!v) visuals.set(it.id, (v = makeVisual(it)));
    const x = cellX(it.i),
      z = cellZ(it.j);
    const gy = groundHeight(x, z);
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
    } else if (it.src === 0 && !reducedMotion) y += Math.sin(now / 700 + v.phase) * 0.02;
    v.root.position.set(x, y, z);
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

function nearestItem() {
  const p = playerAt();
  if (!p) return null;
  let best = null,
    bestD = REACH;
  const now = performance.now();
  for (const it of gifts.items) {
    if (now - (pending.get(it.id) ?? -1e9) < 2000) continue;
    const d = Math.hypot(cellX(it.i) - p.x, cellZ(it.j) - p.z);
    if (d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

function nearestRipeTree() {
  const p = playerAt();
  if (!p) return -1;
  let best = -1,
    bestD = SHAKE_R;
  layout.trees.forEach((_, t) => {
    if (!canDrop(gifts, t, world.tick)) return;
    const d = Math.hypot(trees[t].x - p.x, trees[t].z - p.z);
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  });
  return best;
}

// The fruit lands on the side of the palm that x, z (the shaker, or the ball) is on.
function dropEdit(t, x, z) {
  const { i, j } = layout.trees[t];
  const a = Math.atan2(z - cellZ(j), x - cellX(i));
  const d = (Math.round(a / (Math.PI / 4)) + DROP_OFFSETS.length) % DROP_OFFSETS.length;
  return submitEdit({ op: 'fruit.drop', i, j, t, d });
}

function currentAction() {
  if (!me.entered || !me.body) return null;
  const it = nearestItem();
  if (it) {
    const g = GIFTS[it.kind];
    if (pocket.length + pending.size >= POCKET_MAX)
      return { text: 'Your pockets are full. Give The Boogler a present!' };
    return {
      label: `pick up the ${g.name}`,
      button: 'Pick up',
      run: () => {
        if (submitEdit({ op: 'gift.take', i: it.i, j: it.j, id: it.id })) pending.set(it.id, performance.now());
      },
    };
  }
  const t = nearestRipeTree();
  if (t >= 0) {
    const p = me.body.position;
    return { label: 'shake the palm', button: 'Shake', run: () => dropEdit(t, p.x, p.z) };
  }
  return null;
}

export function pickupAction() {
  const a = currentAction();
  if (!a?.run) return false;
  a.run();
  return true;
}

export function pickupHint() {
  const a = currentAction();
  if (!a) return null;
  if (!a.run) return { text: a.text };
  return { text: `${isTouch ? `Tap ${a.button}` : 'Click'} to ${a.label}`, button: a.button };
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

// ---------------------------------------------------------------- HUD: pocket chips
let pocketEl = null;
let shownVersion = -1;
function updatePocketHud() {
  if (!pocketEl) {
    const hud = document.querySelector('.hud');
    if (!hud) return;
    pocketEl = document.createElement('div');
    pocketEl.className = 'pocket';
    pocketEl.hidden = true;
    hud.append(pocketEl);
  }
  const show = me.entered && pocket.length > 0;
  if (pocketEl.hidden === show) pocketEl.hidden = !show;
  if (shownVersion === pocketVersion) return;
  shownVersion = pocketVersion;
  pocketEl.replaceChildren();
  const label = document.createElement('span');
  label.className = 'pocket-label';
  label.textContent = `Pocket ${pocket.length}/${POCKET_MAX}`;
  pocketEl.append(label);
  for (const kind of pocket) {
    const chip = document.createElement('span');
    chip.className = 'pocket-chip';
    const dot = document.createElement('span');
    dot.className = 'pocket-dot';
    dot.style.background = GIFTS[kind].color;
    chip.append(dot, GIFTS[kind].name);
    pocketEl.append(chip);
  }
}

export function updateGifts(dt, now) {
  if (!fruitMeshes.size) return;
  for (const [id, at] of pending) if (now - at > 4000) pending.delete(id);
  const target = nearestItem()?.id;
  updateTreeFruit(now);
  updateItems(dt, now, target);
  updatePocketHud();
}
