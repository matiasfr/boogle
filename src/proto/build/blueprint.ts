// The helper hut's build, as data (the construction prototype, ?proto=build; docs/game-design/haul.md): every piece
// in the order it goes up, with the fraction of the Helper ring's stock at which it appears. Scaffolding first, then
// sills, posts, top plates, wall planks, the ridge, the roof and the station sign; the scaffolding comes down once
// the hut is built. A later "projects as data" system can take this shape as it is (a list of pieces per project).
// Pure data and math, no three.js: the view is ./index.ts. Cosmetic (Local): the stage is derived from lockstep stock.

/** One box, in metres in the hut's frame (x away from the Helper ring, y up, origin on the ground at the hut's middle).
 * (x, y, z) is the middle of the box's base; w, h, d its size along x, y, z; rx, rz tilt it about its base. */
export type Piece = {
  kind: 'scaffold' | 'sill' | 'post' | 'plate' | 'plank' | 'ridge' | 'roof' | 'sign' | 'board';
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rx?: number;
  rz?: number;
  /** Shows once the ring's stock fraction reaches this (0: with the first piece poured; 1: when the hut is built). */
  at: number;
};
type Box = Omit<Piece, 'at'>;

// Spreads boxes evenly over a stretch of the ring, in order.
const spread = (from: number, to: number, boxes: Box[]): Piece[] =>
  boxes.map((b, k) => ({ ...b, at: boxes.length > 1 ? from + ((to - from) * k) / (boxes.length - 1) : to }));

const W = 2.4, // footprint along x
  D = 1.9, // footprint along z
  SILL = 0.18,
  POST = 1.45,
  TOP = SILL + POST, // top of the posts
  PLATE = 0.16,
  RISE = 0.62, // roof: ridge above the eaves
  EAVE = D / 2 + 0.3, // roof overhang along z
  PITCH = Math.atan2(RISE, EAVE);
const corners = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

const scaffold: Box[] = [
  ...corners.map(([sx, sz]) => ({
    kind: 'scaffold' as const,
    x: sx * 1.5,
    y: 0,
    z: sz * 1.3,
    w: 0.08,
    h: 2.8,
    d: 0.08,
  })),
  ...[-1, 1].flatMap((sz) =>
    [1.1, 2.2].map((y) => ({ kind: 'scaffold' as const, x: 0, y, z: sz * 1.3, w: 3.1, h: 0.06, d: 0.06 })),
  ),
];
const sills: Box[] = [
  { kind: 'sill', x: 0, y: 0, z: -D / 2, w: W, h: SILL, d: SILL },
  { kind: 'sill', x: 0, y: 0, z: D / 2, w: W, h: SILL, d: SILL },
  { kind: 'sill', x: -W / 2 + 0.09, y: 0, z: 0, w: SILL, h: SILL, d: D - SILL },
  { kind: 'sill', x: W / 2 - 0.09, y: 0, z: 0, w: SILL, h: SILL, d: D - SILL },
];
const posts: Box[] = corners.map(([sx, sz]) => ({
  kind: 'post',
  x: sx * (W / 2 - 0.09),
  y: SILL,
  z: sz * (D / 2),
  w: 0.16,
  h: POST,
  d: 0.16,
}));
const plates: Box[] = sills.map((b) => ({ ...b, kind: 'plate', y: TOP, h: PLATE }));
// Three rows of planks on each wall; the wall facing the ring (-x) keeps a doorway in its middle.
const rows = [0, 1, 2].map((r) => SILL + 0.05 + r * 0.47);
const planks: Box[] = rows.flatMap((y) => [
  { kind: 'plank', x: 0, y, z: -D / 2, w: W - 0.3, h: 0.42, d: 0.07 },
  { kind: 'plank', x: 0, y, z: D / 2, w: W - 0.3, h: 0.42, d: 0.07 },
  { kind: 'plank', x: W / 2 - 0.09, y, z: 0, w: 0.07, h: 0.42, d: D - 0.3 },
  { kind: 'plank', x: -W / 2 + 0.09, y, z: -0.6, w: 0.07, h: 0.42, d: 0.55 },
  { kind: 'plank', x: -W / 2 + 0.09, y, z: 0.6, w: 0.07, h: 0.42, d: 0.55 },
]);
const ridge: Box[] = [{ kind: 'ridge', x: 0, y: TOP + PLATE + RISE - 0.1, z: 0, w: W + 0.5, h: 0.14, d: 0.14 }];
// Four roof boards, two a side, each tilted down from the ridge to the eave.
const slope = Math.hypot(RISE, EAVE);
const roof: Box[] = [-1, 1].flatMap((sz) =>
  [-1, 1].map((sx) => ({
    kind: 'roof' as const,
    x: (sx * (W + 0.5)) / 4,
    y: TOP + PLATE + RISE / 2 - 0.06,
    z: (sz * EAVE) / 2,
    w: (W + 0.5) / 2 - 0.02,
    h: 0.08,
    d: slope,
    rx: sz * PITCH,
  })),
);
// The station sign beside the doorway: two posts, then the board as the hut completes.
const signPosts: Box[] = [0.55, 1.65].map((z) => ({
  kind: 'sign',
  x: -W / 2 - 0.7,
  y: 0,
  z,
  w: 0.12,
  h: 1.75,
  d: 0.12,
}));
const signBoard: Box = { kind: 'board', x: -W / 2 - 0.7, y: 1.1, z: 1.1, w: 0.08, h: 0.5, d: 1.4 };

export const HUT_BUILD: Piece[] = [
  ...spread(0, 0.04, scaffold),
  ...spread(0.08, 0.18, sills),
  ...spread(0.22, 0.34, posts),
  ...spread(0.38, 0.48, plates),
  ...spread(0.52, 0.78, planks),
  ...spread(0.81, 0.81, ridge),
  ...spread(0.84, 0.94, roof),
  ...spread(0.96, 0.98, signPosts),
  { ...signBoard, at: 1 },
];

/** The build's named phases, in order (construction research rec 4): each boundary gets a beat in the view. */
export const PHASES = ['ground', 'frame', 'walls', 'roof', 'topping out'] as const;
export type Phase = (typeof PHASES)[number];
export const PHASE_OF: Record<Piece['kind'], Phase> = {
  scaffold: 'ground',
  sill: 'ground',
  post: 'frame',
  plate: 'frame',
  plank: 'walls',
  ridge: 'roof',
  roof: 'roof',
  sign: 'topping out',
  board: 'topping out',
};

/** How far along a build is: the ring's stock over its cost, or 1 once it is built. */
export const buildFraction = (stock: number, cost: number, built: boolean): number =>
  built ? 1 : cost > 0 ? Math.min(1, Math.max(0, stock / cost)) : 0;
/** Whether a piece shows at build fraction f (nothing before the first piece is poured). */
export const shows = (p: Piece, f: number): boolean => f > 0 && f >= p.at;
