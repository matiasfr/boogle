// node dev/level/world-blockout.ts [--check]: the whole-map blockout's two derived files, from the Sickle Isles JSON in
// docs/world/map-prototypes.html and Place's real line 2 (docs/plans/world-blockout.md):
//   src/sim/railway-world-lines.ts    every future line as a pinned catalog in the sim's own shape (world cm, stops, halts)
//   docs/world/world-blockout.html  the top-down map and its tables, for the owner's review
//   docs/world/map-prototypes.html  the Sickle Isles option's rails (points, heights) for those links, from the catalog
//   dev/level/world-blockout-authored.json  what those links were before (the generator's own input, not the live game's)
// `--check` writes nothing and exits 1 if either file is stale (test/world-lines.test.ts runs the same comparison).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { pageJson } from './page-data.ts';
import {
  HALTS,
  LINES,
  LINKS,
  ORIGIN,
  ROOM_PLOTS,
  SPIRE,
  TOWN,
  TURNTABLE,
  FORGE,
  lineAt,
  railY,
  FAR,
} from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { GATES, GATE_SLAB, PILLARS } from '../../src/place/tech-layout.ts';
import { FRAME_D, FRAME_W, frameBesideLine } from '../../src/place/spatial-station.ts';
import {
  layout,
  parseMapPage,
  syncHomeMap,
  polyLen,
  smoothRing,
  type Line,
  type XZ,
} from '../../src/sickle/map-data.ts';
import { RING_CONES } from '../../src/proto/greybox/ground.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CATALOG = 'src/sim/railway-world-lines.ts';
const PAGE = 'docs/world/world-blockout.html';
const STILLS = 'docs/world/world-blockout';

type Leg = { id: string; reverse?: boolean };
type HaltSpec = { name: string; place?: string; at?: 'end' | 'start'; nearPt?: XZ; deck?: number };
type Service = { id: string; name: string; extends?: 1; legs: Leg[]; halts: HaltSpec[]; note: string };
type Turn = 'crossover' | 'loop' | null;

/** Every corridor is double track (owner, 10 November): two tracks on 4 m centres. The gauge is the village's: rails 0.5 m
 * either side of the centre (src/entities/railway/track.ts), on a 3.6 m deck, so the formation is 7.6 m wide. Halts get a
 * platform outside each track. */
const FORMATION = { tracks: 2, centresCm: 400, gaugeCm: 100, deckCm: 760, platformCm: 580, loopCm: 4000 };
/** How each line's ends turn a train back without reversing it: a scissors crossover just short of the terminus
 * platform, or a single-track balloon loop past it where the island has room. Null: the line runs on (line 2's end). */
const TURNBACKS: Record<string, [start: Turn, end: Turn]> = {
  ring: [null, 'crossover'],
  ns: ['crossover', 'loop'],
  bay: ['crossover', 'loop'],
  'bay-trestle': ['crossover', 'crossover'],
  cave: ['crossover', 'crossover'],
};

/** The future lines as train services, rail-map's five (docs/plans/rail-map.md, "The shape it gives the network"; the
 * greybox route's step 1): which map links each runs over, in order, and where it stops. Line 1 is not a future line.
 * High Port is a crane lift, not a rail leg, so the `lift` link is in no service. The White Wall grows from Port Quay on
 * the `cave` row (greybox-route design review, ruling 2): its `s` keeps growing to the Gorge, where it ends beside
 * line 2 as a second platform. `deck` is a halt's deck where no map place names it. */
const SERVICES: Service[] = [
  {
    id: 'ring',
    name: 'Line 2 to High Gorge',
    extends: 1,
    legs: [{ id: 'ringx' }, { id: 'ledge' }],
    halts: [
      { name: 'Ring Island halt', nearPt: [414, -820], deck: 8 },
      { name: 'High Gorge', place: 'gorge' },
    ],
    note: "Line 2's own extension: over the bow to the Ring Island halt (build 1), on along the island's west shore and out over the sea to the split stack. No Ring top junction (ruling 3).",
  },
  {
    id: 'ns',
    name: 'North-south line',
    legs: [{ id: 'incline', reverse: true }, { id: 'final' }],
    halts: [
      { name: 'High Gorge', place: 'gorge' },
      { name: 'Bell Rock', place: 'bell', deck: 4 },
      { name: 'Original Island', place: 'original' },
    ],
    note: "The Gorge's low station at the water, Bell Rock (stage 4), and the last line over the shallows to The Boogler's island.",
  },
  {
    id: 'bay',
    name: 'Bay line',
    legs: [{ id: 'bay-cut' }, { id: 'bell-canopy' }, { id: 'notch-tunnel' }],
    halts: [
      { name: 'West landing', place: 'home' },
      { name: 'Bell Rock', place: 'bell' },
      { name: 'Canopy Town', place: 'canopy' },
      { name: 'Lantern Notch', place: 'notch' },
    ],
    note: "Home's West landing straight across the bay to Bell Rock (the shortcut), on through the cleft to Canopy Town and out to the Notch.",
  },
  {
    id: 'bay-trestle',
    name: 'Bay trestle',
    legs: [{ id: 'ring-bell' }],
    halts: [
      { name: 'Ring Island halt', nearPt: [414, -820], deck: 8 },
      { name: 'Bell Rock', place: 'bell' },
    ],
    note: 'Only built when Canopy Town is the first branch (the island-to-Canopy line); otherwise the shortcut makes it unnecessary.',
  },
  {
    id: 'cave',
    name: 'Cave line and the White Wall',
    legs: [{ id: 'seacave' }, { id: 'salt-quay' }, { id: 'wall-s' }, { id: 'wall-n' }],
    halts: [
      { name: 'West landing', place: 'home' },
      { name: 'Saltpan Halt', place: 'saltpan' },
      { name: 'Port Quay', place: 'quay' },
      { name: 'Canopy Town', place: 'canopy' },
      { name: 'High Gorge', place: 'gorge' },
    ],
    note: "Through the sea cave the powered pick opens, past the Saltpan and along the breakwater to Port Quay, then the White Wall at the chalk's foot to Canopy Town and its last span, on crystal collars, to the Gorge.",
  },
];

/** The greybox ride round the whole network: Home, Ring Island, the Gorge, the Wall, Port Quay and back through the cave. */
const FULL_LOOP: Leg[] = [
  { id: 'l2a' },
  { id: 'l2b' },
  { id: 'ringx' },
  { id: 'ledge' },
  { id: 'wall-n', reverse: true },
  { id: 'wall-s', reverse: true },
  { id: 'salt-quay', reverse: true },
  { id: 'seacave', reverse: true },
];

const html = fs.readFileSync(ROOT + 'docs/world/map-prototypes.html', 'utf8');
const MAP = syncHomeMap(parseMapPage(html));
const A = layout(MAP, 'sickle', 'A');
const B = layout(MAP, 'sickle', 'B');

// ---------------------------------------------------------------- the rulings applied to the map's drawn lines
// The catalog follows the 10 November rulings (docs/plans/world-blockout.md, "The ruling grade"): trains run low, a deck
// meets an island at its height, and no span is steeper than 4%. The map JSON's heights predate them (they jump onto
// cliffs at 45 to 340%), so the heights here come from the rulings, not from `heights`: a station's deck, a plateau
// where the JSON holds a deck at an island's height, and the sea deck everywhere else. A line eases between them at the
// ruling grade, beside the higher end. The JSON's rails for these links are then written back from the catalog
// (`mapPage`) into the Sickle Isles option's own lines; what they were stays in AUTHORED_FILE, the only copy of them this
// file reads, so a rerun is stable. The 2D map page and the live blockout then draw the catalog's own rails, and the
// shared `common` lines (and the options the owner did not choose) stay as authored.
const SEA_DECK = 4;
/** An authored height above this is a cliff or a summit the JSON climbed onto: the line stays at the sea deck instead. */
const DECK_CAP = 16;
/** The eased grade (3.9%): under the ruling 4%, with the margin a centimetre of rounding needs on a 12 m chord. */
const GRADE = 0.039;
/** Station decks, metres (rulings 3 and 5: the Gorge halt low in the split, Port Quay at the harbour, one West landing). */
const DECKS: Record<string, number> = {
  home: 4,
  saltpan: 3,
  quay: 3,
  gorge: 3,
  bell: 15,
  canopy: 13,
  notch: 7,
  original: 4,
};

