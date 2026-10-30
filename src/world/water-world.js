// Phase 4: the shared water simulation on the island. Owns the one sim instance, keeps its ground in step
// with every terrain edit (TERRAIN_OPS), registers it with the world sync (state, per-tick step, slosh edits)
// and wires it to the cosmetic mesh (water-surface.js) and to physics/splash (water-field.js).
//
// Order inside a tick: edits apply (terrain deltas change) -> terrain-edits flushes its mesh -> this module
// copies changed ground into the sim, wakes those cells and steps the water -> the surface mesh retargets.
import { GRID_RES, CELL, HALF, SEA } from '../constants.js';
import { homeBox } from './grid.js';
import { clamp } from '../math.js';
import { groundHeight } from '../terrain.js';
import { createWater } from '../sim/water.js';
import { regionFromBase, checkSlosh, applySlosh, SLOSH } from '../sim/water-region.js';
import { waterField } from '../water-field.js';
import { createWaterSurface } from '../water-surface.js';
import { registerOp, registerState, onTick, onApplied, onSnapshot, submitEdit, world } from './sync.js';
import { terrain } from './terrain-edits.js'; // import first: its onTick (mesh flush) must run before ours
import { TERRAIN_OPS } from './terrain-logic.js';

// ------------------------------------------------------------------ tunables (all the feel lives here)
export const WATER_CONFIG = {
  regionBelowCm: -150, // cells whose base ground is below this are open ocean and not simulated
  seaPinBelowCm: -220, // ground deeper than this is open sea: held at sea level (water that reaches it is absorbed)
  regionPad: 3, // extra cells around the island box
  flowRate: 160, // sim: how fast levels equalise (water.js: 256 = as fast as allowed)
  // Physics (owner-side only): how hard sim water pushes balls and swimmers.
  flowMax: 2.6, // m/s cap on the current speed
  flowGain: 7, // current m/s per unit of surface slope
  minPushCm: 6, // water shallower than this does not carry things
  puddleCm: 3, // the surface is only "water" for floating/splashing from this depth
  playerDrift: 0.6, // how much of the current a wading player is carried by
  // Slosh: a ball landing in a pool throws water out (see sim/water-region.js SLOSH).
  sloshMinSpeed: 3.6, // m/s landing speed to slosh
  sloshCmPerMs: 55, // extra cm thrown per m/s above the minimum
};

const N = GRID_RES;
const CFG = WATER_CONFIG;

// ------------------------------------------------------------------ the sim
// Only the home square (constants.js HOME) is simulated: the mainland has no shared water, so the sim costs what it
// always did however big the island gets.
const full = regionFromBase(terrain.base, N, CFG.regionBelowCm, CFG.regionPad);
const { i0: homeI0, i1: homeI1, j0: homeJ0, j1: homeJ1 } = homeBox();
const i0 = Math.max(full.i0, homeI0),
  j0 = Math.max(full.j0, homeJ0);
const W = Math.min(full.i0 + full.w - 1, homeI1) - i0 + 1,
  H = Math.min(full.j0 + full.h - 1, homeJ1) - j0 + 1;
const region = { i0, j0, w: W, h: H };
const regionKey = `${i0},${j0},${W},${H}`;
const simTerrain = new Int32Array(W * H);
function copyGround(a0, b0, a1, b1) {
  for (let a = Math.max(a0, i0); a <= Math.min(a1, i0 + W - 1); a++)
    for (let b = Math.max(b0, j0); b <= Math.min(b1, j0 + H - 1); b++) {
      const g = a * N + b;
      simTerrain[(a - i0) * H + (b - j0)] = terrain.base[g] + terrain.delta[g];
    }
}
copyGround(0, 0, N - 1, N - 1);

const water = createWater({
  width: W,
  height: H,
  terrain: simTerrain,
  sea: SEA * 100,
  seaEdges: 15,
  flowRate: CFG.flowRate,
});
const seaFill = (c) => Math.max(0, water.seaLevel - simTerrain[c]); // how deep the sea sits over a cell
for (let c = 0; c < W * H; c++) water.depth[c] = seaFill(c);

