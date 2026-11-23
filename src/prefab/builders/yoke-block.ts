import * as THREE from 'three/webgpu';
import { flat } from '../../render/flat.ts';
import { registerBuilder } from '../builders.ts';

declare module '../names.ts' {
  interface BuilderNames {
    'railway.yoke-block': true;
  }
}

registerBuilder('railway.yoke-block', () => {
  const geometry = new THREE.BoxGeometry(2, 0.7, 1.2).translate(0, 0.35, 0);
  const object = new THREE.Mesh(geometry, flat('#8a6236', 0.9));
  object.castShadow = object.receiveShadow = true;
  return { object, dispose: () => geometry.dispose() };
});
