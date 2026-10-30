// Phase 3: dig and pile. Adapts the terrain rules (rules/terrain.js: the sand layer and its ops) to the terrain mesh,
// the physics heightfield and the water height texture.
// Also owns the shovel tool: mode, aiming, the target ring and the hold-to-repeat loop.
import { rules } from './game-world.js'; // first: the lockstep rules register before anything else
import * as THREE from 'three';
import { GRID_RES, CELL, HALF, BALL_R, PLAYER_R } from '../constants.js';
import { clamp } from '../math.js';
import { heights, groundHeight, setCellHeight, refreshRegion, startSettle } from '../terrain.js';
import { refreshGround } from '../physics.js';
import { updateHeightTexels } from '../water-render.js';
import { scene, camera } from '../scene.js';
import { me, camForward } from '../player.js';
import { inputKind } from '../glyphs.js';
import { ball } from '../ball.js';
import { onApplied, onAfterTick, onSnapshot, submitEdit } from './sync.js';
import { CARRY_MAX } from './terrain-logic.js';

const N = GRID_RES;
export const REACH = 4.5; // metres from the player to the aimed spot
const REPEAT_MS = 220; // client-side repeat while a button is held (host limit is 200 ms)

// ---------------------------------------------------------------- state
// The sand layer and its ops live in rules/terrain.js (lockstep); this module adapts it to the mesh, physics and water
// texture. Only the home square is editable (the mask): that is where the shared water runs.
export const terrain = rules.terrain.state;
updateHeightTexels(0, 0, N - 1, N - 1);
refreshGround();

// ---------------------------------------------------------------- render + physics adapter
let dirty = null; // [i0, j0, i1, j1] bounding box of cells changed since the last flush
function markDirty(idx) {
  const i = Math.floor(idx / N),
    j = idx % N;
  if (!dirty) dirty = [i, j, i, j];
  else {
    dirty[0] = Math.min(dirty[0], i);
    dirty[1] = Math.min(dirty[1], j);
    dirty[2] = Math.max(dirty[2], i);
    dirty[3] = Math.max(dirty[3], j);
  }
}

// Remembers who "me" is: the first applied edit that matches what this client just submitted.
let myId = 'local';
export const isMyEdit = (edit) => edit.p === myId;
let submitted = null;

// Hook for other systems (water, wake effects): fn(edit, cells) after every applied edit, cells = [[index, signedCm]]
// where index = i*GRID_RES+j and a positive amount means sand was added to that cell. Do not mutate cells.
const cellsFns = [];
export const onTerrainCells = (fn) => cellsFns.push(fn);

onApplied((edit) => {
  if (submitted && submitted.op === edit.op && submitted.i === edit.i && submitted.j === edit.j) {
    myId = edit.p;
    submitted = null;
  }
  // The brush touches the 5x5 around (i, j); mark its corners, the box covers the rest.
  markDirty(Math.max(0, edit.i - 2) * N + Math.max(0, edit.j - 2));
  markDirty(Math.min(N - 1, edit.i + 2) * N + Math.min(N - 1, edit.j + 2));
  animateNext = true;
  const cells = terrain.lastCells();
  for (const fn of cellsFns) fn(edit, cells);
}, 'terrain adapter');
let animateNext = false;

function liftIfBuried(body, r) {
  if (!body) return;
  const g = groundHeight(body.position.x, body.position.z);
  if (body.position.y < g + r * 0.5) {
    body.position.y = g + r + 0.05;
    body.previousPosition.y = body.position.y;
    body.interpolatedPosition.y = body.position.y;
    if (body.velocity.y < 0) body.velocity.y = 0;
  }
}

// Once per sim tick: push every changed cell into heights, mesh, physics and the water texture.
export function flushTerrain() {
  if (!dirty) return;
  const [i0, j0, i1, j1] = dirty;
  dirty = null;
  const animate = animateNext;
  animateNext = false;
  const oldH = animate ? new Float32Array((i1 - i0 + 1) * (j1 - j0 + 1)) : null;
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const idx = i * N + j;
      if (oldH) oldH[(i - i0) * (j1 - j0 + 1) + (j - j0)] = heights[i][j];
      setCellHeight(i, j, (terrain.base[idx] + terrain.delta[idx]) / 100, terrain.delta[idx] / 100);
    }
  if (oldH) startSettle(i0, j0, i1, j1, oldH); // render-only dip and spring back
  refreshRegion(i0, j0, i1, j1);
  refreshGround();
  updateHeightTexels(i0, j0, i1, j1);
  liftIfBuried(me.body, PLAYER_R);
  if (ball.mine) liftIfBuried(ball.body, BALL_R);
}
onAfterTick(flushTerrain, 'terrain flush'); // after the sim ticks (none reads heights)
// A snapshot replaced the sand layer: redraw the cells it changed.
onSnapshot(() => {
  for (const idx of rules.terrain.lastLoaded()) markDirty(idx);
});

