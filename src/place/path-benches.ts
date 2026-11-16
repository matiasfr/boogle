// Terrain-clean's local bench profiles. Keep the planted catalog's original PATHS and bridge endpoints;
// the later ground cut and its paint share these eased profiles, after catalog capture.
import { PATHS, type Pt } from './layout.ts';
import { SHORE_PATH } from './shore-layout.ts';

/** Flat run-ins/out at a bend, on the original centre line. Distances are metres either side of that waypoint. */
function landings(pts: Pt[], distances: number[]): Pt[] {
  return pts.flatMap((p, i) => {
    const distance = distances[i] ?? 0;
    const near = (q: Pt): Pt => {
      const t = distance / Math.hypot(q[0] - p[0], q[1] - p[1]);
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2]];
    };
    return [
      ...(distance && i > 0 ? [near(pts[i - 1]!)] : []),
      p,
      ...(distance && i + 1 < pts.length ? [near(pts[i + 1]!)] : []),
    ];
  });
}

const quarry = PATHS[1]!;
// Level corners and bridge run-ins keep the 2 m grid's triangles from twisting across the 4 m tread.
export const QUARRY_WEST_BENCH = landings(quarry.pts.slice(4, quarry.bridgeAt + 1), [0, 4, 4, 3, 8]);
export const QUARRY_EAST_BENCH = landings(quarry.pts.slice(quarry.bridgeAt + 1, 13), [8, 7, 4, 0]);
// Three metres either side of the shore bends, including the existing hop's 14 m datum.
export const SHORE_BENCH = landings(SHORE_PATH, [0, 0, 3, 3]);
