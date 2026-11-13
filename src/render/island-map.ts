// The railway as a small map of the island, drawn into a 2D canvas: both lines where they really run (their track
// polylines, simplified to stay legible), laid track in the line's colour and unlaid track dashed, every station
// dotted and named (unlaid ones dim), and this halt ringed. The owner's pick for the halt boards (9 November,
// "Island map", after the 1 November departures board prototype's map and a 2D prototype of four boards); the Home
// hall's big board can draw the same map larger with no ring. Trains are drawn by the caller on top (quads in the
// world, or `drawMarker` into a canvas), so a moving train never redraws the map.
// Pure canvas drawing: callers own the canvas, the texture and when to redraw.

export type MapStop = {
  /** Its name on the map; '' for a stop drawn as a dot with no name. */
  name: string;
  s: number;
  x: number;
  z: number;
  /** Not drawn and not named: a halt trains no longer stop at, kept so a stop's index stays its line's. */
  hide?: true;
  /** A small square before its name: the building frame stands here (the greybox route's railhead). */
  frame?: true;
};
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

/** The halts' map cell in pixels (`w` × `h`) and the padding `fitMap` keeps round the track, as a fraction of `h`;
 * the boards draw into cells this size and the unit tests place names on the same ones. */
export const MAP_CELL = { w: 320, h: 256, pad: 0.11 } as const;
/** Every mark's size once the line heads to sea and the whole crossing is fitted at true scale (owner, 11 November:
 * "Yes, smaller is fine"; docs/plans/ring-island-build1.md, call 67): 0.7 of the island-only map's. */
export const MAP_SEA_SCALE = 0.7;

/** Sizes in pixels for a map `h` tall: line width, stop dot radius, ring radius, label size, and a train marker's
 * width and height (callers drawing markers in the world use these too). `scale` shrinks them all together. */
export function mapSizes(h: number, scale = 1) {
  const r = h * 0.034 * scale,
    mark = r * 1.15;
  return {
    track: h * 0.032 * scale,
    dot: r,
    ring: r * 2.1,
    label: h * 0.085 * scale,
    markW: mark * 3.2,
    markH: mark * 2.27,
  };
}

/** A placed name: its box (top-left, size) and how it is inked. */
export type MapLabel = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  here: boolean;
  /** The box's side nearer its stop, where the (narrower) drawn text is set. */
  align: CanvasTextAlign;
  /** The box's first `frameWidth` holds a stop's frame square, the name after it. */
  frame: boolean;
};
/** What a frame square takes off the front of its name's box, at label `size` px. */
export const frameWidth = (size: number) => size * 0.95;
/** A name's box width at `size` px: a per-letter allowance for the bold face with 8% to spare, so placing names needs no
 * canvas and a unit test sees the same boxes the game draws (the drawn text, set at its stop's side, is narrower:
 * measured in the game, Figtree 700, "Camp" 2.73 em against 3.07, "Quarry" 3.23 against 3.54). */
export function labelWidth(name: string, size: number) {
  let em = 0;
  for (const c of name)
    em += c === ' ' ? 0.25 : /[mwMW]/.test(c) ? 0.92 : /[iljrtfI]/.test(c) ? 0.38 : /[A-Z]/.test(c) ? 0.72 : 0.6;
  return em * size * 1.08;
}
/** What each stop keeps clear of names, in pixels: its ring, or a train marker standing on it, whichever is wider. */
export function stopClear(h: number, scale = 1) {
  const S = mapSizes(h, scale);
  return Math.max(S.ring, Math.hypot(S.markW, S.markH) / 2) + S.label * 0.08;
}

/** The most steps `mapLabels` searches before it settles for the best placement found. */
const SEARCH_MAX = 300_000;
// Where a name may sit around its stop: right, left, above, below, then the diagonals; the bias prefers the sides.
const SIDES: readonly [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, -1, 1.5],
  [0, 1, 1.5],
  [Math.SQRT1_2, -Math.SQRT1_2, 1],
  [-Math.SQRT1_2, -Math.SQRT1_2, 1],
  [Math.SQRT1_2, Math.SQRT1_2, 1],
  [-Math.SQRT1_2, Math.SQRT1_2, 1],
];

