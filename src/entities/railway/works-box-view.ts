// Both dormant views share one instanced-box recipe. One draw per view, including all palette changes.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';
import type { WorksBox } from './works-shape.ts';
import type { BoxBatch } from './box-batch.ts';
export async function drawWorksBoxes(owner: OwnedView, boxes: WorksBox[]) {
  const { addStatic } = await import('../../place/land.ts');
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material('stone', { colour: '#ffffff' }), boxes.length);
  const pose = new THREE.Object3D();
  boxes.forEach((b, i) => {
    pose.position.set(b.x, b.y, b.z);
    pose.rotation.set(0, b.yaw, 0);
    pose.scale.set(b.w, b.h, b.d);
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
    mesh.setColorAt(i, new THREE.Color(b.colour ?? '#b7b0a0'));
    if (b.solid !== false)
      addStatic(
        { kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 },
        pose.position,
        pose.quaternion,
        undefined,
        owner,
      );
  });
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  owner.add(mesh);
  geometry.dispose();
  return mesh;
}

export { createBoxBatch, type BoxBatch } from './box-batch.ts';

/** Effects due a moment later, run from the owner's frame update (never a wall-clock timer that outlives the view);
 * a restore clears them. */
export function createLater() {
  const queue: { t: number; fn: () => void }[] = [];
  return {
    after(seconds: number, fn: () => void) {
      if (seconds <= 0) fn();
      else queue.push({ t: seconds, fn });
    },
    update(dt: number) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const e = queue[i]!;
        e.t -= dt;
        if (e.t > 0) continue;
        queue.splice(i, 1);
        e.fn();
      }
    },
    clear() {
      queue.length = 0;
    },
  };
}

/** A precast footing in its own frame, base centre at the origin, 1.2 m square: a pale block with a dark groove for a
 * bent's post, an iron band and two lifting eyes. Reads as a made thing, never as logs or stone. */
export const FOOTING = { w: 1.2, h: 0.9 } as const;
export function footingParts(batch: BoxBatch, frame: THREE.Matrix4, tint = '#d6cfbf') {
  const { w, h } = FOOTING;
  batch.part(frame, 0, h * 0.42, 0, w, h * 0.84, w, tint);
  // Two shoulders leave the groove open along local z.
  for (const side of [-1, 1]) batch.part(frame, side * w * 0.33, h * 0.92, 0, w * 0.34, h * 0.16, w, tint);
  batch.part(frame, 0, h * 0.86, 0, w * 0.32, h * 0.04, w * 0.98, '#4c4842');
  batch.part(frame, 0, h * 0.3, 0, w + 0.04, 0.12, w + 0.04, '#7a5236');
  for (const side of [-1, 1]) batch.part(frame, side * w * 0.33, h + 0.07, 0, 0.1, 0.14, 0.34, '#3c3a36');
}
const fp = new THREE.Vector3(),
  fq = new THREE.Quaternion(),
  fs = new THREE.Vector3(),
  fe = new THREE.Euler(0, 0, 0, 'YXZ');
/** World frame for a footing standing at (x, y, z), turned `yaw`, tipped `tilt` about its local x. */
export function footingFrame(out: THREE.Matrix4, x: number, y: number, z: number, yaw = 0, tilt = 0, scale = 1) {
  return out.compose(fp.set(x, y, z), fq.setFromEuler(fe.set(tilt, yaw, 0)), fs.set(scale, scale, scale));
}