// ---------------------------------------------------------------- shovel tool
export const shovel = { on: false, hold: null, flat: false, target: null, lastMs: 0, lastCell: null };

export function toggleShovel(force) {
  shovel.on = force ?? !shovel.on;
  if (!shovel.on) shovel.hold = null;
  document.body.classList.toggle('shovel', shovel.on);
}
// Whether the shovel should take clicks right now (the ball wins while it is in hand).
export const shovelActive = () => shovel.on && me.entered && !me.holding && !me.charging;
// setHold(null, 'dig') releases only if the current hold is 'dig' (a key released while another input holds).
export function setHold(kind, onlyIf) {
  if (onlyIf && shovel.hold !== onlyIf) return;
  shovel.hold = kind;
  shovel.lastCell = null;
  if (kind) shovel.lastMs = 0;
}
// Shift held: the preview shows the flatten brush and Shift+click flattens.
export const setFlatten = (on) => (shovel.flat = on);
export const carryAmount = () => terrain.carryOf(myId);

const cellOf = (x, z) => [
  clamp(Math.round((x + HALF) / CELL), 1, N - 2),
  clamp(Math.round((HALF - z) / CELL), 1, N - 2),
];

const fwd = new THREE.Vector3();
// Aim: march the camera ray down to the ground, then pull the spot in to within reach of the player.
function aim() {
  if (!me.body) return null;
  camForward(fwd);
  const o = camera.position;
  let hit = null;
  let prev = 0;
  for (let t = 0.3; t < 70; t += 0.3) {
    const x = o.x + fwd.x * t,
      y = o.y + fwd.y * t,
      z = o.z + fwd.z * t;
    if (y <= groundHeight(x, z)) {
      let lo = prev,
        hi = t;
      for (let k = 0; k < 6; k++) {
        const m = (lo + hi) / 2;
        if (o.y + fwd.y * m <= groundHeight(o.x + fwd.x * m, o.z + fwd.z * m)) hi = m;
        else lo = m;
      }
      hit = { x: o.x + fwd.x * hi, z: o.z + fwd.z * hi };
      break;
    }
    prev = t;
  }
  const p = me.body.position;
  let dx, dz;
  if (hit) {
    dx = hit.x - p.x;
    dz = hit.z - p.z;
  } else {
    dx = fwd.x;
    dz = fwd.z;
  }
  const len = Math.hypot(dx, dz) || 1;
  const k = Math.min(len, REACH) / len;
  const x = p.x + dx * k,
    z = p.z + dz * k;
  const [i, j] = cellOf(x, z);
  return { i, j, x: i * CELL - HALF, z: HALF - j * CELL };
}

// Target preview: two strips hugging the ground. The outer one is the full 5x5 brush footprint and doubles as the
// bucket gauge (bright arc = sand carried); the inner one marks the strong 3x3 core.
const RING_SEG = 48;
function makeRing(r0, r1, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RING_SEG + 1) * 2 * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((RING_SEG + 1) * 2 * 3).fill(1), 3));
  const idx = [];
  for (let s = 0; s < RING_SEG; s++) {
    const a = s * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 5;
  scene.add(mesh);
  return { geo, mat, mesh, r0, r1 };
}
const outer = makeRing(2.85, 3.15, 0.9);
const inner = makeRing(1.5, 1.65, 0.55);
const RING_COLORS = { dig: 0xff9a3d, pile: 0xfff2c4, flatten: 0x6ad0ff, bad: 0xff4a40 };

