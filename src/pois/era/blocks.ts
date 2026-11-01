// The era block sets (docs/plans/find-the-fun.md step 4, the greybox era swap): what stands around the court and along
// the route in each era. One data table on purpose, so the art pass (vertical-slice S1's era props: huts and campfire;
// bazaar stalls, bunting, the town hall) replaces rows here and the swap (./index.ts) keeps working.
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
  color: string;
  /** a second box on top (a roof, an awning): its height and colour, as wide as the block plus `over` metres */
  top?: { h: number; color: string; over?: number };
};
export type Bunting = { from: [number, number]; to: [number, number]; h: number };
export type EraSet = { blocks: Block[]; bunting: Bunting[] };

const hut = (x: number, z: number, yaw = 0): Block => ({
  kind: 'hut',
  x,
  z,
  w: 2.2,
  h: 1.4,
  d: 2,
  yaw,
  color: '#8a6a48',
  top: { h: 0.5, color: '#c9a86a', over: 0.5 },
});
const STALL_COLORS = ['#e05a4f', '#f2b134', '#3fa7d6', '#7bc96f', '#e86fb0'];
let stalls = 0;
const stall = (x: number, z: number, yaw = 0): Block => ({
  kind: 'stall',
  x,
  z,
  w: 2.4,
  h: 3.2,
  d: 2.2,
  yaw,
  color: '#efe3c8',
  top: { h: 0.5, color: STALL_COLORS[stalls++ % STALL_COLORS.length], over: 0.8 },
});

/** By era (index 1, 2). */
export const ERAS: Record<number, EraSet> = {
  1: {
    blocks: [
      hut(0, 16, 0.3),
      hut(-1, 24, -0.2),
      hut(24, 15, -0.3),
      hut(25, 24, 0.2),
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
  },
  2: {
    blocks: [
      stall(0, 16, 0.3),
      stall(-1, 24, -0.2),
      stall(24, 15, -0.3),
      stall(25, 24, 0.2),
      stall(2, 10, 0.5),
      stall(22, 9, -0.5),
      stall(3, -18, -0.4),
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
      },
      { kind: 'clock tower', x: 22, z: -2, w: 2.2, h: 10, d: 2.2, yaw: -0.2, color: '#d8c8a6' },
    ],
    bunting: [
      { from: [2, 13], to: [22, 13], h: 3.6 },
      { from: [2, 13], to: [-1, 27], h: 3.6 },
      { from: [22, 13], to: [25, 27], h: 3.6 },
      { from: [9, 6], to: [9, -10], h: 3.2 },
    ],
  },
};

// Era-independent pieces the prototype needs: the platform at the far end of the route, where opening day starts.
export const PLATFORM = { w: 5, h: 0.5, d: 3.5, color: '#9c8a70' };
export const BELL_POST = { h: 3.2, color: '#5b4632', bell: '#d9a63a' };
// The wagon-run marker (era 2): posts beside the laid line every `every` metres, `off` metres to its side.
export const WAGON_MARK = { every: 3, off: 1.6, h: 2, w: 0.3, color: '#ffd23f' };
