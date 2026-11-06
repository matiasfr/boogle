// Scope common cove layers without changing default Place material ownership.
import type * as THREE from 'three/webgpu';
import { attribute, positionWorld, smoothstep } from 'three/tsl';
import { applyCoveLayers } from './cove-material.ts';
export function dressCoveGround(_geometry: THREE.BufferGeometry, material: THREE.MeshStandardNodeMaterial) {
  material.colorNode ??= attribute('color', 'vec3');
  const p = positionWorld;
  const region = smoothstep(735, 750, p.x)
    .mul(smoothstep(870, 885, p.x).oneMinus())
    .mul(smoothstep(-20, -5, p.z))
    .mul(smoothstep(95, 110, p.z).oneMinus());
  applyCoveLayers(material, region);
}
