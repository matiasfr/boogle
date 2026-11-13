// Owner-requested migration proof: execute the real draw boundary with recording physics, without a renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import * as line2 from '../src/entities/railway/line2-path.ts';
import { RAIL_GATES, RAIL_GRANTS } from '../src/sim/railway-route.ts';
import { LEG2, PAD_SIZE } from '../src/entities/route-greybox/leg2-layout.ts';
import type { Shape } from '../src/physics/engine.ts';

test('Gorge colliders and drawn placements match the old hand-built platform', async () => {
  const colliders: unknown[] = [];
  const record = (shape: Shape, at: THREE.Vector3, q?: THREE.Quaternion) => {
    colliders.push({ shape, at: at.toArray(), rotation: q?.toArray() });
  };
  const boxes = sourceModule<typeof import('../src/entities/route-greybox/boxes.ts')>(
    fs
      .readFileSync('src/entities/route-greybox/boxes.ts', 'utf8')
      .replace("await import('../../place/land.ts')", '{ addStatic: record }'),
    { THREE, material: () => new THREE.MeshStandardNodeMaterial(), record },
  );
  const leg2 = sourceModule<typeof import('../src/entities/route-greybox/leg2-draw.ts')>(
    fs.readFileSync('src/entities/route-greybox/leg2-draw.ts', 'utf8'),
    { span: boxes.span, PAD_SIZE },
  );
  const massing = sourceModule<typeof import('../src/entities/route-greybox/massing.ts')>(
    fs.readFileSync('src/entities/route-greybox/massing.ts', 'utf8'),
    { ...line2, RAIL_GATES, RAIL_GRANTS, span: boxes.span, leg2Boxes: leg2.leg2Boxes, LEG2 },
  );
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
  );
  const owner = createOwnedView();
  const { mesh, solids } = await boxes.drawGreyBoxes(owner, massing.gorgeMassing());
  const placements = Array.from({ length: mesh.count }, (_, i) => {
    const matrix = new THREE.Matrix4();
    const colour = new THREE.Color();
    mesh.getMatrixAt(i, matrix);
    mesh.getColorAt(i, colour);
    return { matrix: matrix.toArray(), colour: colour.toArray() };
  });
  for (const [file, value] of [
    ['test/fixtures/prefab-gorge-colliders.json', colliders],
    ['test/fixtures/prefab-gorge-placements.json', { boxes: mesh.count, solids, placements }],
  ] as const) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    if (process.env.GOLDEN === '1') fs.writeFileSync(file, bytes);
    assert.equal(bytes, fs.readFileSync(file, 'utf8'), file);
  }
  owner.dispose();
});
