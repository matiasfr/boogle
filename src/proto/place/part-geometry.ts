// Side-effect-free coloured primitives shared by rewards and worn gear.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Part, PartShape as Prim } from '../../render/cosmetic-parts.ts';
export type { Part };
const unit: Record<Prim, () => THREE.BufferGeometry> = {
  s: () => new THREE.SphereGeometry(1, 10, 8),
  c: () => new THREE.CylinderGeometry(1, 1, 1, 12),
  tube: () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, true),
  brim: () => {
    const geometry = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.66, -0.5),
        new THREE.Vector2(1, -0.5),
        new THREE.Vector2(1, 0.5),
        new THREE.Vector2(0.66, 0.5),
        new THREE.Vector2(0.66, -0.5),
      ],
      12,
    );
    const positions = geometry.getAttribute('position');
    // The earned brim projects 0.06 m forward; centre its opening under the crown, not the projection.
    for (let i = 0; i < positions.count; i++)
      if (Math.hypot(positions.getX(i), positions.getZ(i)) < 0.8) positions.setZ(i, positions.getZ(i) - 0.06 / 0.42);
    geometry.computeVertexNormals();
    return geometry;
  },
  k: () => new THREE.ConeGeometry(1, 1, 10),
  b: () => new THREE.BoxGeometry(1, 1, 1),
  t: () => new THREE.TorusGeometry(1, 0.3, 6, 14).rotateX(Math.PI / 2),
  // A curved front panel, open at the sides: the arms and waist still read through the outfit.
  bib: () =>
    new THREE.LatheGeometry(
      [new THREE.Vector2(1, -0.5), new THREE.Vector2(1, 0), new THREE.Vector2(0.78, 0.5)],
      12,
      -0.64,
      1.28,
    ),
  strap: () =>
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.07, 0.203),
        new THREE.Vector3(0, 0.14, 0.17),
        new THREE.Vector3(0, 0.18, 0.08),
        new THREE.Vector3(0, 0.18, 0),
        new THREE.Vector3(0, 0.18, -0.08),
        new THREE.Vector3(0, 0.14, -0.17),
        new THREE.Vector3(0, 0.07, -0.203),
      ]),
      12,
      0.028,
      4,
      false,
    ),
  // A narrow, soft pack strap: from the back rail, over the shoulder and under the arm.
  packstrap: () =>
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.09, 0.23),
        new THREE.Vector3(0, 0.04, 0.23),
        new THREE.Vector3(0, 0.14, 0.17),
        new THREE.Vector3(0, 0.18, 0.08),
        new THREE.Vector3(0, 0.18, 0),
        new THREE.Vector3(0, 0.18, -0.08),
        new THREE.Vector3(0, 0.14, -0.17),
        new THREE.Vector3(0, 0.07, -0.205),
        new THREE.Vector3(0, -0.01, -0.21),
        new THREE.Vector3(0, -0.08, -0.195),
        new THREE.Vector3(0, -0.13, -0.16),
      ]),
      24,
      0.022,
      8,
      false,
    ),
  // One continuous pear-shaped shell: open hem and neck, with an inward lip at each edge.
  // Buddy's belly is broader than its shoulders (assets/src/buddy.py).
  vest: () =>
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.85, -0.5),
        new THREE.Vector2(0.94, -0.5),
        new THREE.Vector2(1, -0.27),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(0.96, 0.24),
        new THREE.Vector2(0.82, 0.5),
        new THREE.Vector2(0.74, 0.5),
      ],
      24,
    ),
};
const m4 = new THREE.Matrix4(),
  e4 = new THREE.Euler(),
  q4 = new THREE.Quaternion(),
  p4 = new THREE.Vector3(),
  s4 = new THREE.Vector3(),
  c4 = new THREE.Color();
export function merged(parts: Part[], grow = 1) {
  const geos = parts.map(([kind, x, y, z, sx, sy, sz, color, rx, rz]) => {
    const g = unit[kind]();
    g.applyMatrix4(
      m4.compose(
        p4.set(x, y, z),
        q4.setFromEuler(e4.set(rx ?? 0, 0, rz ?? 0)),
        s4.set(sx * grow, sy * grow, sz * grow),
      ),
    );
    const n = g.getAttribute('position').count;
    c4.set(color);
    const col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) col.set([c4.r, c4.g, c4.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  return mergeGeometries(geos)!;
}
