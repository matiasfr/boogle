// A cliff kit piece's solids as placed (docs/plans/cliff-kit-everywhere.md): plain geometry over the records
// (src/content/prefabs/terrain.ts), a leaf the generator (./cliff-kit.ts), its areas and the gate
// (dev/level/cliff-kit-standing.ts) all read, so the gate can be shared with an area's generation without a cycle.
// Every solid is convex: a box, or a face's crowned prism (a closed trimesh, wound outward).
import type { Placement } from '../../src/prefab/types.ts';
import { prefabs } from '../../src/content/prefabs/terrain.ts';

export type V3 = readonly [number, number, number];
/** A placed solid, Place-local: its corners and its triangles (indices into them, wound outward). */
export type Hull = { points: V3[]; triangles: (readonly [number, number, number])[] };

/** Turns (x, y, z) by a record rotation [yaw, pitch, roll] in its order, YXZ: roll, then pitch, then yaw. */
function turn([x, y, z]: readonly number[], [yaw = 0, pitch = 0, roll = 0]: readonly number[]) {
  [x, y] = [x! * Math.cos(roll) - y! * Math.sin(roll), x! * Math.sin(roll) + y! * Math.cos(roll)];
  [y, z] = [y * Math.cos(pitch) - z! * Math.sin(pitch), y * Math.sin(pitch) + z! * Math.cos(pitch)];
  return [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)] as const;
}
/** A box's twelve triangles over its corners in (u, v, w) order (index 4u + 2v + w, each 0 or 1), wound outward. */
const BOX: (readonly [number, number, number])[] = [
  [0, 1, 3],
  [0, 3, 2],
  [4, 6, 7],
  [4, 7, 5], // -x, +x
  [0, 4, 5],
  [0, 5, 1],
  [2, 3, 7],
  [2, 7, 6], // -y, +y
  [0, 2, 6],
  [0, 6, 4],
  [1, 5, 7],
  [1, 7, 3], // -z, +z
];
/** A placed piece's solids: each collider's own rotation and offset, then the placement's scale, whole rotation and
 * position (three's TRS order). Plain arithmetic. */
export function solidHulls(p: Placement): Hull[] {
  const place = (c: { at: readonly number[]; rot?: readonly number[] }, q: readonly number[]): V3 => {
    const local = turn(q, c.rot ?? []);
    const [sx = 1, sy = 1, sz = 1] = p.scale ?? [];
    const placed = turn(
      [(local[0] + c.at[0]!) * sx, (local[1] + c.at[1]!) * sy, (local[2] + c.at[2]!) * sz],
      p.rot ?? [],
    );
    return [placed[0] + p.pos[0], placed[1] + p.pos[1], placed[2] + p.pos[2]];
  };
  return prefabs
    .find((q) => q.key === p.prefab)!
    .colliders.map((c) => {
      if (c.shape === 'box') {
        const points: V3[] = [];
        for (const u of [-1, 1])
          for (const v of [-1, 1])
            for (const w of [-1, 1]) points.push(place(c, [c.half[0] * u, c.half[1] * v, c.half[2] * w]));
        return { points, triangles: BOX };
      }
      if (c.shape !== 'trimesh') throw new Error(`cliff kit: ${p.prefab} has a solid that is not a box or a prism`);
      const points: V3[] = [];
      for (let k = 0; k < c.vertices.length; k += 3) points.push(place(c, c.vertices.slice(k, k + 3)));
      const triangles: (readonly [number, number, number])[] = [];
      for (let k = 0; k < c.indices.length; k += 3)
        triangles.push([c.indices[k]!, c.indices[k + 1]!, c.indices[k + 2]!]);
      return { points, triangles };
    });
}
/** A triangle's outward unit normal. */
export function normalOf(hull: Hull, [a, b, c]: readonly [number, number, number]): V3 {
  const [p, q, r] = [hull.points[a]!, hull.points[b]!, hull.points[c]!];
  const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]],
    v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
  const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  const length = Math.hypot(n[0]!, n[1]!, n[2]!);
  return [n[0]! / length, n[1]! / length, n[2]! / length];
}
/** Every point through a placed piece's solids, on a grid `spacing` m apart over each solid's bounds (those inside it),
 * and its corners. */
export function* solidSamples(p: Placement, spacing: number) {
  for (const hull of solidHulls(p)) {
    yield* hull.points;
    const planes = hull.triangles.map((t) => ({ n: normalOf(hull, t), at: hull.points[t[0]]! }));
    const lo = [0, 1, 2].map((a) => Math.min(...hull.points.map((q) => q[a]!))),
      hi = [0, 1, 2].map((a) => Math.max(...hull.points.map((q) => q[a]!)));
    for (let x = lo[0]!; x <= hi[0]! + 1e-9; x += spacing)
      for (let y = lo[1]!; y <= hi[1]! + 1e-9; y += spacing)
        for (let z = lo[2]!; z <= hi[2]! + 1e-9; z += spacing)
          if (planes.every(({ n, at }) => n[0] * (x - at[0]) + n[1] * (y - at[1]) + n[2] * (z - at[2]) <= 1e-6))
            yield [x, y, z] as V3;
  }
}
