// Matched stills for the meadow, Home's default ground dressing (docs/game-design/place.md, "The meadow"): the
// Round's green round the statue, the ring road, the hall's front, the south slope, a station approach, the works
// yard and an open hill, with the meadow off (`?meadow=0`) and on, and one phone-sized frame on the phone tier.
// `node dev/look/shots.ts dev/ground/meadow-shots.ts --name meadow`. MEADOW_ONLY=on keeps one variant;
// MEADOW_CAMS=green,yard keeps the cameras whose names contain one of the words.
import type { ShotList } from '../look/shot-types.ts';

const only = process.env.MEADOW_ONLY;
const cams = process.env.MEADOW_CAMS?.split(',');
const variants = [
  { name: 'Off (meadow=0)', query: 'meadow=0' },
  { name: 'On', query: '' },
].filter((v) => !only || (only === 'on') === (v.query === ''));
const cameras = [
  { name: 'Green, player eye by the statue', cam: [877, 19.3, 30], look: [885, 18.4, 20], fov: 55 },
  { name: 'Green, from above', cam: [885, 58, 36], look: [885, 17, 20], fov: 55 },
  { name: 'Ring road, looking at the statue', cam: [868.5, 19.6, 26], look: [885, 18.6, 20], fov: 55 },
  { name: 'Hall front', cam: [895, 20.4, 19], look: [910, 19.4, 10.5], fov: 55 },
  { name: 'South slope, player eye', cam: [926, 19.4, 96], look: [930, 16.6, 126], fov: 55 },
  { name: 'South slope, from above', cam: [928, 72, 126], look: [928, 17, 108], fov: 55 },
  { name: 'South slope, from the village edge', cam: [900, 22.5, 58], look: [935, 15, 120], fov: 55 },
  { name: 'Station approach (T3)', cam: [965, 36.5, -76], look: [977, 30.4, -89], fov: 55 },
  { name: 'Works yard (kiln)', cam: [1115, 31, 101], look: [1128, 24.6, 87], fov: 55 },
  { name: 'Open hill', cam: [1086, 30.5, -128], look: [1104, 24, -150], fov: 55 },
  { name: 'Town, wide', cam: [885, 34, 48], look: [885, 18, 20], fov: 55 },
].filter((c) => !cams || cams.some((word) => c.name.toLowerCase().includes(word)));

export default {
  question:
    'Does the meadow read round the statue and across the lawn without hiding streets, buildings or places players work, and is the ground unchanged with meadow=0?',
  size: [1280, 800],
  beats: [
    {
      name: 'Meadow',
      query: 'dev=1',
      setup: 'dev/ground/meadow-setup.ts',
      warm: 6,
      cameras: cameras as {
        name: string;
        cam: [number, number, number];
        look: [number, number, number];
        fov: number;
      }[],
      variants: variants.map((v) => ({ ...v, graphics: { resolution: 1 } })),
    },
    ...(only || cams
      ? []
      : [
          {
            name: 'Meadow on a phone',
            query: 'dev=1',
            setup: 'dev/ground/meadow-setup.ts',
            warm: 6,
            cameras: [
              {
                name: 'Green, phone',
                cam: [877, 19.3, 30] as [number, number, number],
                look: [885, 18.4, 20] as [number, number, number],
                fov: 55,
              },
            ],
            variants: [
              {
                name: 'On, phone tier',
                query: 'meadowTier=phone',
                size: [390, 844] as [number, number],
                graphics: { resolution: 1 },
              },
            ],
          },
        ]),
  ],
} satisfies ShotList;
