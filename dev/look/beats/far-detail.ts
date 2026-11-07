import type { ShotList } from '../shot-types.ts';

// Matched stills for the owner's call of 7 November 2026: the cheaper far sea and coarser far ground, off against on,
// from spawn, the bench's far view and its bay view, at desktop and phone size. Frozen clock, fixed resolution.
const sizes: [string, [number, number]][] = [
  ['desktop', [1280, 800]],
  ['phone', [375, 812]],
];
const settings: [string, Record<string, boolean>][] = [
  ['off', { farSea: false, farGround: false }],
  ['far sea', { farSea: true, farGround: false }],
  ['far ground', { farSea: false, farGround: true }],
  ['both on', { farSea: true, farGround: true }],
];

export default {
  question:
    'Do the cheaper far sea and the coarser far ground look the same as the full ones from where players stand?',
  beats: [
    {
      name: 'Far sea and ground',
      query: 'dev=1',
      warm: 4,
      cameras: [
        { name: 'spawn', anchor: 'player', cam: [0, 3.2, 7], look: [0, 1.4, -6], fov: 62 },
        { name: 'far', cam: [1040, 170, 260], look: [0, 0, 0], fov: 62 },
        { name: 'bay', cam: [780, 9, 0], look: [-700, 40, -500], fov: 62 },
      ],
      variants: sizes.flatMap(([device, size]) =>
        settings.map(([label, values]) => ({
          name: `${device} ${label}`,
          size,
          graphics: { resolution: 1, ...values },
        })),
      ),
    },
  ],
} satisfies ShotList;
