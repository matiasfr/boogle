// Headless geometry from the compiled instances: no renderer, body service or parallel layout authority.
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { ColliderDef, LevelArtifact, Placement, PrefabDef, Transform, Vec3 } from '../../src/prefab/types.ts';
import { validateLevelArtifact } from '../../src/prefab/validate.ts';

export type Triangle = {
  a: Vector3;
  b: Vector3;
  c: Vector3;
  area: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
};
export type Volume = { centre: Vector3; edges: readonly Vector3[]; triangles: readonly Triangle[] };
export type PlacedCollider = { placement: Placement; definition: ColliderDef; volume: Volume };
const transform = (t: Transform) =>
  new Matrix4().compose(
    new Vector3().fromArray(t.pos),
    new Quaternion().setFromEuler(new Euler(t.rot?.[1] ?? 0, t.rot?.[0] ?? 0, t.rot?.[2] ?? 0, 'YXZ')),
    new Vector3().fromArray(t.scale ?? [1, 1, 1]),
  );
function triangles(vertices: readonly Vector3[], indices: readonly number[]): Triangle[] {
  const out: Triangle[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = vertices[indices[i]!]!,
      b = vertices[indices[i + 1]!]!,
      c = vertices[indices[i + 2]!]!;
    const area = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
    if (area <= 1e-10) continue; // Only upward faces support a downward ray.
    out.push({
      a,
      b,
      c,
      area,
      x0: Math.min(a.x, b.x, c.x),
      x1: Math.max(a.x, b.x, c.x),
      z0: Math.min(a.z, b.z, c.z),
      z1: Math.max(a.z, b.z, c.z),
    });
  }
  return out;
}
export function boxVolume(matrix: Matrix4, half: Vec3): Volume {
  const points: Vector3[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) points.push(new Vector3(x * half[0], y * half[1], z * half[2]).applyMatrix4(matrix));
  const centre = new Vector3().applyMatrix4(matrix);
  return {
    centre,
    edges: [new Vector3(half[0], 0, 0), new Vector3(0, half[1], 0), new Vector3(0, 0, half[2])].map((v) =>
      v.applyMatrix4(matrix).sub(centre),
    ),
    triangles: triangles(
      points,
      [2, 3, 6, 3, 7, 6, 0, 4, 1, 1, 4, 5, 4, 6, 5, 5, 6, 7, 0, 1, 2, 1, 3, 2, 1, 5, 3, 3, 5, 7, 0, 2, 4, 2, 6, 4],
    ),
  };
}
export function resolvePlacedColliders(level: LevelArtifact, prefabs: Readonly<Record<string, PrefabDef>>) {
  validateLevelArtifact(level, prefabs);
  // route-greybox's runtime instantiates every placement under the area's identity owner; it does not mount parents.
  // Reject that unsupported shape instead of predicting a hierarchy the game would not instantiate.
  if (level.placements.some((p) => p.parent))
    throw new Error('level-check: parented greybox placements are not supported by the runtime');
  const matrices = new Map<string, Matrix4>();
  const world = (p: Placement): Matrix4 => {
    const cached = matrices.get(p.id);
    if (cached) return cached;
    const matrix = transform(p);
    matrices.set(p.id, matrix);
    return matrix;
  };
  const colliders: PlacedCollider[] = [];
  for (const p of level.placements)
    for (const c of prefabs[p.prefab]!.colliders) {
      const matrix = world(p)
        .clone()
        .multiply(transform({ pos: c.at, ...(c.rot ? { rot: c.rot } : {}) }));
      let volume: Volume;
      if (c.shape === 'box') volume = boxVolume(matrix, c.half);
      else if (c.shape === 'trimesh') {
        const vertices: Vector3[] = [];
        for (let i = 0; i < c.vertices.length; i += 3)
          vertices.push(new Vector3().fromArray(c.vertices, i).applyMatrix4(matrix));
        volume = { centre: new Vector3().applyMatrix4(matrix), edges: [], triangles: triangles(vertices, c.indices) };
      } else throw new Error(`level-check: unsupported placed collider ${p.id}: ${c.shape}`);
      colliders.push({ placement: p, definition: c, volume });
    }
  return {
    colliders,
    world,
    visualBounds(p: Placement) {
      const visual = prefabs[p.prefab]!.visual;
      if (!('builder' in visual) || visual.builder !== 'greybox.box')
        throw new Error(`level-check: unsupported greybox visual ${p.id}`);
      const bounds = new Box3();
      for (const t of visual.instances ?? [{ pos: [0, 0, 0] as Vec3 }]) {
        const matrix = transform(t);
        for (const x of [-0.5, 0.5])
          for (const y of [-0.5, 0.5])
            for (const z of [-0.5, 0.5]) bounds.expandByPoint(new Vector3(x, y, z).applyMatrix4(matrix));
      }
      const centre = bounds.getCenter(new Vector3()),
        half = bounds.getSize(new Vector3()).multiplyScalar(0.5);
      return boxVolume(
        world(p)
          .clone()
          .multiply(new Matrix4().makeTranslation(centre.x, centre.y, centre.z)),
        [half.x, half.y, half.z],
      );
    },
  };
}
/** Vertical ray against the actual world triangles. maxY also permits checking support at a drawn surface. */
export function heightAt(triangles: readonly Triangle[], p: { x: number; z: number }, maxY = Infinity) {
  let height: number | null = null;
  for (const t of triangles) {
    if (p.x < t.x0 - 1e-9 || p.x > t.x1 + 1e-9 || p.z < t.z0 - 1e-9 || p.z > t.z1 + 1e-9) continue;
    const u = ((p.z - t.a.z) * (t.c.x - t.a.x) - (p.x - t.a.x) * (t.c.z - t.a.z)) / t.area;
    const v = ((t.b.z - t.a.z) * (p.x - t.a.x) - (t.b.x - t.a.x) * (p.z - t.a.z)) / t.area;
    if (u < -1e-9 || v < -1e-9 || u + v > 1 + 1e-9) continue;
    const y = t.a.y + u * (t.b.y - t.a.y) + v * (t.c.y - t.a.y);
    if (y <= maxY && (height === null || y > height)) height = y;
  }
  return height;
}
/** Separating axes for two transformed boxes, including pitches/rolls and visual-only sheared boxes. */
export function volumesOverlap(a: Volume, b: Volume) {
  const normals = (v: Volume) => v.edges.map((e, i) => new Vector3().crossVectors(e, v.edges[(i + 1) % 3]!));
  const axes = [
    ...normals(a),
    ...normals(b),
    ...a.edges.flatMap((x) => b.edges.map((y) => new Vector3().crossVectors(x, y))),
  ];
  const delta = b.centre.clone().sub(a.centre);
  for (const axis of axes) {
    if (axis.lengthSq() < 1e-20) continue;
    axis.normalize();
    const radius = (v: Volume) => v.edges.reduce((n, e) => n + Math.abs(e.dot(axis)), 0);
    if (Math.abs(delta.dot(axis)) >= radius(a) + radius(b) - 0.01) return false;
  }
  return true;
}
export function reserveVolume(r: { x: number; z: number; y0: number; y1: number; yaw: number; w: number; d: number }) {
  return boxVolume(transform({ pos: [r.x, (r.y0 + r.y1) / 2, r.z], rot: [r.yaw, 0, 0] }), [
    r.w / 2,
    (r.y1 - r.y0) / 2,
    r.d / 2,
  ]);
}
