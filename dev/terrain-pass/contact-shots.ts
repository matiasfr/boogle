// Buddy at the foot of the rock face where the terrain pass drew the ground furthest from its collider with walkable
// ground below (docs/plans/terrain-pass.md; dev/terrain-pass/contact.ts): do his feet or body float or sink? With the
// contact cap (the default) and without (`terrainCap=0`). The setup also prints a census of static bodies on the ground.
// `node dev/look/shots.ts dev/terrain-pass/contact-shots.ts --name tp-contact`.
import type { ShotList } from '../look/shot-types.ts';

export default {
  question: 'Standing at the foot of the worst face, do Buddy’s feet or body float off the drawn rock or sink into it?',
  size: [1280, 800],
  beats: [
    {
      name: 'Contact',
      query: 'dev=1',
      setup: 'dev/terrain-pass/census.ts',
      warm: 3,
      cameras: [
        { name: 'Along the face', cam: [957.6, 3.1, 99.6], look: [956.6, 2.7, 102.7], fov: 45 },
        { name: 'From the floor, square on', cam: [961.5, 3.2, 102.7], look: [956.5, 3, 102.7], fov: 45 },
      ],
      variants: [
        { name: 'With the contact cap', query: '', graphics: { resolution: 1 } },
        { name: 'Without (terrainCap=0)', query: 'terrainCap=0', graphics: { resolution: 1 } },
      ],
    },
  ],
} satisfies ShotList;
