import type { ShotList } from '../shot-types.ts';

export default {
  question:
    'Do narrower grass/path/sand boundaries read better at play distance without changing paths, palette or water?',
  size: [640, 400],
  beats: [
    {
      name: 'Ground boundaries',
      at: 'objective: Follow the path.',
      saves: '.look/evidence/1793845117250-29352/run/saves',
      query: 'proto=place&water=new&dev=1&groundEdges=1&shot=pack',
      warm: 3,
      cameras: [
        { name: 'Town path / 5.2 m play camera', anchor: 'player', cam: [0, 1.835, 5.075], look: [0, 0.7, 0], fov: 62 },
        { name: 'Town path overview', cam: [924, 52, 47], look: [900, 18, 0], fov: 62 },
        { name: 'Shore / grass, sand and water', cam: [778, 19, 55], look: [796, 6, 34], fov: 62 },
      ],
      variants: [
        { name: 'Current', look: 'current', graphics: { resolution: 1 }, values: { 'ground.edges': 0 } },
        { name: 'Narrow / restrained', look: 'current', graphics: { resolution: 1 }, values: { 'ground.edges': 1 } },
        {
          name: 'Crisp / strongest channel',
          look: 'current',
          graphics: { resolution: 1 },
          values: { 'ground.edges': 2 },
        },
      ],
    },
  ],
} satisfies ShotList;
