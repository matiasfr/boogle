// No new way up (docs/plans/cliff-kit-everywhere.md, step 0's audit): Place's own flood does not read prop solids, so an
// area's kit pieces get their own. Over a fine grid round the area, the ground the game builds stands with every piece's
// solids on it (each column's height is the highest solid over it), and is flooded twice with the controller's limits
// (./flood.ts, MOVER: slope, jump, fall, swim), from every tread cell in the window and every cell of deep water (a
// swimmer reaches the sea from anywhere):
// - freely, climbing anything;
// - with the kit as no climbing aid: a player may fall onto a piece, walk along it (rising at most STEP, the clearance
//   helper's small step: a slab's top is not level), and hop onto one from ground (or water) they reached without
//   climbing a piece, but never step up from a piece.
// A cell a player can stand on (bare ground: a walkable quad beside it; over a piece: its highest solid is a box's top
// face, and that face is walkable, so a slab's steep front, binned onto the grid, is no ledge) that the free flood reaches is a new way up when the second
// does not reach it (somewhere a player gets only by climbing the kit), or reaches it only SHORTCUT m or more of steps
// farther round (climbing the kit is a short cut up a wall to ground reached another way). A boulder you can hop onto
// passes; a staircase up a wall, or a boulder that lifts you onto a ledge, fails; a ledge on a face's top you can only
// drop onto from a rim you already reach passes. Starting only from the window's treads is strict: ground reached by a
// route outside the window counts as new if, inside it, the kit is the only way there.
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { solidBoxes, solidSamples } from '../prefab/cliff-kit.ts';
import { WALKABLE_NY } from '../../src/constants.ts';
import { hops, standable } from './flood.ts';
import { MOVER } from './mover.ts';
import { STEP } from '../../src/place/clearance.ts';

/** Grid spacing, m, how far past the pieces' solids the window reaches, and the shortest route the kit may not cut, m
 * of steps (a diagonal step counts as one). */
const CELL = 0.5,
  MARGIN = 16,
  SHORTCUT = 10;

export type Reach = { cells: number; fresh: { x: number; z: number; y: number; saved: number | null }[] };

/** The cells only the kit reaches, over a window round `placements`' solids. */
export function kitReach(placements: readonly Placement[]): Reach {
  const samples = placements.map((p) => [...solidSamples(p, CELL / 2)]);
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const list of samples)
    for (const [x, , z] of list) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  x0 -= MARGIN;
  z0 -= MARGIN;
  const n = Math.ceil(Math.max(x1 + MARGIN - x0, z1 + MARGIN - z0) / CELL) + 1;
  // Node (i, j) is Place-local (x0 + i CELL, z0 + j CELL), at i * n + j.
  const bare = new Float32Array(n * n),
    kit = new Float32Array(n * n);
  const starts: number[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = x0 + i * CELL,
        z = z0 + j * CELL,
        k = i * n + j;
      bare[k] = kit[k] = H(x + ORIGIN.x, z);
      if (pathAt(x, z).edge <= 0 || bare[k]! < -MOVER.wade) starts.push(k);
    }
  for (const list of samples)
    for (const [x, y, z] of list) {
      const i = Math.round((x - x0) / CELL),
        j = Math.round((z - z0) / CELL);
      if (i >= 0 && j >= 0 && i < n && j < n) kit[i * n + j] = Math.max(kit[i * n + j]!, y);
    }
  // The walkable top faces' heights, sampled as the volumes are.
  const tops = new Float32Array(n * n).fill(-Infinity);
  for (const p of placements)
    for (const box of solidBoxes(p)) {
      const o = box(0, 0, 0),
        up = box(0, 1, 0);
      const ny = (up[1] - o[1]) / Math.hypot(up[0] - o[0], up[1] - o[1], up[2] - o[2]);
      if (ny < WALKABLE_NY) continue;
      const su = Math.max(1, Math.ceil((4 * box.half[0]) / CELL)),
        sw = Math.max(1, Math.ceil((4 * box.half[2]) / CELL));
      for (let a = 0; a <= su; a++)
        for (let b = 0; b <= sw; b++) {
          const [x, y, z] = box((2 * a) / su - 1, 1, (2 * b) / sw - 1);
          const i = Math.round((x - x0) / CELL),
            j = Math.round((z - z0) / CELL);
          if (i >= 0 && j >= 0 && i < n && j < n) tops[i * n + j] = Math.max(tops[i * n + j]!, y);
        }
    }
  const grid = { n, cell: CELL, h: kit };
  const piece = (k: number) => kit[k]! > bare[k]! + 0.01;
  const stand = standable(grid, MOVER).map((g, k) => (piece(k) ? (tops[k]! >= kit[k]! - 0.05 ? 1 : 0) : g));
  const free = hops(grid, MOVER, starts, { swim: true, stand });
  const unaided = hops(grid, MOVER, starts, {
    swim: true,
    stand,
    climbs: (from, to) => !piece(from) || kit[to]! - kit[from]! <= STEP,
  });
  const fresh: Reach['fresh'] = [];
  for (let k = 0; k < n * n; k++) {
    if (free[k]! < 0 || !stand[k]) continue;
    const saved = unaided[k]! < 0 ? null : (unaided[k]! - free[k]!) * CELL;
    if (saved === null || saved >= SHORTCUT) {
      const i = Math.floor(k / n);
      fresh.push({ x: x0 + i * CELL, z: z0 + (k - i * n) * CELL, y: kit[k]!, saved });
    }
  }
  return { cells: n * n, fresh };
}
