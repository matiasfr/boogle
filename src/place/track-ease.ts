// Easing a parallel track round a bend. No three.js; Place data, read by the views and the client's train poses only.
// A track drawn a fixed distance inside a line's bend turns on a smaller radius than the line: 4 m inside the
// Quarry's 6.5 m bend, the up track was a bend of under 3 m (owner, 14 November: "on certain stops, especially with
// curves, the train car clips the train engine"). Here the track keeps its offset on the straights and takes the
// corner wider: it starts turning earlier and finishes later, bowing a little further from the line through the
// bend, so its radius is no tighter than `minR`.
//
// The eased track is one curve, handed out as a lateral offset per metre of the line in the two ways the line's
// heading is read (layout.ts): `stepped`, for `lineAt`, whose heading steps at each metre point (rails, bed, crossing:
// fixed things), and `smooth`, for `lineSmoothAt`, whose heading turns through the point (trains). Both put their
// points on the same curve. The stepped table is kept per metre span of the line, each end of a span with that span's
// own heading: one table read across a metre point mixed two headings' offsets and bent the track between samples
// (review, 14 November: a 5.6 m radius at 0.05 m steps where 0.25 m steps read 10 m).
export type XZ = { x: number; z: number };
/** A point of the line and a unit heading at `s`. */
export type LineAt = (s: number, out: { x: number; z: number; ux: number; uz: number }) => unknown;
export type Eased = {
  from: number;
  to: number;
  /** Offsets along the stepped heading: for each metre span from `from`, at its quarters, start to end. */
  stepped: number[][];
  /** Offsets along the smooth heading, every quarter metre from `from`. */
  smooth: number[];
};

const STEP = 0.25,
  PER = 4;
/** The radius through three points (Infinity on a straight). */
function radius(a: XZ, b: XZ, c: XZ) {
  const ab = Math.hypot(b.x - a.x, b.z - a.z),
    bc = Math.hypot(c.x - b.x, c.z - b.z),
    ca = Math.hypot(a.x - c.x, a.z - c.z);
  const area = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / 2;
  return area < 1e-9 ? Infinity : (ab * bc * ca) / (4 * area);
}
/** The tightest radius of a path, measured over points about `span` m apart either side of each of its points. */
export function tightest(path: readonly XZ[], span = 1) {
  let least = Infinity;
  for (let i = 1; i < path.length - 1; i++) {
    let a = i,
      c = i;
    while (a > 0 && Math.hypot(path[a]!.x - path[i]!.x, path[a]!.z - path[i]!.z) < span) a--;
    while (c < path.length - 1 && Math.hypot(path[c]!.x - path[i]!.x, path[c]!.z - path[i]!.z) < span) c++;
    if (Math.hypot(path[a]!.x - path[i]!.x, path[a]!.z - path[i]!.z) < span) continue;
    if (Math.hypot(path[c]!.x - path[i]!.x, path[c]!.z - path[i]!.z) < span) continue;
    least = Math.min(least, radius(path[a]!, path[i]!, path[c]!));
  }
  return least;
}
const p = { x: 0, z: 0, ux: 0, uz: 1 };
/** Where the normal at `s` (the heading `line` gives there, the point `at` gives) meets the path nearest `lat`. */
function meet(path: readonly XZ[], line: LineAt, s: number, at: number, lat: number) {
  line(s, p);
  const nx = -p.uz,
    nz = p.ux;
  line(at, p);
  let best = lat,
    miss = Infinity;
  for (let j = 1; j < path.length; j++) {
    const a = path[j - 1]!,
      b = path[j]!;
    const ex = b.x - a.x,
      ez = b.z - a.z,
      den = nx * ez - nz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a.x - p.x) * ez - (a.z - p.z) * ex) / den, // along the normal
      u = ((a.x - p.x) * nz - (a.z - p.z) * nx) / den; // along the segment
    if (u < -1e-6 || u > 1 + 1e-6) continue;
    if (Math.abs(t - lat) < miss) {
      miss = Math.abs(t - lat);
      best = t;
    }
  }
  return best;
}
/**
 * A track that runs `lat` m beside the line at `from` and `to` (whole metres of the line, whose spans are a metre) and
 * nowhere between turns tighter than `minR`, as offsets along each heading (above). `stepped` and `smooth` give the
 * line's point with its stepped and its smooth heading. Null when the plain offset already holds `minR`.
 */
export function easeBend(
  stepped: LineAt,
  smooth: LineAt,
  from: number,
  to: number,
  lat: number,
  minR: number,
): Eased | null {
  const n = Math.round((to - from) / STEP) + 1;
  // The plain offset, along the smooth heading: one unbroken curve, its points in order.
  const plain: XZ[] = [];
  for (let i = 0; i < n; i++) {
    smooth(from + i * STEP, p);
    plain.push({ x: p.x - p.uz * lat, z: p.z + p.ux * lat });
  }
  if (tightest(plain) >= minR) return null;
  // Evenly spaced along the track (the plain offset bunches its points inside the bend), then relaxed with its ends
  // held: each pass moves a point halfway to the middle of its neighbours, which widens the corner a little.
  const dense: XZ[] = [];
  let gone = 0,
    next = 0;
  for (let i = 1; i < n; i++) {
    const a = plain[i - 1]!,
      b = plain[i]!,
      seg = Math.hypot(b.x - a.x, b.z - a.z);
    for (; next < gone + seg; next += STEP) {
      const t = (next - gone) / seg;
      dense.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
    gone += seg;
  }
  dense.push({ ...plain[n - 1]! });
  const hold = Math.round(2 / STEP); // the first and last 2 m stay on the plain offset
  for (let pass = 0; pass < 4000 && tightest(dense) < minR * 1.05; pass++)
    for (let sweep = 0; sweep < 8; sweep++)
      for (let i = hold; i < dense.length - hold; i++) {
        const a = dense[i - 1]!,
          b = dense[i]!,
          c = dense[i + 1]!;
        b.x += ((a.x + c.x) / 2 - b.x) * 0.5;
        b.z += ((a.z + c.z) / 2 - b.z) * 0.5;
      }
  // Back to offsets a metre of the line: where each heading's normal meets the relaxed track.
  const out: Eased = { from, to, stepped: [], smooth: [] };
  for (let i = 0; i < n; i++) out.smooth.push(meet(dense, smooth, from + i * STEP, from + i * STEP, lat));
  for (let k = from; k < to; k++) {
    const span: number[] = [];
    // The span's own heading, read at its middle, at each of its quarters.
    for (let q = 0; q <= PER; q++) span.push(meet(dense, stepped, k + 0.5, k + q / PER, lat));
    out.stepped.push(span);
  }
  return out;
}
/** The eased offset at `s` along the stepped heading (`lineAt`), or `lat` outside the stretch. */
export function easedAt(e: Eased, s: number, lat: number) {
  if (s <= e.from || s >= e.to) return lat;
  const span = e.stepped[Math.floor(s - e.from)]!,
    f = (s - Math.floor(s)) * PER,
    k = Math.min(PER - 1, Math.floor(f));
  return span[k]! + (span[k + 1]! - span[k]!) * (f - k);
}
/** The eased offset at `s` along the smooth heading (`lineSmoothAt`), or `lat` outside the stretch. */
export function easedSmoothAt(e: Eased, s: number, lat: number) {
  const f = (s - e.from) / STEP;
  if (f <= 0 || f >= e.smooth.length - 1) return lat;
  const k = Math.floor(f);
  return e.smooth[k]! + (e.smooth[k + 1]! - e.smooth[k]!) * (f - k);
}
