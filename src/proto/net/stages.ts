// The town's stages (?proto=net), one data table in the shape of src/proto/era/blocks.ts, so an art pass replaces rows
// here and the step-up (./town.ts) keeps working. Each stage changes shape, not just size (era-progression recs 1-3):
//   0  a village: low A-frame huts around a fire
//   1  wood arrived: tall timber halls with steep roofs, and a clock tower, the landmark you read from the line
//   2  stone arrived: a town of stone blocks with smoking chimneys, a works stack and a far taller keep
//   3  the frontier: the town at its biggest, spreading up the hill behind a red-and-white signal mast
// A row is a box on the ground, centre x, z in world metres. `keep` stays standing in every later stage (heritage, recs
// 4-5: one hut from the first day stays). Everything else sinks when the next stage rises. A landmark's kind starts
// `landmark`: it rises slowly, last, and sets off the fireworks. `net-line`'s rail runs north from x = -28 and the
// Track ring sits just west of it at z = 22: the town stands clear of both, and of the court (x 4 to 20, z 13 to 29).
import type { Block } from '../era/blocks.ts';

/** Where the step-up ripples out from. */
export const TOWN = { x: -11, z: 22 };

const WOOD = '#8a6a48',
  THATCH = '#c9a86a',
  TIMBER = '#a9794c',
  RED = '#c4453a',
  STONE = '#c8c3b4',
  STONE2 = '#b2ad9f',
  SLATE = '#4d5560',
  BRICK = '#9a4a3a',
  CREAM = '#efe3c8',
  GOLD = '#f2b134',
  IRON = '#3f4145',
  TERRACOTTA = '#c9663c',
  GLASS = '#55606c',
  WHITE = '#f4f1e8';

const hut = (x: number, z: number, yaw = 0, keep = false): Block => ({
  kind: 'hut',
  x,
  z,
  w: 2.8,
  h: 1,
  d: 2.6,
  yaw,
  color: WOOD,
  pitch: { rise: 2.3, color: THATCH, over: 0.6 },
  keep,
});
const hall = (x: number, z: number, w: number, h: number, d: number, yaw = 0, smokes = false): Block => ({
  kind: 'hall',
  x,
  z,
  w,
  h,
  d,
  yaw,
  color: TIMBER,
  pitch: { rise: Math.max(w, d) * 0.75, color: RED, over: 1 },
  chimney: smokes ? { h: 3, dx: w * 0.25, dz: -d * 0.2 } : undefined,
});
// A stone block: `keep`, since the last stage only adds. Dark window bands say how many floors it has, so it reads as a
// building rather than a slab; walls and roofs vary by row (shape first, then colour).
const WALLS = ['#d9d2c0', '#b9b5a8', '#d8b98c', '#c6c9c4', '#cf9f7e'];
let blocks = 0;
const block = (x: number, z: number, w: number, h: number, d: number, yaw = 0, smokes = false): Block[] => {
  const k = blocks++;
  const color = WALLS[k % WALLS.length]!;
  const roof =
    k % 3 === 1 ? { pitch: { rise: 2.6, color: TERRACOTTA, over: 0.7 } } : { top: { h: 0.8, color: SLATE, over: 0.7 } };
  const floors: Block[] = [];
  for (let y = 1.5; y < h - 1.2; y += 3)
    floors.push({ kind: 'windows', x, z, y, w: w + 0.12, h: 1, d: d + 0.12, yaw, color: GLASS, keep: true });
  return [
    {
      kind: 'stone block',
      x,
      z,
      w,
      h,
      d,
      yaw,
      color,
      ...roof,
      chimney: smokes ? { h: 3.5, dx: w * 0.28, dz: d * 0.2 } : undefined,
      keep: true,
    },
    ...floors,
  ];
};

// Stage 1's landmark, stacked boxes: 30 m, white and red, by the village's middle.
const CLOCK = { x: -18.5, z: 25 };
const clockTower: Block[] = [
  { kind: 'landmark clock shaft', x: CLOCK.x, z: CLOCK.z, w: 4, h: 20, d: 4, color: WHITE, keep: true },
  { kind: 'landmark clock face', x: CLOCK.x, z: CLOCK.z, y: 20, w: 5, h: 3.4, d: 5, color: GOLD, keep: true },
  { kind: 'landmark clock roof', x: CLOCK.x, z: CLOCK.z, y: 23.4, w: 6, h: 1, d: 6, color: RED, keep: true },
  { kind: 'landmark clock spire', x: CLOCK.x, z: CLOCK.z, y: 24.4, w: 2.2, h: 5.6, d: 2.2, color: RED, keep: true },
];
// Stage 2's landmark: a 48 m stone keep with a gold crown, the tallest thing you can see.
const KEEP = { x: -8, z: 21 };
const stoneKeep: Block[] = [
  { kind: 'landmark keep base', x: KEEP.x, z: KEEP.z, w: 11, h: 14, d: 11, color: STONE, keep: true },
  { kind: 'landmark keep shaft', x: KEEP.x, z: KEEP.z, y: 14, w: 7.5, h: 22, d: 7.5, color: STONE2, keep: true },
  { kind: 'landmark keep cap', x: KEEP.x, z: KEEP.z, y: 36, w: 10, h: 2.5, d: 10, color: SLATE, keep: true },
  { kind: 'landmark keep crown', x: KEEP.x, z: KEEP.z, y: 38.5, w: 4.5, h: 9.5, d: 4.5, color: GOLD, keep: true },
];
// Stage 3's landmark: a signal mast on the hill behind the town, about 60 m over the sea.
const MAST = { x: -9, z: -3 };
const bands = [0, 1, 2, 3, 4, 5, 6].map((k): Block => ({
  kind: 'landmark mast band',
  x: MAST.x,
  z: MAST.z,
  y: k * 7,
  w: 2.6 - k * 0.2,
  h: 7,
  d: 2.6 - k * 0.2,
  color: k % 2 ? WHITE : RED,
  keep: true,
}));
const signalMast: Block[] = [
  ...bands,
  { kind: 'landmark mast lamp', x: MAST.x, z: MAST.z, y: 49, w: 3.4, h: 2.4, d: 3.4, color: GOLD, keep: true },
];

