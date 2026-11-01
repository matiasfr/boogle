// The era kits (docs/plans/find-the-fun.md step 4, the greybox era swap): what stands around the court and along the
// route in each era, and how the era looks and sounds. One data table on purpose (docs/research/era-progression.md,
// rec 12: ceremonies from a template), so the art pass (vertical-slice S1's era props: huts and campfire; bazaar
// stalls, bunting, the town hall) replaces rows here and the swap (./index.ts) keeps working.
//
// Each era changes several channels at once (era-progression rec 1 and 3): a signature silhouette (era 1's steep
// A-frame roofs, era 2's smoking chimneys), one landmark seen from the court (rec 2: era 2's water tower, the tallest
// thing on the island), a sky and fog tint and an ambience bed (./atmosphere.ts, ./ambience.ts).
//
// A row is a box on the ground: centre x, z (world metres), size w (x), h (up), d (z), yaw (radians), colour. `kind`
// names what it stands in for. Bunting is a line of little flags between two poles, `from` and `to` at height `h`.
// Positions keep clear of the court (COURT, src/world/grid.ts: x 12, z 21, r 8), the route's site rings
// (src/sim/route.ts) and the court camera (`/look --view court`: from x 12, z 30, looking north).

export type Block = {
  kind: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  yaw?: number;
  /** metres above the ground the box starts (a water tower's tank on its legs) */
  y?: number;
  color: string;
  /** a second box on top (a roof, an awning): its height and colour, as wide as the block plus `over` metres */
  top?: { h: number; color: string; over?: number };
  /** a steep A-frame roof on top instead (era 1's signature): ridge `rise` metres above the walls, along x */
  pitch?: { rise: number; color: string; over?: number };
  /** a chimney on the roof (era 2's signature), `h` metres above the walls at (dx, dz) from the middle; it smokes */
  chimney?: { h: number; dx?: number; dz?: number };
  /** heritage (era-progression rec 4 and 5): it stays standing in every later era instead of sinking */
  keep?: boolean;
};
export type Bunting = { from: [number, number]; to: [number, number]; h: number };
export type EraSet = {
  name: string;
  blocks: Block[];
  bunting: Bunting[];
  /** Sky and fog (./atmosphere.ts): dome top and horizon tints, how far toward them (0..1), and scales on the fog's
   * near and far distances (1: the game's own; smaller is hazier). */
  sky: { top: string; horizon: string; amount: number; near: number; far: number };
  /** The ambience bed that plays in this era (./ambience.ts). */
  bed: 'wood' | 'steam';
};

const hut = (x: number, z: number, yaw = 0, keep = false): Block => ({
  kind: 'hut',
  x,
  z,
  w: 2.4,
  h: 0.9,
  d: 2.2,
  yaw,
  color: '#8a6a48',
  pitch: { rise: 2.1, color: '#c9a86a', over: 0.5 },
  keep,
});
const STALL_COLORS = ['#e05a4f', '#f2b134', '#3fa7d6', '#7bc96f', '#e86fb0'];
let stalls = 0;
const stall = (x: number, z: number, yaw = 0, smokes = false): Block => ({
  kind: 'stall',
  x,
  z,
  w: 2.4,
  h: 3.2,
  d: 2.2,
  yaw,
  color: '#efe3c8',
  top: { h: 0.5, color: STALL_COLORS[stalls++ % STALL_COLORS.length], over: 0.8 },
  chimney: smokes ? { h: 2.6, dx: 0.7, dz: -0.5 } : undefined,
});
const IRON = '#4a4642',
  BRICK = '#9a4a3a';

// Era 2's landmark (era-progression rec 2): a water tower, the tallest thing on the island, left of the court view.
const TOWER = { x: -5, z: -22, legs: 12, tank: 5 };
const waterTower: Block[] = [
  ...[
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sz]) => ({
    kind: 'water tower leg',
    x: TOWER.x + sx * 1.7,
    z: TOWER.z + sz * 1.7,
    w: 0.35,
    h: TOWER.legs,
    d: 0.35,
    color: IRON,
  })),
  { kind: 'water tower band', x: TOWER.x, z: TOWER.z, y: 5, w: 3.8, h: 0.25, d: 3.8, color: IRON },
  {
    kind: 'water tower tank',
    x: TOWER.x,
    z: TOWER.z,
    y: TOWER.legs,
    w: 5,
    h: TOWER.tank,
    d: 5,
    yaw: 0.785,
    color: '#7b8a8f',
    top: { h: 1.4, color: IRON, over: -1.6 },
  },
];

