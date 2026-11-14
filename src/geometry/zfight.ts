// Local/offline geometry diagnostics. No renderer, game state or numerical lockstep contract.
export type Point = readonly [number, number, number];
export type Face = { piece: string; points: readonly Point[]; ground?: boolean };
export type Contact = {
  a: string;
  b: string;
  position: Point;
  normal: Point;
  area: number;
  separation: number;
};
export const ZFIGHT = { separation: 0.002, normalDot: 0.999999, minArea: 0.005 };
const EPS = 1e-8;
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const mix = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
type Plane = { n: Point; d: number };
type Prepared = Face & Plane & { lo: Point; hi: Point };
function prepare(face: Face): Prepared | null {
  const { points } = face;
  if (points.length < 3 || points.some((p) => p.some((n) => !Number.isFinite(n)))) return null;
  const v = cross(sub(points[1]!, points[0]!), sub(points[2]!, points[0]!));
  const length = Math.hypot(...v);
  if (length < EPS) return null;
  const n: Point = [v[0] / length, v[1] / length, v[2] / length];
  return {
    ...face,
    n,
    d: dot(n, points[0]!),
    lo: [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i]!))) as unknown as Point,
    hi: [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i]!))) as unknown as Point,
  };
}
// Sutherland-Hodgman in world space: retain n.p <= d. All input polygons are convex.
function clip(poly: readonly Point[], { n, d }: Plane): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!,
      b = poly[(i + 1) % poly.length]!;
    const da = dot(n, a) - d,
      db = dot(n, b) - d;
    if (da <= EPS) out.push(a);
    if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) out.push(mix(a, b, da / (da - db)));
  }
  return out;
}
function edges(face: Prepared): Plane[] {
  return face.points.map((p, i) => {
    const n = cross(sub(face.points[(i + 1) % face.points.length]!, p), face.n);
    return { n, d: dot(n, p) };
  });
}
function measure(poly: readonly Point[], n: Point) {
  let area = 0;
  const sum = [0, 0, 0];
  for (let i = 1; i + 1 < poly.length; i++) {
    const a = poly[0]!,
      b = poly[i]!,
      c = poly[i + 1]!;
    const size = Math.abs(dot(cross(sub(b, a), sub(c, a)), n)) / 2;
    area += size;
    for (let k = 0; k < 3; k++) sum[k]! += (size * (a[k]! + b[k]! + c[k]!)) / 3;
  }
  return { area, position: sum.map((v) => v / area) as unknown as Point };
}
type Solid = { piece: string; planes: Plane[]; lo: Point; hi: Point };
function solids(faces: Prepared[]): Solid[] {
  const grouped = new Map<string, Prepared[]>();
  for (const f of faces) {
    const group = grouped.get(f.piece) ?? [];
    group.push(f);
    grouped.set(f.piece, group);
  }
  const out: Solid[] = [];
  for (const [piece, group] of grouped) {
    if (group[0]!.ground) {
      for (const f of group)
        if (f.n[1] > EPS)
          out.push({
            piece,
            planes: [f, ...edges({ ...f, n: [0, 1, 0] })],
            lo: [f.lo[0], -Infinity, f.lo[2]],
            hi: f.hi,
          });
      continue;
    }
    // Only closed convex pieces may hide another face. Open/non-convex meshes remain candidates.
    if (group.length < 4) continue;
    const vertices = group.flatMap((f) => f.points);
    const planes = group.filter(
      (f, i) => !group.slice(0, i).some((g) => dot(f.n, g.n) > 1 - EPS && Math.abs(f.d - g.d) < EPS),
    );
    if (planes.some((f) => vertices.some((p) => dot(f.n, p) > f.d + 1e-5))) continue;
    // A closed convex hull has balanced oriented area; this excludes a single-sided open box.
    const balance = [0, 0, 0];
    let total = 0;
    for (const f of group) {
      const { area } = measure(f.points, f.n);
      total += area;
      for (let k = 0; k < 3; k++) balance[k]! += area * f.n[k]!;
    }
    if (Math.hypot(...balance) > total * 1e-5) continue;
    out.push({
      piece,
      planes,
      lo: [0, 1, 2].map((i) => Math.min(...group.map((f) => f.lo[i]!))) as unknown as Point,
      hi: [0, 1, 2].map((i) => Math.max(...group.map((f) => f.hi[i]!))) as unknown as Point,
    });
  }
  return out;
}
function cells(lo: Point, hi: Point, visit: (key: string) => void) {
  for (let x = Math.floor(lo[0] / 8); x <= Math.floor(hi[0] / 8); x++)
    for (let z = Math.floor(lo[2] / 8); z <= Math.floor(hi[2] / 8); z++) visit(`${x},${z}`);
}
/** Convex, outward-wound faces. Triangles partitioning a face are summed, never counted twice.
 * Subtract nearby opaque convex solids (and terrain prisms) at a point just outside BOTH faces.
 * This establishes local exterior exposure, not line-of-sight from every possible camera.
 */
