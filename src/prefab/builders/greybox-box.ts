// The existing unit-box batch, with the same material, colours, flags and instance order.
import * as THREE from 'three/webgpu';
import { material } from '../../render/materials.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'greybox.box': true;
  }
}
export const greyboxBox = registerBuilder('greybox.box', (params, batch) => {
  if (batch) {
    if (typeof params.colour !== 'string') throw new Error('greybox.box: expected colour');
    batch.mesh.setColorAt(batch.index, new THREE.Color(params.colour));
    batch.mesh.instanceColor!.needsUpdate = true;
    return batch.mesh;
  }
  const count = params.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1)
    throw new Error('greybox.box: expected batch capacity');
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material('stone', { colour: '#ffffff' }), count);
  geometry.dispose();
  mesh.receiveShadow = true;
  return mesh;
});
