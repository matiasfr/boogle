import type { ShotList } from '../shot-types.ts';

// The Sickle Isles greybox's review views (src/proto/greybox/index.ts, VIEWS: window.__greybox.viewPose(id) prints
// them), in world metres, with the game's 3.6 km fog and the old 1.5 km one for comparison.
// `node dev/look/shots.ts dev/look/beats/sickle-greybox.ts --name sickle` when the look queue is quiet.
const cameras = [
  { name: 'Spawn (West landing): the Wall', cam: [812, 8, 22], look: [-829, 60, -331] },
  { name: 'Home: the Wall', cam: [900, 25, 14], look: [-829, 60, -331] },
  { name: 'Home: High Port crane', cam: [900, 27, 14], look: [-150, 136, 1050] },
  { name: "Home: The Boogler's island", cam: [900, 27, 14], look: [10, 10, -40] },
  { name: 'West landing: the sea cave', cam: [801, 7, 10], look: [818, 5, 71] },
  { name: 'Pier: the Wall', cam: [1402, 9, -372], look: [-829, 60, -331] },
  { name: 'Ring aperture: the Wall', cam: [1190, 100, -1130], look: [-829, 60, -331] },
  { name: 'Ring aperture: the Gorge split', cam: [1190, 100, -1130], look: [-103, 85, -1988] },
  { name: 'Ring aperture: Canopy crowns', cam: [1190, 100, -1130], look: [-1100, 12, -300] },
  { name: 'Bell Rock: the causeway', cam: [-50, 22, -850], look: [10, 10, -40] },
  { name: 'Saltpan: the line into High Port', cam: [550, 11, 700], look: [120, 3, 960] },
  { name: 'High Port harbour from the mouth', cam: [290, 22, 1370], look: [120, 3, 960] },
  { name: 'High Port: the mainland city', cam: [-300, 63, 1180], look: [-1950, 160, 2400] },
  { name: 'Lantern Notch: through the arch', cam: [-1510, 22, -1000], look: [-3400, 60, -1000] },
  { name: 'Gorge bridge: down the split to Ring', cam: [-103, 93, -1988], look: [1190, 100, -1130] },
  { name: 'Canopy Town: the cleft', cam: [-1100, 20, -300], look: [-50, 14, -850] },
] satisfies ShotList['beats'][number]['cameras'];
export default {
  question: 'Do the Sickle Isles read at play distance with the game camera, sea, sky and fog?',
  size: [960, 600],
  beats: [
    {
      name: 'Sickle Isles greybox',
      query: 'dev=1&greybox=sickle&labels=0',
      warm: 4,
      cameras,
      variants: [
        { name: 'Game fog (3.6 km)', query: 'dev=1&greybox=sickle&labels=0' },
        { name: 'Old fog (1.5 km)', query: 'dev=1&greybox=sickle&labels=0&gbfog=1500' },
      ],
    },
  ],
} satisfies ShotList;
