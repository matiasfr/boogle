import type { ShotList } from '../shot-types.ts';

const colours = ['#fff6c2', '#ffb81f', '#ffffff', '#fffadc', '#fff0c8', '#ffd278', '#ffbe5a', '#808080', '#c83a2a'];
export default {
  question:
    'Do corrected sRGB texture samples match linear references, and how did the missing decode change these actual canvas palette colours?',
  size: [960, 600],
  beats: [
    {
      name: 'Canvas decode control: top linear reference / middle AFTER sRGB / bottom BEFORE untagged',
      query: 'proto=place&dev=1&shot=pack&fixture=colour-textures',
      setup: 'dev/look/evals/visual-pipeline.ts',
      warm: 3,
      cameras: [
        {
          name: 'Honk (1–2), gift (3–4), halo (5–7), grey/red controls (8–9); palette reproduction, not live effects',
          anchor: 'player',
          cam: [0, 4, 10],
          look: [0, 2, -3.2],
          fov: 48,
        },
      ],
      variants: [
        {
          name: 'Accepted Neutral / 0.12 / key 1.12 / fill 3.2',
          look: 'current',
          tunables: { 'post.centre': 0.12, 'sky.keyGain': 1.12, 'sky.fillGain': 3.2 },
          graphics: { resolution: 1, bloom: false },
        },
      ],
      sampleObjects: colours.flatMap((hex) => [
        `linear RGB ${hex}`,
        `sRGB texture ${hex}`,
        `untagged texture (before) ${hex}`,
      ]),
    },
  ],
} satisfies ShotList;