/** Every station's name placed on a `w` × `h` face for view `v`: one per name at the middle of its stops, on whichever
 * side of it keeps the names off each other, off the face's edge, off every stop's ring and standing train, and as far
 * as it can off the track, preferring the side away from the map's middle, close to its stop. Small enough (a handful
 * of names, a few dozen spots each) to search every combination, cutting branches that can't beat the best so far. */
/** Steps the last `mapLabels` call searched, for the label tests. */
export let mapLabelSteps = 0;
export function mapLabels(
  lines: readonly MapLine[],
  v: MapView,
  w: number,
  h: number,
  here: readonly { line: number; stop: number }[],
  scale = 1,
): MapLabel[] {
  const S = mapSizes(h, scale),
    clear = stopClear(h, scale),
    gap = S.label * 0.15,
    lh = S.label * 1.05,
    edge = h * 0.04;
  const stops: [number, number][] = [];
  const names = new Map<string, { x: number; y: number; n: number; lit: boolean; here: boolean; frame: boolean }>();
  lines.forEach((l, li) =>
    l.stops.forEach((st, si) => {
      if (st.hide) return;
      const [x, y] = mapPx(v, st.x, st.z);
      stops.push([x, y]);
      if (!st.name) return;
      const n = names.get(st.name) ?? { x: 0, y: 0, n: 0, lit: false, here: false, frame: false };
      n.frame ||= !!st.frame;
      n.x += x;
      n.y += y;
      n.n++;
      n.lit ||= st.s <= l.laid + 0.01;
      n.here ||= here.some((hr) => hr.line === li && hr.stop === si);
      names.set(st.name, n);
    }),
  );
  // The track as points every few pixels, to keep names off it where there is room.
  const track: [number, number][] = [];
  for (const l of lines)
    for (let k = 1; k < l.path.length; k++) {
      const [ax, ay] = mapPx(v, l.path[k - 1]!.x, l.path[k - 1]!.z),
        [bx, by] = mapPx(v, l.path[k]!.x, l.path[k]!.z);
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
      for (let i = 0; i <= steps; i++) track.push([ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps]);
    }
  const list = [...names].map(([name, n]) => ({ ...n, name, x: n.x / n.n, y: n.y / n.n }));
  let mx = 0,
    my = 0;
  for (const n of list) {
    mx += n.x / list.length;
    my += n.y / list.length;
  }
  const hitsCircle = (b: MapLabel, cx: number, cy: number, r: number) => {
    const dx = cx - Math.max(b.x, Math.min(cx, b.x + b.w)),
      dy = cy - Math.max(b.y, Math.min(cy, b.y + b.h));
    return dx * dx + dy * dy < r * r;
  };
  // Each name's candidate boxes with their own cost, cheapest first.
  const options = list.map((n) => {
    const lw = labelWidth(n.name, S.label) + (n.frame ? frameWidth(S.label) : 0);
    const ox = n.x - mx,
      oy = n.y - my,
      od = Math.hypot(ox, oy) || 1;
    const spots: [number, number, number, number, number][] = [];
    for (const [cx, cy, bias] of SIDES)
      for (const far of [0, 1])
        for (const slide of cx === 0 || cy === 0 ? [0, -1, 1] : [0]) spots.push([cx, cy, bias, far, slide]);
    return spots
      .map(([cx, cy, bias, far, slide]) => {
        // Just outside the stop's clear circle, or a line further out; a side's name can also slide along it.
        const d = clear + gap + far * lh * 0.9,
          sx = Math.abs(cx) < 0.3 ? 0 : Math.sign(cx),
          sy = Math.abs(cy) < 0.3 ? 0 : Math.sign(cy);
        const box: MapLabel = {
          name: n.name,
          x: n.x + cx * d + (sx * lw) / 2 - lw / 2 + (cx === 0 ? slide * lw * 0.35 : 0),
          y: n.y + cy * d + (sy * lh) / 2 - lh / 2 + (cy === 0 ? slide * lh * 0.6 : 0),
          w: lw,
          h: lh,
          lit: n.lit,
          here: n.here,
          align: sx > 0 ? 'left' : sx < 0 ? 'right' : 'center',
          frame: n.frame,
        };
        const out =
          Math.max(0, edge - box.x) +
          Math.max(0, box.x + lw - (w - edge)) +
          Math.max(0, edge - box.y) +
          Math.max(0, box.y + lh - (h - edge));
        let cost =
          bias + far * 2.5 + Math.abs(slide) + 3 * (1 - (cx * ox + cy * oy) / od) + (out > 0 ? 1e5 + out * 100 : 0);
        for (const [x, y] of stops) if (hitsCircle(box, x, y, clear)) cost += 1e4;
        for (const [x, y] of track)
          if (
            x > box.x - S.track / 2 &&
            x < box.x + lw + S.track / 2 &&
            y > box.y - S.track / 2 &&
            y < box.y + lh + S.track / 2
          )
            cost += 0.5;
        return { box, cost };
      })
      .sort((a, b) => a.cost - b.cost);
  });
  const PAD = S.label * 0.1;
  const clash = (a: MapLabel, b: MapLabel) =>
    a.x < b.x + b.w + PAD && b.x < a.x + a.w + PAD && a.y < b.y + b.h + PAD && b.y < a.y + a.h + PAD;
  let best = Infinity,
    pick: MapLabel[] = [];
  const chosen: MapLabel[] = [];
  // The cheapest the names still to place could cost, to stop early on a branch that can't win.
  const rest = options.map(() => 0);
  for (let i = options.length - 2; i >= 0; i--) rest[i] = rest[i + 1]! + options[i + 1]![0]!.cost;
  // A face with no clean placement would otherwise search every combination (seconds, on the page's one thread): past
  // `SEARCH_MAX` steps it keeps the best found. No face the label tests cover comes near it.
  let steps = 0;
  const search = (i: number, sum: number) => {
    if (steps++ > SEARCH_MAX) return;
    if (sum + (i < options.length ? options[i]![0]!.cost + rest[i]! : 0) >= best) return;
    if (i === options.length) {
      best = sum;
      pick = [...chosen];
      return;
    }
    for (const o of options[i]!) {
      let extra = o.cost;
      for (const c of chosen) if (clash(o.box, c)) extra += 1e6;
      chosen.push(o.box);
      search(i + 1, sum + extra);
      chosen.pop();
    }
  };
  search(0, 0);
  mapLabelSteps = steps;
  return pick;
}

