import * as THREE from 'three/webgpu';
import { registerBuilder } from '../builders.ts';
import { propModels } from '../../render/prop-models.ts';
import { mergeParts } from '../../render/geometry-parts.ts';
import type { PropSample } from '../../blueprints/props.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'scenery.prop': true;
  }
}
// The production view retains its tile merges. The record also has a standalone builder for previews/export.
export const sceneryProp = registerBuilder('scenery.prop', (params) => {
  const kind = params.kind;
  if (kind !== 'palm' && kind !== 'broadleaf' && kind !== 'rock') throw new Error('prefabs: unknown prop kind');
  const parts: THREE.BufferGeometry[] = [];
  const p = { blueprint: kind, x: 0, h: 0, z: 0, size: 1, ...params } as PropSample;
  if (p.blueprint === 'palm') propModels.palm(parts, p);
  else if (p.blueprint === 'broadleaf') propModels.broadleaf(parts, p);
  else propModels.rock(parts, p);
  const geometry = mergeParts(parts);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return {
    object: mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
});
