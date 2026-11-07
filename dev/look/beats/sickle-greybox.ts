import type { ShotList } from '../shot-types.ts';

// The Sickle Isles greybox's review views (src/proto/greybox/index.ts, VIEWS), in world metres, each with the game's
// own fog and with a 3.6 km fog for comparison. `node dev/look/shots.ts dev/look/beats/sickle-greybox.ts --name sickle`.
const cameras = [
  { name: 'Spawn (West landing), west over the bay', cam: [812, 8, 22], look: [100, 30, -250] },
  { name: 'Home: the White Wall', cam: [900, 25, 14], look: [-720, 60, -350] },
  { name: 'Home: High Port crane', cam: [900, 25, 14], look: [-150, 70, 1050] },
  { name: 'West landing: sea-cave gate', cam: [801, 6.5, 10], look: [847, 5, 117] },
  { name: 'Pier: the White Wall', cam: [1402, 9, -372], look: [-650, 60, -700] },
  { name: 'Ring aperture: the White Wall', cam: [1190, 100, -1130], look: [-700, 60, -600] },
  { name: 'Ring aperture: the Gorge split', cam: [1190, 100, -1130], look: [-138, 45, -1880] },
  { name: 'Ring aperture: Canopy crowns', cam: [1190, 100, -1130], look: [-1070, 90, -300] },
  { name: 'Gorge rim: the Original Island', cam: [-400, 95, -1930], look: [-2150, 72, -1700] },
  { name: 'Bell Rock: Canopy Town', cam: [-50, 22, -450], look: [-1070, 40, -300] },
  { name: 'Bell Rock: the stacks', cam: [-50, 22, -450], look: [-138, 50, -1880] },
  { name: 'Saltpan: High Port', cam: [550, 8, 700], look: [-200, 45, 1080] },
  { name: 'Canopy Town: the north chalk', cam: [-1100, 20, -300], look: [-760, 70, -1030] },
] satisfies ShotList['beats'][number]['cameras'];
export default {
  question: 'Do the Sickle Isles read at play distance with the game camera, sea, sky and fog?',
  size: [960, 600],
  beats: [
    {
      name: 'Sickle Isles greybox',
      query: 'dev=1&greybox=sickle',
      warm: 4,
      cameras,
      variants: [
        { name: 'Game fog, no labels', query: 'dev=1&greybox=sickle&labels=0' },
        { name: 'Fog 3.6 km, no labels', query: 'dev=1&greybox=sickle&gbfog=3600&labels=0' },
        { name: 'Fog 3.6 km, chalk white', query: 'dev=1&greybox=sickle&gbfog=3600&labels=0&gbcliff=d9d4c8' },
      ],
    },
  ],
} satisfies ShotList;
