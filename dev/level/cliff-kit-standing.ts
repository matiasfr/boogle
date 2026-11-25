// No new standing height (docs/plans/cliff-kit-everywhere.md, step 0's gate): the kit is never a new way up, checked
// by geometry rather than by modelling moves. A face of a piece's solid that a player could stand on (its outward
// normal at least WALKABLE_NY up, the controller's own slope limit) must, at every point, lie within one step (STEP,
// 0.3 m) of a surface the bare world already offers within the player's radius of it: walkable ground, or the sea's
// surface where the ground is under it. A top at most a step above the ground under or beside it passes, and so does
// one that sits up to a step under the bare top it is flush against (a rim cap level with the lip). Every other face
// must be steeper than the controller can stand on. With no new standable surface above what the bare world offers,
// no route of any kind (jumps, glides, roofs, stones) is gained. Checked per collider with full rotation and scale;
// a face point under the bare ground is buried, not offered.
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { SEA } from '../../src/world/grid.ts';
import { PLAYER_R, WALKABLE_NY } from '../../src/constants.ts';
import { STEP } from '../../src/place/clearance.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { solidBoxes } from '../prefab/cliff-kit.ts';

/** Spacing of the points checked on a face, and of the bare surfaces looked for round each, m. */
const SAMPLE = 0.25,
  AROUND = 0.15;
/** Points within the player's radius of a spot, as offsets. */
const DISC: [number, number][] = [];
for (let dx = -PLAYER_R; dx <= PLAYER_R + 1e-9; dx += AROUND)
  for (let dz = -PLAYER_R; dz <= PLAYER_R + 1e-9; dz += AROUND)
    if (Math.hypot(dx, dz) <= PLAYER_R + 1e-9) DISC.push([dx, dz]);

const ground = (x: number, z: number) => H(x + ORIGIN.x, z);
/** Whether the bare ground at Place-local (x, z) is walkable: its slope's normal at least WALKABLE_NY up. */
function walkable(x: number, z: number) {
  const e = SAMPLE;
  const gx = (ground(x + e, z) - ground(x - e, z)) / (2 * e),
    gz = (ground(x, z + e) - ground(x, z - e)) / (2 * e);
  return 1 / Math.sqrt(1 + gx * gx + gz * gz) >= WALKABLE_NY;
}
/** The heights a player stands at in the bare world within PLAYER_R of (x, z): walkable ground, or the sea's surface. */
function footings(x: number, z: number) {
  const out: number[] = [];
  for (const [dx, dz] of DISC) {
    const g = ground(x + dx, z + dz);
    if (g < SEA) out.push(SEA);
    else if (walkable(x + dx, z + dz)) out.push(g);
  }
  return out;
}

type V = readonly [number, number, number];
const sub = (a: V, b: V) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as const;

/** What a placed piece breaks: each standable face that offers a new standing height, with its worst point (how far
 * off the nearest bare footing within the player's radius, or none at all). */
export function standingProblems(p: Placement): string[] {
  const problems: string[] = [];
  for (const [n, box] of solidBoxes(p).entries()) {
    const centre = box(0, 0, 0);
    for (let axis = 0; axis < 3; axis++)
      for (const side of [-1, 1]) {
        // The face's two other axes, its tangents across it and its outward normal (scale and rotation included).
        const [a, b] = [0, 1, 2].filter((x) => x !== axis) as [number, number];
        const at = (s: number, t: number) => {
          const q = [0, 0, 0];
          q[axis] = side;
          q[a] = s;
          q[b] = t;
          return box(q[0]!, q[1]!, q[2]!);
        };
        const ta = sub(at(1, 0), at(-1, 0)),
          tb = sub(at(0, 1), at(0, -1));
        let normal = [ta[1] * tb[2] - ta[2] * tb[1], ta[2] * tb[0] - ta[0] * tb[2], ta[0] * tb[1] - ta[1] * tb[0]];
        const out = sub(at(0, 0), centre);
        if (normal[0]! * out[0] + normal[1]! * out[1] + normal[2]! * out[2] < 0) normal = normal.map((v) => -v);
        if (normal[1]! / Math.hypot(...normal) < WALKABLE_NY) continue; // too steep to stand on: no top
        const sa = Math.max(1, Math.ceil(Math.hypot(...ta) / SAMPLE)),
          sb = Math.max(1, Math.ceil(Math.hypot(...tb) / SAMPLE));
        let worst = 0,
          where: V | undefined;
        for (let i = 0; i <= sa; i++)
          for (let j = 0; j <= sb; j++) {
            const q = at((2 * i) / sa - 1, (2 * j) / sb - 1);
            if (q[1] < ground(q[0], q[2]) - 0.05) continue; // buried
            const off = Math.min(...footings(q[0], q[2]).map((h) => Math.abs(q[1] - h)), Infinity);
            if (off > STEP && off > worst) {
              worst = off;
              where = q;
            }
          }
        if (where)
          problems.push(
            `${p.id} (${p.prefab}, solid ${n}) offers a standable top at (${where.map((v) => v.toFixed(2)).join(', ')}) ${
              worst === Infinity
                ? 'with no walkable ground or sea within reach'
                : `${worst.toFixed(2)} m off the bare footing`
            }`,
          );
      }
  }
  return problems;
}
