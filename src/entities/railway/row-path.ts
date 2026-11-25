// The greybox route's own lines (the ns, bay and cave rows) as the views stand them:
// the catalog row smoothed (the mean of three row points 7.5 m apart, from a table every 5 m, as ./line2-path.ts reads
// the `ring` row), in world metres. One path for the trains' cars, the deck and the sites, so they agree with each
// other and with the sim's platforms (rowSide on the unsmoothed row). Unlike line 2,
// a row's line is its formation's centre: the outward track 2 m to its right going out, the homeward 2 m to its left
// (right-hand running; the platforms' 5.8 m, railway-lines.ts legPlatforms). Pure numbers; no three.js.
import type { LinePoint } from '../../place/layout.ts';
import { RAIL_LINES } from '../../sim/railway-lines.ts';
import { ROW_LINE } from '../../sim/railway-route.ts';
import { WORLD_LINES } from '../../sim/railway-world-lines.ts';
import { lerp, smoothstep } from '../../math-pure.ts';

/** Each track's offset from the row, metres (the outward track +, the homeward -), and each platform's middle (the
 * halts' platform points, railway-lines.ts legPlatforms: 3.8 to 7.8 m off the row). */
export const ROW_TRACK = 2,
  ROW_PLATFORM = 5.8;
/** A crossover's and a stub turnout's length, metres (the sim's 20 m turnout). */
const CROSS = 20,
  TURN = 20;
const STEP = 5;

type RowPath = { line: number; table: Float64Array; len: number };
export const BAY_CUT_END = WORLD_LINES.find((l) => l.id === 'bay')!.legs[0]!.toCm / 100;
/** The bay row's kink at Canopy Town, metres (leg 3's buffers stand 2 m short of it; leg 6 eases it). */
export const CANOPY_KINK = WORLD_LINES.find((l) => l.id === 'bay')!.legs[1]!.toCm / 100;
function build(id: 'ns' | 'bay' | 'cave'): RowPath {
  const r = WORLD_LINES.find((l) => l.id === id)!,
    end = r.fromCm + r.lengthCm;
  const lens = r.pts.slice(1).map((b, i) => Math.hypot(b[0] - r.pts[i]![0], b[1] - r.pts[i]![1]));
  // The row's point `cm` along it, unrounded; past either end the end span runs on straight.
  const at = (cm: number) => {
    let want = Math.min(cm, end) - r.fromCm,
      i = 0;
    while (i < lens.length - 1 && want > lens[i]!) want -= lens[i++]!;
    const a = r.pts[i]!,
      b = r.pts[i + 1]!,
      t = want / lens[i]!,
      past = cm > end ? cm - end : 0,
      ux = (b[0] - a[0]) / lens[i]!,
      uz = (b[1] - a[1]) / lens[i]!;
    return {
      x: a[0] + (b[0] - a[0]) * t + ux * past,
      z: a[1] + (b[1] - a[1]) * t + uz * past,
      y: a[2] + (b[2] - a[2]) * Math.max(0, Math.min(1, t)),
    };
  };
  const len = (r.fromCm + r.lengthCm) / 100,
    n = Math.ceil(len / STEP) + 2,
    table = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const cm = i * STEP * 100;
    let x = 0,
      z = 0,
      y = 0;
    for (const d of [-750, 0, 750]) {
      const p = at(cm + d);
      x += p.x;
      z += p.z;
      y += p.y;
    }
    table.set([x / 300, z / 300, y / 300], i * 3);
  }
  return { line: ROW_LINE[id], table, len };
}
const PATHS: readonly RowPath[] = [build('ns'), build('bay'), build('cave')];
const byLine = new Map(PATHS.map((p) => [p.line, p]));
/** Whether a row line's halt has a second lever, on its homeward platform (railway/halts-view.ts rowSpot): a stub head,
 * and every later halt, which its line may grow past (Bell Rock on the bay line, once leg 3 lays: homeward trains
 * stand at its homeward platform). It stands only once the line runs past the halt. */
export const rowHomewardLever = (h: { stop: number; end?: { kind: string } }) => h.end?.kind === 'stub' || h.stop > 0;
/** Whether sim line `line` is one of the rows drawn here. */
export const isRowLine = (line: number) => byLine.has(line);

