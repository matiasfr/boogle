// Port of the independent review's downward-ray reproducer, with a rail-head-height assertion.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { sourceFunction } from '../dev/level/source.ts';
test('rail cap removal retains a visible surface for a downward player-camera ray', async () => {
  const bytes = fs.readFileSync('assets/built/place-kit.glb');
  const asset = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  asset.scene.updateMatrixWorld(true);
  let rail: THREE.Mesh | undefined;
  asset.scene.getObjectByName('rail')!.traverse((o) => {
    if (o instanceof THREE.Mesh) rail = o;
  });
  assert.ok(rail);
  const bake = sourceFunction<(mesh: THREE.Mesh, name: string) => THREE.BufferGeometry>(
    'src/place/look-kit.ts',
    'bake',
    { THREE, LOOK: { contact: false } },
  );
  // The bypass name follows the identical bake path without the rail orientation repair.
  const before = new THREE.Mesh(bake(rail, 'unfiltered-rail'), new THREE.MeshStandardNodeMaterial());
  const after = new THREE.Mesh(bake(rail, 'rail'), new THREE.MeshStandardNodeMaterial());
  before.updateMatrixWorld(true);
  after.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
  assert.ok(ray.intersectObject(before).length, 'control: the old rail is visible from above');
  assert.ok(
    ray.intersectObject(after).length,
    'the cap filter opens the rail: no front-facing triangle remains under this ray',
  );
  const hit = ray.intersectObject(after)[0]!;
  assert.ok(hit.point.y > 0.13 && hit.point.y < 0.14, 'ray hits the 13.5 cm rail head, not the foot');
  assert.ok(hit.face!.normal.y > 0.99, 'rail head faces upward');
});
