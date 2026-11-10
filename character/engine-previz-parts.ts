// Train engine previz blockouts (docs/plans/engine-previz.md): pure part data, no three.js, so Node can check it.
// Inspection only: nothing in the game imports this. Engine frame: +z forward, +x across, y up from the rail line
// (the game's car origin; rail tops are at 0.16 m and the halt deck at 0.72 m).
export type V = readonly [number, number, number];
/** What a part belongs to. `body` is always drawn; the others are the upgrade states' separate meshes. */
export type Module = 'body' | 'boiler' | 'lashing' | 'speed' | 'steam' | 'wheels';
export type Part =
  | { kind: 'box'; m: Module; c: string; min: V; max: V; tilt?: number }
  | {
      kind: 'cyl';
      m: Module;
      c: string;
      axis: 'x' | 'y' | 'z';
      at: V;
      len: number;
      r0: number;
      r1: number;
      seg: number;
    }
  | { kind: 'sphere'; m: Module; c: string; at: V; r: number; sy: number; seg: number }
  | { kind: 'torus'; m: Module; c: string; axis: 'y' | 'z'; at: V; r: number; tube: number; seg: number }
  | { kind: 'wheel'; m: 'wheels'; at: V; r: number };
export type EngineId = 'a' | 'b' | 'c';
export type Candidate = { id: EngineId; name: string; hx: number; hz: number; parts: Part[] };

// The game's flat palette (src/proto/place/look-kit.ts, halts-view.ts, gold-rope.ts).
export const RED = '#e8392a',
  RUST = '#9a5a44',
  DARK = '#24262c',
  BRASS = '#d9a23a',
  DULL_BRASS = '#8f7a4e',
  GOLD_ROPE = '#d9a438',
  DOOR = '#3a3c42',
  GLASS = '#1d2430',
  STEAM = '#f2efe8';

type Parts = Part[];
const box = (p: Parts, m: Module, c: string, x: [number, number], y: [number, number], z: [number, number]) =>
  p.push({ kind: 'box', m, c, min: [x[0], y[0], z[0]], max: [x[1], y[1], z[1]] });
/** A box and its mirror across the engine's centre line; `x` is the +x side. */
const pair = (p: Parts, m: Module, c: string, x: [number, number], y: [number, number], z: [number, number]) => {
  box(p, m, c, x, y, z);
  box(p, m, c, [-x[1], -x[0]], y, z);
};
/** A cylinder along z from z0 to z1; `r1` is the front radius when it tapers. */
const cz = (p: Parts, m: Module, c: string, y: number, z: [number, number], r: number, seg = 20, x = 0) =>
  p.push({ kind: 'cyl', m, c, axis: 'z', at: [x, y, (z[0] + z[1]) / 2], len: z[1] - z[0], r0: r, r1: r, seg });
/** An upright cylinder from y0 to y1, radius r0 at the bottom and r1 at the top. */
const cy = (p: Parts, m: Module, c: string, z: number, y: [number, number], r0: number, r1 = r0, seg = 16, x = 0) =>
  p.push({ kind: 'cyl', m, c, axis: 'y', at: [x, (y[0] + y[1]) / 2, z], len: y[1] - y[0], r0, r1, seg });
const sphere = (p: Parts, m: Module, c: string, at: V, r: number, sy = 1) =>
  p.push({ kind: 'sphere', m, c, at, r, sy, seg: 16 });
const ring = (p: Parts, m: Module, c: string, axis: 'y' | 'z', at: V, r: number, tube: number) =>
  p.push({ kind: 'torus', m, c, axis, at, r, tube, seg: 24 });
const wheels = (p: Parts, zs: number[], r: number) => {
  for (const z of zs) for (const s of [-1, 1]) p.push({ kind: 'wheel', m: 'wheels', at: [s * 0.5, r + 0.15, z], r });
};
/** Buffers off one end: stocks and heads at y, face at `end` (signed: + front, − back). */
const buffers = (p: Parts, end: number, y = 0.62) => {
  const s = Math.sign(end),
    a = Math.abs(end);
  for (const x of [-0.55, 0.55]) {
    cz(p, 'body', DARK, y, s > 0 ? [a - 0.25, a - 0.03] : [-(a - 0.03), -(a - 0.25)], 0.09, 10, x);
    cz(p, 'body', DARK, y, s > 0 ? [a - 0.05, a] : [-a, -(a - 0.05)], 0.13, 14, x);
  }
};
/** The lashing (the boiler fit's mark, boiler-first-choice step 8): two gold rope rings 3 cm off the barrel and a knot
 * on top. `r` is the barrel's radius; the tube sits clear of it so the rings never touch the paint. */
