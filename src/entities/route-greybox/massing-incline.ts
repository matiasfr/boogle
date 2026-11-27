import * as THREE from 'three/webgpu';
import { color, mix, normalWorldGeometry, positionWorld, smoothstep } from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { kitMaterial } from '../../prefab/builders/terrain-kit.ts';
import { terrainKitGeometry } from '../terrain-kit/geometry.ts';
import { gorgeAt } from './massing.ts';
import type { Placement } from '../../prefab/types.ts';

/** A timber facing along the deck edge under the walking surface. */
export async function bellCut(owner: OwnedView, placements: readonly Placement[]) {
  // Recessed ends of the cut face inward across the lower deck. Both lie outside the working floor.
  await rockShoulders(owner, [
    [-64.5, -876.8, 0, 2.65, 4.64],
    [-68.5, -825.7, Math.PI - 0.067, 2.65, 4.64],
  ]);
  if (!owner.alive) return;
  owner.root.name = 'bell:cut-dressing';
  const deck = placements.find((p) => p.id === 'bell.upper-deck')!;
  const [w, h, d] = deck.scale!;
  const geometry = new THREE.BoxGeometry(w + 0.05, 0.42, d + 0.05);
  const material = new THREE.MeshStandardNodeMaterial({ color: '#96714c', roughness: 0.95 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'bell:upper-lip';
  mesh.position.fromArray(deck.pos);
  mesh.position.y += h / 2 - 0.24;
  mesh.rotation.y = deck.rot![0];
  owner.add(mesh);
  geometry.dispose();
  owner.cleanup(() => material.dispose());
  return { update() {} };
}

/** Shallow courses against the existing vertical cut, outside both mouth jambs. */
async function rockShoulders(
  owner: OwnedView,
  shoulders: readonly (readonly [number, number, number, number, number])[],
) {
  const pieces = await terrainKitGeometry();
  if (!owner.alive) return;
  const material = patchNode(kitMaterial().clone(), 'colorNode', (rock) => {
    const stone = mix(rock, color('#707980'), smoothstep(1, 4, positionWorld.y).mul(0.48));
    const cap = smoothstep(9, 11, positionWorld.y).mul(smoothstep(0.6, 0.9, normalWorldGeometry.y));
    return mix(stone, color('#777c48'), cap);
  });
  owner.cleanup(() => material.dispose());
  const faces = new THREE.InstancedMesh(pieces.get('low_face')!, material, shoulders.length);
  const transform = new THREE.Object3D();
  for (const [i, [x, z, yaw, width, height]] of shoulders.entries()) {
    transform.position.set(x, -0.4, z);
    transform.rotation.y = yaw;
    transform.scale.set(width, height, 0.22);
    transform.updateMatrix();
    faces.setMatrixAt(i, transform.matrix);
  }
  owner.add(faces);
}

export async function inclineShoulders(owner: OwnedView) {
  const shoulders = [
    [39.7, 44.55, Math.atan2(0.5162, -0.8565)],
    [59.5, 44.55, Math.atan2(0.5162, -0.8565)],
    [171.4, 145.6, Math.atan2(0.885, 0.466)],
    [174.3, 166.2, Math.atan2(0.92, 0.39)],
  ] as const;
  await rockShoulders(
    owner,
    shoulders.map(([a, c, yaw]) => {
      const p = gorgeAt(a, c);
      return [p.x, p.z, yaw, 1.1, 4] as const;
    }),
  );
  owner.root.name = 'incline:mouth-shoulders';
  return { update() {} };
}
