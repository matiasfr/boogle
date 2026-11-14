// One shared ramp specification. Up-platform parts keep their existing drop-set reveal.
import * as THREE from 'three/webgpu';
import { flat } from '../../render/flat.ts';
import type { Part } from '../../render/part-geometry.ts';
import type { JsonObject } from '../types.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'railway.halt-ramp': true;
  }
}
export function haltRamp(p: JsonObject) {
  const { x, y, z, width, full, yaw, pitch } = p as Record<string, number>;
  if ([x, y, z, width, full, yaw, pitch].some((n) => typeof n !== 'number' || !Number.isFinite(n)))
    throw new Error('halt kit: missing ramp dimensions');
  if (p.up) return { parts: [['b', x!, y!, z!, width!, 0.4, full!, '#bdb8ac', pitch!]] as Part[] };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.4, full), flat('#bdb8ac'));
  mesh.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  mesh.position.set(x!, y!, z!);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
registerBuilder('railway.halt-ramp', haltRamp);