/** By era (index 1, 2). */
export const ERAS: Record<number, EraSet> = {
  1: {
    name: 'Wood age',
    blocks: [
      hut(0, 16, 0.3),
      hut(-1, 24, -0.2),
      hut(24, 15, -0.3),
      hut(25, 24, 0.2, true), // the hut that stays: history or leftovers?
      hut(17, -3, 0.1),
      hut(3, -18, -0.4),
      hut(14, -24, 0.3),
      hut(1, -38, 0.2),
      { kind: 'campfire', x: 19, z: 13, w: 0.9, h: 0.6, d: 0.9, color: '#e8742c' },
      { kind: 'log seat', x: 20.6, z: 13, w: 0.5, h: 0.35, d: 1.6, color: '#6b4a2b' },
      { kind: 'log seat', x: 19, z: 11.4, w: 1.6, h: 0.35, d: 0.5, color: '#6b4a2b' },
      { kind: 'log seat', x: 17.4, z: 13, w: 0.5, h: 0.35, d: 1.6, color: '#6b4a2b' },
    ],
    bunting: [],
    sky: { top: '#3d9de3', horizon: '#cfeee0', amount: 0.25, near: 1, far: 1 },
    bed: 'wood',
  },
  2: {
    name: 'Steam wagons',
    blocks: [
      stall(0, 16, 0.3, true),
      stall(-1, 24, -0.2),
      stall(24, 15, -0.3, true),
      stall(2, 10, 0.5),
      stall(22, 9, -0.5),
      stall(3, -18, -0.4, true),
      stall(14, -24, 0.3),
      stall(1, -38, 0.2),
      {
        kind: 'town hall',
        x: 22,
        z: -2,
        w: 8,
        h: 6,
        d: 6,
        yaw: -0.2,
        color: '#e9dcc0',
        top: { h: 1.2, color: '#b5443a', over: 0.8 },
        chimney: { h: 4.5, dx: -2.6, dz: 1.6 },
      },
      { kind: 'clock tower', x: 22, z: -2, w: 2.2, h: 10, d: 2.2, yaw: -0.2, color: '#d8c8a6' },
      { kind: 'works stack', x: 31, z: -14, w: 1.6, h: 13, d: 1.6, color: BRICK, chimney: { h: 0 } },
      { kind: 'works shed', x: 31, z: -10, w: 6, h: 3, d: 5, yaw: 0.1, color: '#8c8478' },
      ...waterTower,
    ],
    bunting: [
      { from: [2, 13], to: [22, 13], h: 3.6 },
      { from: [2, 13], to: [-1, 27], h: 3.6 },
      { from: [22, 13], to: [25, 27], h: 3.6 },
      { from: [9, 6], to: [9, -10], h: 3.2 },
    ],
    sky: { top: '#8c9aa6', horizon: '#e8c08a', amount: 0.85, near: 0.15, far: 0.42 },
    bed: 'steam',
  },
};

// Era-independent pieces the prototype needs: the platform at the far end of the route, where opening day starts.
export const PLATFORM = { w: 5, h: 0.5, d: 3.5, color: '#9c8a70' };
export const BELL_POST = { h: 3.2, color: '#5b4632', bell: '#d9a63a' };
// The wagon-run marker (era 2): posts beside the laid line every `every` metres, `off` metres to its side.
export const WAGON_MARK = { every: 3, off: 1.6, h: 2, w: 0.3, color: '#ffd23f' };
// The gathering call (./call.ts; docs/research/shared-moments-and-events.md, recs 1 to 3): the ring around the
// platform that counts as "at the platform" (it also shows the time left), and the signal smoke's colour.
export const GATHER = { r: 9, smoke: '#ffd23f', ring: '#ffd23f', bell: '#e05a4f' };
