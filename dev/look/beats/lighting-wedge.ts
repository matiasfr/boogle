import type { ShotList } from '../shot-types.ts';

const keys: [number, number, number] = [0.96, 1.12, 1.28];
const fills: [number, number, number] = [2.4, 3.2, 4];

// The production entry at its first-visit spawn, not played progression. Cell 5 is the accepted look.
export default {
  question: 'At fixed exposure, how do key and fill change Buddy, the town surfaces and open shade at play distance?',
  size: [640, 400],
  beats: [
    {
      name: 'Town key/fill wedge — production spawn',
      query: 'dev=1',
      warm: 3,
      cameras: [{ name: 'Town play distance', anchor: 'player', cam: [6, 6, 15], look: [0, 0.7, 0], fov: 62 }],
      wedge: {
        rows: { id: 'sky.keyGain', label: 'Key', values: keys },
        columns: { id: 'sky.fillGain', label: 'Fill', values: fills },
        legend: 'Current / Neutral · exposure 0.12 · bloom off · gold outline: accepted baseline (5)',
      },
      variants: keys.flatMap((key) =>
        fills.map((fill) => ({
          name: `Key ${key} / fill ${fill}${key === 1.12 && fill === 3.2 ? ' — accepted baseline' : ''}`,
          look: 'current',
          tunables: { 'post.centre': 0.12, 'sky.keyGain': key, 'sky.fillGain': fill },
          graphics: { resolution: 1, bloom: false },
        })),
      ),
    },
  ],
} satisfies ShotList;
