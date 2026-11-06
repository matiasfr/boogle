import type { ShotList, ShotVariant } from '../shot-types.ts';

const variants: ShotVariant[] = ['Lit · Current/Neutral', 'Unlit · Current/Neutral', 'Raw base colour · sRGB only'].map(
  (name, mode) => ({
    name,
    look: 'current',
    tunables: { 'view.mode': mode, 'view.sky': 1, 'view.water': 1, 'post.centre': 0.12 },
    graphics: { resolution: 1, bloom: false },
  }),
);
// Run the current-tree place bot first. The broker resolves these beats from that job's saves.
export default {
  question: 'Do warmth and bright clouds survive removal of lighting, then exposure/tone mapping?',
  size: [720, 450],
  beats: [
    {
      name: 'Spawn',
      query: 'proto=place&dev=1',
      warm: 3,
      cameras: [{ name: 'Spawn view', anchor: 'player', cam: [6, 5, 12], look: [0, 1, -2], fov: 62 }],
      variants,
    },
    {
      name: 'Town square — authored house fixture',
      query: 'proto=place&dev=1&shot=pack',
      setup: 'dev/look/evals/place-job.ts',
      warm: 3,
      cameras: [{ name: 'Town square', anchor: 'player', cam: [6, 6, 15], look: [0, 0.7, 0], fov: 62 }],
      variants,
    },
    {
      name: 'T1 station and track layer — played checkpoint',
      at: 't1-done',
      query: 'proto=place&dev=1',
      warm: 3,
      cameras: [{ name: 'T1', anchor: 'player', cam: [10, 8, 14], look: [0, 0, -3], fov: 62 }],
      variants,
    },
    {
      name: 'Cove — played checkpoint, terrain=cove',
      at: 'at-cove',
      query: 'proto=place&dev=1&terrain=cove',
      warm: 3,
      cameras: [{ name: 'Cove', anchor: 'player', cam: [13, 10, 17], look: [0, 0, -4], fov: 62 }],
      variants,
    },
  ],
} satisfies ShotList;
