// The map prototypes' data as the greybox reads it: docs/world/map-prototypes.html's #map-data JSON is the one source
// for the 2D page and the 3D blockout. Pure (no three.js, no DOM), so Node scripts can load it with the page's text.
// Shared by the production horizon and dev greybox. Place-local metres: x east, z south; world = local + ORIGIN.
// The geometry helpers copy the page's own (blobPts, mulberry), so outlines match the drawn map exactly.

import { HALTS, LINES, ORIGIN, lineAt } from '../place/layout.ts';
import { HEADS, headPoints } from '../place/home-station.ts';
import { LINE2_BOILER, LINE2_STATIONS } from '../sim/railway-line2-layout.ts';
import { SHED_STALL, SHED_TABLE, WORKS_BREAKER, WORKS_SEAMS } from '../sim/railway-works-layout.ts';

export type XZ = [x: number, z: number];
/** A stage, or `{ c, s: [if side c is picked first, if second] }`; null means never. A is the first branch's side. */
export type Staged = number | null | { c: 'A' | 'B'; s: [number | null, number | null] };
export type Pick = 'A' | 'B';

export type Shelf = { w: number; kind: 'sand' | 'rock' };
export type Land = {
  id: string;
  on?: string[];
  seen?: Staged;
  c?: XZ;
  r?: XZ;
  rot?: number;
  seed?: number;
  rough?: number;
  poly?: XZ[];
  biome?: string;
  /** false: backdrop, seen and never walked. */
  walk?: boolean;
  /** Greybox fields (all optional; the page ignores them). */
  top?: number;
  geology?: string;
  shelf?: Shelf;
  tint?: string;
  /** A kit shape placed several times: every land with the same module shares one mesh. */
  module?: string;
  /** Clipped to its own side of the named terrain line (a split stack), leaving `gap` metres between the halves. */
  clip?: { by: string; gap: number };
  /** Already built (the classic island): the greybox draws nothing for it. */
  existing?: boolean;
  /** A terrace on another land (counted once on the page). */
  tier?: boolean;
  /** A far silhouette layer (the mainland). */
  horizon?: boolean;
};
export type Terrain = {
  kind: string;
  land?: string;
  c?: XZ;
  r?: XZ;
  pts?: XZ[];
  seed?: number;
  label?: string;
  labelAt?: XZ;
  /** forest: crown tops, metres above the sea (the walkable forest). */
  h?: number;
  /** forest: height above the ground where the crowns start (default 40% of the height). */
  crownFrom?: number;
  /** forest: tree count multiplier (default 1). */
  density?: number;
  /** forest: mother trees [x, z], taller than the rest. */
  mothers?: XZ[];
  /** forest: mother-tree crown tops, metres above the sea (default 150). */
  motherH?: number;
};
export type Place = {
  id: string;
  name: string;
  kind: string;
  at: XZ;
  reach?: Staged;
  seen?: Staged;
  gives?: string;
  note?: string;
  minor?: boolean;
};
export type Line = {
  id: string;
  name: string;
  from: string;
  to: string;
  kind: string;
  stage: Staged;
  pts: XZ[];
  /** Authored deck metres above sea, one per point; null uses the terrain/station deck. */
  heights?: (number | null)[];
  style?: string;
  note?: string;
};
export type Gate = { id: string; name: string; at: XZ; needs?: string; note?: string };
export type Secret = { id: string; name: string; at: XZ; note?: string };
export type Sight = { from: string; to: string; note: string };
export type Landmark = {
  id: string;
  kind: 'crane' | 'arch' | 'pinnacle' | 'waterfall' | 'saltworks' | 'lamps' | string;
  at?: XZ;
  base?: number;
  h?: number;
  jib?: number;
  span?: number;
  bearing?: number;
  light?: boolean;
  lantern?: boolean;
  land?: string;
  line?: string;
  every?: number;
  note?: string;
};
export type Harbour = {
  place: string;
  breakwater: XZ[];
  head: XZ;
  mouth: XZ;
  quay: XZ[];
  /** x, z, width, depth, height */
  warehouses: [number, number, number, number, number][];
  moorings: XZ[];
  /** Greybox only: the basin's sea floor, metres below the sea. At the quay foot, across the basin, and at the mouth
   * (past it the floor runs on down to the open sea). The water reads its colour from this depth. */
  seabed?: { quay: number; basin: number; mouth: number };
  note?: string;
};
export type Backdrop = {
  land: string;
  city: XZ;
  /** x, z, height */
  towers: [number, number, number][];
  lighthouse: [number, number, number];
  smoke: XZ;
  note?: string;
};
/** Line-2 works (greybox only; the page ignores them): pinned from Place's layout and the railway catalog. `s` is metres
 * along `line` ('l1' = Place's north line, 'l2' = its east line) at the nearest rail; `off` how far to its side the mark
 * stands. Nothing here is solid: the real railway is, or will be, laid there. */
