// Sickle Isles as data: the option's land, places, lines, gates and sights from docs/world/map-prototypes.html
// (branch map-art-surface, 6 November), transcribed so the greybox (./index.ts) and Node checks share one table.
// Place-local metres like the map: x east, z south, world = local + ORIGIN (src/proto/place/layout.ts). Heights are
// not in the map: TOPS below are this greybox's guesses, the numbers to argue with. No three.js here.

export type XZ = [x: number, z: number];
/** Stage per pick: the map's `{ c, s: [A, B] }`, where A is High Gorge first and B Canopy Town first. */
export type Staged = number | { c: 'A' | 'B'; s: [number | null, number | null] };
export type Pick = 'A' | 'B';

/** The map's land blob: 18 points round an ellipse, radius jittered by `rough`, turned by `rot` degrees. */
export type Blob = { c: XZ; r: XZ; seed: number; rough: number; rot?: number };

const mulberry = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export { mulberry };

/** The page's blobPts, unchanged, so outlines match the drawn map exactly. */
export function blobPts({ c, r, seed, rough, rot = 0 }: Blob, n = 18): XZ[] {
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

/** Closed Catmull-Rom through the blob's points, `k` samples per edge: the map draws them smoothed too. */
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

export function stageOf(s: Staged, pick: Pick): number | null {
  if (typeof s === 'number') return s;
  return s.c === pick ? s.s[0] : s.s[1];
}

// ---------------------------------------------------------------- roles and heights (greybox guesses)
export type Role = 'walk' | 'cliff' | 'backdrop';
/** The White Wall's one module: wall-n1's blob at the origin. Placed four times at each islet's centre and turn. */
export const CHALK_MODULE: Blob = { c: [0, 0], r: [250, 65], seed: 43, rough: 0.1 };
export const CHALK_TOP = 120; // the map: "120 m"
/** The gorge line splits the stack; the map's note says the gap is 90 m. */
export const GORGE_X = -1138,
  GORGE_GAP = 90;

export type Isle = {
  id: string;
  name: string;
  blob: Blob;
  /** Top of the walkable surface, metres above the sea. */
  top: number;
  /** Clip to one side of the gorge line. */
  clip?: 'west' | 'east';
  /** Same shape as another (the chalk module). */
  module?: boolean;
  biome: string;
};
export const ISLES: Isle[] = [
  {
    id: 'stack-w',
    name: 'High Gorge stack, west',
    blob: { c: [-1265, -1930], r: [185, 150], seed: 41, rough: 0.2 },
    top: 85,
    clip: 'west',
    biome: 'Split sea stack: copper works',
  },
  {
    id: 'stack-e',
    name: 'High Gorge stack, east',
    blob: { c: [-1010, -1865], r: [165, 140], seed: 42, rough: 0.2 },
    top: 85,
    clip: 'east',
    biome: 'Split sea stack: copper works',
  },
  {
    id: 'wall-n1',
    name: 'White Wall islet N1',
    blob: { ...CHALK_MODULE, c: [-1460, -1490], rot: 122 },
    top: CHALK_TOP,
    module: true,
    biome: 'Chalk sea-cliff islets',
  },
  {
    id: 'wall-n2',
    name: 'White Wall islet N2',
    blob: { ...CHALK_MODULE, c: [-1760, -1030], rot: 112 },
    top: CHALK_TOP,
    module: true,
    biome: 'Chalk sea-cliff islets',
  },
  {
    id: 'canopy-isle',
    name: 'Canopy island',
    blob: { c: [-2060, -300], r: [360, 300], seed: 45, rough: 0.16 },
    top: 12,
    biome: 'Forest island: giant trees',
  },
  {
    id: 'wall-s1',
    name: 'White Wall islet S1',
    blob: { ...CHALK_MODULE, c: [-1960, 360], rot: 78 },
    top: CHALK_TOP,
    module: true,
    biome: 'Chalk sea-cliff islets',
  },
  {
    id: 'wall-s2',
    name: 'White Wall islet S2',
    blob: { ...CHALK_MODULE, c: [-1720, 760], rot: 48 },
    top: CHALK_TOP,
    module: true,
    biome: 'Chalk sea-cliff islets',
  },
  {
    id: 'port-isle',
    name: 'High Port island, the quay apron',
    blob: { c: [-1190, 1080], r: [360, 240], seed: 48, rough: 0.15 },
    top: 3,
    biome: 'Harbour on a cliff-top island',
  },
  {
    // The cliff-top town: the same island drawn smaller and west of the quay, so the quay sits at the cliff's foot.
    id: 'port-top',
    name: 'High Port cliff top',
    blob: { c: [-1255, 1115], r: [285, 190], seed: 48, rough: 0.15 },
    top: 55,
    biome: 'Harbour on a cliff-top island',
  },
  {
    id: 'notch-isle',
    name: 'Lantern Notch',
    blob: { c: [-2600, -1000], r: [140, 100], seed: 49, rough: 0.2 },
    top: 6,
    biome: 'Sea arch and lantern',
  },
  {
    id: 'bell-land',
    name: 'Bell Rock',
    blob: { c: [-1050, -450], r: [120, 95], seed: 3, rough: 0.2 },
    top: 14,
    biome: 'Bell Rock',
  },
  {
    id: 'salt-land',
    name: 'The Saltpan',
    blob: { c: [-450, 700], r: [170, 110], seed: 5, rough: 0.2 },
    top: 3, // 1.5 m went under the swell in the first captures
    biome: 'Salt flats',
  },
  {
    id: 'orig-land',
    name: 'The Original Island',
    blob: { c: [-3150, -1700], r: [230, 190], seed: 9, rough: 0.15 },
    top: 28,
    biome: 'The Original Island',
  },
];
/** The map's Ring Island outline (common land); the game already stands its cones and shard there. */
export const RING_BLOB: Blob = { c: [330, -1120], r: [240, 200], seed: 7, rough: 0.18 };

/** Each isle's final outline, smoothed and clipped. */
export function isleOutline(isle: Isle): XZ[] {
  let pts = smoothRing(blobPts(isle.blob));
  if (isle.clip === 'west') pts = clipHalf(pts, (p) => GORGE_X - GORGE_GAP / 2 - p[0]);
  if (isle.clip === 'east') pts = clipHalf(pts, (p) => p[0] - (GORGE_X + GORGE_GAP / 2));
  return pts;
}

/** The canopy forest's giant trees, placed as the map scatters them (terrain "forest", seed 4). */
export function canopyTrees() {
  const c: XZ = [-2070, -300],
    r: XZ = [300, 240];
  const rnd = mulberry(4 * 31);
  const n = Math.round((r[0] * r[1]) / 9000);
  const out: { x: number; z: number; r: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd());
    out.push({ x: c[0] + Math.cos(a) * r[0] * rr, z: c[1] + Math.sin(a) * r[1] * rr, r: 28 + rnd() * 30 });
  }
  return out;
}

