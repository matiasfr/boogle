// Animated attachments retain their original view-controlled transforms and materials.
import * as THREE from 'three/webgpu';
import { flat } from '../../render/flat.ts';
import { roadPlaque } from '../../entities/railway/home-pictogram.ts';
import { registerBuilder } from '../builders.ts';
import type { JsonObject } from '../types.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'railway.halt-attachment': true;
  }
}
export function haltAttachment(p: JsonObject) {
  if (p.kind === 'road-plaque') {
    if (p.road !== 0 && p.road !== 1) throw new Error('halt attachment: invalid road');
    const plaque = roadPlaque(p.road);
    return { object: plaque.mesh, dispose: plaque.dispose };
  }
  if (p.kind !== 'signal') throw new Error('halt attachment: invalid kind');
  const arm = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.05), flat('#e8392a'));
  blade.position.x = 0.5;
  arm.add(blade);
  return arm;
}
registerBuilder('railway.halt-attachment', haltAttachment);
