// Easing a parallel track round a bend. No three.js; Place data, read by the views and the client's train poses only.
// A track drawn a fixed distance inside a line's bend turns on a smaller radius than the line: 4 m inside the
// Quarry's 6.8 m bend, the up track was a 2.8 m bend (owner, 14 November: "on certain stops, especially with curves,
// the train car clips the train engine"). Here the track keeps its offset on the straights and takes the corner
// wider: it starts turning earlier and finishes later, bowing a little further from the line through the bend, so
// its radius is no tighter than `minR`. The result is still a lateral offset per metre of the line, so everything
// that follows `upLat` (rails, bed, crossing, trains) follows it.
export type XZ = { x: number; z: number };
/** A point of the line and its unit heading at `s`. */
export type LineAt = (s: number, out: { x: number; z: number; ux: number; uz: number }) => unknown;
export type Eased = { from: number; step: number; lat: number[] };

const STEP = 0.25;
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
    if (a === i || c === i) continue;
    least = Math.min(least, radius(path[a]!, path[i]!, path[c]!));
  }
  return least;
}
/** The drawn track at each sample: the line's point set across by `lat` (the consumers' convention). */
function offsetPath(line: LineAt, from: number, lat: readonly number[]) {
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  return lat.map((l, i): XZ => {
    line(from + i * STEP, p);
    return { x: p.x - p.uz * l, z: p.z + p.ux * l };
  });
}
/**
 * The lateral offsets, every 0.25 m of the line from `from` to `to`, of a track that runs `lat` m beside the line at
 * both ends and nowhere turns tighter than `minR`. Null when the plain offset already holds `minR`.
 */
export function easeBend(line: LineAt, from: number, to: number, lat: number, minR: number): Eased | null {
  const n = Math.round((to - from) / STEP) + 1;
  const plain = offsetPath(
    line,
    from,
    Array.from({ length: n }, () => lat),
  );
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
  // Back to an offset a metre of the line: where the line's normal at each sample meets the relaxed track.
  const p = { x: 0, z: 0, ux: 0, uz: 1 };
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    line(from + i * STEP, p);
    const nx = -p.uz,
      nz = p.ux;
    let best = lat,
      miss = Infinity;
    for (let j = 1; j < dense.length; j++) {
      const a = dense[j - 1]!,
        b = dense[j]!;
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
    out.push(best);
  }
  return { from, step: STEP, lat: out };
}
/** The eased offset at `s`, or `lat` outside the table. */
export function easedAt(e: Eased, s: number, lat: number) {
  const f = (s - e.from) / e.step;
  if (f <= 0 || f >= e.lat.length - 1) return lat;
  const k = Math.floor(f);
  return e.lat[k]! + (e.lat[k + 1]! - e.lat[k]!) * (f - k);
}
