// Many dots in one draw call: an instanced Sprite whose per-instance data lives in dynamic buffers. WebGPU has no point
// size, so this stands in for THREE.Points (src/render/README.md, "Materials"). Used by particles, fireflies and the
// throw preview.
import * as THREE from 'three/webgpu';
import { instancedDynamicBufferAttribute } from 'three/tsl';
import { scene } from './scene.ts';

// A per-instance buffer that is rewritten every frame.
export const dynAttr = (array: Float32Array, itemSize: number) =>
  new THREE.InstancedBufferAttribute(array, itemSize).setUsage(THREE.DynamicDrawUsage);

// Adds a hidden instanced Sprite to the scene, centred per instance on posAttr. mat is a SpriteNodeMaterial (sized in
// world units through scaleNode) or a PointsNodeMaterial (sized like PointsMaterial). alphaToCoverage is turned off, or
// MSAA dithers the soft dot edges.
export function instancedSprite(
  mat: THREE.SpriteNodeMaterial | THREE.PointsNodeMaterial,
  posAttr: THREE.InstancedBufferAttribute,
  count = 0,
) {
  mat.alphaToCoverage = false;
  mat.positionNode = instancedDynamicBufferAttribute(posAttr);
  const sprite = new THREE.Sprite(mat);
  sprite.count = count;
  sprite.frustumCulled = false;
  sprite.visible = false;
  scene.add(sprite);
  return sprite;
}
