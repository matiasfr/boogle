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
  const { GRID, ORIGIN } = await import('../../src/proto/place/layout.ts');
  const hf = Array.from({ length: T.NX }, (_, i) =>
    Array.from({ length: T.NZ }, (_, j) => T.heights[T.at(i, T.NZ - 1 - j)]!),
  );
  const solids: Solid[] = [
    {
      id: 'terrain',
      source: { file: 'src/proto/place/land.ts', symbol: 'buildMesh' },
      shape: { kind: 'heightfield', heights: hf, cell: T.CELL },
      position: { x: ORIGIN.x + GRID.x0, y: 0, z: ORIGIN.z + GRID.z1 },
      support: 'embedded',
    },
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
    boundaryRetries = 0;
  try {
    for (let z = 35; z <= 78; z += 0.5)
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
      triangles: C.coveMeshes.reduce((n, m) => n + m.indices.length / 3, 0),
      addedBodies: C.coveMeshes.length,
      errors,
      coverage: {
        included: ['finished heightfield', 'all cove kit/rock triangles'],
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