/** A smooth route through keys [point, heading in degrees (0 east, 90 south), tangent length], a vertex every 15 m. */
function hermite(keys: [XZ, number, number][]): XZ[] {
  const out: XZ[] = [];
  for (let k = 0; k < keys.length - 1; k++) {
    const [p0, h0, m0] = keys[k]!,
      [p1, h1, m1] = keys[k + 1]!;
    const t0 = [Math.cos((h0 * Math.PI) / 180) * m0, Math.sin((h0 * Math.PI) / 180) * m0];
    const t1 = [Math.cos((h1 * Math.PI) / 180) * m1, Math.sin((h1 * Math.PI) / 180) * m1];
    const n = Math.max(2, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 15));
    for (let i = k ? 1 : 0; i <= n; i++) {
      const t = i / n,
        a = 2 * t ** 3 - 3 * t ** 2 + 1,
        b = t ** 3 - 2 * t ** 2 + t,
        c = -2 * t ** 3 + 3 * t ** 2,
        d = t ** 3 - t ** 2;
      out.push([
        Math.round((a * p0[0] + b * t0[0]! + c * p1[0] + d * t1[0]!) * 100) / 100,
        Math.round((a * p0[1] + b * t0[1]! + c * p1[1] + d * t1[1]!) * 100) / 100,
      ]);
    }
  }
  return out;
}

/** Line 2's bow ends at the Ring Island halt (ringx's fifth vertex, the halt's north end at u 458). From there the stack line
 * turns west and runs out along the island's southern then western shore, over a cutting for the first 300 m or so (ruling 3:
 * the junction is the halt, the cone's summit a walked-up lookout), clear of the cones' waterline, then straight down the
 * split end-on at 31° north of west (ruling 5). R 90 m at its tightest; 2.05 km to the Gorge. */
const ISLAND_HALT: XZ = [414.46, -830.08];
const GORGE_AT: XZ = [-1103, -1988];
const SHORE_OUT = hermite([
  [ISLAND_HALT, 270, 150],
  [[314.46, -930.08], 180, 150],
  [[100, -905], 184, 260],
]);
const STACK_LEDGE = [
  ...SHORE_OUT,
  ...hermite([
    [[100, -905], 184, 260],
    [[-150, -950], 200, 300],
    [[-550, -1280], 214, 600],
    [GORGE_AT, 211.2, 600],
  ]).slice(1),
];

type Route = { pts: XZ[]; heights?: (number | null)[]; ruled?: boolean; from?: string };
/** A line's points and heights before the rulings. A sidecar, not part of the page: the live game imports the page raw. */
type Authored = { pts: XZ[]; heights?: (number | null)[] };
const AUTHORED_FILE = 'dev/level/world-blockout-authored.json';
const AUTHORED: Record<string, Authored> = fs.existsSync(ROOT + AUTHORED_FILE)
  ? JSON.parse(fs.readFileSync(ROOT + AUTHORED_FILE, 'utf8'))
  : {};
const authoredOf = (l: Line): Authored => AUTHORED[l.id] ?? l;
const lineOf = (id: string): Line => {
  const l = A.lines.find((x) => x.id === id);
  if (!l) throw new Error(`no map line ${id}`);
  const { pts, heights } = authoredOf(l);
  return { ...l, pts, heights };
};
const NULLS = (n: number) => Array.from({ length: n }, () => null);
/** The links the rulings redraw; every other link runs as the map JSON draws it. `ruled`: its heights are the rulings' own
 * (the bow's 24.3 m is not a cliff). */
const ROUTES: Record<string, Route> = {
  // The bow ends at the island halt (no Ring top); the pier head and first bent at 24.3 m, then 4% down to the halt.
  ringx: { pts: lineOf('ringx').pts.slice(0, 5), heights: [24.3, 24.3, null, null, null], ruled: true },
  ledge: { pts: STACK_LEDGE },
  // Bell Rock on two levels (rail-map question 3): the bay line on the skerry at 15 m, the north-south line at the water.
  incline: { pts: lineOf('incline').pts, heights: NULLS(lineOf('incline').pts.length) },
  final: { pts: lineOf('final').pts, heights: NULLS(lineOf('final').pts.length) },
  // The bay trestle leaves the same halt and the same shore, then runs on to Bell Rock as drawn.
  'ring-bell': {
    pts: [...SHORE_OUT, ...lineOf('ring-bell').pts.slice(16)],
    heights: [...NULLS(SHORE_OUT.length), ...lineOf('ring-bell').heights!.slice(16)],
  },
  // One West landing: the cave line starts at the bay line's station (ruling 6), 25 m off the cave mouth it is to meet.
  seacave: { pts: [[-199, 10], [-205, 75], ...lineOf('seacave').pts.slice(1)] },
  // The White Wall's south end starts from the quay, not the 55 m top the lift reaches (ruling 4's knock-on): the link
  // runs quay to Canopy, so the lift is its own link and a trip over both is not counted twice (`from`).
  'wall-s': {
    from: 'quay',
    pts: [
      ...hermite([
        [[-880, 960], 150, 250],
        [[-1535, 840], 235.5, 300],
      ]),
      ...lineOf('wall-s').pts.slice(8),
    ],
    heights: [
      ...NULLS(
        hermite([
          [[-880, 960], 150, 250],
          [[-1535, 840], 235.5, 300],
        ]).length,
      ),
      ...lineOf('wall-s').heights!.slice(8),
    ],
  },
};
/** A leg's vertices (x, z in map metres) and the heights it asks for (null: none), in the direction it is ridden. */
function routeOf(id: string, reverse = false) {
  const line = lineOf(id),
    over = ROUTES[id];
  const pts = [...(over?.pts ?? line.pts)];
  const raw = over ? (over.heights ?? NULLS(pts.length)) : (line.heights ?? NULLS(pts.length));
  const hs = pts.map((_, i) => {
    const h = raw[i] ?? null;
    return h === null || over?.ruled || h <= DECK_CAP ? h : null;
  });
  if (reverse) {
    pts.reverse();
    hs.reverse();
  }
  return { pts, hs };
}

type Vtx = { x: number; z: number; h: number | null; leg: number };
/** A service's vertices in centimetres, legs end to end (a leg's first vertex is the last one of the leg before). */
function vertices(svc: Service): Vtx[] {
  const out: Vtx[] = [];
  svc.legs.forEach((leg, k) => {
    const { pts, hs } = routeOf(leg.id, leg.reverse);
    pts.forEach((p, i) => {
      const v = { x: cm(p[0] + ORIGIN.x), z: cm(p[1] + ORIGIN.z), h: hs[i] ?? null, leg: k };
      const last = out.at(-1);
      if (last && last.x === v.x && last.z === v.z) {
        last.h ??= v.h;
        return;
      }
      out.push(v);
    });
  });
  return out;
}

/** The deck's height (metres) at `s` metres along a service. Hills (a station's deck, a plateau the JSON holds at an
 * island's height) and dips (a station below the sea deck) hold their height along their length and ease to the sea deck at
 * the ruling grade; elsewhere it is the sea deck. */