const lashing = (p: Parts, y: number, r: number, zs: [number, number]) => {
  const tube = 0.035,
    rr = r + 0.03 + tube;
  for (const z of zs) ring(p, 'lashing', GOLD_ROPE, 'z', [0, y, z], rr, tube);
  box(p, 'lashing', GOLD_ROPE, [-0.08, 0.08], [y + rr - 0.04, y + rr + 0.08], [zs[1] - 0.07, zs[1] + 0.07]);
};
const steam = (p: Parts, x: number, top: number, z: number) => {
  sphere(p, 'steam', STEAM, [x, top + 0.25, z - 0.05], 0.14);
  sphere(p, 'steam', STEAM, [x, top + 0.5, z - 0.3], 0.19);
  sphere(p, 'steam', STEAM, [x, top + 0.82, z - 0.65], 0.25);
};
/** A cab: walls, roof, two front windows and one each side. */
const cab = (
  p: Parts,
  hx: number,
  y: [number, number],
  z: [number, number],
  roof: { hx: number; z: [number, number] },
) => {
  box(p, 'body', RED, [-hx, hx], y, z);
  box(p, 'body', DARK, [-roof.hx, roof.hx], [y[1] - 0.03, y[1] + 0.09], roof.z);
  const front = z[1],
    wy: [number, number] = [y[1] - 0.5, y[1] - 0.17];
  pair(p, 'body', GLASS, [0.18, Math.min(0.58, hx - 0.15)], wy, [front - 0.015, front + 0.015]);
  pair(p, 'body', GLASS, [hx - 0.015, hx + 0.015], [wy[0] - 0.08, wy[1] - 0.04], [z[0] + 0.25, z[0] + 0.7]);
};

/** A: the stubby toy at today's footprint (LOCO 1.6 × 3.0 m): two big drivers, a short fat boiler, a tall chimney. */
function stubby(): Candidate {
  const p: Parts = [];
  wheels(p, [-0.75, 0.75], 0.38);
  pair(p, 'wheels', DARK, [0.63, 0.66], [0.48, 0.58], [-0.8, 0.8]); // the side rods
  box(p, 'body', DARK, [-0.4, 0.4], [0.3, 0.96], [-1.42, 1.42]); // inner frame
  box(p, 'body', DARK, [-0.8, 0.8], [0.94, 1.02], [-1.5, 1.5]); // footplate
  box(p, 'body', RED, [-0.8, 0.8], [0.45, 0.8], [1.38, 1.58]); // buffer beams
  box(p, 'body', RED, [-0.8, 0.8], [0.45, 0.8], [-1.58, -1.38]);
  buffers(p, 1.77);
  buffers(p, -1.77);
  cab(p, 0.75, [1.0, 2.0], [-1.46, -0.5], { hx: 0.86, z: [-1.6, -0.38] });
  pair(p, 'body', BRASS, [0.06, 0.42], [1.0, 1.12], [-0.2, -0.06]); // the empty saddles, as today's shell has
  pair(p, 'body', BRASS, [0.06, 0.42], [1.0, 1.12], [0.8, 0.94]);
  // The boiler: the fitted part, one mesh with its smokebox, chimney and dome.
  cz(p, 'boiler', RED, 1.5, [-0.7, 1.15], 0.5, 24);
  cz(p, 'boiler', DARK, 1.5, [1.0, 1.42], 0.53, 24);
  cz(p, 'boiler', DOOR, 1.5, [1.41, 1.45], 0.3, 20);
  cy(p, 'boiler', DARK, 1.2, [1.9, 2.4], 0.17, 0.21);
  cy(p, 'boiler', DARK, 1.2, [2.36, 2.46], 0.25, 0.25);
  sphere(p, 'boiler', BRASS, [0, 1.98, 0.35], 0.24, 0.8);
  lashing(p, 1.5, 0.5, [0.05, 0.75]);
  // Speed (parked): a brass band round the smokebox, a second dome and a brass chimney ring.
  ring(p, 'speed', BRASS, 'z', [0, 1.5, 1.08], 0.555, 0.03);
  pair(p, 'speed', BRASS, [0.79, 0.82], [0.92, 1.04], [-1.45, 1.45]); // a brass stripe down the footplate
  sphere(p, 'speed', BRASS, [0, 1.95, -0.3], 0.18, 0.85);
  ring(p, 'speed', BRASS, 'y', [0, 2.46, 1.2], 0.25, 0.03);
  steam(p, 0, 2.46, 1.2);
  return { id: 'a', name: 'Stubby toy', hx: 0.8, hz: 1.5, parts: p };
}

