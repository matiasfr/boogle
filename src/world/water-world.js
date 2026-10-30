// Phase 4: the shared water on the island. The sim, its ground copy, sea pin, tick and the slosh op are lockstep rules
// (rules/water.js); this module adapts them to the cosmetic mesh (water-surface.js), to physics/splash (water-field.js)
// and turns ball impacts into slosh edits.
import { rules } from './game-world.js'; // first: the lockstep rules register before anything else
import { CELL, HALF, SEA } from '../constants.js';
import { clamp } from '../math.js';
import { groundHeight } from '../adapters/terrain.js';
import { SLOSH } from '../sim/water-region.js';
import { waterField } from '../physics/water-field.js';
import { createWaterSurface } from '../render/water-surface.js';
import { onAfterTick, onSnapshot, submitEdit, world } from './sync.js';
import { WATER_SIM } from './rules/water.js';

// ------------------------------------------------------------------ tunables (all the feel lives here)
export const WATER_CONFIG = {
  ...WATER_SIM, // the sim's own (region, sea pin, flow rate): rules/water.js
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

const CFG = WATER_CONFIG;
const { water, region, simTerrain, stepOnce } = rules.water;
const { i0, j0, w: W, h: H } = region;

const cellX = (x) => Math.round((x + HALF) / CELL);
const cellZ = (z) => Math.round((HALF - z) / CELL);

// ------------------------------------------------------------------ render: the surface follows the sim
const surface = createWaterSurface({ water, i0, j0, flowMax: CFG.flowMax, flowGain: CFG.flowGain });
surface.syncAll();
onAfterTick(() => surface.scan(), 'water surface'); // retarget the mesh to the new depths
onSnapshot(() => surface.syncAll());

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
  stats: () => ({ ...water.stats(), W, H }), // step cost: `npm run perf -- --sim`
  hash: water.hash,
  fast(n) {
    // test helper: run n extra sim steps right now (solo only; this desyncs a networked room)
    for (let k = 0; k < n; k++) stepOnce();
    surface.scan();
  },
};
