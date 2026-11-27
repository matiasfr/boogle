import * as THREE from 'three/webgpu';
import { positionWorld, smoothstep } from 'three/tsl';
import { kitMaterial } from '../../prefab/builders/terrain-kit.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { terrainKitGeometry } from '../terrain-kit/geometry.ts';

export async function originalAbutment(owner: OwnedView) {
  const pieces = await terrainKitGeometry();
  if (!owner.alive) return;
  const stone = kitMaterial().clone();
  // The low courses darken at the same wet-line heights as the beach.
  stone.colorNode = stone.colorNode!.mul(smoothstep(0.05, 0.6, positionWorld.y).mul(0.28).add(0.72));
  owner.cleanup(() => stone.dispose());
  const faces = new THREE.InstancedMesh(pieces.get('face_6')!, stone, 2);
  faces.name = 'Original Island abutment';
  // One seaward face under each deck where it meets the landward steps.
  const yaw = Math.atan2(309, 951);
  const along = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const across = new THREE.Vector3(along.z, 0, -along.x);
  const matrix = new THREE.Matrix4().makeRotationY(yaw + Math.PI).scale(new THREE.Vector3(0.61, 0.34, 0.34));
  for (const [i, offset] of [-5.8, 5.8].entries()) {
    const foot = new THREE.Vector3(-6.19, -0.5, -135.05).addScaledVector(along, 18.7).addScaledVector(across, offset);
    faces.setMatrixAt(i, matrix.setPosition(foot));
  }
  owner.add(faces);
  return { update() {} };
}
