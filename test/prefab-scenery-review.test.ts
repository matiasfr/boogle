// Independent step-11 review: exercise the new prefab door, which the legacy-path golden bypasses.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { compiled } from '../src/prefab/catalogue.ts';
import { names } from '../src/prefab/names.ts';
import * as validation from '../src/prefab/validate.ts';
import { collidersOf } from '../src/prefab/scenery.ts';
import type { Placement } from '../src/prefab/types.ts';
import type { Builder } from '../src/prefab/builders.ts';
import type { Body, Shape } from '../src/physics/engine.ts';
import { TREE_PLACEMENTS } from '../src/place/tree-sources.ts';
import { H } from '../src/place/terrain.ts';
import { createTreeRoots } from '../src/render/tree-roots.ts';
import { flat } from '../src/render/flat.ts';
import type { PropSample } from '../src/blueprints/props.ts';
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };

const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
  'src/render/owned-view.ts',
  'createOwnedView',
  { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
);
const createTreeView = sourceFunction<typeof import('../src/render/place-tree-view.ts').createTreeView>(
  'src/render/place-tree-view.ts',
  'createTreeView',
  { THREE, createTreeRoots },
);
function runtime(record: (shape: Shape, at: THREE.Vector3) => void = () => {}) {
  const builders = new Map<string, Builder>(names.builders.map((name) => [name, () => new THREE.Group()]));
  sourceModule(fs.readFileSync('src/prefab/builders/scenery-tree.ts', 'utf8'), {
    THREE,
    createTreeView,
    flat,
    registerBuilder(name: string, build: Builder) {
      builders.set(name, build);
      return build;
    },
  });
  return sourceModule<typeof import('../src/prefab/instantiate.ts')>(
    fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
    {
      THREE,
      compiled,
      workshop,
      gorge,
      names,
      ...validation,
      collidersOf,
      builders,
      staticBody(shape: Shape, at: THREE.Vector3) {
        record(shape, at);
        return {} as Body;
      },
    },
  );
}

test('review: instantiated palm colliders exactly preserve the pre-conversion golden', () => {
  const golden = JSON.parse(fs.readFileSync(new URL('./fixtures/prefab-trees.json', import.meta.url), 'utf8')) as {
    scatters: { all: PropSample[]; shapes: { spheres: { x: number; y: number; z: number; r: number }[] }[] }[];
  };
  const differences: unknown[] = [];
  const actual: { x: number; y: number; z: number; r: number }[] = [];
  const { instantiate } = runtime((shape, at) => {
    assert.equal(shape.kind, 'sphere');
    if (shape.kind === 'sphere') actual.push({ x: at.x, y: at.y, z: at.z, r: shape.r });
  });
  for (const [index, sample] of golden.scatters[0]!.all.entries()) {
    if (sample.blueprint !== 'palm') continue;
    const owner = createOwnedView();
    const p: Placement = {
      id: `island-props.${index}`,
      prefab: 'scenery.palm',
      pos: [sample.x, sample.h, sample.z],
      params: { lean: sample.lean, look: sample.look },
    };
    try {
      actual.length = 0;
      instantiate(p.prefab, p, { owner }).setEnabled(true);
      const expected = golden.scatters[0]!.shapes[index]!.spheres;
      for (let joint = 0; joint < expected.length; joint++) {
        if (JSON.stringify(actual[joint]) !== JSON.stringify(expected[joint]))
          differences.push({ id: p.id, joint, expected: expected[joint], actual: actual[joint] });
      }
      assert.equal(actual.length, expected.length);
    } finally {
      owner.dispose();
    }
  }
  assert.deepEqual(differences, [], 'the new trunk-chain runtime must preserve the old world-space arithmetic');
});

test('review: instantiated hardwood branch retains its terrain-grounded height', () => {
  const { instantiate } = runtime();
  const differences: unknown[] = [];
  for (const p of TREE_PLACEMENTS.filter((p) => p.params!.hardwood)) {
    const owner = createOwnedView();
    try {
      const instance = instantiate(p.prefab, p, { owner });
      instance.setEnabled(true);
      owner.root.updateWorldMatrix(true, true);
      let branch: THREE.InstancedMesh | undefined;
      instance.root.traverse((object) => {
        if (
          object instanceof THREE.InstancedMesh &&
          object.geometry instanceof THREE.CylinderGeometry &&
          object.geometry.parameters.height === 1.5
        )
          branch = object;
      });
      assert.ok(branch, 'the hardwood has its original loose branch geometry');
      const matrix = new THREE.Matrix4();
      branch.getMatrixAt(0, matrix);
      matrix.premultiply(branch.matrixWorld);
      const at = new THREE.Vector3().setFromMatrixPosition(matrix);
      const expected = H(p.pos[0] + 1.5 * p.scale![0], p.pos[2] + 1.1 * p.scale![0]) + 0.22;
      // Instanced transforms use float32; this checks visible ground contact, not last-bit equality.
      if (Math.abs(at.y - expected) > 1e-4) differences.push({ id: p.id, expected, actual: at.y });
    } finally {
      owner.dispose();
    }
  }
  assert.deepEqual(differences, [], 'use the branch ground sample, not the trunk seat height');
});