// ---------------------------------------------------------------- places, lines, gates, sights (the map's own)
export type Place = { id: string; name: string; at: XZ; kind: string; deck?: number; gives?: string };
/** Deck heights: on the isle's top unless given. Home and the pier take the terrain under them. */
export const PLACES: Place[] = [
  { id: 'home', name: 'Home', at: [-100, 14], kind: 'hub' },
  { id: 'pier', name: 'Pier', at: [402, -372], kind: 'stop' },
  { id: 'ring', name: 'Ring Island', at: [330, -1120], kind: 'main' },
  { id: 'gorge', name: 'High Gorge', at: [-1150, -1900], kind: 'branch', deck: 85, gives: 'Copper, powered pick' },
  { id: 'canopy', name: 'Canopy Town', at: [-2100, -300], kind: 'branch', deck: 12, gives: 'Fibre, glider cloth' },
  { id: 'bell', name: 'Bell Rock', at: [-1050, -450], kind: 'stop', deck: 14 },
  { id: 'saltpan', name: 'Saltpan Halt', at: [-450, 700], kind: 'stop', deck: 3 },
  { id: 'quay', name: 'Port Quay', at: [-990, 940], kind: 'stop', deck: 3 },
  { id: 'port', name: 'High Port', at: [-1300, 1180], kind: 'main', deck: 55 },
  { id: 'notch', name: 'Lantern Notch', at: [-2600, -1000], kind: 'stop', deck: 6 },
  { id: 'original', name: 'Original Island', at: [-3150, -1700], kind: 'ending', deck: 28 },
];

