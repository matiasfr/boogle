// The island's land in Node, built by the same code as the game (src/island/ground.js), for tests of the shared sim.
// src/island/index.js finds sites with Vite's import.meta.glob('../pois/*/site.js'), which Node lacks: this loads the
// same files and sorts them by the same key string, so the stamps compose in the same order as in the browser.
import fs from 'node:fs';
import { createIsland } from '../../src/island/stamps.js';
import { islandBaseCm } from '../../src/island/ground.js';

const ISLAND_DIR = new URL('../../src/island/', import.meta.url); // the glob's keys are relative to index.js
export const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/world-inputs.json', import.meta.url), 'utf8'));

// FNV-1a style over the values in index order, as uint32 (the hash dev/scenarios/world-inputs.mjs pins).
export function fnv(a) {
  let h = 2166136261;
  for (let k = 0; k < a.length; k++) h = Math.imul(h ^ a[k], 16777619);
  return h >>> 0;
}

const keys = fs
  .readdirSync(new URL('../pois/', ISLAND_DIR), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(new URL(`../pois/${d.name}/site.js`, ISLAND_DIR)))
  .map((d) => '../pois/' + d.name + '/site.js')
  .sort();
export const sites = await Promise.all(
  keys.map(async (key) => ({ id: key.split('/').at(-2), ...(await import(new URL(key, ISLAND_DIR))).default })),
);
export const island = createIsland(sites);

// The home land on the full 409 grid: base heights (cm) built only inside the fixture's window (sea floor outside)
// and the gifts layout as pinned. Built once per process; treat it as read-only.
let home = null;
export function homeLand() {
  home ??= { n: fixture.n, base: islandBaseCm(island, fixture.n, fixture.window), layout: fixture.layout };
  return home;
}
