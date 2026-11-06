// Register the finished terrain grid only: tracks, bridge decks and room roofs are separate geometry.
import { SEA } from '../../constants.ts';
import { registerShoreProvider } from '../../render/water-render.ts';
import { gridBedAt } from '../../render/water/shore-providers.ts';
import { GRID, ORIGIN } from './layout.ts';
import { heights, NX, NZ, at, fineHeightAt } from './terrain.ts';
import { SHORE_COAST } from './shore-layout.ts';
import { COVE, COVE_ROCKS, coveSurface } from './cove.ts';

export function registerPlaceShore() {
  const bounds = {
    minX: ORIGIN.x + GRID.x0,
    maxX: ORIGIN.x + GRID.x1,
    minZ: ORIGIN.z + GRID.z0,
    maxZ: ORIGIN.z + GRID.z1,
  };
  const gridBed = gridBedAt({
    x0: bounds.minX,
    z0: bounds.minZ,
    dx: GRID.cell,
    dz: GRID.cell,
    nx: NX,
    nz: NZ,
    height: (i, j) => heights[at(i, j)]!,
    triangles: true,
  });
  return registerShoreProvider({
    id: 'place',
    bounds,
    seaLevel: SEA,
    revision: COVE ? 'cove-smooth-2' : SHORE_COAST ? 'shore-place-triangles-3' : 'finished-place-triangles-2',
    extent: 1024,
    // The bed query matches the 1 m cove triangles. The existing 2 m atlas cannot resolve every fine feature.
    vertexBed: true,
    bedAt: (x, z) => {
      const bed = gridBed(x, z);
      const lx = x - ORIGIN.x,
        lz = z - ORIGIN.z;
      return COVE && bed.valid ? { valid: true, height: coveSurface(lx, lz, fineHeightAt(lx, lz, bed.height)) } : bed;
    },
    obstacles: COVE
      ? COVE_ROCKS.map((r) => ({
          kind: 'circle' as const,
          x: r.x + ORIGIN.x,
          z: r.z + ORIGIN.z,
          radius: Math.max(r.rx, r.rz),
          top: r.top,
        }))
      : [],
  });
}