const cellX = (x) => Math.round((x + HALF) / CELL);
const cellZ = (z) => Math.round((HALF - z) / CELL);
// Deep sea cells are pinned to sea level after every step: the ocean is an infinite reservoir, so water
// reaching the sea disappears into it instead of heaping up, and holes dug at the shore always find water.
const seaCells = [];
for (let c = 0; c < W * H; c++) if (simTerrain[c] < CFG.seaPinBelowCm) seaCells.push(c);
function pinSea() {
  for (const c of seaCells) {
    const i = (c / H) | 0,
      j = c - i * H;
    const diff = water.depth[c] - seaFill(c);
    if (diff > 0) water.removeWater(i, j, diff);
    else if (diff < 0) water.addWater(i, j, -diff);
  }
}

const surface = createWaterSurface({ water, i0, j0, flowMax: CFG.flowMax, flowGain: CFG.flowGain });
surface.syncAll();

// ------------------------------------------------------------------ sync: state, ops, tick
// The sea part of the depth grid is implied by the ground, so snapshots only carry cells that differ from it.
registerState('water', {
  serialize() {
    const s = water.serialize();
    const cells = [];
    for (let c = 0; c < W * H; c++) if (water.depth[c] !== seaFill(c)) cells.push(c, water.depth[c]);
    return { ...s, cells, region: regionKey };
  },
  load(json) {
    // Cells are region-relative: water saved over a different region (an older island) is dropped and the sea refills.
    if (json.region !== regionKey) json = { ...json, cells: [] };
    copyGround(0, 0, N - 1, N - 1); // terrain state was loaded just before this one
    const d = new Int32Array(W * H);
    for (let c = 0; c < d.length; c++) d[c] = seaFill(c);
    for (let k = 0; k + 1 < json.cells.length; k += 2) d[json.cells[k]] = json.cells[k + 1];
    const cells = [];
    for (let c = 0; c < d.length; c++) if (d[c]) cells.push(c, d[c]);
    water.load({ ...json, cells });
    surface.syncAll();
  },
  hash: water.hash,
});

let groundDirty = null; // [a0, b0, a1, b1] in terrain grid cells
function dirtyGround(a0, b0, a1, b1) {
  if (!groundDirty) groundDirty = [a0, b0, a1, b1];
  else {
    groundDirty[0] = Math.min(groundDirty[0], a0);
    groundDirty[1] = Math.min(groundDirty[1], b0);
    groundDirty[2] = Math.max(groundDirty[2], a1);
    groundDirty[3] = Math.max(groundDirty[3], b1);
  }
}

let stepMs = 0;
const lastSlosh = new Map(); // host-only rate bookkeeping, never serialized
registerOp('slosh', {
  validate(edit, ctx) {
    const why = checkSlosh(
      { i: edit.i - i0, j: edit.j - j0, amt: edit.amt },
      water,
      ctx.tick,
      lastSlosh.get(edit.p) ?? -1e9,
    );
    if (why) return false;
    lastSlosh.set(edit.p, ctx.tick);
    return true;
  },
  apply(edit) {
    const wi = edit.i - i0,
      wj = edit.j - j0;
    if (wi < 0 || wj < 0 || wi >= W || wj >= H) return;
    applySlosh(water.depth, W, H, wi, wj, edit.amt);
    water.wake(wi, wj, 4);
  },
});

// Any terrain op changes ground under the water, so all of them re-copy their 5x5 brush footprint. (Flatten used to be
// left out: long-running peers kept stale sim ground while a joiner's load copied it fresh, and their water diverged.)
onApplied((edit) => {
  if (!TERRAIN_OPS.has(edit.op)) return; // other ops (slosh) leave terrain.lastCells() stale
  for (const [idx] of terrain.lastCells()) {
    const a = (idx / N) | 0;
    dirtyGround(a, idx - a * N, a, idx - a * N);
  }
}, 'water ground');

