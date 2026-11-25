// The cliff kit's shore (docs/plans/cliff-kit-everywhere.md, step 1; generated as
// `content/built/levels/cliff-kit-shore.json` by dev/prefab/cliff-kit.ts): what a new player meets first. The cove's
// sculpted face is gone (owner, 24 November: "Replace with kit faces"); its bluff is ground now (src/place/cove.ts
// coveBluff), so the walk up its beachward end is ground and never a kit top, and the kit stands over the bluff's front
// and the shore climb's wall (census wall 9) as scenery with box solids, laid by runs along them. Its rules beyond the
// kit's own:
// - Nothing on the walk: the bluff's walkable end (z 36 to 50, its west flank to the beach included) stays bare ground.
//   (A low face on that flank snagged a controller walking up the end's west edge: it is left bare.)
// - Tops are flush with the ground behind them, so the bluff's top walk runs on over a face's top a step at most.
// - Shore rocks stand in the water at the faces' foot, low and dark, where the old cove's three boulders stood.
// - The shore hop (src/place/shore-layout.ts SHORE_HOP) keeps its place and solid; it is not a kit piece.
import type { Placement, Vec3 } from '../../src/prefab/types.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { coveEdge } from '../../src/place/cove.ts';
import { SHORE_HOP, SHORE_LANDING } from '../../src/place/shore-layout.ts';
import { SEA_FACE, SHORE_ROCK } from '../../src/content/prefabs/terrain.ts';
import { r2 as round } from '../../src/math.ts';
import { kitPieceProblems, layAlong, layCourses, runAlong, type Area, type Key, type Kit } from './cliff-kit.ts';

const ground = (x: number, z: number) => H(x + ORIGIN.x, z);
/** How far back from its front a face's top reaches (its slab's depth and lean), m: where its top meets the ground. */
const TOP_BACK = 2.4;
/** A face's top over its origin: its slab's top, which leans a little higher at the front (the record's box). */
const TOP: Partial<Record<Key, number>> = {
  'terrain.sea-face-6': SEA_FACE,
  'terrain.sea-face-10': SEA_FACE,
};

function put(kit: Kit, prefab: Key, x: number, y: number, z: number, yaw: number, where: string) {
  const pos: Vec3 = [round(x), round(y), round(z)];
  kit.place(prefab, pos, [round(yaw), 0, 0], where);
}

/** The bluff's front, along coveEdge from the end of its walkable end to where it tucks under the beach. */
const BLUFF = runAlong(Array.from({ length: 21 }, (_, k): [number, number] => [coveEdge(49 + k), 49 + k]));
/** A slope dressed in tiers of sea-cliff faces along its contours (owner, 25 November 2026: non-standable kit
 * everywhere; a face's crowned solid offers no top, so faces may cover walkable rock slopes too). `rays` are lines
 * across the slope from its foot, each a start (Place-local x, z) and a unit direction uphill; on each, the first point
 * the ground reaches a tier's `level` is that tier's contour. Consecutive contour points less than 4 m apart make a run;
 * faces go end to end along it (10 m, then 6 m where 10 no longer fits), their foot SET_IN m into it and 0.5 m under the
 * contour, facing downhill. A face that would break a piece rule (the tread, a gated place, a rail) is left out, and
 * so is one whose middle stands in `keepOff` (the walks: nothing of the kit on them). */
function dressSlope(
  kit: Kit,
  name: string,
  rays: readonly (readonly [number, number, number, number])[],
  levels: readonly number[],
) {
  for (const level of levels) {
    const runs: { x: number; z: number; ux: number; uz: number }[][] = [[]];
    for (const [x0, z0, ux, uz] of rays) {
      let d = 0;
      while (d < 30 && ground(x0 + ux * d, z0 + uz * d) < level) d += 0.25;
      const run = runs[runs.length - 1]!;
      const last = run[run.length - 1];
      const point = d < 30 ? { x: x0 + ux * d, z: z0 + uz * d, ux, uz } : undefined;
      if (!point || (last && Math.hypot(point.x - last.x, point.z - last.z) > 4)) runs.push([]);
      if (point) runs[runs.length - 1]!.push(point);
    }
    for (const points of runs) {
      if (points.length < 2) continue;
      const run = runAlong(points.map((q) => [q.x, q.z] as const));
      // The run's left normal faces downhill when it points against the rays.
      const n = run.at(run.length / 2);
      const side = n.nx * points[0]!.ux + n.nz * points[0]!.uz < 0 ? 1 : -1;
      layCourses(run, side, (prefab, c, yaw, s) => {
        const placement: Placement = {
          id: 'trial',
          prefab,
          pos: [round(c.x - c.nx * SET_IN), round(level - 0.5), round(c.z - c.nz * SET_IN)],
          rot: [round(yaw), 0, 0],
        };
        if (keepOff(c.x, c.z) || kitPieceProblems(placement, shore.keepClear).length) return;
        kit.place(prefab, placement.pos, placement.rot!, `${name} ${level} m s ${s.toFixed(1)}`);
      });
    }
  }
}
/** Rays `step` m apart along a line from (x0, z0) to (x1, z1), each starting `back` m downhill of it and running uphill
 * along (ux, uz). */
