// Greybox boxes for ?proto=net: the shape of src/proto/era/blocks.ts drawn in one instanced mesh per set, each box grown
// from the ground by a fraction. Pure transforms/drawing are shared with the era swap through box-plan.ts.
import * as THREE from 'three/webgpu';
import { groundHeight } from '../island/terrain.ts';
// boogle-disable-next-line no-restricted-imports -- moves out of proto with M5/M6 (ecs-migration-railway)
import type { Block } from '../proto/era/blocks.ts';

export type Smoke = { x: number; y: number; z: number };
import { place, boxAt, partMesh, draw, type Box } from './box-plan.ts';
export { place, draw, type Box } from './box-plan.ts';

const Y = new THREE.Vector3(0, 1, 0);
const tp = new THREE.Vector3();

export const box = (x: number, z: number, local: THREE.Matrix4, color: string, tall = false, pop = 0.7): Box =>
  boxAt(x, groundHeight(x, z), z, local, color, tall, pop);

export function blockBoxes(b: Block, smokes: Smoke[]): Box[] {
  const yaw = b.yaw ?? 0,
    y0 = b.y ?? 0;
  const pop = b.kind.startsWith('landmark') ? 1.8 : 0.7;
  const out = [box(b.x, b.z, place(0, y0, 0, b.w, b.h, b.d, yaw), b.color, y0 + b.h > 3, pop)];
  if (b.top) {
    const o = b.top.over ?? 0;
    out.push(box(b.x, b.z, place(0, y0 + b.h, 0, b.w + o, b.top.h, b.d + o, yaw), b.top.color, false, pop));
  }
  if (b.pitch) {
    const o = b.pitch.over ?? 0,
      eave = (b.d + o) / 2,
      { rise } = b.pitch;
    const tilt = Math.atan2(rise, eave),
      slope = Math.hypot(rise, eave);
    for (const side of [-1, 1]) {
      const m = place(
        0,
        y0 + b.h + rise / 2 - 0.1,
        (side * eave) / 2,
        b.w + o,
        0.16,
        slope,
        yaw,
        new THREE.Euler(side * tilt, 0, 0),
      );
      out.push(box(b.x, b.z, m, b.pitch.color, false, pop));
    }
    out.push(box(b.x, b.z, place(0, y0 + b.h, 0, b.w * 0.92, rise * 0.55, b.d * 0.5, yaw), b.color, false, pop));
  }
  if (b.chimney) {
    const { h, dx = 0, dz = 0 } = b.chimney;
    if (h > 0) out.push(box(b.x, b.z, place(dx, y0 + b.h, dz, 0.7, h, 0.7, yaw), '#9a4a3a', false, pop));
    tp.set(dx, 0, dz).applyAxisAngle(Y, yaw);
    smokes.push({ x: b.x + tp.x, y: groundHeight(b.x, b.z) + y0 + b.h + h, z: b.z + tp.z });
  }
  return out;
}

const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, flatShading: true });
export type BoxSet = { boxes: Box[]; mesh: THREE.InstancedMesh };
/** The set's mesh is not in any scene: the caller adds it to its owner (or, for a prototype, the scene). */
export function makeSet(boxes: Box[]): BoxSet {
  const mesh = partMesh(boxes, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const set = { boxes, mesh };
  draw(set, () => 0);
  return set;
}
