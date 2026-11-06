import type { ShotList, ShotVariant } from '../shot-types.ts';

const variants: ShotVariant[] = ['current', 'windpaint', 'summer'].map((sky) => ({
  name: sky,
  query: `sky=${sky}`,
  graphics: { resolution: 1, bloom: false },
}));

export default {
  question: 'Do authored skies add character without striped water, hard horizon seams or unreadable town shade?',
  size: [800, 500],
  beats: [
    {
      name: 'Shore, town and sun — matched authored fixture',
      query: 'proto=place&dev=1&shot=pack',
      setup: 'dev/look/evals/sky-views.ts',
      warm: 3,
      cameras: [
        { name: 'Shore', cam: [884, 8, 151], look: [868, 0, 144], fov: 62 },
        { name: 'Town', anchor: 'player', cam: [6, 6, 15], look: [0, 0.7, 0], fov: 62 },
        { name: 'Sun-facing', snapshot: 'sunSkyCamera', cam: [0, 0, 0], look: [0, 0, -1] },
      ],
      variants,
    },
    {
      name: 'Spawn sky-glance — real arrival, diagnostic raised gaze',
      query: 'proto=place&intro=1&dev=1',
      setup: 'dev/look/evals/spawn-view.ts',
      warm: 0,
      cameras: [{ name: 'Spawn sky-glance', snapshot: 'spawnSkyCamera', cam: [0, 0, 0], look: [0, 0, -1] }],
      variants,
    },
  ],
} satisfies ShotList;