onTick(() => {
  if (groundDirty) {
    const [a0, b0, a1, b1] = groundDirty;
    groundDirty = null;
    copyGround(a0, b0, a1, b1);
    for (let a = Math.max(a0, i0); a <= Math.min(a1, i0 + W - 1); a++)
      for (let b = Math.max(b0, j0); b <= Math.min(b1, j0 + H - 1); b++) water.wake(a - i0, b - j0, 1);
  }
  const t0 = performance.now();
  water.step();
  pinSea();
  stepMs = stepMs * 0.9 + (performance.now() - t0) * 0.1;
}, 'water');
onTick(() => surface.scan(), 'water surface'); // render-side: retarget the mesh to the new depths
onSnapshot(() => {
  copyGround(0, 0, N - 1, N - 1);
  surface.syncAll();
});

// ------------------------------------------------------------------ physics + splash bridge
function simDepthM(fi, fj) {
  // bilinear water thickness (m) at fractional region cell coordinates
  if (fi < 0 || fj < 0 || fi > W - 1 || fj > H - 1) return 0;
  const a = Math.min(Math.floor(fi), W - 2),
    b = Math.min(Math.floor(fj), H - 2);
  const u = fi - a,
    v = fj - b;
  const d = water.depth,
    c = a * H + b;
  return ((d[c] * (1 - u) + d[c + H] * u) * (1 - v) + (d[c + 1] * (1 - u) + d[c + H + 1] * u) * v) / 100;
}

waterField.surfaceAt = (x, z) => {
  const d = simDepthM((x + HALF) / CELL - i0, (HALF - z) / CELL - j0);
  if (d < CFG.puddleCm / 100) return SEA;
  return Math.max(SEA, groundHeight(x, z) + d);
};

const FLOW = surface.flowTarget;
waterField.currentAt = (x, z, out) => {
  out.x = out.z = 0;
  const wi = cellX(x) - i0,
    wj = cellZ(z) - j0;
  if (wi < 0 || wj < 0 || wi >= W || wj >= H) return out;
  const c = wi * H + wj;
  if (water.depth[c] < CFG.minPushCm || simTerrain[c] + water.depth[c] <= water.seaLevel + 2) return out;
  out.x = FLOW[c * 4 + 2];
  out.z = FLOW[c * 4 + 3];
  return out;
};

let lastMyTick = -1e9;
waterField.onBallImpact = (x, z, speed) => {
  if (speed < CFG.sloshMinSpeed || world.tick - lastMyTick < SLOSH.rateTicks) return;
  const i = cellX(x),
    j = cellZ(z);
  const wi = i - i0,
    wj = j - j0;
  if (wi < 2 || wj < 2 || wi > W - 3 || wj > H - 3) return;
  const c = wi * H + wj;
  if (water.depth[c] < SLOSH.minDepthCm || simTerrain[c] + water.depth[c] <= water.seaLevel + 4) return; // not the sea
  const amt = clamp(Math.round(60 + (speed - CFG.sloshMinSpeed) * CFG.sloshCmPerMs), 1, SLOSH.maxCm);
  lastMyTick = world.tick;
  submitEdit({ op: 'slosh', i, j, amt });
};

// ------------------------------------------------------------------ per frame (driven by the mesh's draw call)
let lastMs = performance.now();
surface.mesh.onBeforeRender = () => {
  const now = performance.now();
  const dt = Math.min((now - lastMs) / 1000, 0.1);
  lastMs = now;
  surface.frame(dt);
};

// Debug / test handle.
window.__water = {
  water,
  region,
  stats: () => ({ ...water.stats(), stepMs, W, H }),
  hash: water.hash,
  fast(n) {
    // test helper: run n extra sim steps right now (solo only; this desyncs a networked room)
    for (let k = 0; k < n; k++) {
      water.step();
      pinSea();
    }
    surface.scan();
  },
};