export type Work = {
  id: string;
  name: string;
  at: XZ;
  kind: 'frame' | 'gate' | 'chest' | 'halt' | 'boiler' | 'train' | 'works';
  line?: 'l1' | 'l2';
  s?: number;
  off?: number;
  note?: string;
};
export type Ambient = { id: string; name: string; kind: string; speed: number; phase: number; pts: XZ[] };
export type Option = {
  id: string;
  name: string;
  land: Land[];
  terrain?: Terrain[];
  places: Place[];
  lines: Line[];
  gates?: Gate[];
  secrets?: Secret[];
  sights?: Sight[];
  landmarks?: Landmark[];
  harbour?: Harbour;
  backdrop?: Backdrop;
  ambient?: Ambient[];
};
export type MapData = {
  ride: { speed: number; accelS: number; dwellS: number; boardS: number };
  common: { land: Land[]; places: Place[]; lines: Line[]; works?: Work[] };
  options: Option[];
};

/** The JSON block inside the page. */
export function parseMapPage(html: string): MapData {
  const m = /<script type="application\/json" id="map-data">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error('map-prototypes.html has no #map-data block');
  return JSON.parse(m[1]!) as MapData;
}

/** Refresh Home's built marks and heads before the world-blockout generator writes the page's shared JSON.
 * Other options and the authored rail points beyond the station's joins keep their shapes. */
export function syncHomeMap(data: MapData): MapData {
  const local = (p: { x: number; z: number }): XZ => [p.x / 100 - ORIGIN.x, p.z / 100 - ORIGIN.z];
  const anchors: Record<string, { x: number; z: number }> = {
    Q1: LINE2_STATIONS[0]!,
    Q2: LINE2_STATIONS[1]!,
    boiler: LINE2_BOILER,
    breaker: WORKS_BREAKER,
    'stall-slab': WORKS_SEAMS[0],
    stall: SHED_STALL,
    turntable: SHED_TABLE,
  };
  for (const w of data.common.works ?? []) {
    if (anchors[w.id]) w.at = local(anchors[w.id]!);
    const halt = w.id === 'halt-village' ? HALTS[0] : w.id === 'halt-village-line-2' ? HALTS[2] : null;
    if (halt) {
      const p = { x: 0, z: 0, ux: 0, uz: 0 };
      w.s = (halt.s0 + halt.s1) / 2;
      w.off = Math.abs(halt.lat);
      lineAt(halt.line === 0 ? LINES.north : LINES.east, w.s, p);
      w.at = [p.x - p.uz * halt.lat, p.z + p.ux * halt.lat];
    }
  }
  for (const road of [0, 1] as const) {
    const line = data.common.lines.find((l) => l.id === (road === 0 ? 'l1' : 'l2a'));
    if (!line) continue;
    const rail = road === 0 ? LINES.north : LINES.east;
    const join = HEADS[road].join;
    // Keep the authored tail after the join; on reruns this also drops the previously generated head samples.
    const tail = line.pts.filter(([x, z]) => {
      let nearest = 0,
        best = Infinity;
      for (let s = 0; s < rail.xs.length; s++) {
        const d = Math.hypot(x - rail.xs[s]!, z - rail.zs[s]!);
        if (d < best) {
          best = d;
          nearest = s;
        }
      }
      return nearest > join;
    });
    const points = headPoints(road);
    line.pts = [...points.filter((_, i) => i % 4 === 0 || i === points.length - 1).map((p): XZ => [p.x, p.z]), ...tail];
  }
  return data;
}

