// Phase 3: dig and pile. Wires the pure sand-layer logic (terrain-logic.js) into the world sync contract,
// then adapts applied edits to the terrain mesh, the physics heightfield and the water height texture.
// Also owns the shovel tool: mode, aiming, the target ring and the hold-to-repeat loop.
import * as THREE from 'three';
import { GRID_RES, CELL, HALF, COURT, BALL_R, PLAYER_R } from '../constants.js';
import { clamp } from '../math.js';
import { heights, groundHeight, setCellHeight, refreshRegion } from '../terrain.js';
import { refreshGround } from '../physics.js';
import { updateHeightTexels } from '../water-render.js';
import { scene, camera } from '../scene.js';
import { me, camForward } from '../player.js';
import { ball } from '../ball.js';
import { registerOp, registerState, onApplied, onTick, submitEdit } from './sync.js';
import { createTerrainState, CARRY_MAX, EDIT_MIN_CM, EDIT_MAX_CM } from './terrain-logic.js';

const N = GRID_RES;
export const REACH = 4.5; // metres from the player to the aimed spot
const REPEAT_MS = 220; // client-side repeat while a button is held (host limit is 200 ms)

// ---------------------------------------------------------------- state
// Base heights, quantized once. The court is sand too, so it is editable even where it sits above the beach band.
const baseCm = new Int16Array(N * N);
const editable = new Uint8Array(N * N);
for (let i = 0; i < N; i++)
  for (let j = 0; j < N; j++) {
    const idx = i * N + j;
    baseCm[idx] = Math.round(heights[i][j] * 100);
    heights[i][j] = baseCm[idx] / 100; // every machine simulates on the same quantized ground
    const onCourt = Math.hypot(i * CELL - HALF - COURT.x, HALF - j * CELL - COURT.z) <= COURT.r + 3;
    editable[idx] = onCourt || (baseCm[idx] >= EDIT_MIN_CM && baseCm[idx] <= EDIT_MAX_CM) ? 1 : 0;
  }
updateHeightTexels(0, 0, N - 1, N - 1);
refreshGround();
export const terrain = createTerrainState({ base: baseCm, n: N, editable });

registerOp('dig', { validate: terrain.validate, apply: terrain.apply });
registerOp('pile', { validate: terrain.validate, apply: terrain.apply });
registerState('terrain', {
  serialize: terrain.serialize,
  load(json) {
    for (const idx of terrain.load(json)) markDirty(idx);
  },
  hash: terrain.hash,
});

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
let submitted = null;

onApplied((edit) => {
  if (submitted && submitted.op === edit.op && submitted.i === edit.i && submitted.j === edit.j) {
    myId = edit.p;
    submitted = null;
  }
  // The brush touches the 3x3 around (i, j); mark its corners, the box covers the rest.
  markDirty(Math.max(0, edit.i - 1) * N + Math.max(0, edit.j - 1));
  markDirty(Math.min(N - 1, edit.i + 1) * N + Math.min(N - 1, edit.j + 1));
});

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
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      const idx = i * N + j;
      setCellHeight(i, j, (baseCm[idx] + terrain.delta[idx]) / 100, terrain.delta[idx] / 100);
    }
  refreshRegion(i0, j0, i1, j1);
  refreshGround();
  updateHeightTexels(i0, j0, i1, j1);
  liftIfBuried(me.body, PLAYER_R);
  if (ball.mine) liftIfBuried(ball.body, BALL_R);
}
onTick(flushTerrain);

// ---------------------------------------------------------------- shovel tool
export const shovel = { on: false, hold: null, target: null, lastMs: 0 };

export function toggleShovel(force) {
  shovel.on = force ?? !shovel.on;
  if (!shovel.on) shovel.hold = null;
  document.body.classList.toggle('shovel', shovel.on);
}
// Whether the shovel should take clicks right now (the ball wins while it is in hand).
export const shovelActive = () => shovel.on && me.entered && !me.holding && !me.charging;
export function setHold(kind) {
  shovel.hold = kind;
  if (kind) shovel.lastMs = 0;
}
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

// Target ring: a thin strip hugging the ground around the aimed cell.
const RING_SEG = 40;
const ringGeo = new THREE.BufferGeometry();
ringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RING_SEG + 1) * 2 * 3), 3));
{
  const idx = [];
  for (let s = 0; s < RING_SEG; s++) {
    const a = s * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  ringGeo.setIndex(idx);
}
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.frustumCulled = false;
ring.visible = false;
ring.renderOrder = 5;
scene.add(ring);
const RING_COLORS = { dig: 0xff9a3d, pile: 0xfff2c4, bad: 0xff5a4d };

function placeRing(t) {
  const a = ringGeo.attributes.position.array;
  for (let s = 0; s <= RING_SEG; s++) {
    const ang = (s / RING_SEG) * Math.PI * 2;
    const c = Math.cos(ang),
      sn = Math.sin(ang);
    for (let side = 0; side < 2; side++) {
      const r = side ? 1.9 : 1.65;
      const x = t.x + c * r,
        z = t.z + sn * r;
      const k = (s * 2 + side) * 3;
      a[k] = x;
      a[k + 1] = Math.max(groundHeight(x, z), 0.02) + 0.07;
      a[k + 2] = z;
    }
  }
  ringGeo.attributes.position.needsUpdate = true;
}

const chipEl = () => document.getElementById('shovel-chip');
let lastChip = '';

// Called every frame from main.js.
export function updateShovel() {
  const active = shovelActive();
  const t = active ? aim() : null;
  shovel.target = t;
  ring.visible = !!t;
  const chip = chipEl();
  if (chip) {
    const text = shovel.on ? `Shovel  Sand ${carryAmount()}/${CARRY_MAX}` : '';
    if (text !== lastChip) {
      lastChip = text;
      chip.textContent = text;
      chip.hidden = !shovel.on;
    }
    chip.dataset.mode = shovel.hold ?? '';
  }
  if (!t) return;
  const kind = shovel.hold ?? 'dig';
  const ok = terrain.plan(kind, t.i, t.j, myId).length > 0;
  ringMat.color.setHex(ok ? RING_COLORS[kind] : RING_COLORS.bad);
  placeRing(t);
  if (shovel.hold && active) {
    const now = performance.now();
    if (now - shovel.lastMs >= REPEAT_MS) {
      shovel.lastMs = now;
      const edit = { op: shovel.hold, i: t.i, j: t.j };
      submitted = { ...edit };
      submitEdit(edit);
    }
  }
}