function deckProfile(V: Vtx[], at: number[], stopsM: number[], svc: Service) {
  type Plateau = { a: number; b: number; y: number };
  const plateaus: Plateau[] = [];
  let run: Plateau | null = null;
  V.forEach((v, i) => {
    if (v.h === null || Math.abs(v.h - SEA_DECK) < 0.05) return;
    if (run && Math.abs(run.y - v.h) < 0.005) run.b = at[i]!;
    else plateaus.push((run = { a: at[i]!, b: at[i]!, y: v.h }));
  });
  svc.halts.forEach((h, k) => {
    const y = h.deck ?? (h.place ? DECKS[h.place] : undefined);
    if (y === undefined || y === SEA_DECK) return;
    plateaus.push({ a: stopsM[k]! - 20, b: stopsM[k]! + 20, y });
  });
  return (s: number) => {
    let hi = SEA_DECK,
      lo = SEA_DECK;
    for (const p of plateaus) {
      const d = Math.max(0, p.a - s, s - p.b);
      if (p.y > SEA_DECK) hi = Math.max(hi, p.y - GRADE * d);
      else lo = Math.min(lo, p.y + GRADE * d);
    }
    return hi > SEA_DECK ? hi : lo;
  };
}
const stageIn = (id: string, pick: 'A' | 'B') => {
  const l = (pick === 'A' ? A : B).lines.find((x) => x.id === id)!;
  const s = l.stage;
  return typeof s === 'number' || s === null ? s : s.c === pick ? s.s[0] : s.s[1];
};
const cm = (m: number) => Math.round(m * 100);
const LINE2_CM = cm(LINES.east.len);
const SPEED = { cruise: 200, step: 250, accel: 3.5 }; // cm a tick (20, 25 m/s), cm a tick² (the sim's TRAIN)

type Built = {
  id: string;
  name: string;
  extends: number | null;
  fromCm: number;
  lengthCm: number;
  pts: [number, number, number][];
  legs: { id: string; reverse: boolean; fromCm: number; toCm: number; stage: [number | null, number | null] }[];
  stops: number[];
  halts: { name: string; stop: number; x: number; z: number; y: number; reach: number }[];
  ends: { at: 'start' | 'end'; kind: 'crossover' | 'loop'; sCm: number; x: number; z: number; y: number }[];
  note: string;
};

type Pt3 = { x: number; z: number; y: number; leg: number; s?: number };
/** Points end to end as the catalog keeps them: no repeated x, z; `along` the centimetres from `fromCm`; each leg's span. */
function lay(P: Pt3[], fromCm: number, nLegs: number) {
  const pts: [number, number, number][] = [];
  const along: number[] = [];
  const legAt: { from: number; to: number }[] = Array.from({ length: nLegs }, () => ({ from: -1, to: -1 }));
  let s = fromCm;
  for (const q of P) {
    const p: [number, number, number] = [q.x, q.z, q.y];
    const last = pts.at(-1);
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    if (legAt[q.leg]!.from < 0) legAt[q.leg]!.from = s;
    if (last) s += Math.round(Math.hypot(p[0] - last[0], p[1] - last[1]));
    pts.push(p);
    along.push(s);
    legAt[q.leg]!.to = s;
  }
  return { pts, along, s, legAt };
}

function build(svc: Service): Built {
  const fromCm = svc.extends ? LINE2_CM : 0;
  const V = vertices(svc);
  const flat = V.map((v) => ({ x: v.x, z: v.z, y: 0, leg: v.leg }));
  const first = lay(flat, fromCm, svc.legs.length);
  const stopsOf = (L: ReturnType<typeof lay>) => {
    const { pts, along, s } = L;
    const at = (sCm: number) => {
      let i = 1;
      while (i < along.length - 1 && along[i]! < sCm) i++;
      const t = (sCm - along[i - 1]!) / Math.max(1, along[i]! - along[i - 1]!);
      const a = pts[i - 1]!,
        b = pts[i]!;
      return [0, 1, 2].map((k) => Math.round(a[k]! + (b[k]! - a[k]!) * t)) as [number, number, number];
    };
    const nearest = (x: number, z: number) => {
      let best = { d: Infinity, s: 0 };
      for (let k = 0; k <= s - fromCm; k += 100) {
        const p = at(fromCm + k);
        const d = Math.hypot(p[0] - x, p[1] - z);
        if (d < best.d) best = { d, s: fromCm + k };
      }
      return best.s;
    };
    // A halt at a place stands at the line's nearest point to it (Home's at the line's own end), 20 m in from either end
    // so its platform fits.
    const stops = svc.halts.map((h, stop) => {
      const p = A.places.find((x) => x.id === h.place);
      const v = h.nearPt
        ? nearest(cm(h.nearPt[0] + 1000), cm(h.nearPt[1]))
        : h.place === 'home'
          ? stop === 0
            ? fromCm
            : s
          : nearest(cm(p!.at[0] + 1000), cm(p!.at[1]));
      return Math.max(fromCm + 2000, Math.min(s - 2000, v));
    });
    return { at, stops };
  };
  // The deck: stations and island plateaus from the rulings, eased at the ruling grade (see deckProfile). The line's
  // vertices keep their places; a vertex is added where the deck changes slope.
  const m1 = first.along.map((a) => (a - fromCm) / 100); // V and `first` share indexes (V has no repeated x, z)
  const deck = deckProfile(
    V,
    m1,
    stopsOf(first).stops.map((x) => (x - fromCm) / 100),
    svc,
  );
  const total = m1.at(-1)!;
  const yCm = (sM: number) => Math.round(deck(sM) * 100);
  const corners: number[] = [];
  const STEP = 0.25;
  let prev = deck(0);
  let prevSlope = 0;
  for (let t = STEP; t <= total + 1e-9; t += STEP) {
    const y = deck(t);
    const slope = (y - prev) / STEP;
    if (Math.abs(slope - prevSlope) > 1e-6) corners.push(t - STEP);
    prev = y;
    prevSlope = slope;
  }
  const full: Pt3[] = [];
  const MIN_GAP = 12;
  let ci = 0;
  V.forEach((v, i) => {
    const sM = m1[i]!;
    if (i > 0) {
      const a = V[i - 1]!,
        sa = m1[i - 1]!;
      while (ci < corners.length && corners[ci]! < sM) {
        const c = corners[ci++]!;
        if (c <= sa + MIN_GAP || c >= sM - MIN_GAP) continue;
        if (full.length && c - full.at(-1)!.s! < MIN_GAP) continue;
        const t = (c - sa) / (sM - sa);
        full.push({
          x: Math.round(a.x + (v.x - a.x) * t),
          z: Math.round(a.z + (v.z - a.z) * t),
          y: yCm(c),
          leg: v.leg,
          s: c,
        });
      }
    }
    full.push({ x: v.x, z: v.z, y: yCm(sM), leg: v.leg, s: sM });
  });
  const { pts, along, s, legAt } = lay(full, fromCm, svc.legs.length);
  const legs: Built['legs'] = svc.legs.map((leg, k) => ({
    id: leg.id,
    reverse: !!leg.reverse,
    fromCm: legAt[k]!.from,
    toCm: legAt[k]!.to,
    stage: [stageIn(leg.id, 'A'), stageIn(leg.id, 'B')],
  }));
  // The gate the catalog keeps: no span steeper than the 4% ruling.
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!,
      b = pts[i]!;
    const g = (100 * Math.abs(b[2] - a[2])) / Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
    if (g > 4) throw new Error(`${svc.id}: span ${i} is ${g.toFixed(2)}% (the ruling grade is 4%)`);
  }
  const { at, stops } = stopsOf({ pts, along, s, legAt });
  const halts = svc.halts.map((h, stop) => {
    const [x, z, y] = at(stops[stop]!);
    return { name: h.name, stop, x, z, y, reach: 1260 };
  });
  // The crossover's middle stands 35 m inside the terminus halt (clear of its 40 m platforms); a loop's centre stands
  // one radius to the side of the line's end, so the circle touches the line there and a train runs round it and back.
  const ends: Built['ends'] = [];
  (['start', 'end'] as const).forEach((side, k) => {
    const kind = TURNBACKS[svc.id]![k];
    if (!kind) return;
    const tip = side === 'start' ? fromCm : s;
    const stop = stops[side === 'start' ? 0 : stops.length - 1]!;
    if (kind === 'crossover') {
      const sCm = side === 'start' ? stop + 3500 : stop - 3500;
      const [x, z, y] = at(sCm);
      ends.push({ at: side, kind, sCm, x, z, y });
    } else {
      const [x0, z0, y] = at(tip),
        [x1, z1] = at(side === 'start' ? tip + 500 : tip - 500);
      const len = Math.hypot(x0 - x1, z0 - z1) || 1;
      const r = FORMATION.loopCm;
      ends.push({
        at: side,
        kind,
        sCm: tip,
        x: Math.round(x0 - ((z0 - z1) / len) * r),
        z: Math.round(z0 + ((x0 - x1) / len) * r),
        y,
      });
    }
  });
  return {
    id: svc.id,
    name: svc.name,
    extends: svc.extends ?? null,
    fromCm,
    lengthCm: s - fromCm,
    pts,
    legs,
    stops,
    halts,
    ends,
    note: svc.note,
  };
}
const BUILT = SERVICES.map(build);