// ---------------------------------------------------------------- geometry, as the page draws it
export const mulberry = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export function blobPts(c: XZ, r: XZ, seed = 1, rough = 0.15, rot = 0, n = 18): XZ[] {
  const rnd = mulberry(seed * 9973);
  const k = (rot * Math.PI) / 180;
  const out: XZ[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const f = 1 + rough * (rnd() * 2 - 1);
    const x = Math.cos(a) * r[0] * f;
    const z = Math.sin(a) * r[1] * f;
    out.push([c[0] + x * Math.cos(k) - z * Math.sin(k), c[1] + x * Math.sin(k) + z * Math.cos(k)]);
  }
  return out;
}
/** Closed Catmull-Rom through the points, `k` samples per edge: the page draws outlines smoothed too. */
export function smoothRing(pts: XZ[], k = 3): XZ[] {
  const n = pts.length,
    out: XZ[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!,
      p1 = pts[i]!,
      p2 = pts[(i + 1) % n]!,
      p3 = pts[(i + 2) % n]!;
    for (let s = 0; s < k; s++) {
      const t = s / k,
        t2 = t * t,
        t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
/** Keeps the part of a polygon where `side(p) >= 0` (Sutherland-Hodgman against one straight line). */
export function clipHalf(pts: XZ[], side: (p: XZ) => number): XZ[] {
  const out: XZ[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!,
      b = pts[(i + 1) % pts.length]!,
      sa = side(a),
      sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
export function inside(p: XZ, poly: XZ[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!,
      [xj, zj] = poly[j]!;
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}
export const polyLen = (pts: XZ[]) =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]), 0);
/** Distance from a point to a polyline. */
export function distToLine(p: XZ, pts: XZ[]) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i]!,
      [bx, bz] = pts[i + 1]!;
    const dx = bx - ax,
      dz = bz - az,
      t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(ax + dx * t - p[0], az + dz * t - p[1]));
  }
  return best;
}
export function stageOf(s: Staged | undefined, pick: Pick): number | null {
  if (s === undefined || s === null) return null;
  if (typeof s === 'number') return s;
  return s.c === pick ? s.s[0] : s.s[1];
}

// ---------------------------------------------------------------- one option, merged with the common map
export type Layout = {
  option: Option;
  pick: Pick;
  ride: MapData['ride'];
  places: Place[];
  lines: Line[];
  works: Work[];
  land: (Land & { outline: XZ[] })[];
  terrain: Terrain[];
  gates: Gate[];
  secrets: Secret[];
  sights: Sight[];
  landmarks: Landmark[];
  ambient: Ambient[];
};
/** The option's outlines (smoothed, clipped), with the common places and lines it builds on. */
export function layout(data: MapData, optionId: string, pick: Pick = 'A'): Layout {
  const option = data.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`No map option "${optionId}"; options: ${data.options.map((o) => o.id).join(', ')}`);
  const terrain = option.terrain ?? [];
  const land = [...data.common.land, ...option.land].map((g) => {
    let outline: XZ[] = g.poly ?? smoothRing(blobPts(g.c!, g.r!, g.seed, g.rough, g.rot ?? 0));
    const by = g.clip && terrain.find((t) => t.kind === g.clip!.by && t.land && t.pts);
    if (g.clip && by?.pts && g.c) {
      // Keep the land's own side of the line through the cut's ends, `gap / 2` from it.
      const [a, b] = [by.pts[0]!, by.pts[by.pts.length - 1]!];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / len,
        nz = (b[0] - a[0]) / len;
      const sideOf = (p: XZ) => (p[0] - a[0]) * nx + (p[1] - a[1]) * nz;
      const sign = Math.sign(sideOf(g.c)) || 1;
      outline = clipHalf(outline, (p) => sign * sideOf(p) - g.clip!.gap / 2);
    }
    return { ...g, outline };
  });
  return {
    option,
    pick,
    ride: data.ride,
    places: [...data.common.places, ...option.places],
    // An option's own line replaces the shared one of its id (where the shared one stood); the rest follow.
    lines: [
      ...data.common.lines.map((l) => option.lines.find((o) => o.id === l.id) ?? l),
      ...option.lines.filter((o) => !data.common.lines.some((l) => l.id === o.id)),
    ],
    works: data.common.works ?? [],
    land,
    terrain,
    gates: option.gates ?? [],
    secrets: option.secrets ?? [],
    sights: option.sights ?? [],
    landmarks: option.landmarks ?? [],
    ambient: option.ambient ?? [],
  };
}

/** The economy model's ride time for a run of links (the page's own settings). */
export const rideSeconds = (ride: MapData['ride'], lens: number[]) =>
  ride.boardS + lens.reduce((s, len) => s + len / ride.speed + ride.accelS + ride.dwellS, 0);
