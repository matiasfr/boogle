import type { ShotList, ShotVariant } from '../shot-types.ts';
import clouds from './cloud-warmth.ts';
import pipeline from './visual-pipeline.ts';

const variants: ShotVariant[] = [
  {
    name: 'Before: original cloud 1 / light profile 0, rebuilt on current source',
    tunables: { 'sky.cloudBrightness': 1, 'sky.lightColourProfile': 0 },
    graphics: { resolution: 1, bloom: false },
  },
  {
    name: 'After: production defaults, owner cell 5 — no lighting overrides',
    graphics: { resolution: 1, bloom: false },
  },
];

export default {
  question:
    'Does the accepted cloud .8 / neutral-light default reduce bright clouds and warmth while keeping spawn, doorway and shore readable at gain .12 and key/fill 1.12/3.2?',
  size: [640, 400],
  beats: [clouds.beats[0]!, pipeline.beats[1]!, pipeline.beats[2]!].map((beat) => ({
    ...beat,
    wedge: undefined,
    variants,
  })),
} satisfies ShotList;
