// The greybox route's own lines (the `ns` and `bay` rows, docs/plans/greybox-leg2.md, step 4) as the views stand them:
// the catalog row smoothed (the mean of three row points 7.5 m apart, from a table every 5 m, as ./line2-path.ts reads
// the `ring` row), in world metres. One path for the trains' cars, the deck and the sites, so they agree with each
// other and with the sim's platforms (rowSide, on the unsmoothed row: every halt stands on a straight). Unlike line 2,
// a row's line is its formation's centre: the outward track 2 m to its right going out, the homeward 2 m to its left
// (right-hand running; the platforms' 5.8 m, railway-lines.ts legPlatforms). Pure numbers; no three.js.
import type { LinePoint } from '../../place/layout.ts';
import { RAIL_LINES } from '../../sim/railway-lines.ts';
import { ROW_LINE, type RowId } from '../../sim/railway-route.ts';
import { WORLD_LINES } from '../../sim/railway-world-lines.ts';

/** Each track's offset from the row, metres (the outward track +, the homeward -). */
export const ROW_TRACK = 2;
/** A crossover's and a stub turnout's length, metres (the sim's 20 m turnout). */
const CROSS = 20,
  TURN = 20;
const STEP = 5;
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

type RowPath = { line: number; table: Float64Array; len: number };
/** Where a row's drawn path stops and runs on straight, cm along it: the `bay` row at its 52° kink at Bell Rock (t 0,
 * the bay line's buffers), so the smoothing never bends the in half's last metres toward the out half (leg 3 eases the
 * bend and moves this). */
const TRIM: Partial<Record<RowId, number>> = {
  bay: WORLD_LINES.find((l) => l.id === 'bay')!.legs[0]!.toCm,
};
function build(id: 'ns' | 'bay'): RowPath {
  const r = WORLD_LINES.find((l) => l.id === id)!,
    end = TRIM[id] ?? r.fromCm + r.lengthCm;
  const lens = r.pts.slice(1).map((b, i) => Math.hypot(b[0] - r.pts[i]![0], b[1] - r.pts[i]![1]));
  // The row's point `cm` along it, unrounded; past either end (or the trim) the end span runs on straight.
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
const PATHS: readonly RowPath[] = [build('ns'), build('bay')];
const byLine = new Map(PATHS.map((p) => [p.line, p]));
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
/** `from` to `to` over [a, b], eased. */
const swing = (s: number, a: number, b: number, from: number, to: number) => from + (to - from) * ease((s - a) / (b - a));
/** The lateral of a train of row line `line` at `s` metres (right-hand running, the views' own: the sim reads only s).
 * Going out it runs on the outward track; at the line's start it stood on the homeward one (the arriving train runs
 * straight in) and takes the start's crossover out (the Gorge's in the bore, s 70 to 90; the West landing's, s 45 to
 * 65). Going home it is on the homeward track, after the turnout or crossover of the end it left: a stub's merge at a
 * head (the terminal track is the outward one), the crossover before Bell Rock's platforms. The end it left is the one
 * at `origin` (the sim's retained departure stop) or, with none, today's open end. */
export function rowLat(line: number, row: RowLatRow, s: number, stops: readonly number[]) {
  const halts = RAIL_LINES[line]!.halts;
  if (!row.track) {
    const start = halts[0]!.end;
    if (!start) return ROW_TRACK;
    const c = start.mergeCm / 100;
    return swing(s, c - CROSS / 2, c + CROSS / 2, -ROW_TRACK, ROW_TRACK);
  }
  const left = row.origin ? halts.findIndex((h, k) => k > 0 && h.end && h.s === row.origin) : -1,
    end = halts[left >= 0 ? left : Math.max(0, stops.length - 1)]?.end;
  if (!end) return -ROW_TRACK;
  const m = end.mergeCm / 100;
  return end.kind === 'stub'
    ? swing(s, m - TURN, m, -ROW_TRACK, ROW_TRACK)
    : swing(s, m - CROSS / 2, m + CROSS / 2, -ROW_TRACK, ROW_TRACK);
}
