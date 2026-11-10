// Ring Island's shore for the sea (docs/plans/ring-island-build1.md, R2b; the coast in regions, R2a): its finished ground
// grid as bathymetry, so the island gets the foam lip and cyan shallows. Decks and fills over the sea are not beds; the
// halt's fill is ground, so it is. Registered once at startup, mounted or not: a re-registration re-bakes the coast.
import { SEA } from '../../constants.ts';
import { registerShoreProvider } from '../../render/water-render.ts';
import { gridBedAt } from '../../render/water/shore-providers.ts';
import type { IslandGround } from './ground.ts';

export function registerRingShore(g: IslandGround) {
  return registerShoreProvider({
    id: 'ring',
    bounds: g.bounds,
    seaLevel: SEA,
    revision: 'ring-island-1',
    extent: 1024,
    // The collider's own triangles (ground.ts islandH).
    bedAt: gridBedAt({ x0: g.x0, z0: g.z0, dx: g.cell, dz: g.cell, nx: g.nx, nz: g.nz, height: g.at, triangles: true }),
  });
}
