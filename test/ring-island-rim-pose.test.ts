// Owner-requested regression (docs/plans/ring-summit-path.md, the rim rocks' second review): a saved return pose at
// the ground under any rim rock is refused, on the real physics backend with the rocks' own colliders.
import '../dev/sim/hooks.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAR, ORIGIN } from '../src/place/layout.ts';
import { RING_CONES } from '../src/proto/greybox/ring-cones.ts';
import { createIslandGround } from '../src/entities/ring-island/ground.ts';
import { summitRimRocks } from '../src/entities/ring-island/path.ts';
import kit from '../content/built/levels/cliff-kit-ring-island.json' with { type: 'json' };
import { definitions } from '../src/prefab/catalogue.ts';
import { loadLevelArtifact } from '../src/prefab/validate.ts';
import { solidHulls } from '../dev/prefab/cliff-kit-solids.ts';

test('a saved pose at the centre of any rim rock is rejected', async () => {
  const physics = await import('../src/physics/engine.ts');
  const { createPosePolicy } = await import('../src/place/pose.ts');
  const { GROUP } = await import('../src/physics/physics.ts');
  await physics.physicsReady;
  const centre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z },
    g = createIslandGround(RING_CONES, centre),
    rocks = summitRimRocks(g, centre);
  const policy = createPosePolicy(
    g.islandH,
    () => true,
    () => false,
  );
  const body = physics.createBody({
    type: 'static',
    group: GROUP.SCENERY,
    position: { x: 0, y: 0, z: 0 },
    shapes: loadLevelArtifact(kit, definitions)
      .placements.filter((p) => p.prefab === 'terrain.low-face')
      .flatMap(solidHulls)
      .map(({ points, triangles }) => ({
        kind: 'trimesh' as const,
        vertices: points.flatMap(([x, y, z]) => [x + ORIGIN.x, y, z + ORIGIN.z]),
        indices: triangles.flat(),
      })),
  });
  physics.addBody(body);
  physics.stepFixed();
  try {
    assert.equal(rocks.length, 19);
    for (const r of rocks) assert.equal(policy.safe({ x: r.x, z: r.z, yaw: 0 }), false, `at ${r.x}, ${r.z}`);
    const clear = rocks[0]!;
    assert.ok(policy.safe({ x: clear.x + 30, z: clear.z, yaw: 0 }), 'open ground away from the rocks is still safe');
  } finally {
    physics.removeBody(body);
    physics.stepFixed();
  }
});
