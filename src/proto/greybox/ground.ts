// What stands under a point of the greybox map, and how high a station's deck is: today's Home terrain, the classic
// island, Ring Island's cones, and each new land's `top` from the map JSON. Local metres (x east, z south).
import { groundHeight } from '../../island/heights.ts';
import { HALF } from '../../constants.ts';
import { FAR, ORIGIN } from '../place/layout.ts';
import { H, insidePlace } from '../place/terrain.ts';
import { inside, type Layout, type Line, type XZ } from './map-data.ts';

export const SEA_BED = -10;
/** A land without `top` in the JSON: low and walkable. */
const DEFAULT_TOP = 10;
export const wx = (x: number) => x + ORIGIN.x,
  wz = (z: number) => z + ORIGIN.z;

/** Today's Ring Island cones (src/proto/place/land.ts, buildFar): dx, dz, radius, height. */
export const RING_CONES: [number, number, number, number][] = [
  [0, 0, 340, 70],
  [-170, 60, 170, 120],
  [190, 30, 190, 95],
  [40, -90, 130, 150],
];
export function ringHeight(x: number, z: number) {
  let best = -Infinity;
  for (const [dx, dz, r, h] of RING_CONES) {
    const d = Math.hypot(x - FAR.x - dx, z - FAR.z - dz);
    if (d < r) best = Math.max(best, h - 4 - (h * d) / r);
  }
  return best;
}

export type Ground = ReturnType<typeof createGround>;
export function createGround(map: Layout) {
  const lands = map.land.filter((g) => g.id !== 'home-land' && g.id !== 'ring-land' && !g.existing && !g.horizon);
  const topOf = (g: (typeof lands)[number]) => g.top ?? DEFAULT_TOP;
  /** The highest new land's top over a point, or null over open sea. */
  function landTop(x: number, z: number) {
    let top: number | null = null;
    for (const g of lands) if (inside([x, z], g.outline)) top = Math.max(top ?? -Infinity, topOf(g));
    return top;
  }
  function groundAt(x: number, z: number) {
    const gx = wx(x),
      gz = wz(z);
    if (insidePlace(gx, gz)) return H(gx, gz);
    let h = Math.max(landTop(x, z) ?? SEA_BED, ringHeight(x, z));
    if (Math.abs(gx) < HALF && Math.abs(gz) < HALF) h = Math.max(h, groundHeight(gx, gz));
    return h;
  }
  /** A station's deck: the top of the land it stands on (the JSON's `on`), else the ground under it. */
  function deckOf(placeId: string, at: XZ) {
    const on = lands.filter((g) => g.on?.includes(placeId) && inside(at, g.outline));
    if (on.length) return Math.max(...on.map(topOf));
    // its own lands that stand right by it (the stack's two halves, not a far islet on the same line)
    const near = (g: (typeof lands)[number]) => g.outline.some((p) => Math.hypot(p[0] - at[0], p[1] - at[1]) < 120);
    const all = lands.filter((g) => g.on?.includes(placeId) && near(g));
    if (placeId === 'ring') return ringHeight(at[0], at[1]) + 1;
    // Stations in a gap between their lands (the split stack) sit at those lands' top, on a bridge.
    if (all.length && landTop(at[0], at[1]) === null) return Math.max(...all.map(topOf));
    return Math.max(groundAt(at[0], at[1]), 2.5) + 0.5;
  }
  /** A line's points with heights (world metres): its ends at their decks, any vertex on a land at its top, linear
   * between, so each original segment is one straight span. Lines built today follow today's ground. */
  function linePath(line: Line, built: boolean): [x: number, y: number, z: number][] {
    if (built) {
      const out: [number, number, number][] = [];
      for (let i = 0; i < line.pts.length - 1; i++) {
        const [ax, az] = line.pts[i]!,
          [bx, bz] = line.pts[i + 1]!;
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 10));
        for (let k = 0; k < n; k++) {
          const x = ax + ((bx - ax) * k) / n,
            z = az + ((bz - az) * k) / n;
          out.push([wx(x), Math.max(groundAt(x, z), 2.5) + 1, wz(z)]);
        }
      }
      const [lx, lz] = line.pts.at(-1)!;
      out.push([wx(lx), Math.max(groundAt(lx, lz), 2.5) + 1, wz(lz)]);
      return out;
    }
    const pts = line.pts;
    const ys: (number | null)[] = pts.map(
      (p, i) =>
        line.heights?.[i] ??
        (i === 0 ? deckOf(line.from, p) : i === pts.length - 1 ? deckOf(line.to, p) : landTop(p[0], p[1])),
    );
    const along = [0];
    for (let i = 1; i < pts.length; i++)
      along.push(along[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
    return pts.map((p, i) => {
      let y = ys[i];
      if (y === null || y === undefined) {
        let a = i - 1,
          b = i + 1;
        while (ys[a] === null) a--;
        while (ys[b] === null) b++;
        y = ys[a]! + ((ys[b]! - ys[a]!) * (along[i]! - along[a]!)) / (along[b]! - along[a]!);
      }
      return [wx(p[0]), y, wz(p[1])];
    });
  }
  return { lands, topOf, landTop, groundAt, deckOf, linePath };
}
