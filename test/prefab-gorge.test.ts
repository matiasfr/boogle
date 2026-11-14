import { prefabGolden, recordMatrices } from './helpers/prefab-golden.ts';
// Owner-requested migration proof: execute the real draw boundary with recording physics, without a renderer.
import test from 'node:test';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';

import type { Shape } from '../src/physics/engine.ts';
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };

test('Gorge collider, placement and count values match the old massing', async () => {
  const matrices = recordMatrices();
  const colliders: unknown[] = [];
  const record = (shape: Shape, at: THREE.Vector3, q?: THREE.Quaternion) => {
    colliders.push({ shape, at: at.toArray(), rotation: q?.toArray() });
  };
  const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
  );
  const builders = new Map();
  sourceModule(fs.readFileSync('src/prefab/builders/greybox-box.ts', 'utf8'), {
    THREE,
    material: () => new THREE.MeshStandardNodeMaterial(),
    registerBuilder: (name: string, build: unknown) => {
      builders.set(name, build);
      return build;
    },
  });
  builders.set('seat.chair', () => new THREE.Group());
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    { THREE, artifact, workshop, gorge, names, ...validation, builders, staticBody: record },
  );
  const boxes = sourceModule<typeof import('../src/entities/route-greybox/boxes.ts')>(
    fs.readFileSync('src/entities/route-greybox/boxes.ts', 'utf8'),
    { ...runtime, artifact, ...validation },
  );
  const owner = createOwnedView();
  const authored = runtime.gorgePlacements;
  const { mesh, solids } = await boxes.drawGreyBoxes(owner, authored);
  const placements = Array.from({ length: mesh.count }, (_, i) => {
    const matrix = matrices.get(mesh, i);
    const colour = matrices.colour(mesh, i);
    return { matrix: matrix.toArray(), colour: colour.toArray() };
  });
  for (const [file, value] of [
    [
      'test/fixtures/prefab-gorge-counts.json',
      {
        authored: authored.length,
        visible: mesh.count,
        bodies: solids,
        batches: owner.root.children.filter((child) => child instanceof THREE.InstancedMesh).length,
      },
    ],
    ['test/fixtures/prefab-gorge-colliders.json', colliders],
    ['test/fixtures/prefab-gorge-placements.json', { boxes: mesh.count, solids, placements }],
  ] as const) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    if (process.env.GOLDEN === '1') fs.writeFileSync(file, bytes);
    prefabGolden(JSON.parse(bytes), JSON.parse(fs.readFileSync(file, 'utf8')), file);
  }
  matrices.restore();
  owner.dispose();
});
