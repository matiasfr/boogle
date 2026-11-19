// One draw of moving coloured boxes, rewritten from state (./works-box-view.ts re-exports it for the dormant views).
// No colliders: what stands on its boxes is its owner's to add.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';

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
