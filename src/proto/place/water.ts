// Register the finished terrain grid only: tracks, bridge decks and room roofs are separate geometry.
import { SEA } from '../../constants.ts';
import { registerShoreProvider } from '../../render/water-render.ts';
import { gridBedAt } from '../../render/water/shore-providers.ts';
import { GRID, ORIGIN } from './layout.ts';
import { heights, NX, NZ, at } from './terrain.ts';

export function registerPlaceShore() {
  const bounds = {
    minX: ORIGIN.x + GRID.x0,
    maxX: ORIGIN.x + GRID.x1,
    minZ: ORIGIN.z + GRID.z0,
    maxZ: ORIGIN.z + GRID.z1,
  };
  return registerShoreProvider({
    id: 'place',
    bounds,
    seaLevel: SEA,
    revision: 'finished-place-triangles-2',
    extent: 1024,
    vertexBed: true, // 2 m atlas corners align with land.ts's 2 m vertices and anti-diagonal.
    bedAt: gridBedAt({
      x0: bounds.minX,
      z0: bounds.minZ,
      dx: GRID.cell,
      dz: GRID.cell,
      nx: NX,
      nz: NZ,
      height: (i, j) => heights[at(i, j)]!,
      triangles: true,
    }),
  });
}
