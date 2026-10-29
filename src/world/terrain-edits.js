// Phase 3: dig and pile. Wires the pure sand-layer logic (terrain-logic.js) into the world sync contract,
// then adapts applied edits to the terrain mesh, the physics heightfield and the water height texture.
// Also owns the shovel tool: mode, aiming, the target ring and the hold-to-repeat loop.
import * as THREE from 'three';
import { GRID_RES, CELL, HALF, COURT, BALL_R, PLAYER_R } from '../constants.js';
import { clamp } from '../math.js';
import { heights, groundHeight, setCellHeight, refreshRegion, startSettle } from '../terrain.js';
import { playEditFx } from '../sand-fx.js';
import { refreshGround } from '../physics.js';
import { updateHeightTexels } from '../water-render.js';
import { scene, camera } from '../scene.js';
import { me, camForward } from '../player.js';
import { ball } from '../ball.js';
import { registerOp, registerState, onApplied, onTick, submitEdit } from './sync.js';
import { createTerrainState, CARRY_MAX, EDIT_MIN_CM, EDIT_MAX_CM, FULL_MARGIN } from './terrain-logic.js';
import { PATCH } from '../sim/mushrooms.js';

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
    const inGarden =
      i >= PATCH.i0 - 4 && i <= PATCH.i0 + PATCH.w + 1 && j >= PATCH.j0 - 2 && j <= PATCH.j0 + PATCH.h + 1;
    editable[idx] = !inGarden && (onCourt || (baseCm[idx] >= EDIT_MIN_CM && baseCm[idx] <= EDIT_MAX_CM)) ? 1 : 0;
  }
updateHeightTexels(0, 0, N - 1, N - 1);
refreshGround();
export const terrain = createTerrainState({ base: baseCm, n: N, editable });

registerOp('dig', { validate: terrain.validate, apply: terrain.apply });
registerOp('pile', { validate: terrain.validate, apply: terrain.apply });
registerOp('flatten', { validate: terrain.validate, apply: terrain.apply });
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
  // Cosmetic juice, local only (also for remote players' edits, at lower intensity).
  const c = edit.i * N + edit.j;
  const x = edit.i * CELL - HALF,
    z = HALF - edit.j * CELL;
  const eff = (baseCm[c] + terrain.delta[c]) / 100;
  playEditFx({ op: edit.op, p: edit.p, own: edit.p === myId, x, z, y: Math.max(eff, 0), depth: -terrain.delta[c], wet: eff <= 0.05 });
});
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
      setCellHeight(i, j, (baseCm[idx] + terrain.delta[idx]) / 100, terrain.delta[idx] / 100);
    }
  if (oldH) startSettle(i0, j0, i1, j1, oldH); // render-only dip and spring back
  refreshRegion(i0, j0, i1, j1);
  refreshGround();
  updateHeightTexels(i0, j0, i1, j1);
  liftIfBuried(me.body, PLAYER_R);
  if (ball.mine) liftIfBuried(ball.body, BALL_R);
}
onTick(flushTerrain);

