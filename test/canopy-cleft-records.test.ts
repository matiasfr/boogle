import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { BoxGeometry, Mesh, Object3D, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import canopy from '../content/built/levels/canopy.json' with { type: 'json' };
import type { Placement } from '../src/prefab/types.ts';
import cleft from '../content/built/levels/canopy-cleft.json' with { type: 'json' };
import { definitions } from '../src/prefab/catalogue.ts';
import { loadLevelArtifact } from '../src/prefab/validate.ts';

test('Canopy cleft dressing stays view-only when loaded from its records', () => {
  const { placements } = loadLevelArtifact(cleft, definitions);
  const solidBeds = placements.filter((p) => definitions[p.prefab]!.colliders.length > 0);
  assert.deepEqual(
    solidBeds.map((p) => p.id),
    [],
  );
});

function placed(object: Object3D, p: Placement) {
  object.position.fromArray(p.pos);
  const [yaw, pitch, roll] = p.rot!;
  object.rotation.set(pitch, yaw, roll, 'YXZ');
  object.scale.fromArray(p.scale!);
  object.updateMatrixWorld(true);
  return object;
}

test('drawn chalk leaves standing room over the outward platform ramp', async () => {
  const { placements } = loadLevelArtifact(canopy, definitions);
  const ramp = placed(
    new Mesh(new BoxGeometry()),
    placements.find((p) => p.id === 'canopy.platform-out-ramp')!,
  );
  const bytes = readFileSync('assets/built/terrain-kit.glb');
  const kit = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  kit.scene.updateMatrixWorld(true);
  const face = kit.scene.getObjectByName('sea_face_10') as Mesh;
  const vertices = face.geometry.getAttribute('position');
  const down = new Vector3(0, -1, 0);
  const conflicts = new Set<string>();
  for (const p of loadLevelArtifact(cleft, definitions).placements) {
    const transform = placed(new Object3D(), p).matrixWorld;
    for (let i = 0; i < vertices.count; i++) {
      const vertex = new Vector3()
        .fromBufferAttribute(vertices, i)
        .applyMatrix4(face.matrixWorld)
        .applyMatrix4(transform);
      const floor = new Raycaster(new Vector3(vertex.x, 50, vertex.z), down).intersectObject(ramp)[0];
      if (floor && vertex.y > floor.point.y && vertex.y < floor.point.y + 1.8) conflicts.add(p.id);
    }
  }
  assert.deepEqual([...conflicts], []);
});
