// The railway as a small map of the island, drawn into a 2D canvas: both lines where they really run (their track
// polylines, simplified to stay legible), laid track in the line's colour and unlaid track dashed, every station
// dotted and named (unlaid ones dim), and this halt ringed. The owner's pick for the halt boards (9 November,
// "Island map", after the 1 November departures board prototype's map and a 2D prototype of four boards); the Home
// hall's big board can draw the same map larger with no ring. Trains are drawn by the caller on top (quads in the
// world, or `drawMarker` into a canvas), so a moving train never redraws the map.
// Pure canvas drawing: callers own the canvas, the texture and when to redraw.

export type MapStop = { name: string; s: number; x: number; z: number };
export type MapLine = {
  color: string;
  /** The track, world metres, with `s` (metres along the line) at each point, in order. */
  path: readonly { x: number; z: number; s: number }[];
  /** Track is laid from the start up to `laid` metres along; beyond it is dashed and its stations dim. */
  laid: number;
  stops: readonly MapStop[];
};
/** How the map sits on a face: world point (x, z) to pixels. */
export type MapView = {
  rx: number;
  rz: number;
  fx: number;
  fz: number;
  k: number;
  ox: number;
  oy: number;
};

export const MAP_INK = '#f4efe2',
  MAP_DIM = '#59606c',
  MAP_RING = '#e0503a',
  MAP_FACE = '#16181d';
const NAME_LIT = '#cfd3da',
  FONT = 'Figtree, ui-sans-serif, system-ui, sans-serif';

/** Drop points closer than `tol` metres to the line through their neighbours (Douglas-Peucker), keeping the ends. */
export function simplify<T extends { x: number; z: number }>(pts: readonly T[], tol: number): T[] {
  if (pts.length < 3) return [...pts];
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const A = pts[a]!,
      B = pts[b]!;
    const dx = B.x - A.x,
      dz = B.z - A.z,
      len = Math.hypot(dx, dz) || 1;
    let far = -1,
      at = -1;
    for (let k = a + 1; k < b; k++) {
      const P = pts[k]!;
      const d = Math.abs((P.x - A.x) * dz - (P.z - A.z) * dx) / len;
      if (d > far) {
        far = d;
        at = k;
      }
    }
    if (far > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, k) => keep[k]);
}

/** Fit `lines` into a `w` × `h` box at the origin, seen by someone facing `forward` (a unit world x/z vector): what
 * lies ahead is up the map and their right is its right, so a board's geography stays true from either side. */
