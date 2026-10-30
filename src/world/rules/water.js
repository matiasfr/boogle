// Water rules: the `water` state (the shared water sim from ../../sim/water.js over the home square), its ground copy of
// the terrain, the sea pin, its tick and the slosh op. Lockstep: everything here runs the same on every peer (see
// ./README.md).
//
// Order inside a tick: edits apply (terrain deltas change, the `water ground` listener marks their cells) -> the
// `water` tick copies that ground into the sim, wakes those cells and steps the water, then pins the sea.
import { SEA, homeBox } from '../grid.js';
import { TERRAIN_OPS } from '../terrain-logic.js';
import { createWater } from '../../sim/water.js';
import { regionFromBase, checkSlosh, applySlosh } from '../../sim/water-region.js';

export const name = 'water';

// The sim's tunables (the adapter's WATER_CONFIG adds the physics and slosh feel on top).
export const WATER_SIM = {
  regionBelowCm: -150, // cells whose base ground is below this are open ocean and not simulated
  seaPinBelowCm: -220, // ground deeper than this is open sea: held at sea level (water that reaches it is absorbed)
  regionPad: 3, // extra cells around the island box
  flowRate: 160, // how fast levels equalise (../../sim/water.js: 256 = as fast as allowed)
};
const CFG = WATER_SIM;

export function install(sync, land, rules, opts) {
  const { n: N } = land;
  const terrain = rules.terrain.state;

  // Only the home square (../grid.js HOME) is simulated: the mainland has no shared water, so the sim costs what it
  // always did however big the island gets.
  const full = regionFromBase(land.base, N, CFG.regionBelowCm, CFG.regionPad);
  const home = homeBox();
  const i0 = Math.max(full.i0, home.i0),
    j0 = Math.max(full.j0, home.j0);
  const W = Math.min(full.i0 + full.w - 1, home.i1) - i0 + 1,
    H = Math.min(full.j0 + full.h - 1, home.j1) - j0 + 1;
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

  // Deep sea cells are pinned to sea level after every step: the ocean is an infinite reservoir, so water reaching the
  // sea disappears into it instead of heaping up, and holes dug at the shore always find water.
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

  // The sea part of the depth grid is implied by the ground, so snapshots only carry cells that differ from it.
  sync.registerState('water', {
    serialize() {
      const s = water.serialize();
      const cells = [];
      for (let c = 0; c < W * H; c++) if (water.depth[c] !== seaFill(c)) cells.push(c, water.depth[c]);
      return { ...s, cells, region: regionKey };
    },
    load(json) {
      // Cells are region-relative: water saved over a different region (an older island) is dropped, the sea refills.
      if (json.region !== regionKey) json = { ...json, cells: [] };
      copyGround(0, 0, N - 1, N - 1); // the terrain state loaded just before this one (RULES order)
      const d = new Int32Array(W * H);
      for (let c = 0; c < d.length; c++) d[c] = seaFill(c);
      for (let k = 0; k + 1 < json.cells.length; k += 2) d[json.cells[k]] = json.cells[k + 1];
      const cells = [];
      for (let c = 0; c < d.length; c++) if (d[c]) cells.push(c, d[c]);
      water.load({ ...json, cells });
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

  const lastSlosh = new Map(); // host-only rate bookkeeping, never serialized
  sync.registerOp('slosh', {
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

  // Every terrain op (dig, pile and flatten alike) changes ground under the water: re-copy exactly the cells its apply
  // returned. (Flatten used to be left out: long-running peers kept stale sim ground while a joiner's load copied it
  // fresh, and their water diverged.)
  sync.onApplied((edit, tick, cells) => {
    if (!TERRAIN_OPS.has(edit.op) || !cells) return;
    for (const idx of cells) {
      const a = (idx / N) | 0;
      dirtyGround(a, idx - a * N, a, idx - a * N);
    }
  }, 'water ground');

  let stepMs = 0;
  function stepOnce() {
    water.step();
    pinSea();
  }
  sync.onTick(() => {
    if (groundDirty) {
      const [a0, b0, a1, b1] = groundDirty;
      groundDirty = null;
      copyGround(a0, b0, a1, b1);
      for (let a = Math.max(a0, i0); a <= Math.min(a1, i0 + W - 1); a++)
        for (let b = Math.max(b0, j0); b <= Math.min(b1, j0 + H - 1); b++) water.wake(a - i0, b - j0, 1);
    }
    const t0 = opts.clock();
    stepOnce();
    stepMs = stepMs * 0.9 + (opts.clock() - t0) * 0.1;
  }, 'water');
  sync.onSnapshot(() => copyGround(0, 0, N - 1, N - 1));

  return { water, region, regionKey, simTerrain, stepOnce, stepMs: () => stepMs };
}
