// Ring Island's land as Place draws it today (src/proto/place/land.ts, buildFar): four cones and the height of their
// surface. Pure, no Vite-only imports, so node tests (test/railway-ring-layout.test.ts), the level report
// (dev/level/ring.ts) and the greybox (./ground.ts) read the same formula. Local metres (x east, z south).
import { FAR } from '../place/layout.ts';

/** Today's Ring Island cones: dx, dz, radius, height. */
export const RING_CONES: [number, number, number, number][] = [
  [0, 0, 340, 70],
  [-170, 60, 170, 120],
  [190, 30, 190, 95],
  [40, -90, 130, 150],
];
/** The cones' surface height at local (x, z), -Infinity where none stands. */
export function ringHeight(x: number, z: number) {
  let best = -Infinity;
  for (const [dx, dz, r, h] of RING_CONES) {
    const d = Math.hypot(x - FAR.x - dx, z - FAR.z - dz);
    if (d < r) best = Math.max(best, h - 4 - (h * d) / r);
  }
  return best;
}