export type Stage = { name: string; blocks: Block[] };
export const STAGES: Stage[] = [
  {
    name: 'Village',
    blocks: [
      hut(-20, 31, 0.2, true), // the hut that stays
      hut(-16, 33, -0.3),
      hut(-16, 14, 0.1),
      hut(-10, 16, 0.3),
      hut(-6, 23, -0.2),
      hut(-8, 30, 0.15),
      { kind: 'campfire', x: -14, z: 26, w: 1, h: 0.6, d: 1, color: '#e8742c', chimney: { h: 0 } },
      { kind: 'log seat', x: -12.2, z: 26, w: 0.5, h: 0.35, d: 1.7, color: '#6b4a2b' },
      { kind: 'log seat', x: -14, z: 27.8, w: 1.7, h: 0.35, d: 0.5, color: '#6b4a2b' },
    ],
  },
  {
    name: 'Timber town',
    blocks: [
      ...clockTower,
      hall(-14.5, 13, 6, 5, 6, 0.1, true),
      hall(-7, 14, 7, 6, 6, -0.15),
      hall(-3, 23, 6, 6, 7, 0.1, true),
      hall(-8, 31, 7, 5, 6, -0.1),
      hall(-15, 33, 6, 5, 5, 0.2, true),
      hall(-13, 7, 6, 5, 5, -0.2),
      hall(-2, 8, 6, 5, 5, 0.25),
      // the station: a long canopy beside the first stop
      { kind: 'station', x: -24.5, z: 14, w: 2.6, h: 3.2, d: 9, color: CREAM, top: { h: 0.5, color: RED, over: 1 } },
    ],
  },
  {
    name: 'Stone town',
    blocks: [
      ...stoneKeep,
      // the streets around the keep, east of the line
      ...block(-19, 33, 6, 7, 5, 0.05),
      ...block(-12, 34, 6, 10, 5, -0.05, true),
      ...block(-5, 33, 6, 8, 6),
      ...block(2, 33, 5, 12, 5, 0.08),
      ...block(0, 23, 4.5, 9, 6, 0, true),
      ...block(-14, 16, 5, 8, 5, 0.1),
      ...block(-19, 10, 5, 11, 6, 0.05, true),
      ...block(-12, 9, 6, 7, 5),
      ...block(-5, 10, 6, 12, 5, -0.05),
      ...block(2, 9, 5, 8, 6, 0.1, true),
      // up the hill behind it
      ...block(-20, 2, 6, 8, 5, 0.1),
      ...block(-13, 2, 5, 11, 5),
      ...block(-1, 1, 6, 9, 5, -0.1, true),
      // and over the line to the west
      ...block(-35, 17, 6, 10, 6),
      ...block(-35.5, 8, 6, 13, 6, 0, true),
      ...block(-36, -1, 6, 7, 5),
      {
        kind: 'station',
        x: -24.5,
        z: 12,
        w: 3,
        h: 4.5,
        d: 12,
        color: CREAM,
        top: { h: 0.8, color: SLATE, over: 1.2 },
        keep: true,
      },
      { kind: 'works stack', x: -35, z: -6, w: 2.4, h: 26, d: 2.4, color: BRICK, chimney: { h: 0 }, keep: true },
      { kind: 'works shed', x: -35.5, z: -1, w: 7, h: 4, d: 6, color: IRON, keep: true },
    ],
  },
  {
    name: 'The biggest town',
    blocks: [
      ...signalMast,
      ...block(-21, -7, 6, 9, 6, -0.2),
      ...block(-14, -9, 6, 13, 6, 0.15, true),
      ...block(-7, -12, 6, 9, 5, -0.1),
      ...block(0, -9, 6, 12, 5, 0.1),
      ...block(5, -2, 5, 8, 6, 0.2, true),
      ...block(-23.5, 29, 3.5, 17, 3.5),
      ...block(5, 36, 5, 15, 4),
      ...block(-37, -13, 6, 9, 6),
    ],
  },
];