export type Line = {
  id: string;
  name: string;
  from: string;
  to: string;
  stage: Staged;
  pts: XZ[];
  style?: 'sea' | 'tunnel' | 'incline';
  /** Built today: not drawn (the real railway is there), only flown. */
  built?: boolean;
};
export const LINES: Line[] = [
  // Common: built today, flown only.
  {
    id: 'l2a',
    name: 'Line 2',
    from: 'home',
    to: 'splitrock',
    stage: 0,
    built: true,
    pts: [
      [-82, 12],
      [-50, 30],
      [28, 27],
      [98, 52],
    ],
  },
  {
    id: 'l2b',
    name: 'Line 2 to the pier',
    from: 'splitrock',
    to: 'pier',
    stage: 0,
    built: true,
    pts: [
      [98, 52],
      [167, -28],
      [373, -184],
      [402, -372],
    ],
  },
  // Common: proposed.
  {
    id: 'ringx',
    name: 'First sea crossing',
    from: 'pier',
    to: 'ring',
    stage: 2,
    style: 'sea',
    pts: [
      [402, -372],
      [380, -650],
      [330, -1120],
    ],
  },
  // Sickle Isles.
  {
    id: 'ledge',
    name: 'Stack line',
    from: 'ring',
    to: 'gorge',
    stage: { c: 'A', s: [3, 5] },
    style: 'sea',
    pts: [
      [330, -1120],
      [-150, -1450],
      [-650, -1780],
      [-1150, -1900],
    ],
  },
  {
    id: 'ring-bell',
    name: 'Bay trestle',
    from: 'ring',
    to: 'bell',
    stage: { c: 'B', s: [3, null] },
    style: 'sea',
    pts: [
      [330, -1120],
      [-300, -820],
      [-1050, -450],
    ],
  },
  {
    id: 'bell-canopy',
    name: 'Bell Rock to Canopy',
    from: 'bell',
    to: 'canopy',
    stage: { c: 'B', s: [3, 5] },
    style: 'sea',
    pts: [
      [-1050, -450],
      [-1600, -380],
      [-2100, -300],
    ],
  },
  {
    id: 'bay-cut',
    name: 'The bay shortcut',
    from: 'home',
    to: 'bell',
    stage: 4,
    style: 'sea',
    pts: [
      [-199, 10],
      [-600, -200],
      [-1050, -450],
    ],
  },
  {
    id: 'incline',
    name: 'Stack incline',
    from: 'bell',
    to: 'gorge',
    stage: { c: 'A', s: [4, 5] },
    style: 'sea',
    pts: [
      [-1050, -450],
      [-1080, -1100],
      [-1150, -1900],
    ],
  },
  {
    id: 'seacave',
    name: 'Sea-cave line',
    from: 'home',
    to: 'saltpan',
    stage: 6,
    style: 'tunnel',
    pts: [
      [-150, 120],
      [-300, 400],
      [-450, 700],
    ],
  },
  {
    id: 'salt-quay',
    name: 'Saltpan to the quay',
    from: 'saltpan',
    to: 'quay',
    stage: 6,
    style: 'sea',
    pts: [
      [-450, 700],
      [-700, 880],
      [-990, 940],
    ],
  },
  {
    id: 'lift',
    name: 'Crane lift up the cliff',
    from: 'quay',
    to: 'port',
    stage: 6,
    style: 'incline',
    pts: [
      [-990, 940],
      [-1150, 1050],
      [-1300, 1180],
    ],
  },
  {
    id: 'wall-s',
    name: 'White Wall line, south',
    from: 'port',
    to: 'canopy',
    stage: 7,
    style: 'sea',
    pts: [
      [-1300, 1180],
      [-1720, 760],
      [-1960, 360],
      [-2100, -300],
    ],
  },
  {
    id: 'wall-n',
    name: 'White Wall line, north',
    from: 'canopy',
    to: 'gorge',
    stage: 7,
    style: 'sea',
    pts: [
      [-2100, -300],
      [-1950, -700],
      [-1760, -1030],
      [-1460, -1490],
      [-1150, -1900],
    ],
  },
  {
    id: 'notch-tunnel',
    name: 'Notch line',
    from: 'canopy',
    to: 'notch',
    stage: 8,
    style: 'sea',
    pts: [
      [-2100, -300],
      [-2450, -700],
      [-2620, -1000],
    ],
  },
  {
    id: 'final',
    name: 'Final crossing',
    from: 'notch',
    to: 'original',
    stage: 8,
    style: 'sea',
    pts: [
      [-2620, -1000],
      [-2950, -1350],
      [-3150, -1700],
    ],
  },
];

