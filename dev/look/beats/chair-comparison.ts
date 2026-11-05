import type { ShotList } from '../shot-types.ts';

export default {
  question: 'Does merging the four rigid chair parts preserve their colors, edges and cast shadows?',
  size: [640, 480],
  beats: [
    {
      name: 'Rigid chair',
      query: 'proto=place&dev=1',
      setup: 'dev/look/evals/chair-comparison.ts',
      warm: 1,
      cameras: [
        { name: 'Front and shadow', anchor: 'player', cam: [2.5, 2.3, 3.5], look: [0, 0.6, 0], fov: 40 },
        { name: 'Back and side', anchor: 'player', cam: [-2.5, 1.6, -3.5], look: [0, 0.6, 0], fov: 40 },
      ],
      variants: [
        { name: 'Original four parts', values: { 'comparison.chair': 0 } },
        { name: 'Merged production chair', values: { 'comparison.chair': 1 } },
      ],
    },
  ],
} satisfies ShotList;
