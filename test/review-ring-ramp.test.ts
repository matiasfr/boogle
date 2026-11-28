import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import type { createGhostOutlines } from '../src/render/ghost-outline.ts';
import type { createHangoutBuilding } from '../src/entities/ring-island/hangout-building.ts';
import { ringAt, RING_HANGOUT } from '../src/sim/railway-ring-layout.ts';
import { FAR, ORIGIN } from '../src/place/layout.ts';
import { RING_CONES } from '../src/proto/greybox/ring-cones.ts';
import { createIslandGround } from '../src/entities/ring-island/ground.ts';

test('the Ring blueprint shows the walk-on ramp meeting the ground at its toe', () => {
  const ground = createIslandGround(RING_CONES, { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z });
  const meshes: THREE.InstancedMesh[] = [];
  const owner = {
    add(mesh: THREE.InstancedMesh) {
      meshes.push(mesh);
    },
    cleanup() {},
  };
  const outlines = sourceFunction<typeof createGhostOutlines>('src/render/ghost-outline.ts', 'createGhostOutlines', {
    THREE,
    ghostMaterial: () => new THREE.MeshBasicMaterial(),
  });
  const { createHangoutBuilding: build } = sourceModule<{ createHangoutBuilding: typeof createHangoutBuilding }>(
    readFileSync('src/entities/ring-island/hangout-building.ts', 'utf8'),
    {
      THREE,
      RING_HANGOUT,
      ringAt,
      createGhostOutlines: outlines,
      instantiate: () => ({ setEnabled() {}, solids: [], pieces: [{ matrix: new THREE.Matrix4(), color: '#abcdef' }] }),
    },
  );
  build(owner as unknown as Parameters<typeof build>[0], ground, true).preview(true);
  const ghost = meshes.find((mesh) => mesh.visible)!;
  const toe = ringAt(RING_HANGOUT.u - 800, RING_HANGOUT.lat + 310);
  const x = toe.x / 100,
    z = toe.z / 100;
  const heights: number[] = [];
  const matrix = new THREE.Matrix4(),
    p = new THREE.Vector3();
  for (let i = 0; i < ghost.count; i++) {
    ghost.getMatrixAt(i, matrix);
    p.setFromMatrixPosition(matrix);
    if (Math.hypot(p.x - x, p.z - z) < 1) heights.push(p.y);
  }
  assert.ok(heights.length > 0);
  const gap = Math.min(...heights) - ground.islandH(x, z);
  assert.ok(gap < 0.2, 'lowest preview dash at ramp toe floats ' + gap.toFixed(2) + ' m above ground');
});
