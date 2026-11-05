import type { ShotList } from '../shot-types.ts';

// Authored Place fixture, not played progression. Cell 5 is the accepted look.
export default {
  question: 'At fixed exposure, how do key and fill change Buddy, the town surfaces and open shade at play distance?',
  size: [640, 400],
  beats: [
    {
      name: 'Town key/fill wedge — authored fixture',
      query: 'proto=place&dev=1&shot=pack',
      setup: 'dev/look/evals/place-job.ts',
      warm: 3,
      cameras: [{ name: 'Town play distance', anchor: 'player', cam: [6, 6, 15], look: [0, 0.7, 0], fov: 62 }],
      variants: [0.96, 1.12, 1.28].flatMap((key) =>
        [2.4, 3.2, 4].map((fill) => ({
          name: `Key ${key} / fill ${fill}${key === 1.12 && fill === 3.2 ? ' — accepted baseline' : ''}`,
          look: 'current',
          tunables: { 'post.centre': 0.12, 'sky.keyGain': key, 'sky.fillGain': fill },
          graphics: { resolution: 1, bloom: false },
        })),
      ),
    },
  ],
} satisfies ShotList;
