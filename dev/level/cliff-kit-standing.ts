// No new way up (docs/plans/cliff-kit-everywhere.md, step 0's gate): a rough geometric rule, not a model of every move
// (owner call review-scope: checks are rough approximations that work). A face of a piece's solid a player could stand
// on (its outward normal at least WALKABLE_NY up, the controller's own slope limit) is fine, at each point, if any of:
// (a) flush: within one step (STEP, 0.3 m) of a bare footing within the player's radius (walkable ground, the sea's
//     surface where the ground is under it, or a train's highest top anywhere along a drawn track), so a top a step over the ground beside it, or a cap a step under
//     the lip it is flush against;
// (b) out of reach: more than two jumps' rise (TWO_JUMPS) above every lower footing and every lower point of another
//     piece's standable top within REACH m across the ground (ground above it only drops a player onto it: no way up);
// (b) counts another piece's top only where a player reaches it from the ground (two jumps or less over a lower footing
//     within REACH m, or a drop from a train's roof within REACH m to two jumps under its rail), so a staircase fails
//     through its lower steps;
// (c) a low perch: the piece's highest such top at most one jump's rise (MOVER.jumpHeight) over the highest footing
//     within PERCH m of its tops.
// Otherwise the piece offers a new way up. Checked per collider with full rotation and scale; a face point under the
// bare ground is buried, not offered. Known limits: moves made only in mid-air (a glide off a train's roof, a jump
// chained through falls from top to top) are not followed, so a staircase reached only that way passes.
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { SEA } from '../../src/world/grid.ts';
import { PLAYER_R, WALKABLE_NY } from '../../src/constants.ts';
import { STEP } from '../../src/place/clearance.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { solidBoxes } from '../prefab/cliff-kit-solids.ts';
import { MOVER, TWO_JUMPS } from './mover.ts';
import { TRAIN_TOP, drawnTracks } from './rail-network.ts';

/** Spacing of the points checked on a face, m; of the footings round each for (a), and for (b) and (c). */
const SAMPLE = 0.25,
  AROUND = 0.15,
  NEAR = 0.5;
/** How far across the ground a top is out of reach of lower footings (b), and a perch's footing (c). */
export const REACH = 8,
  PERCH = 1;

const ground = (x: number, z: number) => H(x + ORIGIN.x, z);
/** Whether the bare ground at Place-local (x, z) is walkable: its slope's normal at least WALKABLE_NY up. */
export function walkable(x: number, z: number) {
  const e = SAMPLE;
  const gx = (ground(x + e, z) - ground(x - e, z)) / (2 * e),
    gz = (ground(x, z + e) - ground(x, z - e)) / (2 * e);
  return 1 / Math.sqrt(1 + gx * gx + gz * gz) >= WALKABLE_NY;
}
/** The height a player stands at in the bare world at (x, z), or undefined: walkable ground, or the sea's surface. */
export function footing(x: number, z: number) {
  const g = ground(x, z);
  return g < SEA ? SEA : walkable(x, z) ? g : undefined;
}
/** A train's highest top every NEAR m along every drawn track, Place-local: a footing a player rides anywhere along it. */
const roofs = drawnTracks().flatMap((t) =>
  t.pts.slice(1).flatMap((b, n) => {
    const a = t.pts[n]!,
      parts = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / NEAR));
    return Array.from({ length: parts }, (_, k) => ({
      x: a.x + ((b.x - a.x) * k) / parts - ORIGIN.x,
      z: a.z + ((b.z - a.z) * k) / parts - ORIGIN.z,
      y: a.y + ((b.y - a.y) * k) / parts + TRAIN_TOP,
      roof: true,
    }));
  }),
);
/** Every footing within `r` m of (x, z), `step` m apart, and every train roof within it. */
function footingsAround(x: number, z: number, r: number, step: number) {
  const out: { x: number; z: number; y: number; roof?: boolean }[] = roofs.filter(
    (q) => Math.abs(q.x - x) <= r && Math.abs(q.z - z) <= r && Math.hypot(q.x - x, q.z - z) <= r,
  );
  for (let dx = -r; dx <= r + 1e-9; dx += step)
    for (let dz = -r; dz <= r + 1e-9; dz += step) {
      if (Math.hypot(dx, dz) > r + 1e-9) continue;
      const y = footing(x + dx, z + dz);
      if (y !== undefined) out.push({ x: x + dx, z: z + dz, y });
    }
  return out;
}

