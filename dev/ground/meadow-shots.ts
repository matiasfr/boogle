// Matched stills for the two meadow experiments (docs/research/small-magic-look.md, "What was built"): the lawn wedge
// south of the village from a player's eye, from play distance, from the village's edge and from above, with the
// flags off, each on, and both on.
// `node dev/look/shots.ts dev/ground/meadow-shots.ts --name meadow`. MEADOW_ONLY=flowers keeps one variant beside "off".
import type { ShotList } from '../look/shot-types.ts';

const only = process.env.MEADOW_ONLY;
const variants = [
  { name: 'Off', query: '' },
  { name: 'meadow=tint', query: 'meadow=tint' },
  { name: 'meadow=flowers', query: 'meadow=flowers' },
  { name: 'meadow=tint,flowers', query: 'meadow=tint,flowers' },
].filter((v) => !only || !v.query || v.query === `meadow=${only}`);

export default {
  question:
    'Does the wedge read as a meadow (patchy greens, flower drifts by the path) without fighting the low-poly look, and is it unchanged with the flags off?',
  size: [1280, 800],
  beats: [
    {
      name: 'Meadow',
      query: 'dev=1',
      setup: 'dev/ground/meadow-setup.ts',
      warm: 3,
      cameras: [
        { name: 'Player eye on the wedge', cam: [926, 19.4, 96], look: [930, 16.6, 126], fov: 55 },
        { name: 'Play distance, 6 m up', cam: [921, 24, 90], look: [927, 16, 118], fov: 55 },
        { name: 'From the village edge', cam: [900, 22.5, 58], look: [935, 15, 120], fov: 55 },
        { name: 'From above', cam: [928, 72, 126], look: [928, 17, 108], fov: 55 },
        { name: 'Wide from the village', cam: [893, 42, 48], look: [962, 2, 150], fov: 55 },
      ],
      variants: variants.map((v) => ({ ...v, graphics: { resolution: 1 } })),
    },
  ],
} satisfies ShotList;