// ---------------------------------------------------------------- the second track beside today's line 1 and line 2
// The live lines stay put: for each, which side a second track 4 m off would go, and where it meets something. Sampled
// every 2 m: a halt's platform on that side, a building, the turntable, the forge or the Needle Bell within reach, or
// ground beside that is far off the rail (a cutting or bank over 2.5 m; a cliff or gorge over 6 m).
type Clash = { fromCm: number; toCm: number; reason: string };
function secondTrack(lineIndex: 0 | 1) {
  const line = lineIndex === 0 ? LINES.north : LINES.east;
  const p = { x: 0, z: 0, ux: 0, uz: 0 };
  const off = FORMATION.centresCm / 100;
  const plots = [...TOWN.start, ...TOWN.wood.flat(), ...TOWN.stone.flat(), ...TOWN.camps.flatMap((c) => c.awake)];
  const things = [
    ...plots.map((b) => ({ x: b.x, z: b.z, r: Math.max(b.w ?? 5, b.d ?? 5) / 2 + 1.5, what: 'a building' })),
    ...Object.values(ROOM_PLOTS).map((b) => ({ x: b.x, z: b.z, r: Math.max(b.w, b.d) / 2 + 1.5, what: 'a building' })),
    { x: FORGE.x, z: FORGE.z, r: Math.max(FORGE.w, FORGE.d) / 2 + 1.5, what: 'the forge' },
    { x: TURNTABLE.x, z: TURNTABLE.z, r: TURNTABLE.r + 2, what: 'the turntable' },
    { x: SPIRE.x, z: SPIRE.z, r: 14, what: 'the Needle Bell' },
    // The pillars, the gates' jambs and the station frames, which the survey missed before the second track was built
    // (orchestrator, 10 November): each with the bed's 1.3 m half width added.
    ...PILLARS.map((q) => ({ x: q.x, z: q.z, r: q.r + 1.3, what: `pillar ${q.id}` })),
    ...Object.entries(GATES).flatMap(([id, g]) =>
      [-1, 1].map((side) => {
        const px = (side * (GATE_SLAB.w + GATE_SLAB.pillar)) / 2;
        return { x: g.x + Math.cos(g.yaw) * px, z: g.z - Math.sin(g.yaw) * px, r: 0.8 + 1.3, what: `the ${id} gate` };
      }),
    ),
    ...LINKS.flatMap((link) =>
      link.stations.map((spec) => {
        const f = frameBesideLine(spec, link.line, link.dir);
        return { x: f.x - ORIGIN.x, z: f.z, r: Math.hypot(FRAME_D, FRAME_W) / 2 + 1.3, what: `the ${spec.id} frame` };
      }),
    ),
    // line 2's works beside the track (frames, racks, levers), pinned in the map JSON from the railway catalog
    ...A.works
      .filter((w) => w.kind !== 'halt' && w.id !== 'bents' && w.id !== 'turntable')
      .map((w) => ({ x: w.at[0], z: w.at[1], r: 2.5, what: `the ${w.name.replace(/ \(.*\)$/, '')}` })),
  ];
  const sides = ([-1, 1] as const).map((side) => {
    const clashes: Clash[] = [];
    for (let s = 0; s <= line.len; s += 2) {
      lineAt(line, s, p);
      // the side normal: -1 is left of the line's drawn direction, +1 right
      const x = p.x - p.uz * off * side,
        z = p.z + p.ux * off * side;
      const y = railY(line, s);
      const centre = H(p.x + ORIGIN.x, p.z + ORIGIN.z),
        beside = H(x + ORIGIN.x, z + ORIGIN.z);
      const onGround = Math.abs(y - centre) < 1.5;
      let reason = '';
      const halt = HALTS.find(
        (h) => h.line === lineIndex && s >= h.s0 - 2 && s <= h.s1 + 2 && Math.sign(h.lat) === side,
      );
      if (halt) reason = `the ${halt.name} platform`;
      const thing = things.find((t) => Math.hypot(t.x - x, t.z - z) < t.r);
      if (!reason && thing) reason = thing.what;
      if (!reason && onGround && Math.abs(beside - y) > 6)
        reason = beside > y ? 'a rock face over 6 m' : 'a drop over 6 m';
      if (!reason && onGround && Math.abs(beside - y) > 2.5) reason = beside > y ? 'a cutting' : 'a bank';
      if (!reason) continue;
      const last = clashes.at(-1);
      const cmAt = Math.round(s * 100);
      if (last && last.reason === reason && cmAt - last.toCm <= 400) last.toCm = cmAt;
      else clashes.push({ fromCm: cmAt, toCm: cmAt, reason });
    }
    const metres = clashes.reduce((n, c) => n + (c.toCm - c.fromCm) / 100 + 2, 0);
    return { side, clashes, metres };
  });
  const best = sides[0]!.metres <= sides[1]!.metres ? sides[0]! : sides[1]!;
  const other = best === sides[0] ? sides[1]! : sides[0]!;
  // Where the chosen side is blocked, is the other side free there?
  const clashes = best.clashes.map((c) => ({
    ...c,
    otherFree: !other.clashes.some((o) => o.fromCm <= c.toCm + 200 && o.toCm >= c.fromCm - 200),
  }));
  return { line: lineIndex, side: best.side, metres: Math.round(best.metres), clashes, other: other.clashes };
}
const LIVE_SECOND = [secondTrack(0), secondTrack(1)];

