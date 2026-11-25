import type { Placement } from '../../src/prefab/types.ts';
import { SEA_FACE } from '../../src/content/prefabs/terrain.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { r2 as round } from '../../src/math.ts';
import { kitPieceProblems, layCourses, runAlong, type Area, type Kit } from './cliff-kit.ts';
const ground = (x: number, z: number) => H(x + ORIGIN.x, z);
/** A slope dressed in tiers of sea-cliff faces along its contours (owner, 25 November 2026: non-standable kit
 * everywhere; a face's crowned solid offers no top, so faces may cover walkable rock slopes too). `rays` are lines
 * across the slope from its foot, each a start (Place-local x, z) and a unit direction uphill; on each, the first point
 * the ground reaches a tier's `level` is that tier's contour. Consecutive contour points less than 4 m apart make a run;
 * faces go end to end along it (10 m, then 6 m where 10 no longer fits), their foot 1.5 m into it and 0.5 m under the
 * contour, facing downhill. A face that would break a piece rule (the tread, a gated place, a rail) is left out, and
 * so is one whose middle stands in `keepOff` (the walks: nothing of the kit on them). */
export function dressSlope(
  kit: Kit,
  name: string,
  rays: readonly (readonly [number, number, number, number])[],
  levels: readonly number[],
  options: { keepClear?: Area['keepClear']; keepOff?: (x: number, z: number) => boolean; seatEnds?: boolean },
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
        let base = level - 0.5;
        if (options.seatEnds) {
          const half = prefab === 'terrain.sea-face-10' ? 4.8 : 2.8;
          for (const across of [-half, 0, half]) {
            const x = c.x - c.nx * 1.5 + c.nz * across;
            const z = c.z - c.nz * 1.5 - c.nx * across;
            base = Math.min(base, ground(x, z) - 0.4, ground(x - 2.4 * c.nx, z - 2.4 * c.nz) - SEA_FACE);
          }
        }
        const placement: Placement = {
          id: 'trial',
          prefab,
          pos: [round(c.x - c.nx * 1.5), round(base), round(c.z - c.nz * 1.5)],
          rot: [round(yaw), 0, 0],
        };
        if (options.keepOff?.(c.x, c.z) || kitPieceProblems(placement, options.keepClear).length) return;
        kit.place(prefab, placement.pos, placement.rot!, `${name} ${level} m s ${s.toFixed(1)}`);
      });
    }
  }
}
/** Rays `step` m apart along a line from (x0, z0) to (x1, z1), each starting `back` m downhill of it and running uphill
 * along (ux, uz). */
export function raysAlong(x0: number, z0: number, x1: number, z1: number, ux: number, uz: number, back = 8, step = 1) {
  const length = Math.hypot(x1 - x0, z1 - z0);
  return Array.from({ length: Math.floor(length / step) + 1 }, (_, k) => {
    const t = (k * step) / length;
    return [x0 + (x1 - x0) * t - ux * back, z0 + (z1 - z0) * t - uz * back, ux, uz] as const;
  });
}
