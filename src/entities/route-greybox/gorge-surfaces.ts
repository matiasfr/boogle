// Source geometry for Gorge's shared slab faces. First-listed slabs own each shared exterior patch.
// Collision recipes and authored transforms are deliberately independent of this mesh operation.
import * as THREE from 'three/webgpu';
import type { Placement } from '../../prefab/types.ts';
const pairs = [
  [14, 26],
  [16, 26],
  [26, 74],
  [18, 27],
  [16, 27],
  [48, 51],
  [18, 20],
  [26, 73],
] as const;
const id = (n: number) => `gorge.massing.${n}`;
type Triangle = { points: THREE.Vector3[]; normal: THREE.Vector3 };
const EPS = 1e-7;
function clip(poly: THREE.Vector3[], normal: THREE.Vector3, origin: THREE.Vector3, inside: boolean) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!,
      b = poly[(i + 1) % poly.length]!;
    const da = normal.dot(a.clone().sub(origin)) * (inside ? 1 : -1);
    const db = normal.dot(b.clone().sub(origin)) * (inside ? 1 : -1);
    if (da <= EPS) out.push(a);
    if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) out.push(a.clone().lerp(b, da / (da - db)));
  }
  return out;
}
function subtract(poly: THREE.Vector3[], triangle: Triangle): THREE.Vector3[][] {
  const planes = triangle.points.map((p, i) => ({
    origin: p,
    normal: triangle.points[(i + 1) % 3]!.clone().sub(p).cross(triangle.normal).normalize(),
  }));
  let intersection = poly;
  for (const p of planes) intersection = clip(intersection, p.normal, p.origin, true);
  if (intersection.length < 3) return [poly];
  const area = new THREE.Vector3();
  for (let i = 1; i + 1 < intersection.length; i++)
    area.add(
      intersection[i]!.clone()
        .sub(intersection[0]!)
        .cross(intersection[i + 1]!.clone().sub(intersection[0]!)),
    );
  if (area.length() < EPS) return [poly];
  const outside: THREE.Vector3[][] = [];
  let remainder = poly;
  for (const p of planes) {
    const part = clip(remainder, p.normal, p.origin, false);
    if (part.length >= 3) outside.push(part);
    remainder = clip(remainder, p.normal, p.origin, true);
  }
  return outside;
}
export function gorgeSurfaces(placements: readonly Placement[]): Map<string, THREE.BufferGeometry> {
  const triangles = new Map<string, Triangle[]>();
  const matrices = new Map<string, THREE.Matrix4>();
  const needed = new Set(pairs.flatMap(([a, b]) => [id(a), id(b)]));
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const p of placements) {
    if (!needed.has(p.id)) continue;
    const rot = p.rot ?? [0, 0, 0];
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...p.pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[1], rot[0], rot[2], 'YXZ')),
      new THREE.Vector3(...(p.scale ?? [1, 1, 1])),
    );
    matrices.set(p.id, matrix);
    const faces: Triangle[] = [];
    for (let i = 0; i < box.index!.count; i += 3) {
      const points = [0, 1, 2].map((k) =>
        new THREE.Vector3()
          .fromBufferAttribute(box.getAttribute('position'), box.index!.getX(i + k))
          .applyMatrix4(matrix),
      );
      const normal = points[1]!.clone().sub(points[0]!).cross(points[2]!.clone().sub(points[0]!)).normalize();
      faces.push({ points, normal });
    }
    triangles.set(p.id, faces);
  }
  box.dispose();
  const result = new Map<string, THREE.BufferGeometry>();
  for (const target of new Set(pairs.map(([, b]) => id(b)))) {
    const source = triangles.get(target);
    if (!source) continue;
    const inverse = matrices.get(target)!.clone().invert();
    const positions: number[] = [];
    for (const face of source) {
      let fragments = [face.points];
      for (const [a, b] of pairs) {
        if (id(b) !== target) continue;
        for (const other of triangles.get(id(a)) ?? []) {
          if (
            face.normal.dot(other.normal) < 1 - 1e-8 ||
            Math.abs(face.normal.dot(other.points[0]!.clone().sub(face.points[0]!))) > EPS
          )
            continue;
          fragments = fragments.flatMap((poly) => subtract(poly, other));
        }
      }
      for (const poly of fragments)
        for (let i = 1; i + 1 < poly.length; i++) {
          const vertices = [poly[0]!, poly[i]!, poly[i + 1]!];
          if (vertices[1]!.clone().sub(vertices[0]!).cross(vertices[2]!.clone().sub(vertices[0]!)).length() < EPS)
            continue;
          for (const v of vertices) positions.push(...v.clone().applyMatrix4(inverse).toArray());
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    result.set(target, geometry);
  }
  return result;
}
