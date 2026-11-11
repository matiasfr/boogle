// Small, untextured rigid props shared by Place and the isolated Buddy stage.
// Load before these synchronous factories are used; no scene/loop, world or physics dependency.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import url from '../../assets/built/boiler-cart.glb?url';

const kit = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
export type PropPart = 'boiler' | 'pedestal' | 'train_shell' | 'cart';

/** Owned resources: carry previews may dispose these without changing the cache or another player. */
export function makeProp(part: PropPart) {
  const source = kit.scene.getObjectByName(part);
  if (!source) throw new Error(`boiler-cart kit has no ${part}`);
  const group = new THREE.Group();
  group.name = `place_${part}`;
  const copy = source.clone(true);
  copy.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry = object.geometry.clone();
      object.material = Array.isArray(object.material)
        ? object.material.map((m) => m.clone())
        : object.material.clone();
      object.castShadow = object.receiveShadow = true;
    }
  });
  group.add(copy); // Keep quantization/decode node transforms intact.
  return group;
}
