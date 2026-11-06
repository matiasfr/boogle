// Local support footprints shared by placement and the offline grounding audit. Metres, world X/Z.
import { surfaceHeight } from './terrain.ts';
export type Footprint = readonly (readonly [number, number])[];
export const SUPPORT_SPACING = 0.25;
export function boxFootprint(x: number, z: number, w: number, d: number, yaw = 0): Footprint {
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => {
    const dx = (a! * w) / 2,
      dz = (b! * d) / 2;
    return [x + dx * c + dz * s, z - dx * s + dz * c] as const;
  });
}
export function sampleFootprint(footprint: Footprint, height = surfaceHeight) {
  if (footprint.length < 3) throw new Error('A support footprint needs at least three vertices');
  let low = Infinity,
    high = -Infinity,
    samples = 0;
  // Fan triangles include every edge; spacing is bounded in both barycentric directions.
  const a = footprint[0]!;
  for (let k = 1; k < footprint.length - 1; k++) {
    const b = footprint[k]!,
      c = footprint[k + 1]!;
    const n = Math.ceil(
      Math.max(
        Math.hypot(b[0] - a[0], b[1] - a[1]),
        Math.hypot(c[0] - a[0], c[1] - a[1]),
        Math.hypot(c[0] - b[0], c[1] - b[1]),
      ) / SUPPORT_SPACING,
    );
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n - i; j++) {
        const y = height(
          a[0] + ((b[0] - a[0]) * i) / n + ((c[0] - a[0]) * j) / n,
          a[1] + ((b[1] - a[1]) * i) / n + ((c[1] - a[1]) * j) / n,
        );
        low = Math.min(low, y);
        high = Math.max(high, y);
        samples++;
      }
  }
  if (!Number.isFinite(low) || !Number.isFinite(high)) throw new Error('Invalid support footprint');
  return { low, high, samples };
}
export type RootTree = { x: number; z: number; size: number; hardwood: boolean; great: boolean };
// These are the actual lower cylinder rings, including the hardwood/great-tree radial relief.
export function treeFootprint(t: RootTree): Footprint {
  const count = t.great ? 16 : t.hardwood ? 12 : 6;
  return Array.from({ length: count }, (_, k) => {
    const angle = (k * 2 * Math.PI) / count;
    const x = Math.sin(angle),
      z = Math.cos(angle);
    const relief = t.great
      ? 0.7 + 0.3 * Math.cos(Math.atan2(z, x) * 8)
      : t.hardwood
        ? 1 + 0.13 * Math.cos(Math.atan2(z, x) * 6)
        : 1;
    const radius = (t.great ? 1.5 : t.hardwood ? 0.95 : 0.46) * t.size * relief;
    return [t.x + x * radius, t.z + z * radius] as const;
  });
}
export function treeSeat(t: RootTree) {
  const footprint = treeFootprint(t);
  const ground = sampleFootprint(footprint);
  const top = surfaceHeight(t.x, t.z);
  return { footprint, bottom: ground.low - 0.02, top, burial: Math.max(0, ground.high - top) };
}