export function fitMap(
  lines: readonly MapLine[],
  forward: { x: number; z: number },
  w: number,
  h: number,
  pad: number,
): MapView {
  const fx = forward.x,
    fz = forward.z,
    rx = -fz,
    rz = fx;
  let minU = Infinity,
    maxU = -Infinity,
    minV = Infinity,
    maxV = -Infinity;
  for (const l of lines)
    for (const p of l.path) {
      const u = p.x * rx + p.z * rz,
        v = -(p.x * fx + p.z * fz);
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
  const k = Math.min((w - pad * 2) / Math.max(1, maxU - minU), (h - pad * 2) / Math.max(1, maxV - minV));
  return {
    rx,
    rz,
    fx,
    fz,
    k,
    ox: w / 2 - ((minU + maxU) / 2) * k,
    oy: h / 2 - ((minV + maxV) / 2) * k,
  };
}
/** Pixels of world (x, z) on view `v`. */
export function mapPx(v: MapView, x: number, z: number): [number, number] {
  return [v.ox + (x * v.rx + z * v.rz) * v.k, v.oy - (x * v.fx + z * v.fz) * v.k];
}
/** World x/z of `s` metres along a line's path. */
export function pathAt(l: MapLine, s: number): { x: number; z: number } {
  const p = l.path;
  if (s <= p[0]!.s) return p[0]!;
  for (let k = 1; k < p.length; k++)
    if (s <= p[k]!.s) {
      const a = p[k - 1]!,
        b = p[k]!,
        f = (s - a.s) / (b.s - a.s || 1);
      return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
    }
  return p[p.length - 1]!;
}

/** Sizes in pixels for a map `h` tall: line width, stop dot radius, ring radius, label size. */
export function mapSizes(h: number) {
  const r = h * 0.034;
  return { track: h * 0.032, dot: r, ring: r * 2.1, label: h * 0.085 };
}

/** The map's base: face, track, stops, names and the "you are here" ring outline (`here`: a line and stop index), in
 * the `w` × `h` box at (`at.x`, `at.y`); `v` is fitted to the box as if it sat at (0, 0). Stops of different lines at
 * the same name share one label at their middle. */
export function drawMapBase(
  g: CanvasRenderingContext2D,
  at: { x: number; y: number },
  w: number,
  h: number,
  lines: readonly MapLine[],
  v: MapView,
  here: { line: number; stop: number } | null,
) {
  const S = mapSizes(h),
    x0 = 0,
    y0 = 0;
  g.save();
  g.translate(at.x, at.y);
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  g.fillStyle = MAP_FACE;
  g.fillRect(x0, y0, w, h);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = S.track;
  const trace = (l: MapLine, from: number, to: number) => {
    g.beginPath();
    const a = pathAt(l, from);
    g.moveTo(...mapPx(v, a.x, a.z));
    for (const p of l.path) if (p.s > from && p.s < to) g.lineTo(...mapPx(v, p.x, p.z));
    const b = pathAt(l, to);
    g.lineTo(...mapPx(v, b.x, b.z));
    g.stroke();
  };
  for (const l of lines) {
    const end = l.path[l.path.length - 1]!.s;
    if (l.laid < end) {
      g.strokeStyle = MAP_DIM;
      g.setLineDash([S.track * 1.5, S.track * 1.9]);
      trace(l, l.laid, end);
      g.setLineDash([]);
    }
    g.strokeStyle = l.color;
    trace(l, l.path[0]!.s, Math.min(l.laid, end));
  }
  // Labels: one per name, at the middle of its stops, pushed outward from the map's middle.
  const names = new Map<string, { x: number; y: number; n: number; lit: boolean; here: boolean }>();
  lines.forEach((l, li) =>
    l.stops.forEach((st, si) => {
      const [x, y] = mapPx(v, st.x, st.z);
      const laid = st.s <= l.laid + 0.01,
        me = !!here && here.line === li && here.stop === si;
      if (me) {
        g.fillStyle = MAP_FACE;
        g.beginPath();
        g.arc(x, y, S.ring, 0, Math.PI * 2);
        g.fill();
        g.lineWidth = S.dot * 0.55;
        g.strokeStyle = MAP_RING;
        g.stroke();
      }
      g.fillStyle = laid ? MAP_INK : MAP_DIM;
      g.beginPath();
      g.arc(x, y, me ? S.dot * 1.15 : S.dot, 0, Math.PI * 2);
      g.fill();
      const n = names.get(st.name) ?? { x: 0, y: 0, n: 0, lit: false, here: false };
      n.x += x;
      n.y += y;
      n.n++;
      n.lit ||= laid;
      n.here ||= me;
      names.set(st.name, n);
    }),
  );
  let mx = 0,
    my = 0;
  for (const n of names.values()) {
    mx += n.x / n.n / names.size;
    my += n.y / n.n / names.size;
  }
  g.font = `700 ${S.label}px ${FONT}`;
  g.textBaseline = 'middle';
  for (const [name, n] of names) {
    const x = n.x / n.n,
      y = n.y / n.n;
    let dx = x - mx,
      dy = y - my;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const off = S.ring + S.label * 0.25;
    g.textAlign = dx > 0.35 ? 'left' : dx < -0.35 ? 'right' : 'center';
    let lx = x + dx * off,
      ly = y + dy * off + (Math.abs(dx) <= 0.35 ? Math.sign(dy || 1) * S.label * 0.35 : 0);
    // Keep the label on the face.
    const tw = g.measureText(name).width,
      left = g.textAlign === 'left' ? lx : g.textAlign === 'right' ? lx - tw : lx - tw / 2,
      edge = h * 0.04;
    lx += Math.max(0, x0 + edge - left) - Math.max(0, left + tw - (x0 + w - edge));
    ly = Math.max(y0 + edge + S.label / 2, Math.min(y0 + h - edge - S.label / 2, ly));
    g.fillStyle = n.here ? MAP_INK : n.lit ? NAME_LIT : MAP_DIM;
    g.fillText(name, lx, ly);
  }
  g.restore();
}

/** A train marker centred at (`x`, `y`), `r` its size unit: a dark outline, the line's colour, two windows. */
export function drawMarker(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const rr = (rx: number, ry: number, w: number, hh: number, c: number) => {
    g.beginPath();
    g.roundRect(rx, ry, w, hh, c);
    g.fill();
  };
  g.fillStyle = MAP_FACE;
  rr(x - r * 1.5, y - r * 1.05, r * 3, r * 2.1, r * 0.5);
  g.fillStyle = color;
  rr(x - r * 1.3, y - r * 0.85, r * 2.6, r * 1.7, r * 0.4);
  g.fillStyle = MAP_FACE;
  g.fillRect(x - r * 0.75, y - r * 0.35, r * 0.6, r * 0.6);
  g.fillRect(x + r * 0.15, y - r * 0.35, r * 0.6, r * 0.6);
}