// ---------------------------------------------------------------- the catalog file
function catalog() {
  const rows = BUILT.map((l) => {
    const pts = l.pts.map((p) => `[${p.join(', ')}]`).join(', ');
    const legs = l.legs
      .map(
        (g) =>
          `{ id: '${g.id}', reverse: ${g.reverse}, fromCm: ${g.fromCm}, toCm: ${g.toCm}, stage: [${g.stage.map(String).join(', ')}] }`,
      )
      .join(',\n      ');
    const halts = l.halts
      .map(
        (h) =>
          `{ name: ${JSON.stringify(h.name)}, stop: ${h.stop}, x: ${h.x}, z: ${h.z}, y: ${h.y}, reach: ${h.reach} }`,
      )
      .join(',\n      ');
    return `  {
    id: '${l.id}',
    name: ${JSON.stringify(l.name)},
    extends: ${l.extends},
    fromCm: ${l.fromCm},
    lengthCm: ${l.lengthCm},
    speed: ${SPEED.cruise},
    accel: ${SPEED.accel},
    stops: [${l.stops.join(', ')}],
    halts: [
      ${halts},
    ],
    ends: [${l.ends.map((e) => `{ at: '${e.at}', kind: '${e.kind}', sCm: ${e.sCm}, x: ${e.x}, z: ${e.z}, y: ${e.y} }`).join(', ')}],
    legs: [
      ${legs},
    ],
    pts: [${pts}],
  },`;
  });
  return `// GENERATED by dev/level/world-blockout.ts from docs/world/map-prototypes.html (Sickle Isles) and Place's line 2: do
// not edit; change the map JSON or the services there and rerun. test/world-lines.test.ts fails when it is stale.
// Every future line in the sim's own shape (docs/plans/world-blockout.md, "Future lines as data"): world centimetres,
// x east and z south, \`y\` the deck; \`stops\` are cm along the line like TRAIN_STOPS (an extension counts on from the
// line it extends), \`halts\` like LINE_HALTS, \`speed\` cm a tick and \`accel\` cm a tick² like TRAIN. Pure integers and
// no imports: it lives in src/sim (lockstep rules), and src/sim/railway-route.ts derives the route's legs from it. The
// blockout reads it as it always has; the rails it describes are not sim state until the route rules (step 3) lay them.

/** Every corridor is double track: two tracks on \`centresCm\` centres either side of the line's points, each of
 * \`gaugeCm\` gauge, on a \`deckCm\` formation. A halt has a platform at \`platformCm\` either side of the centre; a loop
 * has radius \`loopCm\`. */
export const FORMATION = ${JSON.stringify(FORMATION)} as const;

export type WorldHalt = { name: string; stop: number; x: number; z: number; y: number; reach: number };
/** A line end's turnback: a scissors crossover centred at \`sCm\`, or a balloon loop centred at (x, z) leaving at \`sCm\`. */
export type WorldEnd = { at: 'start' | 'end'; kind: 'crossover' | 'loop'; sCm: number; x: number; z: number; y: number };
export type WorldLeg = {
  /** The map link (docs/world/map-prototypes.html) this stretch runs over, and whether against its drawn direction. */
  id: string;
  reverse: boolean;
  fromCm: number;
  toCm: number;
  /** The progression stage it is built at: [High Gorge first, Canopy Town first]; null never. */
  stage: [number | null, number | null];
};
export type WorldLine = {
  id: string;
  name: string;
  /** null: its own train; 1: an extension of line 2 (TRAIN_STOPS[1]), counted on from \`fromCm\`. */
  extends: number | null;
  fromCm: number;
  lengthCm: number;
  speed: number;
  accel: number;
  stops: readonly number[];
  halts: readonly WorldHalt[];
  ends: readonly WorldEnd[];
  legs: readonly WorldLeg[];
  /** Track vertices, [x, z, y] world cm; each consecutive pair is one straight span. */
  pts: readonly (readonly [number, number, number])[];
};

export const WORLD_LINES: readonly WorldLine[] = [
${rows.join('\n')}
];

/** Today's single-track line 1 (0) and line 2 (1), left where they are: the side (-1 left of the drawn direction, +1
 * right) a second track would take, and the stretches where it meets something (cm along the line). \`otherFree\`: the
 * other side is clear there. The plan's notes, not a change to the live lines. */
export type SecondTrack = {
  line: 0 | 1;
  side: -1 | 1;
  clashes: readonly { fromCm: number; toCm: number; reason: string; otherFree: boolean }[];
};
export const LIVE_SECOND_TRACK: readonly SecondTrack[] = ${JSON.stringify(LIVE_SECOND.map(({ line, side, clashes }) => ({ line, side, clashes })))};
`;
}

// ---------------------------------------------------------------- numbers for the plan and the page
/** The service ladder's first two steps (docs/game-design/sickle-greybox.md): cruise, acceleration, dwell a stop. */
const LADDER: Record<number, [accel: number, dwell: number]> = { 20: [3.5, 5], 25: [4.5, 4] };
/** Rest-to-rest seconds for `stops` legs over `m` metres (every leg here is long enough to reach cruise). */
const ride = (m: number, mps: number, stops = 1) => m / mps + stops * (mps / LADDER[mps]![0] + LADDER[mps]![1]);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const km = (m: number) => (m / 1000).toFixed(2);
const legLen = (id: string) => polyLen(ROUTES[id]?.pts ?? lineOf(id).pts);
const LOOP_M = FULL_LOOP.reduce((s, l) => s + legLen(l.id), 0);
/** Rail only: the crane lift to High Port carries players, not trains. */
const ALL_FUTURE = A.lines.filter((l) => l.kind !== 'built' && l.id !== 'lift').reduce((s, l) => s + legLen(l.id), 0);
const BUILT_M = A.lines.filter((l) => l.kind === 'built' && l.id !== 'l1').reduce((s, l) => s + polyLen(l.pts), 0);

function legRows() {
  return A.lines
    .filter((l) => l.kind !== 'built')
    .map((l) => {
      const m = legLen(l.id);
      const svc = BUILT.find((b) => b.legs.some((g) => g.id === l.id));
      const st = [stageIn(l.id, 'A'), stageIn(l.id, 'B')].map((v) => (v === null ? 'never' : v)).join(' / ');
      return {
        id: l.id,
        name: l.name,
        from: l.from,
        to: l.to,
        m,
        svc: svc?.name ?? '',
        st,
        t20: ride(m, 20),
        t25: ride(m, 25),
      };
    });
}

