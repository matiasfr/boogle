import type { ShotList } from '../shot-types.ts';

// The production entry at its first-visit spawn, not a bot checkpoint. For played beats use at + saves.
const cameras = [
  { name: 'Town play distance', anchor: 'player', cam: [6, 6, 15], look: [0, 0.7, 0], fov: 62 },
  { name: 'Buddy close', anchor: 'player', cam: [2.3, 1.4, 3.4], look: [0, 0.7, 0], fov: 40 },
  { name: 'Shore', cam: [884, 8, 151], look: [868, 0, 144], fov: 62 },
] satisfies ShotList['beats'][number]['cameras'];
export default {
  question: 'Do the looks preserve Buddy and town readability, and hold water geometry across matched cells?',
  size: [640, 400],
  beats: [
    {
      name: 'Dev Looks',
      query: 'dev=1',
      warm: 3,
      cameras,
      variants: [
        { name: 'Current', look: 'current' },
        { name: 'Clean toys', look: 'clean' },
        { name: 'Sunshine water', look: 'sunshine' },
        ...[0, 0.025, 0.05, 0.1, 0.2, 0.4].map((strength) => ({
          name: `Bloom strength ${strength}`,
          look: 'clean',
          values: { 'post.bloom': 1, 'post.bloomStrength': strength },
        })),
      ],
    },
  ],
} satisfies ShotList;
