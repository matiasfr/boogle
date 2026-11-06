import type { ShotList } from '../shot-types.ts';

export default {
  question: 'Do the summer day and the prepared evening retain their lighting and reflections?',
  size: [960, 600],
  beats: [
    {
      name: 'Summer day and prepared evening',
      query: 'proto=place&dev=1',
      warm: 2,
      cameras: [
        { name: 'Shore reflections', cam: [884, 8, 151], look: [868, 0, 144], fov: 62 },
        { name: 'Cloud horizon', cam: [884, 8, 151], look: [864, 9, 151], fov: 62 },
      ],
      variants: [{ name: 'Default summer day' }, { name: 'Evening', query: 'evening=1' }],
    },
  ],
} satisfies ShotList;