const point = (p: RowPath, s: number, out: { x: number; z: number; y: number }) => {
  const T = p.table,
    f = Math.max(0, Math.min(T.length / 3 - 1.001, s / STEP)),
    i = Math.floor(f) * 3,
    t = f - Math.floor(f);
  out.x = T[i]! + (T[i + 3]! - T[i]!) * t;
  out.z = T[i + 1]! + (T[i + 4]! - T[i + 1]!) * t;
  out.y = T[i + 2]! + (T[i + 5]! - T[i + 2]!) * t;
  return out;
};
const before = { x: 0, z: 0, y: 0 },
  after = { x: 0, z: 0, y: 0 },
  here = { x: 0, z: 0, y: 0 };
const pathOf = (line: number) => {
  const p = byLine.get(line);
  if (!p) throw new Error(`row-path: line ${line} is not a greybox row`);
  return p;
};
/** World x, z and heading of `s` metres along row line `line` (the formation's centre). */
export function rowAt(line: number, s: number, out: LinePoint) {
  const p = pathOf(line);
  // The heading is the chord's over the 5 m about `s` (a table row's corner is spread over a car's bogie spacing).
  point(p, s - 2.5, before);
  point(p, s + 2.5, after);
  point(p, s, here);
  const hx = after.x - before.x,
    hz = after.z - before.z,
    len = Math.hypot(hx, hz) || 1;
  out.x = here.x;
  out.z = here.z;
  out.ux = hx / len;
  out.uz = hz / len;
  return out;
}
/** Rail height at `s` metres along row line `line`. */
export const rowY = (line: number, s: number) => point(pathOf(line), s, here).y;
const tmp: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
/** World (x, z) of `lat` metres right (going out) of row line `line`'s centre at `s`. */
export function rowWorld(line: number, s: number, lat: number, out: { x: number; z: number }) {
  rowAt(line, s, tmp);
  out.x = tmp.x - tmp.uz * lat;
  out.z = tmp.z + tmp.ux * lat;
  return out;
}

/** The part of a train row the lateral reads. */
export type RowLatRow = { readonly track: number; readonly origin: number };
/** A turnout or crossover a train swings over: from `from` metres off the row at `s0` to `to` at `s1`. */
export type RowSwing = { s0: number; s1: number; from: number; to: number };
const swingAt = (w: RowSwing, s: number) => lerp(w.from, w.to, smoothstep(w.s0, w.s1, s));
/** The start's crossover (homeward trains cross onto the outward track on their way in), centred on its merge. */
export const rowStartCrossing = (line: number): RowSwing | null => {
  const start = RAIL_LINES[line]!.halts[0]?.end;
  if (!start) return null;
  const c = start.mergeCm / 100;
  return { s0: c - CROSS / 2, s1: c + CROSS / 2, from: ROW_TRACK, to: -ROW_TRACK };
};
/** The way out of an end a homeward train leaves: a head's stub (its terminal track the outward one, merging at
 * `mergeCm`) or the crossover before a destination's platforms, centred on its merge. */
export const rowEndSwing = (end: { kind: string; mergeCm: number }): RowSwing => {
  const m = end.mergeCm / 100;
  return end.kind === 'stub'
    ? { s0: m - TURN, s1: m, from: -ROW_TRACK, to: ROW_TRACK }
    : { s0: m - CROSS / 2, s1: m + CROSS / 2, from: -ROW_TRACK, to: ROW_TRACK };
};
/** The lateral of a train of row line `line` at `s` metres (right-hand running, the views' own: the sim reads only s).
 * Going out it runs on the outward track. Going home it is on the homeward track, after the turnout or crossover of
 * the end it left (a stub's merge at a head, whose terminal track is the outward one; the crossover before Bell Rock's
 * platforms), and it takes the start's crossover on its way in (the Gorge's in the bore, s 70 to 90; the West
 * landing's, s 45 to 65), so it stands at the start's outward platform, which the server judges a departure's lever
 * from (railway-lines.ts haltPlatform), and leaves straight out. The end it left is the one at `origin` (the sim's
 * retained departure stop) or, with none, today's open end. */
export function rowLat(line: number, row: RowLatRow, s: number, stops: readonly number[]) {
  if (!row.track) return ROW_TRACK;
  const halts = RAIL_LINES[line]!.halts,
    start = rowStartCrossing(line);
  if (start && s <= start.s1) return swingAt(start, s);
  const left = row.origin ? halts.findIndex((h, k) => k > 0 && h.end && h.s === row.origin) : -1,
    end = halts[left >= 0 ? left : Math.max(0, stops.length - 1)]?.end;
  return end ? swingAt(rowEndSwing(end), s) : -ROW_TRACK;
}