/** The map's base: face, track, stops, names and the "you are here" ring outline (`here`: lines and stop indices), in
 * the `w` × `h` box at (`at.x`, `at.y`); `v` is fitted to the box as if it sat at (0, 0). Stops of different lines at
 * the same name share one label at their middle. */
export function drawMapBase(
  g: CanvasRenderingContext2D,
  at: { x: number; y: number },
  w: number,
  h: number,
  lines: readonly MapLine[],
  v: MapView,
  here: readonly { line: number; stop: number }[],
  scale = 1,
) {
  const S = mapSizes(h, scale),
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
  lines.forEach((l, li) =>
    l.stops.forEach((st, si) => {
      if (st.hide) return;
      const [x, y] = mapPx(v, st.x, st.z);
      const laid = st.s <= l.laid + 0.01,
        me = here.some((h) => h.line === li && h.stop === si);
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
    }),
  );
  // Names, each in the box `mapLabels` gave it, set against the side nearer its stop.
  g.font = `700 ${S.label}px ${FONT}`;
  g.textBaseline = 'middle';
  for (const b of mapLabels(lines, v, w, h, here, scale)) {
    g.textAlign = b.align;
    g.fillStyle = g.strokeStyle = b.here ? MAP_INK : b.lit ? NAME_LIT : MAP_DIM;
    // A frame square leads the name, hard against the drawn text (which is narrower than its box).
    const fw = b.frame ? frameWidth(S.label) : 0,
      at = b.align === 'left' ? b.x + fw : b.align === 'right' ? b.x + b.w : b.x + (fw + b.w) / 2;
    if (fw) {
      const tw = g.measureText(b.name).width,
        left = b.align === 'left' ? at : b.align === 'right' ? at - tw : at - tw / 2,
        side = S.label * 0.6;
      g.lineWidth = S.label * 0.14;
      g.strokeRect(left - side - S.label * 0.25, b.y + b.h / 2 - side / 2, side, side);
    }
    g.fillText(b.name, at, b.y + b.h / 2);
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
