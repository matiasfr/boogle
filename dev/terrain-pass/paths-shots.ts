// Matched stills for the paths round of the terrain pass (docs/plans/terrain-pass.md, 14 November): the canyon path up
// the gorge's east wall (walking up, looking back down, from across the valley), a town path, the shore path, the wedge
// and the island from afar. Run it on the commit before and the commit after; TP_LABEL names the cells and TP_QUERY adds
// a query (`terrain=0` is the ground before the pass).
// `TP_LABEL=before node dev/look/shots.ts dev/terrain-pass/paths-shots.ts --name tp-paths-before`.
import type { ShotList } from '../look/shot-types.ts';

const label = process.env.TP_LABEL ?? 'now';
const query = process.env.TP_QUERY ?? '';

export default {
  question: 'Does every trail read as a path, distinct from the rock beside it, at play distance and from afar?',
  size: [1280, 800],
  beats: [
    {
      name: 'Paths',
      query: 'dev=1',
      setup: 'dev/terrain-pass/paths-setup.ts',
      warm: 3,
      cameras: [
        { name: 'Canyon path, walking up', cam: [957.6, 5.2, -91.5], look: [946, 8.5, -112], fov: 55 },
        { name: 'Canyon path, looking back down', cam: [939, 21.5, -139], look: [948, 6, -106], fov: 55 },
        { name: 'Canyon path, from across the valley', cam: [906, 26, -98], look: [946, 8, -112], fov: 50 },
        { name: 'Town path', cam: [904, 21.6, 14], look: [884, 17.5, -28], fov: 55 },
        { name: 'Shore path', cam: [806, 6.2, 6], look: [826, 9, 30], fov: 55 },
        { name: 'Wedge, wide from the village', cam: [893, 42, 48], look: [962, 2, 150], fov: 55 },
        { name: 'Wedge, quarry path into the gorge', cam: [931, 15, 150], look: [958, 3, 128], fov: 55 },
        { name: 'Far, across the water', cam: [970, 30, 450], look: [960, 8, 140], fov: 45 },
        { name: 'Far, the island from the north-west', cam: [760, 150, -520], look: [1010, 0, -40], fov: 45 },
      ],
      variants: [{ name: label, query, graphics: { resolution: 1 } }],
    },
  ],
} satisfies ShotList;
