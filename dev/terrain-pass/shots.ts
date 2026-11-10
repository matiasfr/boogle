// Matched stills for the terrain pass (docs/plans/terrain-pass.md): today, A, B and A+B over one wedge of Place, four
// framings, desktop and phone. `node dev/look/shots.ts dev/terrain-pass/shots.ts --name terrain-pass`.
import type { ShotList } from '../look/shot-types.ts';

const variants = [
  { name: 'Today', query: '' },
  { name: 'A: 0.5 m mesh + bands', query: 'terrain=a' },
  { name: 'B: cove textured layers', query: 'terrain=b' },
  { name: 'A+B', query: 'terrain=ab' },
];
const sizes: [string, [number, number]][] = [
  ['desktop', [1280, 800]],
  ['phone', [844, 390]],
];

export default {
  question: 'Does the wedge read as better-made ground (cliff, slope, path, shore) without props floating or a seam?',
  size: [1280, 800],
  beats: [
    {
      name: 'Terrain pass wedge',
      query: 'dev=1',
      setup: 'dev/terrain-pass/setup.ts',
      warm: 3,
      cameras: [
        { name: 'Wide from the village', cam: [893, 42, 48], look: [962, 2, 150], fov: 55 },
        { name: 'Cliff foot, Buddy for scale', cam: [957.5, 2.6, 165], look: [950, 6, 157], fov: 55 },
        { name: 'Shore edge', cam: [928, 3.5, 202], look: [957, 1.5, 180], fov: 55 },
        { name: 'Far, across the water', cam: [970, 30, 450], look: [960, 8, 140], fov: 45 },
      ],
      variants: sizes.flatMap(([label, size]) =>
        variants.map((v) => ({ name: `${v.name} (${label})`, query: v.query, size, graphics: { resolution: 1 } })),
      ),
    },
  ],
} satisfies ShotList;
