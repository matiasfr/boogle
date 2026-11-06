// Bounded addition to level-check's physical coverage: real pilot mesh + real heightfield facade.
import fs from 'node:fs';
import path from 'node:path';
import { sourceBuild } from './build.ts';
import { openScene, type Solid } from './scene.ts';

export async function auditCove() {
  // Headless level tools normally select classic. Select before importing the source-owned static recipe.
  Object.defineProperty(globalThis, 'location', { value: { search: '?proto=place&terrain=cove' }, configurable: true });
  const T = await import('../../src/proto/place/terrain.ts');
  const C = await import('../../src/proto/place/cove.ts');
  const { ORIGIN } = await import('../../src/proto/place/layout.ts');
  const tiles = T.terrainCollisionTiles();
  const solids: Solid[] = [
    ...tiles.map((tile, i) => ({
      id: `terrain-${i}`,
      source: { file: 'src/proto/place/land.ts', symbol: 'buildMesh' },
      shape: { kind: 'heightfield' as const, heights: tile.heights, cell: tile.cell },
      position: tile.position,
      support: 'embedded' as const,
    })),
    ...C.coveMeshes.map((m) => ({
      id: m.name,
      source: { file: 'src/proto/place/cove-view.ts', symbol: 'buildCove' },
      shape: { kind: 'trimesh' as const, vertices: m.vertices, indices: m.indices },
      position: { x: ORIGIN.x, y: 0, z: ORIGIN.z },
      support: 'embedded' as const,
    })),
  ];
  const scene = await openScene(solids);
  const errors: unknown[] = [];
  let maximumResidual = 0,
    rays = 0,
    protectedVertices = 0,
    boundaryRetries = 0,
    protectedFineSamples = 0,
    protectedMaximumResidual = 0;
  try {
    for (let z = T.COVE_FINE?.z0 ?? 16; z <= (T.COVE_FINE?.z1 ?? 78); z += 0.5)
      for (let x = -214; x <= -156; x += 0.5) {
        let expected = T.H(x + ORIGIN.x, z + ORIGIN.z);
        let hit = scene.below({ x: x + ORIGIN.x, y: 50, z: z + ORIGIN.z }, 60);
        // Retain the exact-edge misses: Rapier's heightfield ray can miss a shared cell boundary.
        // A 1 mm interior probe distinguishes a missing surface from that boundary ambiguity.
        if (!hit || Math.abs(hit.y - expected) > 0.03) {
          boundaryRetries++;
          expected = T.H(x + ORIGIN.x + 0.001, z + ORIGIN.z + 0.001);
          hit = scene.below({ x: x + ORIGIN.x + 0.001, y: 50, z: z + ORIGIN.z + 0.001 }, 60);
        }
        const residual = hit ? Math.abs(hit.y - expected) : Infinity;
        maximumResidual = Math.max(maximumResidual, residual);
        rays++;
        if (residual > 0.03) errors.push({ x, z, expected, actual: hit?.y, residual });
      }
    for (const m of C.coveMeshes)
      for (let k = 0; k < m.vertices.length; k += 3)
        if (T.coveProtection(m.vertices[k]!, m.vertices[k + 2]!) === 0) protectedVertices++;
    if (protectedVertices) errors.push({ protectedVertices });
    const fine = T.COVE_FINE;
    if (fine)
      for (let j = 0; j < fine.nz; j++)
        for (let i = 0; i < fine.nx; i++) {
          const x = fine.x0 + i * fine.cell,
            z = fine.z0 + j * fine.cell;
          if (T.coveProtection(x, z) !== 0) continue;
          protectedFineSamples++;
          const ci = Math.floor((x - T.cellX(0)) / T.CELL),
            cj = Math.floor((z - T.cellZ(0)) / T.CELL);
          const u = (x - T.cellX(ci)) / T.CELL,
            v = (z - T.cellZ(cj)) / T.CELL;
          const a = T.heights[T.at(ci, cj)]!,
            b = T.heights[T.at(ci + 1, cj)]!;
          const c = T.heights[T.at(ci, cj + 1)]!,
            d = T.heights[T.at(ci + 1, cj + 1)]!;
          const original = u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
          protectedMaximumResidual = Math.max(
            protectedMaximumResidual,
            Math.abs(fine.heights[i + j * fine.nx]! - original),
          );
        }
    if (protectedMaximumResidual > 0.000001) errors.push({ protectedMaximumResidual });
    const fineTriangles = fine ? (fine.nx - 1) * (fine.nz - 1) * 2 : 0;
    const replacedCoarseTriangles = fine ? ((fine.x1 - fine.x0) / T.CELL) * ((fine.z1 - fine.z0) / T.CELL) * 2 : 0;
    const build = sourceBuild();
    const dir = path.resolve('.look/level-check', build.sourceHash, 'cove');
    fs.mkdirSync(dir, { recursive: true });
    const report = {
      build: { ...build, dependencies: undefined },
      selection: 'cove',
      status: errors.length ? 'findings' : 'bounded-surface-parity',
      rays,
      maximumResidual,
      boundaryRetries,
      protectedVertices,
      protectedFineSamples,
      protectedMaximumResidual,
      triangles: C.coveMeshes.reduce((n, m) => n + m.indices.length / 3, 0),
      fineTriangles,
      replacedCoarseTriangles,
      addedHeightfieldTriangles: fineTriangles - replacedCoarseTriangles,
      heightfieldBodies: tiles.length,
      addedBodies: C.coveMeshes.length + tiles.length - 1,
      errors,
      coverage: {
        included: [
          'four coarse heightfield partitions and one 1 m cove heightfield',
          'all cove kit/rock triangles',
          'protected fine-grid path/rail/landing vertices',
        ],
        missing: ['other Place creators', 'dynamic cargo/balls', 'controller sweeps', 'camera sweep'],
        verdict: 'Not a complete regional collision certificate. Bot and camera evidence are separate.',
      },
    };
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify({ ...report, solids, dependencies: build.dependencies }, null, 2),
    );
    console.log(
      JSON.stringify({ ...report, errors: errors.slice(0, 8), errorCount: errors.length, artifacts: dir }, null, 2),
    );
    if (errors.length) process.exitCode = 1;
  } finally {
    scene.world.free();
  }
}