export type Gate = { id: string; name: string; at: XZ; needs: string };
export const GATES: Gate[] = [
  { id: 'cave', name: 'Sea cave under the south cliffs', at: [-170, 150], needs: 'Powered pick (High Gorge)' },
  { id: 'crane', name: 'Harbour crane', at: [-1150, 1050], needs: 'Copper and fibre fittings' },
  { id: 'collar', name: 'Deep gap at the stacks', at: [-1300, -1700], needs: 'Crystal collars' },
  { id: 'notch-ledge', name: 'Notch ledge', at: [-2300, -520], needs: 'Hook reel up, glider cloth across' },
];
export const SECRETS: { id: string; name: string; at: XZ }[] = [
  { id: 'falls', name: 'Cave in the stack', at: [-1010, -1760] },
  { id: 'trestle', name: 'Sunken trestle', at: [-760, -260] },
];
export const SIGHTS: { from: string; to: string; note: string }[] = [
  { from: 'home', to: 'port', note: 'The cliff-top crane on the south-west skyline' },
  { from: 'ring', to: 'gorge', note: 'The Gorge waterfall, seen from the aperture' },
  { from: 'ring', to: 'canopy', note: 'Giant crowns at the foot of the Wall' },
  { from: 'gorge', to: 'original', note: 'A lighthouse beyond the Wall' },
];

/** The economy model's ride settings (map JSON "ride"): per link length / 20 m/s + 10 s + 8 s dwell; 20 s to board. */
export const RIDE = { speed: 20, accelS: 10, dwellS: 8, boardS: 20 };
export const rideSeconds = (lens: number[]) =>
  RIDE.boardS + lens.reduce((s, len) => s + len / RIDE.speed + RIDE.accelS + RIDE.dwellS, 0);

/** Routes to fly for review: each a list of line ids, reversed with a leading `-`. */
export const ROUTES: { id: string; name: string; legs: string[] }[] = [
  {
    id: 'bell-before',
    name: 'Home to Bell Rock before the shortcut (Line 2, pier, Ring Island, bay trestle)',
    legs: ['l2a', 'l2b', 'ringx', 'ring-bell'],
  },
  { id: 'bell-after', name: 'Home to Bell Rock by the bay shortcut', legs: ['bay-cut'] },
  {
    id: 'canopy-before',
    name: 'Home to Canopy Town before the shortcut',
    legs: ['l2a', 'l2b', 'ringx', 'ring-bell', 'bell-canopy'],
  },
  { id: 'canopy-after', name: 'Home to Canopy Town after the shortcut', legs: ['bay-cut', 'bell-canopy'] },
  { id: 'gorge-first', name: 'Home to High Gorge, Gorge first (stack line)', legs: ['l2a', 'l2b', 'ringx', 'ledge'] },
  { id: 'gorge-incline', name: 'Home to High Gorge by the shortcut and the incline', legs: ['bay-cut', 'incline'] },
  { id: 'port', name: 'Home to High Port through the sea cave', legs: ['seacave', 'salt-quay', 'lift'] },
  { id: 'wall', name: 'The White Wall line, High Port to High Gorge', legs: ['wall-s', 'wall-n'] },
  { id: 'ending', name: 'Canopy Town to the Original Island', legs: ['notch-tunnel', 'final'] },
];

export const STAGE_COLOURS: Record<number, string> = {
  2: '#3f7fd8',
  3: '#e89b2f',
  4: '#d8412f',
  5: '#9157d6',
  6: '#22b39a',
  7: '#e8cf2f',
  8: '#e85cab',
};
export const UNBUILT = '#8a8a8a';
