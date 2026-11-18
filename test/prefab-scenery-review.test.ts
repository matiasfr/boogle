// Independent step-11 review: exercise the new prefab door, which the legacy-path golden bypasses.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { fitInstanceBounds } from '../src/render/instance-bounds.ts';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { compiled } from '../src/prefab/catalogue.ts';
import { names } from '../src/prefab/names.ts';
import * as validation from '../src/prefab/validate.ts';
import { collidersOf } from '../src/prefab/scenery.ts';
import type { Placement } from '../src/prefab/types.ts';
import type { Builder } from '../src/prefab/builders.ts';
import type { Body, Shape } from '../src/physics/engine.ts';
import { TREE_PLACEMENTS, TREE_SOURCES } from '../src/place/tree-sources.ts';
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
  { THREE, createTreeRoots, fitInstanceBounds },
);
function runtime(record: (shape: Shape, at: THREE.Vector3) => void = () => {}) {
  const builders = new Map<string, Builder>(names.builders.map((name) => [name, () => new THREE.Group()]));
  sourceModule(fs.readFileSync('src/prefab/builders/scenery-tree.ts', 'utf8'), {
    THREE,
    createTreeView,
    flat,
    H,
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

function poseOf(source: (typeof TREE_SOURCES)[number]) {
  return {
    ...source,
    work: 0,
    issued: 0,
    ceiling: 10,
    revision: 0,
    collapsed: false,
    scuff: false,
    hitAt: 0,
    cutYaw: 0,
    strokes: 0,
    shake: 0,
    fall: -1,
    fallYaw: 0,
    at: new THREE.Vector3(),
    body: null,
    stump: null,
  };
}

test('review: the last fallen crown comes back inside its fitted sphere on renewal', () => {
  const root = new THREE.Group();
  const source = TREE_SOURCES.find((tree) => !tree.cleared && !tree.hardwood)!;
  const tree = { ...poseOf(source), index: 0, fall: 1, growth: 0 };
  const view = createTreeView([tree], root, H, { flat, tree: (color) => flat(color).clone() }, () => false, 10);
  try {
    const crowns = root.children.filter(
      (mesh): mesh is THREE.InstancedMesh =>
        mesh instanceof THREE.InstancedMesh && mesh.geometry instanceof THREE.ConeGeometry,
    );
    assert.equal(crowns.length, 2);
    view.pose(tree, 0);
    assert.ok(crowns.every((mesh) => !mesh.visible && mesh.boundingSphere!.isEmpty()));
    tree.fall = -1;
    tree.growth = 1;
    view.pose(tree, 0);
    for (const mesh of crowns) {
      assert.ok(mesh.visible);
      const transform = new THREE.Matrix4();
      mesh.getMatrixAt(0, transform);
      const positions = mesh.geometry.getAttribute('position');
      for (let vertex = 0; vertex < positions.count; vertex++) {
        assert.ok(
          mesh.boundingSphere!.containsPoint(
            new THREE.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(transform),
          ),
        );
      }
    }
  } finally {
    view.dispose();
  }
});

test('review: shaking one standing tree does not reread the entire forest', () => {
  const root = new THREE.Group();
  const trees = TREE_SOURCES.map(poseOf);
  const view = createTreeView(trees, root, H, { flat, tree: (color) => flat(color).clone() }, () => false, 10);
  try {
    for (const tree of trees) view.pose(tree, 0, false);
    view.upload();
    let reads = 0;
    root.traverse((part) => {
      if (!(part instanceof THREE.InstancedMesh)) return;
      const read = part.getMatrixAt.bind(part);
      part.getMatrixAt = (slot, target) => {
        reads++;
        return read(slot, target);
      };
    });
    const hit = trees.find((tree) => !tree.cleared && !tree.hardwood)!;
    hit.shake = 1;
    view.pose(hit, 100);
    assert.ok(reads < trees.length, `one shake pose read ${reads} matrices for ${trees.length} trees`);
  } finally {
    view.dispose();
  }
});

test('review: a previously empty fitted caster can be raycast and culled independently by each camera', () => {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 1);
  try {
    mesh.count = 0;
    fitInstanceBounds(mesh);
    assert.ok(mesh.boundingSphere!.isEmpty());
    mesh.count = 1;
    mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(10, 0, 0));
    mesh.position.x = 20;
    mesh.updateMatrixWorld();
    mesh.computeBoundingSphere();
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 25);
    const seesCaster = (x: number) => {
      camera.position.set(x, 0, 10);
      camera.updateMatrixWorld();
      return mesh.intersectsFrustum(
        new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
        ),
      );
    };
    assert.equal(seesCaster(0), false);
    assert.equal(seesCaster(30), true);
    const ray = new THREE.Raycaster(new THREE.Vector3(30, 0, 10), new THREE.Vector3(0, 0, -1));
    assert.equal(ray.intersectObject(mesh)[0]?.instanceId, 0);
  } finally {
    mesh.dispose();
    mesh.material.dispose();
    mesh.geometry.dispose();
  }
});