/** B: a bit longer (1.7 × 4.2 m), a proper long boiler with a steam dome, three drivers and a pony truck. */
function longer(): Candidate {
  const p: Parts = [];
  wheels(p, [-1.15, -0.25, 0.65], 0.36);
  wheels(p, [1.55], 0.24);
  pair(p, 'wheels', DARK, [0.63, 0.66], [0.46, 0.56], [-1.2, 0.7]);
  box(p, 'body', DARK, [-0.4, 0.4], [0.3, 0.96], [-2.0, 2.0]);
  box(p, 'body', DARK, [-0.85, 0.85], [0.94, 1.02], [-2.1, 2.1]);
  pair(p, 'body', RED, [0.84, 0.87], [0.86, 1.0], [-2.05, 2.05]); // the valance under the footplate's edge
  box(p, 'body', RED, [-0.85, 0.85], [0.45, 0.82], [1.98, 2.18]);
  box(p, 'body', RED, [-0.85, 0.85], [0.45, 0.82], [-2.18, -1.98]);
  buffers(p, 2.37);
  buffers(p, -2.37);
  cab(p, 0.8, [1.0, 2.1], [-2.06, -0.95], { hx: 0.9, z: [-2.2, -0.82] });
  pair(p, 'body', BRASS, [0.06, 0.44], [1.0, 1.14], [-0.6, -0.46]);
  pair(p, 'body', BRASS, [0.06, 0.44], [1.0, 1.14], [0.9, 1.04]);
  cz(p, 'boiler', RED, 1.55, [-1.1, 1.55], 0.55, 24);
  cz(p, 'boiler', DARK, 1.55, [1.4, 1.95], 0.58, 24);
  cz(p, 'boiler', DOOR, 1.55, [1.94, 1.98], 0.34, 20);
  cy(p, 'boiler', DARK, 1.65, [2.0, 2.55], 0.15, 0.19);
  cy(p, 'boiler', DARK, 1.65, [2.5, 2.6], 0.23, 0.23);
  sphere(p, 'boiler', BRASS, [0, 2.07, 0.5], 0.27, 0.85);
  cy(p, 'boiler', BRASS, -0.85, [2.0, 2.25], 0.06, 0.06, 10); // safety valve
  lashing(p, 1.55, 0.55, [-0.15, 1.05]);
  ring(p, 'speed', BRASS, 'z', [0, 1.55, 1.45], 0.605, 0.03);
  pair(p, 'speed', BRASS, [0.86, 0.89], [0.93, 1.03], [-2.0, 2.0]);
  sphere(p, 'speed', BRASS, [0, 2.02, -0.4], 0.2, 0.85);
  ring(p, 'speed', BRASS, 'y', [0, 2.6, 1.65], 0.235, 0.03);
  for (const x of [-0.6, 0.6]) cz(p, 'speed', BRASS, 1.75, [-0.9, 1.35], 0.025, 8, x); // handrails
  steam(p, 0, 2.6, 1.65);
  return { id: 'b', name: 'Longer, proper boiler', hx: 0.85, hz: 2.1, parts: p };
}

/** C: a tank engine (1.7 × 3.6 m): side tanks either side of a slimmer boiler, a coal bunker, a cowcatcher. The
 * empty slot between the tanks is where the boiler is fitted. */