function placeRing(rg, t, fill = 1) {
  const a = rg.geo.attributes.position.array;
  const col = rg.geo.attributes.color.array;
  for (let s = 0; s <= RING_SEG; s++) {
    const ang = (s / RING_SEG) * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(ang),
      sn = Math.sin(ang);
    const lit = s / RING_SEG <= fill ? 1 : 0.5;
    for (let side = 0; side < 2; side++) {
      const r = side ? rg.r1 : rg.r0;
      const x = t.x + c * r,
        z = t.z + sn * r;
      const k = (s * 2 + side) * 3;
      a[k] = x;
      a[k + 1] = Math.max(groundHeight(x, z), 0.02) + 0.09;
      a[k + 2] = z;
      col[k] = col[k + 1] = col[k + 2] = lit;
    }
  }
  rg.geo.attributes.position.needsUpdate = true;
  rg.geo.attributes.color.needsUpdate = true;
}

const REASONS = {
  'bucket-full': 'Bucket full: pile some sand',
  'no-carry': 'Bucket empty: dig first',
  'not-sand': "Can't dig here",
  'too-deep': 'Too deep',
  'too-high': 'Too high',
  'nothing-to-move': 'Already level',
  range: "Can't dig here",
};
const LABELS = { dig: 'Dig', pile: 'Pile', flatten: 'Flatten' };

let chip = null,
  reasonEl = null,
  lastChip = '',
  lastReason = null;
function ensureDom() {
  if (chip) return;
  chip = document.getElementById('shovel-chip');
  reasonEl = document.createElement('div');
  reasonEl.className = 'shovel-reason';
  reasonEl.hidden = true;
  (document.querySelector('.hud') ?? document.body).append(reasonEl);
}

// The height the flatten brush levels toward: the ground under the player's feet, in whole centimetres.
const feetCm = () => (me.body ? Math.round(groundHeight(me.body.position.x, me.body.position.z) * 100) : 0);

// Called every frame by the shovel feature.
export function updateShovel() {
  ensureDom();
  const active = shovelActive();
  const t = active ? aim() : null;
  shovel.target = t;
  outer.mesh.visible = inner.mesh.visible = !!t;
  const carry = carryAmount();
  const kind = shovel.hold ?? (shovel.flat ? 'flatten' : 'dig');
  if (chip) {
    const keys = inputKind() === 'kbm' ? '  (Q dig, Z pile)' : '';
    const text = shovel.on ? `${LABELS[kind]}  Sand ${carry}/${CARRY_MAX}${keys}` : '';
    if (text !== lastChip) {
      lastChip = text;
      chip.textContent = text;
      chip.hidden = !shovel.on;
      chip.style.setProperty('--fill', `${Math.round((carry / CARRY_MAX) * 100)}%`);
    }
    chip.dataset.mode = shovel.hold ?? '';
  }
  let reason = null;
  if (t) {
    const edit = { op: kind, i: t.i, j: t.j, p: myId };
    if (kind === 'flatten') edit.h = feetCm();
    reason = terrain.check(edit, 1e9); // the same pure validation the host runs (rate aside)
    const color = reason ? RING_COLORS.bad : RING_COLORS[kind];
    outer.mat.color.setHex(color);
    inner.mat.color.setHex(color);
    placeRing(outer, t, carry / CARRY_MAX);
    placeRing(inner, t);
  }
  const text = reason ? (REASONS[reason] ?? "Can't do that") : null;
  if (text !== lastReason) {
    lastReason = text;
    reasonEl.textContent = text ?? '';
    reasonEl.hidden = !text;
  }
  if (!t || !shovel.hold || !active) return;
  const now = performance.now();
  if (now - shovel.lastMs < REPEAT_MS) return;
  shovel.lastMs = now;
  // Dragging: step at most 2 cells per edit along the path from the last edit, so a fast sweep draws a
  // continuous channel or wall instead of dots.
  let { i, j } = t;
  const lc = shovel.lastCell;
  if (lc) {
    const di = i - lc.i,
      dj = j - lc.j;
    const dist = Math.max(Math.abs(di), Math.abs(dj));
    if (dist > 2) {
      i = lc.i + Math.round((di * 2) / dist);
      j = lc.j + Math.round((dj * 2) / dist);
    }
  }
  shovel.lastCell = { i, j };
  const edit = { op: shovel.hold, i, j };
  if (shovel.hold === 'flatten') edit.h = feetCm();
  submitted = { op: edit.op, i, j };
  submitEdit(edit);
}
