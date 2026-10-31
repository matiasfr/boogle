// The island: natural ground (shape.js) reshaped by every point of interest's site file. See README.md.
//
// Each POI is a folder in src/pois/. Its site.js (placement, terrain stamps, keep-out discs) is read here, before the
// terrain is built; its index.js (meshes, colliders, lights, per-frame updates) is loaded later by
// src/features/pois.js. Add or delete a folder to add or remove a POI; nothing else on the island changes.
import { createIsland } from './stamps.js';
import { islandBaseCm } from './ground.js';

const found = import.meta.glob('../pois/*/site.js', { eager: true });

// Folder order (alphabetical), so every client composes the stamps in the same order.
const sites = Object.keys(found)
  .sort()
  .map((path) => ({ id: path.split('/').at(-2), ...found[path].default }));

export const island = createIsland(sites);
// Base heights in cm on the world grid (ground.js): the fixed ground the terrain mesh and heightfield are built from.
export const baseCm = islandBaseCm(island);