function tank(): Candidate {
  const p: Parts = [];
  wheels(p, [-0.9, 0, 0.9], 0.32);
  pair(p, 'wheels', DARK, [0.63, 0.66], [0.42, 0.52], [-0.95, 0.95]);
  box(p, 'body', DARK, [-0.4, 0.4], [0.3, 0.86], [-1.7, 1.7]);
  box(p, 'body', DARK, [-0.85, 0.85], [0.84, 0.92], [-1.8, 1.8]);
  box(p, 'body', RED, [-0.85, 0.85], [0.42, 0.76], [1.68, 1.88]);
  box(p, 'body', RED, [-0.85, 0.85], [0.42, 0.76], [-1.88, -1.68]);
  buffers(p, 2.07, 0.6);
  buffers(p, -2.07, 0.6);
  // The cowcatcher: five slats leaning forward under the buffers.
  for (const x of [-0.5, -0.25, 0, 0.25, 0.5])
    p.push({ kind: 'box', m: 'body', c: DARK, min: [x - 0.05, 0.14, 1.82], max: [x + 0.05, 0.2, 2.28], tilt: 0.6 });
  pair(p, 'body', RED, [0.42, 0.84], [0.9, 1.7], [-0.55, 1.2]); // side tanks
  for (const x of [-0.63, 0.63]) cy(p, 'body', BRASS, 0.9, [1.68, 1.76], 0.1, 0.1, 12, x); // filler caps
  box(p, 'body', RED, [-0.74, 0.74], [0.88, 1.5], [-1.78, -1.4]); // bunker
  box(p, 'body', DARK, [-0.66, 0.66], [1.45, 1.6], [-1.74, -1.44]); // coal
  cab(p, 0.78, [0.87, 2.0], [-1.42, -0.5], { hx: 0.88, z: [-1.88, -0.38] });
  pair(p, 'body', BRASS, [0.06, 0.4], [0.9, 1.02], [-0.2, -0.06]);
  pair(p, 'body', BRASS, [0.06, 0.4], [0.9, 1.02], [0.9, 1.04]);
  cz(p, 'boiler', RED, 1.4, [-0.6, 1.25], 0.42, 24);
  cz(p, 'boiler', DARK, 1.4, [1.15, 1.6], 0.45, 24);
  cz(p, 'boiler', DOOR, 1.4, [1.59, 1.63], 0.28, 20);
  cy(p, 'boiler', DARK, 1.38, [1.7, 2.3], 0.14, 0.18);
  cy(p, 'boiler', DARK, 1.38, [2.26, 2.36], 0.21, 0.21);
  sphere(p, 'boiler', BRASS, [0, 1.8, 0.35], 0.22, 0.9);
  lashing(p, 1.4, 0.42, [0.0, 0.8]);
  ring(p, 'speed', BRASS, 'z', [0, 1.4, 1.2], 0.475, 0.025);
  pair(p, 'speed', BRASS, [0.845, 0.875], [0.82, 0.94], [-1.75, 1.75]);
  sphere(p, 'speed', BRASS, [0, 1.75, -0.25], 0.16, 0.9);
  ring(p, 'speed', BRASS, 'y', [0, 2.36, 1.38], 0.21, 0.025);
  pair(p, 'speed', BRASS, [0.83, 0.86], [1.3, 1.36], [-0.5, 1.15]); // brass tank bands
  steam(p, 0, 2.36, 1.38);
  return { id: 'c', name: 'Tank engine', hx: 0.85, hz: 1.8, parts: p };
}

export const CANDIDATES: Record<EngineId, Candidate> = { a: stubby(), b: longer(), c: tank() };

/** The upgrade states the plans name, and the modules each one draws. `twin` is two boiler-state engines coupled. */
export const STATES = [
  { id: 'base', label: 'Old train: no boiler, empty saddles, rust', modules: ['body', 'wheels'] },
  {
    id: 'boiler',
    label: 'Boiler fitted: boiler, gold lashing, steam',
    modules: ['body', 'wheels', 'boiler', 'lashing', 'steam'],
  },
  {
    id: 'speed',
    label: 'Speed (parked): brass band, second dome',
    modules: ['body', 'wheels', 'boiler', 'lashing', 'steam', 'speed'],
  },
  {
    id: 'twin',
    label: 'Second engine (parked): two coupled',
    modules: ['body', 'wheels', 'boiler', 'lashing', 'steam'],
  },
] as const satisfies readonly { id: string; label: string; modules: readonly Module[] }[];
export type StateId = (typeof STATES)[number]['id'];

