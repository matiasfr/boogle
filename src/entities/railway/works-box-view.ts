// Both dormant views share one instanced-box recipe. One draw per view, including all palette changes.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';
import type { WorksBox } from './works-shape.ts';
export async function drawWorksBoxes(owner: OwnedView, boxes: WorksBox[]) {
  const { addStatic } = await import('../../proto/place/land.ts');
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

/** One draw of moving coloured boxes, rewritten each frame from state: slabs, footings, vehicles and frames.
 * Never culled (its pieces travel); no colliders, which their owners add and remove from state. */
export function createBoxBatch(owner: OwnedView, max: number, shadows = true) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material('stone', { colour: '#ffffff' }), max);
  geometry.dispose();
  // The colour attribute must exist before the first draw: WebGPU builds the pipeline once, and one compiled while
  // the batch was empty (no instanceColor yet) would draw every later box white.
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
  mesh.frustumCulled = false;
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.count = 0;
  owner.add(mesh);
  const local = new THREE.Matrix4(),
    out = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    e = new THREE.Euler(0, 0, 0, 'YXZ'),
    c = new THREE.Color();
  let n = 0;
  const batch = {
    mesh,
    begin() {
      n = 0;
    },
    /** A box at a world pose: centre, size, yaw then pitch (x) and roll (z). */
    box(
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      colour: string,
      yaw = 0,
      pitch = 0,
      roll = 0,
    ) {
      if (n >= max || w <= 0 || h <= 0 || d <= 0) return;
      out.compose(p.set(x, y, z), q.setFromEuler(e.set(pitch, yaw, roll)), s.set(w, h, d));
      mesh.setMatrixAt(n, out);
      mesh.setColorAt(n++, c.set(colour));
    },
    /** A box in a parent frame (`frame` maps local metres to world). */
    part(frame: THREE.Matrix4, x: number, y: number, z: number, w: number, h: number, d: number, colour: string) {
      if (n >= max || w <= 0 || h <= 0 || d <= 0) return;
      local.compose(p.set(x, y, z), q.identity(), s.set(w, h, d));
      mesh.setMatrixAt(n, out.multiplyMatrices(frame, local));
      mesh.setColorAt(n++, c.set(colour));
    },
    /** A unit box already posed and sized by `matrix`. */
    matrix(matrix: THREE.Matrix4, colour: string) {
      if (n >= max) return;
      mesh.setMatrixAt(n, matrix);
      mesh.setColorAt(n++, c.set(colour));
    },
    commit() {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    get count() {
      return n;
    },
  };
  return batch;
}
export type BoxBatch = ReturnType<typeof createBoxBatch>;

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
