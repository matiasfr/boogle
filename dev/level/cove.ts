// `npm run level-check -- --cove`: the cove's ground in Rapier (docs/plans/cliff-kit-everywhere.md, step 1). The sculpted
// face and its trimesh are gone; its bluff is the heightfield's, and the cliff kit's shore pieces stand over its front
// as box solids. In one Rapier scene, the real heightfield facade (four coarse partitions and the 1 m cove patch) and
// every shore piece's boxes:
// - parity: every downward ray over the cove patch off the kit lands on the heightfield within 0.03 m of H;
// - the walk is ground: every sample on the bluff's walkable end (sand to top, z 34 to 48) and along its top lands on
//   the heightfield, never a kit box, within 0.03 m of H, on walkable ground;
// - protection: the 1 m patch equals the coarse triangles wherever the path, rail and landing shoulders are protected.
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { sourceBuild } from './build.ts';
import { openScene, type Solid } from './scene.ts';

/** The walk over the bluff's walkable end, from the sand up to its top, then along the top behind the faces. */
function walkSamples(edge: (z: number) => number) {
  const out: { x: number; z: number }[] = [];
  for (let z = 34; z <= 48; z += 0.5) out.push({ x: -195.5, z });
  for (let z = 50; z <= 68; z += 0.5) out.push({ x: edge(z) + 3, z });
  return out;
}

export async function auditCove() {
  const T = await import('../../src/place/terrain.ts');
  const { coveEdge } = await import('../../src/place/cove.ts');
  const { ORIGIN } = await import('../../src/place/layout.ts');
  const { WALKABLE_NY } = await import('../../src/constants.ts');
  const { AREAS, levelOf, solidBoxes } = await import('../prefab/cliff-kit.ts');
  const { loadLevelArtifact } = await import('../../src/prefab/validate.ts');
  const { compiled } = await import('../../src/prefab/catalogue.ts');
  const shore = AREAS.find((a) => a.id === 'shore')!;
  const placements = loadLevelArtifact(
    JSON.parse(fs.readFileSync(`content/built/levels/${levelOf(shore)}.json`, 'utf8')) as unknown,
    compiled.prefabs,
  ).placements;
  const tiles = T.terrainCollisionTiles();
  const kit: Solid[] = placements.flatMap((p) =>
    solidBoxes(p).map((box, n) => {
      const c = box(0, 0, 0);
      const axis = (u: number, v: number, w: number) => {
        const q = box(u, v, w);
        return new THREE.Vector3(q[0] - c[0], q[1] - c[1], q[2] - c[2]).normalize();
      };
      const q = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(axis(1, 0, 0), axis(0, 1, 0), axis(0, 0, 1)),
      );
      return {
        id: `kit ${p.id}.${n}`,
        source: { file: 'src/entities/terrain-kit/view.ts', symbol: 'createTerrainKitView' },
        shape: { kind: 'box' as const, hx: box.half[0], hy: box.half[1], hz: box.half[2] },
        position: { x: c[0] + ORIGIN.x, y: c[1], z: c[2] + ORIGIN.z },
        rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
        support: 'embedded' as const,
      };
    }),
  );
  const solids: Solid[] = [
    ...tiles.map((tile, i) => ({
      id: `terrain-${i}`,
      source: { file: 'src/place/land.ts', symbol: 'buildMesh' },
      shape: { kind: 'heightfield' as const, heights: tile.heights, cell: tile.cell },
      position: tile.position,
      support: 'embedded' as const,
    })),
    ...kit,
  ];
  const scene = await openScene(solids);
  const errors: unknown[] = [];
  let maximumResidual = 0,
    rays = 0,
    kitRays = 0,
    boundaryRetries = 0,
    protectedFineSamples = 0,
    protectedMaximumResidual = 0;
  /** The first surface under (x, z), Place-local: retried 1 mm inside where Rapier's heightfield ray can miss a
   * shared cell boundary. */
  const probe = (x: number, z: number) => {
    let expected = T.H(x + ORIGIN.x, z + ORIGIN.z);
    let hit = scene.below({ x: x + ORIGIN.x, y: 50, z: z + ORIGIN.z }, 60);
    if (!hit || (!hit.solid.id.startsWith('kit') && Math.abs(hit.y - expected) > 0.03)) {
      boundaryRetries++;
      expected = T.H(x + ORIGIN.x + 0.001, z + ORIGIN.z + 0.001);
      hit = scene.below({ x: x + ORIGIN.x + 0.001, y: 50, z: z + ORIGIN.z + 0.001 }, 60);
    }
    return { expected, hit };
  };
  try {
    for (let z = T.COVE_FINE.z0; z <= T.COVE_FINE.z1; z += 0.5)
      for (let x = -214; x <= -156; x += 0.5) {
        const { expected, hit } = probe(x, z);
        rays++;
        if (hit?.solid.id.startsWith('kit')) {
          kitRays++;
          continue;
        }
        const residual = hit ? Math.abs(hit.y - expected) : Infinity;
        maximumResidual = Math.max(maximumResidual, residual);
        if (residual > 0.03) errors.push({ x, z, expected, actual: hit?.y, residual });
      }
    const walk = walkSamples(coveEdge);
    let lowestWalkNy = 1;
    for (const { x, z } of walk) {
      const { expected, hit } = probe(x, z);
      const e = 0.25,
        g = (dx: number, dz: number) => T.H(x + dx + ORIGIN.x, z + dz + ORIGIN.z);
      const ny = 1 / Math.hypot(1, (g(e, 0) - g(-e, 0)) / (2 * e), (g(0, e) - g(0, -e)) / (2 * e));
      lowestWalkNy = Math.min(lowestWalkNy, ny);
      if (!hit || hit.solid.id.startsWith('kit') || Math.abs(hit.y - expected) > 0.03 || ny < WALKABLE_NY)
        errors.push({ walk: { x, z }, expected, actual: hit?.y, on: hit?.solid.id, ny });
    }
    const fine = T.COVE_FINE;
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
    const build = sourceBuild();
    const dir = path.resolve('.look/level-check', build.sourceHash, 'cove');
    fs.mkdirSync(dir, { recursive: true });
    const report = {
      build: { ...build, dependencies: undefined },
      selection: 'cove',
      status: errors.length ? 'findings' : 'ground-walk-and-parity',
      rays,
      kitRays,
      maximumResidual,
      boundaryRetries,
      walkSamples: walk.length,
      lowestWalkNy,
      protectedFineSamples,
      protectedMaximumResidual,
      kitPieces: placements.length,
      kitBoxes: kit.length,
      heightfieldBodies: tiles.length,
      errors,
      coverage: {
        included: [
          'four coarse heightfield partitions and one 1 m cove heightfield',
          "every shore kit piece's boxes",
          "the bluff's walkable end and its top walk",
          'protected fine-grid path/rail/landing samples',
        ],
        missing: ['other Place creators', 'dynamic cargo/balls', 'controller sweeps', 'camera sweep'],
        verdict: 'Not a complete regional collision certificate. The controller walk and stills are separate.',
      },
    };
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({ ...report, errors: errors.slice(0, 8), errorCount: errors.length, artifacts: dir }, null, 2),
    );
    if (errors.length) process.exitCode = 1;
  } finally {
    scene.world.free();
  }
}