/** Triangles three.js builds for one part (Box 12, Cylinder 4·seg, Sphere seg·(2·seg/2 − 2), Torus 2·6·seg). */
export const TORUS_RADIAL = 6;
export function triangles(part: Part, wheelTriangles = 0) {
  if (part.kind === 'box') return 12;
  if (part.kind === 'cyl') return 4 * part.seg;
  if (part.kind === 'sphere') return part.seg * (part.seg - 2);
  if (part.kind === 'torus') return 2 * TORUS_RADIAL * part.seg;
  return wheelTriangles;
}

/** Axis-aligned faces facing the same way, in the same plane, overlapping: the z-fighting the owner saw where the red
 * cab met its dark base (both boxes ended at z −1.5 and −0.5 in today's shell). Boxes and cylinder end caps only;
 * tilted boxes, spheres and rings can't share a plane with an axis-aligned face. */
export function coplanarFaces(parts: readonly Part[], eps = 0.002) {
  type Face = { i: number; axis: 0 | 1 | 2; sign: 1 | -1; at: number; lo: [number, number]; hi: [number, number] };
  const faces: Face[] = [];
  const other = (axis: 0 | 1 | 2) => [0, 1, 2].filter((a) => a !== axis) as [number, number];
  parts.forEach((p, i) => {
    let min: V, max: V, axes: (0 | 1 | 2)[];
    if (p.kind === 'box' && !p.tilt) [min, max, axes] = [p.min, p.max, [0, 1, 2]];
    else if (p.kind === 'cyl') {
      const a = ({ x: 0, y: 1, z: 2 } as const)[p.axis],
        r = Math.max(p.r0, p.r1);
      const lo = [...p.at] as [number, number, number],
        hi = [...p.at] as [number, number, number];
      for (const k of other(a)) [lo[k], hi[k]] = [p.at[k]! - r, p.at[k]! + r];
      [lo[a], hi[a]] = [p.at[a]! - p.len / 2, p.at[a]! + p.len / 2];
      [min, max, axes] = [lo, hi, [a]];
    } else return;
    for (const axis of axes) {
      const [u, v] = other(axis);
      for (const sign of [-1, 1] as const)
        faces.push({
          i,
          axis,
          sign,
          at: sign > 0 ? max[axis]! : min[axis]!,
          lo: [min[u]!, min[v]!],
          hi: [max[u]!, max[v]!],
        });
    }
  });
  const hits: string[] = [];
  for (let a = 0; a < faces.length; a++)
    for (let b = a + 1; b < faces.length; b++) {
      const f = faces[a]!,
        g = faces[b]!;
      if (f.i === g.i || f.axis !== g.axis || f.sign !== g.sign || Math.abs(f.at - g.at) > eps) continue;
      const du = Math.min(f.hi[0], g.hi[0]) - Math.max(f.lo[0], g.lo[0]),
        dv = Math.min(f.hi[1], g.hi[1]) - Math.max(f.lo[1], g.lo[1]);
      if (du > 1e-4 && dv > 1e-4)
        hits.push(`parts ${f.i} and ${g.i}: ${'xyz'[f.axis]}=${f.at} (${f.sign > 0 ? '+' : '−'})`);
    }
  return hits;
}

/** Overall extents of the modules a state draws. */
export function extents(c: Candidate, modules: readonly Module[]) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  const grow = (lo: V, hi: V) =>
    lo.forEach((_, k) => ((min[k] = Math.min(min[k]!, lo[k]!)), (max[k] = Math.max(max[k]!, hi[k]!))));
  for (const p of c.parts) {
    if (!modules.includes(p.m)) continue;
    if (p.kind === 'box') grow(p.min, p.max);
    else if (p.kind === 'wheel')
      grow([p.at[0] - 0.06, p.at[1] - p.r, p.at[2] - p.r], [p.at[0] + 0.06, p.at[1] + p.r, p.at[2] + p.r]);
    else {
      const r = p.kind === 'cyl' ? Math.max(p.r0, p.r1) : p.kind === 'torus' ? p.r + p.tube : p.r;
      const h = p.kind === 'cyl' ? p.len / 2 : r;
      const e = [r, r, r];
      if (p.kind === 'cyl') e[{ x: 0, y: 1, z: 2 }[p.axis]] = h;
      grow([p.at[0] - e[0]!, p.at[1] - e[1]!, p.at[2] - e[2]!], [p.at[0] + e[0]!, p.at[1] + e[1]!, p.at[2] + e[2]!]);
    }
  }
  return { min, max };
}
