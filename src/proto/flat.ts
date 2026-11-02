// A greybox prototype's plain flat-shaded material, one per colour and roughness. Nothing may change one after: it's shared.
import * as THREE from 'three/webgpu';

const made = new Map<string, THREE.MeshStandardNodeMaterial>();
export function flat(color: string, roughness = 0.95) {
  const key = `${color} ${roughness}`;
  let mat = made.get(key);
  if (!mat) made.set(key, (mat = new THREE.MeshStandardNodeMaterial({ color, roughness, flatShading: true })));
  return mat;
}
