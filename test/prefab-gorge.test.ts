import { gorgeSurfaces } from '../src/entities/route-greybox/gorge-surfaces.ts';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { compiled, definitions } from '../src/prefab/catalogue.ts';
import { prefabGolden, recordMatrices } from './helpers/prefab-golden.ts';
// Owner-requested migration proof: execute the real draw boundary with recording physics, without a renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';

import type { Shape } from '../src/physics/engine.ts';
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };

test('Gorge collider and placement values match the old massing', async (t) => {
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
  builders.set('scenery.prop', () => new THREE.Group());
  builders.set('scenery.tree', () => new THREE.Group());
  builders.set('railway.coach-parts', () => new THREE.Group());
  builders.set('town.workshop-parts', () => new THREE.Group());
  builders.set('town.shop-parts', () => new THREE.Group());
  builders.set('town.curio-parts', () => new THREE.Group());
  builders.set('town.museum-parts', () => new THREE.Group());
  builders.set('town.museum-exhibit', () => new THREE.Group());
  builders.set('town.house-parts', () => new THREE.Group());
  builders.set('town.room-shell', () => new THREE.Group());
  builders.set('town.room-proxy', () => new THREE.Group());
  builders.set('town.boogler-statue', () => new THREE.Group());
  builders.set('town.statue-scaffold', () => new THREE.Group());
  builders.set('town.green-kerb', () => new THREE.Group());
  builders.set('railway.halt-parts', () => new THREE.Group());
  builders.set('railway.halt-ramp', () => new THREE.Group());
  builders.set('railway.halt-lever', () => new THREE.Group());
  builders.set('railway.halt-attachment', () => new THREE.Group());
  builders.set('railway.till-parts', () => new THREE.Group());
  builders.set('railway.loader-parts', () => new THREE.Group());
  builders.set('roundhouse.bay', () => new THREE.Group());
  builders.set('roundhouse.table', () => new THREE.Group());
  builders.set('poi.lighthouse', () => new THREE.Group());
  builders.set('poi.lighthouse-lantern', () => new THREE.Group());
  builders.set('poi.windmill', () => new THREE.Group());
  builders.set('poi.windmill-rotor', () => new THREE.Group());
  builders.set('poi.hay-bale', () => new THREE.Group());
  builders.set('poi.fence-post', () => new THREE.Group());
  builders.set('poi.fence-rail', () => new THREE.Group());
  builders.set('poi.cave-parts', () => new THREE.Group());
  builders.set('poi.cave-water', () => new THREE.Group());
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    { THREE, artifact, compiled, definitions, workshop, gorge, names, ...validation, builders, staticBody: record },
  );
  const boxes = sourceModule<typeof import('../src/entities/route-greybox/boxes.ts')>(
    fs.readFileSync('src/entities/route-greybox/boxes.ts', 'utf8'),
    { ...runtime, artifact, compiled, definitions, ...validation, THREE, gorgeSurfaces, mergeGeometries },
  );
  const owner = createOwnedView();
  const authored = runtime.gorgePlacements;
  const { mesh, solids } = await boxes.drawGreyBoxes(owner, authored);
  const placements = Array.from({ length: mesh.count }, (_, i) => {
    const matrix = matrices.get(mesh, i);
    const colour = matrices.colour(mesh, i);
    return { matrix: matrix.toArray(), colour: colour.toArray() };
  });
  // The goldens below read the returned batch, which Gorge hides: these are the two meshes the scene draws instead.
  const drawn = (name: string) => owner.root.children.find((child) => child.name === name);
  const untrimmed = drawn('gorge:untrimmed-surfaces');
  const trimmed = drawn('gorge:trimmed-surfaces');
  assert.ok(untrimmed instanceof THREE.InstancedMesh, 'the untrimmed boxes are attached');
  assert.ok(trimmed instanceof THREE.Mesh, 'the trimmed slabs are attached');
  assert.ok(untrimmed.visible && trimmed.visible, 'both drawn meshes are visible');
  assert.equal(mesh.visible, false, 'the source batch is not drawn twice');
  const surfaces = gorgeSurfaces(authored);
  // A placement takes one batch slot per builder instance (one when it lists none); a trimmed one leaves the batch.
  const trimmedSlots = authored.reduce((n, p) => {
    const visual = compiled.prefabs[p.prefab]!.visual;
    return n + (surfaces.has(p.id) && 'builder' in visual ? (visual.instances?.length ?? 1) : 0);
  }, 0);
  assert.ok(surfaces.size > 0 && trimmedSlots > 0, 'Gorge has trimmed slabs');
  assert.equal(untrimmed.count, mesh.count - trimmedSlots, 'every untrimmed box is drawn once');
  assert.ok(trimmed.geometry.getAttribute('position').count > 0, 'the trimmed slabs have geometry');
  t.diagnostic(
    `Gorge: ${authored.length} authored, ${mesh.count} visible, ${solids} bodies, ${owner.root.children.filter((child) => child instanceof THREE.InstancedMesh).length} batches`,
  );
  for (const [file, value] of [
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
