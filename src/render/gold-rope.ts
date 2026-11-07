// The great beam's gold rope: one colour and one sagging-rope builder for Station 3's lashings, the great tree's sling
// and the drag rope (the great beam pass, 7 November: the same rope ties the gap, the tree and the carry together).
// Local presentation only.
import * as THREE from 'three/webgpu';

export const GOLD_ROPE = '#d9a438';
const UP = new THREE.Vector3(0, 1, 0);
const mid = new THREE.Vector3(),
  ctl = new THREE.Vector3(),
  p = new THREE.Vector3(),
  q = new THREE.Vector3();
const point = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) =>
  out
    .copy(a)
    .multiplyScalar((1 - t) * (1 - t))
    .addScaledVector(c, 2 * t * (1 - t))
    .addScaledVector(b, t * t);

/** A rope of `segments` short cylinders under `parent`, posed with set(a, b, sag) in the parent's space. */
export function createRope(parent: THREE.Object3D, material: THREE.Material, segments = 8, radius = 0.035) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 1, 5, 1, true);
  const parts = Array.from({ length: segments }, () => {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = true;
    parent.add(m);
    return m;
  });
  return {
    parts,
    /** A quadratic sag: the middle hangs `sag` metres below the straight line from a to b. */
    set(a: THREE.Vector3, b: THREE.Vector3, sag: number) {
      ctl.copy(mid.addVectors(a, b).multiplyScalar(0.5)).addScaledVector(UP, -2 * sag);
      for (let k = 0; k < segments; k++) {
        point(a, ctl, b, k / segments, p);
        point(a, ctl, b, (k + 1) / segments, q);
        const m = parts[k]!;
        m.position.addVectors(p, q).multiplyScalar(0.5);
        q.sub(p);
        const length = q.length();
        m.scale.set(1, Math.max(0.001, length + radius), 1);
        if (length > 1e-5) m.quaternion.setFromUnitVectors(UP, q.multiplyScalar(1 / length));
      }
    },
    set visible(on: boolean) {
      for (const m of parts) m.visible = on;
    },
    dispose() {
      for (const m of parts) m.removeFromParent();
      geometry.dispose();
    },
  };
}