type V = readonly [number, number, number];
const sub = (a: V, b: V) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as const;
type Top = { piece: number; solid: number; at: V };

/** Every unburied point of a piece's faces a player could stand on, SAMPLE m apart. */
function standableTops(p: Placement, piece: number): Top[] {
  const out: Top[] = [];
  for (const [solid, box] of solidBoxes(p).entries()) {
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
        const outward = sub(at(0, 0), centre);
        if (normal[0]! * outward[0] + normal[1]! * outward[1] + normal[2]! * outward[2] < 0)
          normal = normal.map((v) => -v);
        if (normal[1]! / Math.hypot(...normal) < WALKABLE_NY) continue; // too steep to stand on: no top
        const sa = Math.max(1, Math.ceil(Math.hypot(...ta) / SAMPLE)),
          sb = Math.max(1, Math.ceil(Math.hypot(...tb) / SAMPLE));
        for (let i = 0; i <= sa; i++)
          for (let j = 0; j <= sb; j++) {
            const q = at((2 * i) / sa - 1, (2 * j) / sb - 1);
            if (q[1] >= ground(q[0], q[2]) - 0.05) out.push({ piece, solid, at: q }); // else buried
          }
      }
  }
  return out;
}

/** The pieces of a set that offer a new way up, each with its first offending point and why. */
export function standingProblems(placements: readonly Placement[]): { id: string; message: string }[] {
  const tops = placements.map(standableTops);
  // The footings near each piece, once: its tops' extent and REACH m round it.
  const near = tops.map((list) => {
    if (!list.length) return [];
    const xs = list.map((t) => t.at[0]),
      zs = list.map((t) => t.at[2]);
    const span = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;
    return footingsAround(
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...zs) + Math.max(...zs)) / 2,
      span + REACH,
      NEAR,
    );
  });
  const across = (a: V, o: { x: number; z: number }) => Math.hypot(o.x - a[0], o.z - a[2]);
  // A top a player reaches from the ground: two jumps or less over a lower footing within REACH m, or under a train's
  // roof within REACH m and no more than two jumps under its rail (a drop off a passing train).
  const grounded = tops.flatMap((list, n) =>
    list.filter((t) =>
      near[n]!.some(
        (f) =>
          across(t.at, f) <= REACH &&
          ((f.y <= t.at[1] && t.at[1] - f.y <= TWO_JUMPS) ||
            (f.roof && f.y > t.at[1] && f.y - TRAIN_TOP - t.at[1] <= TWO_JUMPS)),
      ),
    ),
  );
  const problems: { id: string; message: string }[] = [];
  for (const [n, p] of placements.entries()) {
    const failing = tops[n]!.filter(({ at: q }) => {
      // (a) flush
      if (footingsAround(q[0], q[2], PLAYER_R, AROUND).some((f) => Math.abs(q[1] - f.y) <= STEP)) return false;
      // (b) out of reach of the lower footings and of the lower tops a player reaches from the ground
      const lower = [
        ...near[n]!.filter((f) => f.y < q[1] && across(q, f) <= REACH).map((f) => f.y),
        ...grounded
          .filter((t) => t.piece !== n && t.at[1] < q[1] && across(q, { x: t.at[0], z: t.at[2] }) <= REACH)
          .map((t) => t.at[1]),
      ];
      return !lower.every((h) => q[1] - h > TWO_JUMPS);
    });
    if (!failing.length) continue;
    // (c) a low perch: its highest top within one jump of the highest footing within PERCH m of its tops.
    const highest = Math.max(...failing.map((t) => t.at[1]));
    const footed = near[n]!.filter((f) => f.y <= highest && tops[n]!.some((t) => across(t.at, f) <= PERCH));
    if (footed.length && highest - Math.max(...footed.map((f) => f.y)) <= MOVER.jumpHeight) continue;
    const worst = failing.find((t) => t.at[1] === highest)!;
    problems.push({
      id: p.id,
      message: `${p.id} (${p.prefab}, solid ${worst.solid}) offers a new way up at (${worst.at.map((v) => v.toFixed(2)).join(', ')}): not flush, within two jumps of ground or a reachable top, and more than a jump over the ground beside it`,
    });
  }
  return problems;
}