// ---------------------------------------------------------------- the page
const AREAS: [string, string, string, string, string, string, string][] = [
  [
    'Home (Threefold Reach)',
    'home',
    'The Needle Bell, the forge chimney, the turntable',
    'Logs, stone, rails',
    'Chop, haul, lay track; the great beam',
    '0.6',
    '0–0.6',
  ],
  [
    'Split-rock Works',
    'splitrock',
    'The split quarry face and kiln stack',
    'Footings',
    'Strike seams with the breaker; carry footings',
    '0.6',
    '0.6–1.2',
  ],
  [
    'Ring Island',
    'ring',
    'The broken ring and its floating shard',
    'Steel (the longer boiler first)',
    'The Meet: glide the gap, brace the leaf, strike the rivet',
    '0.6',
    '1.2–1.8',
  ],
  [
    'First branch: High Gorge or Canopy Town',
    'gorge',
    'The split stack / the mother trees over the Wall',
    'Copper / fibre',
    'Powered pick and hook reel / carry sling and glider cloth',
    '1.2',
    '1.8–3.0',
  ],
  [
    'Bell Rock and the bay shortcut',
    'bell',
    'The granite pinnacle in the shallows',
    'Crystal seeds (by hand)',
    'Hook practice; the shortcut home',
    '0.5',
    '3.0–3.5',
  ],
  [
    'Second branch',
    'canopy',
    'The other of the pair',
    'The other material',
    "The other branch's tool",
    '0.7',
    '3.5–4.2',
  ],
  [
    'The sea cave, Saltpan and High Port',
    'port',
    'The 75 m lit crane on the cliff edge',
    'Town services; the faster engine; seed cradle',
    'Break the cave (powered pick); slide the salt flats; crane lift',
    '0.8',
    '4.2–5.0',
  ],
  [
    'White Wall line (the ring closes)',
    'wall',
    'Six 120 m chalk islets read as one wall',
    'Crystal collars carry the last span',
    'Collar the deep gap; the first lap',
    '0.8',
    '5.0–5.8',
  ],
  [
    'Lantern Notch, the causeway, the Original Island',
    'notch',
    'The sea arch; the causeway lamps; the classic island',
    'The ending',
    'Glide from the Canopy ledge; light the lantern; ride to The Boogler',
    '0.3',
    '5.8–6.1',
  ],
];
const SIGHTS: [string, string, string, string][] = [
  [
    'Home hilltop / telescope',
    'Ring Island shard and the raised leaf',
    'ring',
    'minute one; the leaf from the Split-rock finale',
  ],
  ['Home, south-west skyline', 'High Port crane, lit', 'port', 'minute one; reached at 4.2 h'],
  ['West landing', 'The sea cave in the sandstone face, 65 m', 'cave', 'minute one; opened at 4.2 h'],
  ['Home across the bay', "The Original Island (The Boogler's)", 'original', 'minute one; reached last'],
  ['Pier head', 'The raised leaf, 280 m; the White Wall beyond', 'ring', 'from 1.0 h'],
  ['Ring top (aperture)', 'The Gorge split, end-on', 'gorge', 'from 1.8 h'],
  ['Ring top', "Canopy's mother trees over the Wall", 'canopy', 'from 1.8 h'],
  ['Bay line train', 'The sunken causeway pointing at the Original Island', 'original', 'from 3.0 h'],
  ['Canopy Town west shore', 'The Notch ledge', 'notch', 'first Canopy visit; used at 5.8 h'],
  ['High Port, the Notch', 'The mainland city (never reached)', 'city', 'from 4.2 h'],
];
const DOUBLE_BACKS: [string, string, string, string][] = [
  [
    'Ring Island upper gallery ("the Closest Pew")',
    "The first branch's ability (hook reel or glider cloth)",
    'about 3.0 h',
    'Line 2 to Ring Island',
  ],
  ["Split-rock's upper seam", 'The powered pick or the carry sling', 'about 3.5 h', 'Bay line home, then line 2'],
  [
    "Home's sea cave (the West landing's sandstone face)",
    'The powered pick (High Gorge)',
    'about 4.2 h',
    'Bay line home; then the cave line opens',
  ],
  [
    "The first branch's hidden section (the falls cave / the Notch ledge)",
    "The second branch's ability",
    'about 4.6 h',
    'Bay line, Bell Rock, stack line',
  ],
  [
    'Ring Island again: the train threads the ring',
    'The closed ring and the express fitting',
    'about 5.8 h',
    'White Wall line round to the stacks',
  ],
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COLOURS: Record<string, string> = {
  ring: '#3f7fd8',
  ns: '#9157d6',
  bay: '#d8412f',
  'bay-trestle': '#c58f8f',
  cave: '#22b39a',
};
function svg() {
  const [x0, z0, w, h] = [-3000, -2350, 3700, 3800];
  const P = (p: XZ) => `${p[0].toFixed(0)},${p[1].toFixed(0)}`;
  const out: string[] = [];
  out.push(
    `<svg viewBox="${x0} ${z0} ${w} ${h}" role="img" aria-label="Top-down blockout of the whole Boogle map" xmlns="http://www.w3.org/2000/svg">`,
  );
  out.push(`<rect x="${x0}" y="${z0}" width="${w}" height="${h}" fill="var(--sea)"/>`);
  for (let gx = Math.ceil(x0 / 500) * 500; gx < x0 + w; gx += 500)
    out.push(
      `<line x1="${gx}" y1="${z0}" x2="${gx}" y2="${z0 + h}" stroke="var(--grid)" stroke-width="${gx % 1000 ? 2 : 5}"/>`,
    );
  for (let gz = Math.ceil(z0 / 500) * 500; gz < z0 + h; gz += 500)
    out.push(
      `<line x1="${x0}" y1="${gz}" x2="${x0 + w}" y2="${gz}" stroke="var(--grid)" stroke-width="${gz % 1000 ? 2 : 5}"/>`,
    );
  // the coast-texture box the live sea can bake today (2048 texels at 1 m, round Home's shores)
  out.push(
    `<rect x="${-250 - 120}" y="${-372 - 120}" width="2048" height="2048" fill="none" stroke="var(--gate)" stroke-width="6" stroke-dasharray="40 24"/>`,
    `<text x="${-250 - 100}" y="${1556}" class="note">2,048 m at 1 m a texel: the sea's coast texture today</text>`,
  );
  for (const g of A.land) {
    if (g.horizon) continue;
    const pts = g.id === 'home-land' ? smoothRing(g.poly!, 3) : g.outline;
    const cls = g.id === 'home-land' ? 'existing' : g.module === 'chalk' ? 'chalk' : 'land';
    out.push(
      `<polygon class="${cls}" points="${pts.map(P).join(' ')}"><title>${esc(g.biome ?? g.id)}</title></polygon>`,
    );
  }
  // the classic island and Ring Island's cones (live geometry)
  out.push(
    `<circle class="existing" cx="-1000" cy="0" r="110"><title>The Original Island (classic island, live)</title></circle>`,
  );
  for (const [dx, dz, r] of RING_CONES)
    out.push(
      `<circle class="existing ring" cx="${FAR.x + dx}" cy="${FAR.z + dz}" r="${r * 0.62}"><title>Ring Island cone (live)</title></circle>`,
    );
  // built rails (Place's real line 1 and line 2)
  for (const line of [LINES.north, LINES.east]) {
    const pts: string[] = [];
    for (let i = 0; i < line.xs.length; i += 5) pts.push(`${line.xs[i]!.toFixed(0)},${line.zs[i]!.toFixed(0)}`);
    out.push(`<polyline class="built" points="${pts.join(' ')}"/>`);
  }
  for (const l of BUILT) {
    const c = COLOURS[l.id] ?? '#888';
    const dash = l.id === 'bay-trestle' ? ' stroke-dasharray="40 30"' : '';
    out.push(
      `<polyline class="line" stroke="${c}"${dash} points="${l.pts.map((p) => `${(p[0] / 100 - 1000).toFixed(0)},${(p[1] / 100).toFixed(0)}`).join(' ')}"><title>${esc(l.name)}: ${km(l.lengthCm / 100)} km</title></polyline>`,
    );
  }
  // sightlines (telegraphing), from the map's own sights
  for (const s of A.sights) {
    const a = A.places.find((p) => p.id === s.from)!.at,
      b = A.places.find((p) => p.id === s.to)!.at;
    out.push(
      `<line class="sight" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><title>${esc(s.note)}</title></line>`,
    );
  }
  for (const g of A.gates)
    out.push(
      `<rect class="gate" x="${g.at[0] - 28}" y="${g.at[1] - 28}" width="56" height="56" transform="rotate(45 ${g.at[0]} ${g.at[1]})"><title>${esc(g.name)}: ${esc(g.needs ?? '')}</title></rect>`,
    );
  for (const l of BUILT)
    for (const h of l.halts)
      out.push(
        `<circle class="halt" cx="${(h.x / 100 - 1000).toFixed(0)}" cy="${(h.z / 100).toFixed(0)}" r="26"><title>${esc(h.name)} (${esc(l.name)})</title></circle>`,
      );
  // turnbacks: a loop is its circle, a crossover a small X
  for (const l of BUILT)
    for (const e of l.ends) {
      const x = e.x / 100 - 1000,
        z = e.z / 100;
      out.push(
        e.kind === 'loop'
          ? `<circle class="loop" cx="${x.toFixed(0)}" cy="${z.toFixed(0)}" r="${FORMATION.loopCm / 100}"><title>${esc(l.name)}: turning loop</title></circle>`
          : `<path class="cross" d="M${(x - 22).toFixed(0)},${(z - 22).toFixed(0)}L${(x + 22).toFixed(0)},${(z + 22).toFixed(0)}M${(x - 22).toFixed(0)},${(z + 22).toFixed(0)}L${(x + 22).toFixed(0)},${(z - 22).toFixed(0)}"><title>${esc(l.name)}: crossover</title></path>`,
      );
    }
  for (const p of A.places) {
    if (p.id === 'camp') continue;
    const big = p.kind === 'main' || p.kind === 'branch' || p.kind === 'ending' || p.id === 'home';
    out.push(`<text class="${big ? 'place' : 'stop'}" x="${p.at[0] + 45}" y="${p.at[1] - 40}">${esc(p.name)}</text>`);
  }
  out.push(`<text class="place" x="-2950" y="2100">Mainland (backdrop) →</text>`);
  out.push(
    `<g class="scale"><line x1="-2850" y1="-2250" x2="-1850" y2="-2250"/><text x="-2850" y="-2275">1 km</text></g>`,
  );
  out.push('</svg>');
  return out.join('\n');
}

function page() {
  const legs = legRows();
  const legTable = legs
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td>${esc(r.from)} → ${esc(r.to)}</td><td>${esc(r.svc)}</td><td>${r.st}</td><td>${km(r.m)}</td><td>${mmss(r.t20)}</td><td>${mmss(r.t25)}</td></tr>`,
    )
    .join('\n');
  const lineTable = BUILT.map(
    (l) =>
      `<tr><td><span class="key" style="background:${COLOURS[l.id]}"></span>${esc(l.name)}</td><td>${l.halts.map((h) => esc(h.name)).join(' · ')}</td><td>${km(l.lengthCm / 100)}</td><td>${mmss(ride(l.lengthCm / 100, 20, l.halts.length - 1))}</td><td>${mmss(ride(l.lengthCm / 100, 25, l.halts.length - 1))}</td></tr>`,
  ).join('\n');
  const areaTable = AREAS.map(
    (a) =>
      `<tr><td>${esc(a[0])}</td><td>${esc(a[2])}</td><td>${esc(a[3])}</td><td>${esc(a[4])}</td><td>${a[5]} h</td><td>${a[6]}</td></tr>`,
  ).join('\n');
  const sightTable = SIGHTS.map((s) => `<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td><td>${esc(s[3])}</td></tr>`).join(
    '\n',
  );
  const turnTable = BUILT.map(
    (l) =>
      `<tr><td>${esc(l.name)}</td><td>${l.ends.map((e) => `${e.at === 'start' ? esc(l.halts[0]!.name) : esc(l.halts.at(-1)!.name)}: ${e.kind === 'loop' ? 'turning loop' : 'crossover'}`).join('; ')}</td></tr>`,
  ).join('\n');
  const liveName = ['Line 1', 'Line 2'];
  const secondTable = LIVE_SECOND.flatMap((t) =>
    t.clashes.map(
      (c) =>
        `<tr><td>${liveName[t.line]}, ${t.side < 0 ? 'left' : 'right'} side</td><td>${(c.fromCm / 100).toFixed(0)}–${(c.toCm / 100).toFixed(0)} m</td><td>${esc(c.reason)}</td><td>${c.otherFree ? 'yes' : 'no'}</td></tr>`,
    ),
  ).join('\n');
  const dbTable = DOUBLE_BACKS.map(
    (d) => `<tr><td>${esc(d[0])}</td><td>${esc(d[1])}</td><td>${d[2]}</td><td>${esc(d[3])}</td></tr>`,
  ).join('\n');
  const stills = fs.existsSync(ROOT + STILLS)
    ? fs
        .readdirSync(ROOT + STILLS)
        .filter((f) => /\.(png|jpe?g)$/.test(f))
        .sort()
        .map(
          (f) =>
            `<figure><img src="world-blockout/${f}" alt="${esc(f.replace(/\.\w+$/, '').replace(/-/g, ' '))}" loading="lazy"/><figcaption>${esc(
              f
                .replace(/^\d+-/, '')
                .replace(/\.\w+$/, '')
                .replace(/-/g, ' '),
            )}</figcaption></figure>`,
        )
        .join('\n')
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>World Blockout</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<!-- GENERATED by dev/level/world-blockout.ts from docs/world/map-prototypes.html: rerun it, don't edit by hand. -->
<style>
  :root { color-scheme: light; --bg: #f4f2e9; --panel: #fffdf5; --ink: #233d3c; --muted: #536a68; --border: #bfcac0;
    --sea: #dcebe9; --grid: #c7dcda; --land: #d4ddbf; --chalk: #ece9df; --existing: #214f4a; --rail: #b75436;
    --gate: #a65126; --sight: #3f7fd8; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { color-scheme: dark; --bg: #142524;
    --panel: #1c302e; --ink: #eff2df; --muted: #b4c6bc; --border: #49625a; --sea: #193b3e; --grid: #244b4e;
    --land: #435b43; --chalk: #8d8b80; --existing: #d9e9cd; --rail: #f3a07c; --gate: #f9b076; --sight: #8fb8ff; } }
  :root[data-theme='dark'] { color-scheme: dark; --bg: #142524; --panel: #1c302e; --ink: #eff2df; --muted: #b4c6bc;
    --border: #49625a; --sea: #193b3e; --grid: #244b4e; --land: #435b43; --chalk: #8d8b80; --existing: #d9e9cd;
    --rail: #f3a07c; --gate: #f9b076; --sight: #8fb8ff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.5 system-ui, sans-serif; padding: 24px 16px 32px; }
  main { max-width: 1300px; margin: auto; min-width: 0; }
  h1 { font: 700 28px/1.2 Georgia, serif; margin: 0 0 6px; }
  h2 { font: 700 19px/1.3 Georgia, serif; margin: 28px 0 8px; }
  p, li { max-width: 80ch; }
  .muted { color: var(--muted); }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0; }
  .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px; }
  .stat b { display: block; font-size: 22px; }
  .map { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 8px; }
  svg { width: 100%; height: auto; display: block; }
  svg .land { fill: var(--land); stroke: var(--muted); stroke-width: 4; }
  svg .chalk { fill: var(--chalk); stroke: var(--muted); stroke-width: 4; }
  svg .existing { fill: var(--land); stroke: var(--existing); stroke-width: 9; }
  svg .ring { fill-opacity: 0.6; }
  svg .built { fill: none; stroke: var(--existing); stroke-width: 14; stroke-linecap: round; }
  svg .line { fill: none; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; }
  svg .sight { stroke: var(--sight); stroke-width: 5; stroke-dasharray: 12 22; opacity: 0.8; }
  svg .gate { fill: var(--gate); }
  svg .halt { fill: var(--panel); stroke: var(--ink); stroke-width: 8; }
  svg .loop { fill: none; stroke: var(--ink); stroke-width: 7; }
  svg .cross { fill: none; stroke: var(--ink); stroke-width: 9; }
  svg text { fill: var(--ink); font: 600 64px system-ui, sans-serif; paint-order: stroke; stroke: var(--panel); stroke-width: 12px; }
  svg text.stop { font-size: 48px; font-weight: 500; }
  svg text.note { font-size: 42px; fill: var(--gate); }
  svg .scale line { stroke: var(--ink); stroke-width: 10; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 8px 4px; font-size: 13px; }
  .key { display: inline-block; width: 22px; height: 6px; border-radius: 3px; vertical-align: middle; margin-right: 6px; }
  .table { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; background: var(--panel); font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { font-weight: 650; }
  td:nth-last-child(-n+3) { white-space: nowrap; }
  .stills { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 12px; }
  figure { margin: 0; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  figure img { width: 100%; display: block; }
  figcaption { padding: 6px 10px; font-size: 13px; color: var(--muted); }
</style>
</head>
<body>
<main>
<h1>World blockout</h1>
<p class="muted">The whole map, rough, so the connections work before each area is built in depth (owner, 10 November).
Sickle Isles geography from <a href="map-prototypes.html">map-prototypes.html</a>, today's Home, Far Head and pier,
the crossing toward Ring Island, and every future line as a train service. Place-local metres, north up, 500 m grid.
The plan: <a href="../plans/world-blockout.md">docs/plans/world-blockout.md</a>.</p>
<div class="stats">
  <div class="stat"><b>9</b>areas, Home to the ending</div>
  <div class="stat"><b>${BUILT.length}</b>future lines, ${BUILT.reduce((n, l) => n + l.halts.length, 0)} halt stops</div>
  <div class="stat"><b>${km(ALL_FUTURE)} km</b>future track (+${km(BUILT_M)} km line 2 built)</div>
  <div class="stat"><b>${km(LOOP_M)} km</b>the full loop, ${mmss(LOOP_M / 20)} at 20 m/s</div>
  <div class="stat"><b>6.1 h</b>to the ending, solo (model)</div>
</div>
<div class="map">
${svg()}
<div class="legend">
  ${BUILT.map((l) => `<span><span class="key" style="background:${COLOURS[l.id]}"></span>${esc(l.name)}</span>`).join('\n  ')}
  <span><span class="key" style="background:var(--existing)"></span>Built today (line 1, line 2)</span>
  <span><span class="key" style="background:var(--sight)"></span>Seen before reached</span>
  <span><span class="key" style="background:var(--gate)"></span>Gate</span>
</div>
</div>

<h2>Areas</h2>
<div class="table"><table><thead><tr><th>Area</th><th>Landmark</th><th>Produces</th><th>New verb</th><th>Hours</th><th>Solo clock</th></tr></thead>
<tbody>${areaTable}</tbody></table></div>

<h2>Lines</h2>
<p class="muted">Ride time = cruise, plus starting and stopping (3.5 m/s² at 20 m/s, 4.5 at 25) and the dwell (5 s, 4 s) at every stop; boarding not included.</p>
<div class="table"><table><thead><tr><th>Line</th><th>Halts</th><th>km</th><th>End to end, 20 m/s</th><th>25 m/s</th></tr></thead>
<tbody>${lineTable}</tbody></table></div>

<h2>Legs</h2>
<div class="table"><table><thead><tr><th>Leg</th><th>From → to</th><th>Line</th><th>Stage (Gorge first / Canopy first)</th><th>km</th><th>20 m/s</th><th>25 m/s</th></tr></thead>
<tbody>${legTable}</tbody></table></div>

<h2>Double track</h2>
<p class="muted">Every corridor is two tracks on ${FORMATION.centresCm / 100} m centres (the gauge is Place's 1 m, on a 3.6 m deck: a
${FORMATION.deckCm / 100} m formation), bridges, cuttings, tunnels and the pier crossing included. Every halt has a platform outside
each track. Each terminus turns a train back without reversing: a crossover (✕) inside the platforms, or a
${FORMATION.loopCm / 100} m-radius turning loop (○) where the island has room.</p>
<div class="table"><table><thead><tr><th>Line</th><th>Turnbacks</th></tr></thead><tbody>${turnTable}</tbody></table></div>
<p class="muted">Today's single-track line 1 and line 2 stay where they are. A second track 4 m off them meets these:</p>
<div class="table"><table><thead><tr><th>Where</th><th>Along the line</th><th>Meets</th><th>Other side free</th></tr></thead><tbody>${secondTable}</tbody></table></div>

<h2>Seen before it's reached</h2>
<div class="table"><table><thead><tr><th>From</th><th>What</th><th>When</th></tr></thead><tbody>${sightTable}</tbody></table></div>

<h2>Doubling back</h2>
<div class="table"><table><thead><tr><th>Where</th><th>With</th><th>When (solo)</th><th>The ride back</th></tr></thead><tbody>${dbTable}</tbody></table></div>

<h2>The 3D greybox</h2>
<p class="muted">Dev: <code>?greybox=sickle</code> (rides along every line, the full loop). Live client: <code>?blockout=world</code> (walkable massing, visual track).</p>
<div class="stills">
${stills}
</div>
</main>
</body>
</html>
`;
}

// Written as Prettier leaves them, so the format hook never makes a generated file look stale.
const pretty = async (file: string, text: string) =>
  prettier.format(text, { ...(await prettier.resolveConfig(ROOT + file)), filepath: ROOT + file });

// ---------------------------------------------------------------- the map JSON's rails, from the catalog
/** map-prototypes.html with every service link's points and heights (Sickle Isles) replaced by the catalog's, ruling
 * corners included, in the option's own lines: ringx is copied out of `common` first, so the other options still draw
 * the shared one as authored. Links no service runs over (the lift, today's lines) keep their own. */
function mapPage(): { page: string; authored: string } {
  const m = /(<script type="application\/json" id="map-data">)([\s\S]*?)(<\/script>)/.exec(html);
  if (!m) throw new Error('map-prototypes.html has no #map-data block');
  const data = syncHomeMap(parseMapPage(html));
  const own: Line[] = data.options.find((o) => o.id === 'sickle')!.lines;
  const authored = { ...AUTHORED };
  const r2 = (v: number) => Math.round(v * 100) / 100;
  for (const b of BUILT) {
    const along = [b.fromCm];
    for (let i = 1; i < b.pts.length; i++)
      along.push(
        along[i - 1]! + Math.round(Math.hypot(b.pts[i]![0] - b.pts[i - 1]![0], b.pts[i]![1] - b.pts[i - 1]![1])),
      );
    for (const g of b.legs) {
      const shared: Line | undefined = data.common.lines.find((l: Line) => l.id === g.id);
      const line = own.find((l) => l.id === g.id) ?? (shared && own[own.push(structuredClone(shared)) - 1]);
      if (!line) throw new Error(`no map line ${g.id}`);
      authored[g.id] ??= { pts: line.pts, ...(line.heights ? { heights: line.heights } : {}) };
      const pts3 = b.pts.filter((_, i) => along[i]! >= g.fromCm && along[i]! <= g.toCm);
      if (g.reverse) pts3.reverse();
      line.pts = pts3.map((p) => [r2(p[0] / 100 - ORIGIN.x), r2(p[1] / 100 - ORIGIN.z)]);
      line.heights = pts3.map((p) => r2(p[2] / 100));
      if (ROUTES[g.id]?.from) line.from = ROUTES[g.id]!.from!;
    }
  }
  return {
    page:
      html.slice(0, m.index + m[1]!.length) +
      '\n' +
      pageJson(data, 2) +
      '\n' +
      html.slice(m.index + m[0].length - m[3]!.length),
    authored: JSON.stringify(authored),
  };
}
const MAP_PAGE = 'docs/world/map-prototypes.html';
const map = mapPage();
const outputs: [string, string][] = [
  [CATALOG, await pretty(CATALOG, catalog())],
  [PAGE, await pretty(PAGE, page())],
  [MAP_PAGE, await pretty(MAP_PAGE, map.page)],
  [AUTHORED_FILE, await pretty(AUTHORED_FILE, map.authored)],
];
const check = process.argv.includes('--check');
let stale = false;
for (const [file, text] of outputs) {
  const now = fs.existsSync(ROOT + file) ? fs.readFileSync(ROOT + file, 'utf8') : '';
  if (now === text) continue;
  stale = true;
  if (check) console.log(`stale: ${file} (node dev/level/world-blockout.ts)`);
  else fs.writeFileSync(ROOT + file, text);
}
if (process.argv.includes('--numbers')) {
  for (const t of LIVE_SECOND)
    console.log('second track', t.line, t.side, JSON.stringify(t.clashes), 'other side:', JSON.stringify(t.other));
  console.log('loop km', km(LOOP_M), 'future km', km(ALL_FUTURE), 'built l2 km', km(BUILT_M));
  for (const r of legRows())
    console.log([r.id, r.name, r.from, r.to, r.svc, r.st, km(r.m), mmss(r.t20), mmss(r.t25)].join(' | '));
  for (const l of BUILT)
    console.log(
      l.id,
      km(l.lengthCm / 100),
      mmss(ride(l.lengthCm / 100, 20, l.halts.length - 1)),
      mmss(ride(l.lengthCm / 100, 25, l.halts.length - 1)),
      l.halts.map((h) => `${h.name}@${(h.y / 100).toFixed(1)}m`).join(', '),
      'stops',
      l.stops.join(','),
    );
}
if (check && stale) process.exit(1);
