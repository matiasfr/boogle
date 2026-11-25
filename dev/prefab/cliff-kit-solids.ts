// A cliff kit piece's box solids as placed (docs/plans/cliff-kit-everywhere.md): plain geometry over the records
// (src/content/prefabs/terrain.ts), a leaf the generator (./cliff-kit.ts), its areas and the gate
// (dev/level/cliff-kit-standing.ts) all read, so the gate can be shared with an area's generation without a cycle.
import type { Placement } from '../../src/prefab/types.ts';
import { prefabs } from '../../src/content/prefabs/terrain.ts';

/** Turns (x, y, z) by a record rotation [yaw, pitch, roll] in its order, YXZ: roll, then pitch, then yaw. */
function turn([x, y, z]: readonly number[], [yaw = 0, pitch = 0, roll = 0]: readonly number[]) {
  [x, y] = [x! * Math.cos(roll) - y! * Math.sin(roll), x! * Math.sin(roll) + y! * Math.cos(roll)];
  [y, z] = [y * Math.cos(pitch) - z! * Math.sin(pitch), y * Math.sin(pitch) + z! * Math.cos(pitch)];
  return [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)] as const;
}
/** A placed piece's box solids, each as a function from box-local (-1..1 on each axis) to Place-local (x, y, z): the
 * box's own rotation and offset, then the placement's scale, whole rotation and position (three's TRS order), with the
 * box's half sizes. Plain arithmetic, so audits can run this source with only its data bound. */
export function solidBoxes(p: Placement) {
  return prefabs
    .find((q) => q.key === p.prefab)!
    .colliders.map((c) => {
      if (c.shape !== 'box') throw new Error(`cliff kit: ${p.prefab} has a solid that is not a box`);
      const box = (u: number, v: number, w: number) => {
        const inBox = turn([c.half[0] * u, c.half[1] * v, c.half[2] * w], c.rot ?? []);
        const [sx = 1, sy = 1, sz = 1] = p.scale ?? [];
        const placed = turn(
          [(inBox[0] + c.at[0]) * sx, (inBox[1] + c.at[1]) * sy, (inBox[2] + c.at[2]) * sz],
          p.rot ?? [],
        );
        return [placed[0] + p.pos[0], placed[1] + p.pos[1], placed[2] + p.pos[2]] as const;
      };
      return Object.assign(box, { half: c.half });
    });
}
/** Every point through a placed piece's boxes, no more than `spacing` m apart along each box axis. */
export function* solidSamples(p: Placement, spacing: number) {
  for (const box of solidBoxes(p)) {
    const steps = box.half.map((h) => Math.max(1, Math.ceil((2 * h) / spacing)));
    for (let i = 0; i <= steps[0]!; i++)
      for (let j = 0; j <= steps[1]!; j++)
        for (let k = 0; k <= steps[2]!; k++)
          yield box((2 * i) / steps[0]! - 1, (2 * j) / steps[1]! - 1, (2 * k) / steps[2]! - 1);
  }
}
