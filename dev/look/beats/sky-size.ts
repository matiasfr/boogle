import type { ShotList } from '../shot-types.ts';

export default {
  question: 'Do smaller loading-baked skies preserve cloud edges, the sun, horizon haze and water reflections?',
  size: [960, 600],
  beats: [
    {
      name: 'Frozen late-morning sky',
      query: 'proto=place&dev=1',
      warm: 2,
      cameras: [
        { name: 'Shore reflections', cam: [884, 8, 151], look: [868, 0, 144], fov: 62 },
        { name: 'Sun and clouds', cam: [884, 8, 151], look: [909, 25, 161], fov: 62 },
        { name: 'Cloud horizon', cam: [884, 8, 151], look: [864, 9, 151], fov: 62 },
      ],
      variants: [
        { name: 'Current 1024', query: 'skySize=1024' },
        { name: 'Compare 512', query: 'skySize=512' },
        { name: 'Compare 256', query: 'skySize=256' },
      ],
    },
  ],
} satisfies ShotList;