export function findZfights(input: readonly Face[], options: Partial<typeof ZFIGHT> = {}): Contact[] {
  const settings = { ...ZFIGHT, ...options };
  if (
    !Object.values(settings).every(Number.isFinite) ||
    settings.separation < 0 ||
    settings.minArea < 0 ||
    settings.normalDot < 0 ||
    settings.normalDot > 1
  )
    throw new Error('Invalid z-fight tolerance');
  const faces = input.map(prepare).filter((f): f is Prepared => f !== null);
  const blockers = new Map<string, Solid[]>();
  for (const solid of solids(faces))
    cells(solid.lo, solid.hi, (key) => {
      const bucket = blockers.get(key) ?? [];
      bucket.push(solid);
      blockers.set(key, bucket);
    });
  const buckets = new Map<string, number[]>();
  const contacts = new Map<string, Contact>();
  const normalReach = Math.sqrt(2 * (1 - settings.normalDot)) + EPS;
  const normalCell = 0.05;
  for (let i = 0; i < faces.length; i++) {
    const a = faces[i]!;
    const candidates = new Set<number>();
    const orientation = a.n.map((v) => Math.floor(v / normalCell)).join(',');
    const neighbours: string[] = [];
    for (
      let x = Math.floor((a.n[0] - normalReach) / normalCell);
      x <= Math.floor((a.n[0] + normalReach) / normalCell);
      x++
    )
      for (
        let y = Math.floor((a.n[1] - normalReach) / normalCell);
        y <= Math.floor((a.n[1] + normalReach) / normalCell);
        y++
      )
        for (
          let z = Math.floor((a.n[2] - normalReach) / normalCell);
          z <= Math.floor((a.n[2] + normalReach) / normalCell);
          z++
        )
          neighbours.push(`${x},${y},${z}`);
    cells(
      a.lo.map((v) => v - settings.separation) as unknown as Point,
      a.hi.map((v) => v + settings.separation) as unknown as Point,
      (key) => {
        for (const normal of neighbours) for (const j of buckets.get(`${key}/${normal}`) ?? []) candidates.add(j);
        const ownKey = `${key}/${orientation}`;
        const bucket = buckets.get(ownKey) ?? [];
        bucket.push(i);
        buckets.set(ownKey, bucket);
      },
    );
    for (const j of candidates) {
      const b = faces[j]!;
      if (a.piece === b.piece || dot(a.n, b.n) < settings.normalDot) continue;
      if ([0, 1, 2].some((k) => a.lo[k]! > b.hi[k]! + settings.separation || b.lo[k]! > a.hi[k]! + settings.separation))
        continue;
      // Test every vertex in both directions: tilted planes cannot sneak in by sharing one vertex.
      const separation = Math.max(
        ...a.points.map((p) => Math.abs(dot(b.n, p) - b.d)),
        ...b.points.map((p) => Math.abs(dot(a.n, p) - a.d)),
      );
      if (separation > settings.separation + EPS) continue;
      let overlap: Point[] = [...a.points];
      for (const plane of edges(b)) overlap = clip(overlap, plane);
      if (measure(overlap, a.n).area < EPS) continue;
      let exposed = [overlap];
      const near = new Set<Solid>();
      cells(a.lo, a.hi, (key) => {
        for (const solid of blockers.get(key) ?? []) near.add(solid);
      });
      const offset = settings.separation + 0.0001;
      for (const solid of near) {
        if (
          solid.piece === a.piece ||
          solid.piece === b.piece ||
          [0, 1, 2].some((k) => a.lo[k]! > solid.hi[k]! + offset || a.hi[k]! < solid.lo[k]! - offset)
        )
          continue;
        const next: Point[][] = [];
        for (const polygon of exposed) {
          let inside = polygon;
          for (const plane of solid.planes) {
            const d = plane.d - offset * dot(plane.n, a.n);
            const outside = clip(inside, { n: plane.n.map((v) => -v) as unknown as Point, d: -d });
            if (measure(outside, a.n).area > EPS) next.push(outside);
            inside = clip(inside, { n: plane.n, d });
            if (inside.length < 3) break;
          }
        }
        exposed = next;
        if (!exposed.length) break;
      }
      for (const polygon of exposed) {
        const { area, position } = measure(polygon, a.n);
        if (area < EPS) continue;
        const names = [a.piece, b.piece].sort();
        // Aggregate triangles on the same oriented plane of a pair; opposite faces stay separate.
        const key = JSON.stringify([
          ...names,
          ...a.n.map((v) => Math.round(v * 10000)),
          Math.round(a.d / Math.max(settings.separation, 1e-5)),
        ]);
        const old = contacts.get(key);
        contacts.set(key, {
          a: names[0]!,
          b: names[1]!,
          area: (old?.area ?? 0) + area,
          position: old ? mix(old.position, position, area / (old.area + area)) : position,
          normal: a.n,
          separation: Math.max(old?.separation ?? 0, separation),
        });
      }
    }
  }
  return [...contacts.values()]
    .filter((c) => c.area >= settings.minArea)
    .sort((a, b) => b.area - a.area || a.a.localeCompare(b.a) || a.b.localeCompare(b.b));
}