function raysAlong(x0: number, z0: number, x1: number, z1: number, ux: number, uz: number, back = 8, step = 1) {
  const length = Math.hypot(x1 - x0, z1 - z0);
  return Array.from({ length: Math.floor(length / step) + 1 }, (_, k) => {
    const t = (k * step) / length;
    return [x0 + (x1 - x0) * t - ux * back, z0 + (z1 - z0) * t - uz * back, ux, uz] as const;
  });
}
/** The walks the kit keeps off: the bluff's walkable end and its flank down to the sand, and the landing's level pad. */
/** How far into the slope a tier face stands from its contour, m: its back buried, so no trough behind it walls a
 * player in (the area audit's reverse flood found pockets at 0.5 m). */
const SET_IN = 1.5;
const keepOff = (x: number, z: number) =>
  (x > -203 && x < -188 && z > 32 && z < 50) || Math.hypot(x - SHORE_LANDING.x, z - SHORE_LANDING.z) < 14;

export const shore: Area = {
  id: 'shore',
  // Census wall 9 (the shore climb). The bluff's front is the area's own: too narrow a strip of the ground for the census.
  walls: [[-186, -8]],
  // The landing, the end of its timber stage, the board at the shore path's foot (src/content/levels/leg2.ts
  // west.board) and the shore hop's rock.
  keepClear: [
    [SHORE_LANDING.x, SHORE_LANDING.z],
    [SHORE_LANDING.x - 19, SHORE_LANDING.z],
    [-195, 20.5],
    [SHORE_HOP.x, SHORE_HOP.z + 7],
  ],
  // The cove's water, its beach and the landing's, and the climb: every swimmer who gets back to a tread bare still
  // does with the kit in.
  stranded: { x: -190, z: 30, half: 55 },
  dress(kit) {
    // Sea-cliff faces along the bluff's front, their foot 1 m out over the beach, their tops flush with the bluff's top
    // behind them. Run from the south (z 49): the sea is on the run's left.
    layAlong(
      BLUFF,
      0,
      [
        ['terrain.sea-face-6', 6],
        ['terrain.sea-face-10', 10],
        ['terrain.sea-face-6', 6],
      ],
      -0.3,
      1,
      (prefab, c, yaw, s) => {
        const x = c.x + c.nx,
          z = c.z + c.nz;
        const top = ground(x - c.nx * TOP_BACK, z - c.nz * TOP_BACK);
        put(kit, prefab, x, top - TOP[prefab]! + 0.05, z, yaw, `bluff s ${s.toFixed(1)}`);
      },
    );
    // The corner where the bluff's front turns in and tucks under the beach: its west leg on from the faces, its south
    // leg facing the beach beyond.
    {
      const x = coveEdge(70.5) - 1.6,
        z = 71;
      put(kit, 'terrain.sea-corner', x, ground(x + 2.4, z - 2.4) - SEA_FACE + 0.05, z, -Math.PI / 2, 'bluff corner');
    }
    // Shore rocks in the water off the faces' foot, where the old cove's boulders stood, low and dark.
    for (const [prefab, z, out, turn] of [
      ['terrain.shore-rock-l', 52, 3.6, 0.4],
      ['terrain.shore-rock-m', 57.5, 3.4, -0.5],
      ['terrain.shore-rock-s', 61, 3.2, 1.1],
      ['terrain.shore-rock-m', 64.5, 3.5, 0.2],
      ['terrain.shore-rock-s', 68, 3.4, -0.9],
    ] as const) {
      const x = coveEdge(z) - out;
      const height = SHORE_ROCK[prefab][1];
      put(
        kit,
        prefab,
        x,
        Math.max(ground(x, z) - 0.15 * height, 0.25 - 0.88 * height),
        z,
        -Math.PI / 2 + turn,
        `bluff rock z ${z}`,
      );
    }
    // The shore's rock slopes, in tiers: the shore climb's wall (census wall 9) seen head on from the landing, its
    // part beside the climb, the pocket's east wall behind the board, the hill behind the bluff and the slope beyond it.
    const tiers = (from: number, to: number) =>
      Array.from({ length: Math.floor((to - from) / 3) + 1 }, (_, k) => from + 3 * k);
    dressSlope(kit, 'climb wall', raysAlong(-189, -16, -189, 2, 1, 0), tiers(4, 13));
    dressSlope(kit, 'climb side', raysAlong(-186, 2, -174, 17, 0.78, -0.63), tiers(7, 13));
    dressSlope(kit, 'pocket wall', raysAlong(-189, 25, -189, 44, 1, 0), tiers(-1, 8));
    dressSlope(kit, 'bluff hill', raysAlong(-184, 46, -184, 72, 1, 0, 2), tiers(6, 15));
    dressSlope(kit, 'south slope', raysAlong(-190, 74, -190, 86, 1, 0), tiers(1, 13));
  },
};
