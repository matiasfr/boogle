// Permanent regression ported from review/gorge-4372df4f4-scratch.
// Run: node --import ./dev/sim/hooks.ts --test test/review-gorge-seams.test.ts
// These are interior floor points, not shifted exterior silhouettes. Nearby rays must still hit.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gorgeSurfaces } from '../src/entities/route-greybox/gorge-surfaces.ts';
import { sourceModule, sourceFunction } from '../dev/level/source.ts';
import { compiled, definitions } from '../src/prefab/catalogue.ts';
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };

// Main is the control; no dependency on a historical scratch commit. CI's unit shards check out shallow with no
// main ref, so the tests skip there and run wherever main is known (ship-check, local runs).
const baseRef = ['origin/main', 'main'].find((ref) => {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});
const noBase = baseRef ? false : 'no main ref to compare against (shallow checkout)';
const read = (file: string, base: boolean) =>
  base ? execFileSync('git', ['show', `${baseRef}:${file}`], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');

async function drawn(base: boolean) {
  const builders = new Map<string, unknown>(names.builders.map((name) => [name, () => new THREE.Group()]));
  sourceModule(read('src/prefab/builders/greybox-box.ts', base), {
    THREE,
    material: () => new THREE.MeshStandardNodeMaterial(),
    registerBuilder: (name: string, build: unknown) => {
      builders.set(name, build);
      return build;
    },
  });
  const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(read('src/prefab/instantiate.ts', base), {
    THREE,
    artifact,
    compiled,
    definitions,
    workshop,
    gorge,
    names,
    ...validation,
    builders,
    staticBody() {},
  });
  const createOwner = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
    'src/render/owned-view.ts',
    'createOwnedView',
    { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
  );
  const boxes = sourceModule<typeof import('../src/entities/route-greybox/boxes.ts')>(
    read('src/entities/route-greybox/boxes.ts', base),
    { ...runtime, THREE, compiled, gorgeSurfaces, mergeGeometries },
  );
  const owner = createOwner();
  await boxes.drawGreyBoxes(owner, runtime.gorgePlacements);
  owner.root.updateMatrixWorld(true);
  const visible: THREE.Object3D[] = [];
  // Raycaster ignores object.visible! Do not include the hidden old InstancedMesh.
  owner.root.traverseVisible((object) => {
    if (object instanceof THREE.Mesh) visible.push(object);
  });
  return { owner, visible };
}

test('clipped Gorge floor has no hole inside the former walkable top', { skip: noBase }, async () => {
  const before = await drawn(true);
  const after = await drawn(false);
  try {
    const x = -106.1078391364522;
    const z = -1983.10225309756;
    const ray = new THREE.Raycaster();
    ray.far = 0.2;
    const hits = (objects: THREE.Object3D[], dx = 0, dz = 0) => {
      ray.set(new THREE.Vector3(x + dx, 4, z + dz), new THREE.Vector3(0, -1, 0));
      return ray.intersectObjects(objects, false);
    };
    assert.ok(hits(before.visible).length, 'main covers the disputed point');
    for (let i = 0; i < 8; i++) {
      const dx = 0.001 * Math.cos((i * Math.PI) / 4);
      const dz = 0.001 * Math.sin((i * Math.PI) / 4);
      assert.ok(hits(before.visible, dx, dz).length, 'point is interior to the old floor');
      assert.ok(hits(after.visible, dx, dz).length, 'new floor covers the surrounding 1 mm ring');
    }
    assert.ok(hits(after.visible).length, 'new visible mesh opens a crack near gorge.massing.20');
  } finally {
    before.owner.dispose();
    after.owner.dispose();
  }
});

// Probe the actual visible draw, never the retained hidden provenance batch.
test('all six clipped slabs cover interior edge probes and oblique floor rays', { skip: noBase }, async (t) => {
  const before = await drawn(true),
    after = await drawn(false);
  const ray = new THREE.Raycaster();
  ray.far = 0.2;
  const hits = (objects: THREE.Object3D[], p: THREE.Vector3, dx = 0, dz = 0, oblique = false) => {
    const origin = p.clone().add(new THREE.Vector3(dx + (oblique ? 0.02 : 0), 0.1, dz));
    ray.set(origin, new THREE.Vector3(oblique ? -0.02 : 0, -0.1, 0).normalize());
    return ray.intersectObjects(objects, false).length > 0;
  };
  const surfaces = gorgeSurfaces(validation.loadLevelArtifact(gorge, definitions).placements);
  const counts: Record<string, number> = {};
  try {
    for (const n of [20, 26, 27, 51, 73, 74]) {
      const id = `gorge.massing.${n}`,
        geometry = surfaces.get(id)!;
      const origin = new THREE.Vector3().fromArray(geometry.userData.gorgeOrigin as number[]);
      const position = geometry.getAttribute('position');
      let probes = 0;
      for (let i = 0; i < position.count; i += 3) {
        const vertices = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(position, i + k).add(origin));
        if (vertices[1]!.clone().sub(vertices[0]!).cross(vertices[2]!.clone().sub(vertices[0]!)).normalize().y < 0.99)
          continue;
        for (let edge = 0; edge < 3; edge++) {
          const p = vertices[edge]!.clone().lerp(vertices[(edge + 1) % 3]!, 0.5);
          if (!hits(before.visible, p)) continue;
          if (
            !Array.from({ length: 8 }, (_, k) =>
              hits(before.visible, p, 0.001 * Math.cos((k * Math.PI) / 4), 0.001 * Math.sin((k * Math.PI) / 4)),
            ).every(Boolean)
          )
            continue;
          assert.ok(hits(after.visible, p), `${id}: interior edge ray at ${p.toArray()}`);
          assert.ok(hits(after.visible, p, 0, 0, true), `${id}: oblique ray at ${p.toArray()}`);
          probes++;
        }
      }
      assert.ok(probes > 0, `${id}: exercised interior edges`);
      counts[id] = probes;
    }
    assert.ok(Object.values(counts).reduce((a, b) => a + b, 0) >= 140);
    t.diagnostic(JSON.stringify(counts));
  } finally {
    for (const geometry of surfaces.values()) geometry.dispose();
    before.owner.dispose();
    after.owner.dispose();
  }
});
