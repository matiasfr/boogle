// The opt-in patch uses the same triangles for drawing, Owner collision and Local surface/shore queries.
// Four unchanged heightfields surround the hole; never leave the original collider under the lowered sand.
import type { BufferGeometry } from 'three/webgpu';
import { CELL, HALF, GRID_RES, SEA } from '../../constants.ts';
import { heights, groundSurface } from '../../island/heights.ts';
import { SHORE, inShore } from '../../island/shore-options.ts';
import { terrainBody, groundMat, GROUP } from '../../physics/physics.ts';
import { createBody, addBody, removeBody } from '../../physics/engine.ts';
import { gridBedAt, registerShoreProvider } from '../../render/water/shore-providers.ts';

export function createShoreContact(geometry: BufferGeometry, height: (x: number, z: number) => number) {
  const i0 = Math.round((SHORE.x0 + HALF) / CELL),
    i1 = Math.round((SHORE.x1 + HALF) / CELL);
  const j0 = Math.round((HALF - SHORE.z1) / CELL),
    j1 = Math.round((HALF - SHORE.z0) / CELL);
  const end = GRID_RES - 1;
  const bodies = [
    [0, i0, 0, end],
    [i1, end, 0, end],
    [i0, i1, 0, j0],
    [i0, i1, j1, end],
  ].map(([a, b, c, d]) =>
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position: { x: a! * CELL - HALF, y: 0, z: HALF - c! * CELL },
      shapes: [
        { kind: 'heightfield', cell: CELL, heights: heights.slice(a, b! + 1).map((col) => col.slice(c, d! + 1)) },
      ],
    }),
  );
  bodies.push(
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      shapes: [{ kind: 'trimesh', vertices: geometry.getAttribute('position').array, indices: geometry.index!.array }],
    }),
  );
  const step = CELL / SHORE.divisions;
  const nx = (i1 - i0) * SHORE.divisions,
    nz = (j1 - j0) * SHORE.divisions;
  const grid = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) grid[j * (nx + 1) + i] = height(SHORE.x0 + i * step, SHORE.z1 - j * step);
  const sample = (x: number, z: number) => {
    if (!inShore(x, z)) return null;
    const u = (x - SHORE.x0) / step,
      v = (SHORE.z1 - z) / step;
    const i = Math.min(nx - 1, Math.floor(u)),
      j = Math.min(nz - 1, Math.floor(v)),
      a = u - i,
      b = v - j;
    const h00 = grid[j * (nx + 1) + i]!,
      h10 = grid[j * (nx + 1) + i + 1]!,
      h01 = grid[(j + 1) * (nx + 1) + i]!,
      h11 = grid[(j + 1) * (nx + 1) + i + 1]!;
    return a + b <= 1 ? h00 + (h10 - h00) * a + (h01 - h00) * b : h11 + (h01 - h11) * (1 - a) + (h10 - h11) * (1 - b);
  };
  const base = gridBedAt({
    x0: -HALF,
    z0: HALF,
    dx: CELL,
    dz: -CELL,
    nx: GRID_RES,
    nz: GRID_RES,
    height: (i, j) => heights[i]![j]!,
  });
  let active = false;
  return (enabled: boolean) => {
    if (active === enabled) return;
    active = enabled;
    if (enabled) {
      removeBody(terrainBody);
      for (const body of bodies) addBody(body);
      groundSurface.sample = sample;
    } else {
      for (const body of bodies) removeBody(body);
      addBody(terrainBody);
      delete groundSurface.sample;
    }
    registerShoreProvider({
      id: 'home',
      bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
      seaLevel: SEA,
      extent: 512,
      revision: enabled ? 'home-shore-triangles-1' : 'stamped-home-1',
      bedAt: (x, z) => {
        const y = enabled ? sample(x, z) : null;
        return y === null ? base(x, z) : { valid: true, height: y };
      },
    });
  };
}
