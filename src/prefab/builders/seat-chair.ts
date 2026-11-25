// Preserve the existing mesh, shared material and shadow flags exactly.
import * as THREE from 'three/webgpu';
import { flat } from '../../render/flat.ts';
import { merged } from '../../render/part-geometry.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'seat.chair': true;
  }
}
const geometry = merged([
  ['b', 0, 0.49, 0, 0.8, 0.12, 0.65, '#bd8a50'],
  ['b', -0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
  ['b', 0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
]);
/** The stool's vertex-coloured material, for other kit props to share (one program). */
export const kitMaterial = flat('#ffffff').clone();
kitMaterial.vertexColors = true;

export const seatChair = registerBuilder('seat.chair', () => {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, kitMaterial);
  mesh.name = 'place stool';
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return group;
});
