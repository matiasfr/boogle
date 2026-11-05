import type { ShotList } from '../shot-types.ts';
import skySize from './sky-size.ts';

export default {
  ...skySize,
  question: 'Do default and prepared evening retain their lighting and reflections with the sky-size comparison?',
  beats: [
    {
      ...skySize.beats[0],
      name: 'Day and prepared evening at matching cube sizes',
      setup: 'dev/look/evals/sky-size.ts',
      cameras: [skySize.beats[0]!.cameras[0]!, skySize.beats[0]!.cameras[2]!],
      variants: [
        { name: 'Default day 1024' },
        { name: 'Evening 1024', query: 'evening=1' },
        { name: 'Day 512', query: 'skySize=512' },
        { name: 'Evening 512', query: 'evening=1&skySize=512' },
        { name: 'Day 256', query: 'skySize=256' },
        { name: 'Evening 256', query: 'evening=1&skySize=256' },
      ],
    },
  ],
} satisfies ShotList;
