// The island: natural ground (shape.ts) reshaped by every point of interest's site file. See README.md.
//
// Each POI is a folder in src/pois/. Its site.ts (placement, terrain stamps, keep-out discs) is read here, before the
// terrain is built; its index.ts (meshes, colliders, lights, per-frame updates) is loaded later by
// src/features/pois.ts. Add or delete a folder to add or remove a POI; nothing else on the island changes.
import { createIsland } from './stamps.ts';
import { islandBaseCm } from './ground.ts';
import { placeSite } from './layout.ts';
import type { Site } from './stamps.ts';

const found = import.meta.glob<{ default: Site }>('../pois/*/site.{js,ts}', { eager: true });

// Folder order (alphabetical), so every client composes the stamps in the same order. `?layout=` may move a site first
// (./layout.ts).
const sites = Object.keys(found)
  .sort()
  .map((path) => {
    const id = path.split('/').at(-2)!;
    placeSite(id, found[path].default);
    return { id, ...found[path].default };
  });

export const island = createIsland(sites);
// Base heights in cm on the world grid (ground.ts): the fixed ground the terrain mesh and heightfield are built from.
export const baseCm = islandBaseCm(island);