test('felling any one tree leaves every other tree drawn and inside its batch bounds', () => {
  const root = new THREE.Group();
  const trees = TREE_SOURCES.map((source, index) => ({ ...poseOf(source), index }));
  const view = createTreeView(trees, root, H, { flat, tree: (color) => flat(color).clone() }, () => false, 10);
  const batches = root.children.filter((mesh): mesh is THREE.InstancedMesh => mesh instanceof THREE.InstancedMesh);
  const matrix = new THREE.Matrix4();
  const centre = new THREE.Vector3();
  const failures: string[] = [];
  function check(label: string) {
    for (const [b, mesh] of batches.entries()) {
      let shown = 0;
      for (let slot = 0; slot < mesh.count; slot++) {
        mesh.getMatrixAt(slot, matrix);
        if (matrix.getMaxScaleOnAxis() === 0) continue;
        shown++;
        centre.setFromMatrixPosition(matrix);
        const s = mesh.boundingSphere;
        if (!s || !Number.isFinite(s.radius) || !s.containsPoint(centre))
          failures.push(`${label}: batch ${b} slot ${slot} outside bounds (${s?.center.toArray()} r ${s?.radius})`);
      }
      if (shown > 0 && !mesh.visible) failures.push(`${label}: batch ${b} hidden with ${shown} instances`);
      if (mesh.frustumCulled) failures.push(`${label}: batch ${b} is frustum culled`);
    }
  }
  try {
    for (const tree of trees) view.pose(tree, 0, false);
    view.upload();
    for (const tree of trees) {
      if (tree.cleared || failures.length > 20) continue;
      const saved = { ...tree };
      tree.work = 15;
      tree.fall = 0;
      tree.fallYaw = 1.3;
      for (const fall of [0, 0.2, 0.5, 0.79]) {
        tree.fall = fall;
        view.pose(tree, fall * 1000);
        check(`tree ${tree.index} falling ${fall}`);
      }
      tree.fall = 1;
      view.pose(tree, 2000, false);
      view.upload();
      check(`tree ${tree.index} fallen, refit`);
      Object.assign(tree, saved);
      view.pose(tree, 0, false);
      view.upload();
    }
  } finally {
    view.dispose();
  }
  assert.deepEqual(failures.slice(0, 10), []);
});

test('one non-finite instance never empties or poisons a fitted batch sphere', () => {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 2);
  try {
    mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(5, 0, 0));
    mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(Number.NaN, 0, 0));
    fitInstanceBounds(mesh);
    const s = mesh.boundingSphere!;
    assert.ok(!s.isEmpty() && Number.isFinite(s.radius) && s.containsPoint(new THREE.Vector3(5, 0, 0)));
  } finally {
    mesh.dispose();
    mesh.material.dispose();
    mesh.geometry.dispose();
  }
});
