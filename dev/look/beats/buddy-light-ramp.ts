import type { ShotList, ShotCamera } from '../shot-types.ts';
const variants = [
  { name: 'Current', values: { 'buddy.ramp': 0 } },
  { name: 'Soft ramp', values: { 'buddy.ramp': 1 } },
  { name: 'Two-band ramp', values: { 'buddy.ramp': 2 } },
];
// 5.2 m from the look target, matching the production resting follow distance and 62 degree field of view.
const play: ShotCamera = {
  name: 'Buddy 5.2 m',
  anchor: 'player',
  cam: [2.6, 2.277, 4.196],
  look: [0, 0.65, 0],
  fov: 62,
  region: [240, 145, 160, 220],
};
export default {
  question: 'Can you read Buddy and the carried logs at a glance without flattening shoulders or cutting the face?',
  size: [640, 480],
  beats: [
    ...[
      ['Coral', 0],
      ['Blue', 4],
      ['Violet', 5],
    ].map(([name, paint]) => ({
      name: String(name),
      query: `proto=place&water=new&dev=1&shot=pack&paint=${paint}`,
      setup: 'dev/look/evals/buddy-ramp.ts',
      warm: 2,
      cameras: [play],
      variants,
    })),
    {
      name: 'Dark paint diagnostic (outside player palette)',
      query: 'proto=place&water=new&dev=1&shot=pack&paint=4&dark=1',
      setup: 'dev/look/evals/buddy-ramp.ts',
      warm: 2,
      cameras: [play, { ...play, name: 'Dark face 5.2 m', cam: [-2.6, 2.277, -4.196] }],
      variants,
    },
    {
      name: 'Loaded at rack',
      query: 'proto=place&water=new&dev=1&shot=pack&paint=4&loaded=1',
      setup: 'dev/look/evals/buddy-ramp.ts',
      warm: 2,
      cameras: [
        play,
        {
          name: 'Face 5.2 m',
          anchor: 'player',
          cam: [-2.6, 2.277, -4.196],
          look: [0, 0.65, 0],
          fov: 62,
          region: [240, 145, 160, 220],
        },
        {
          name: 'Close secondary',
          anchor: 'player',
          cam: [-1.6, 1.6, -2.6],
          look: [0, 0.65, 0],
          fov: 40,
          region: [160, 50, 320, 420],
        },
        { name: 'Shore water control', cam: [884, 8, 151], look: [868, 0, 144], fov: 62 },
      ],
      variants,
    },
  ],
} satisfies ShotList;
