import type { ShotList } from '../shot-types.ts';

// The Sickle Isles greybox's review views (src/proto/greybox/index.ts, VIEWS: window.__greybox.viewPose(id) prints
// them), in world metres, with the greybox's 3.6 km fog and the live game's 1.5 km one for comparison.
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
// Line 2 part 2 (the `works` marks and the survey line, docs/plans/line2-part2-greybox.md): where each payoff reads.
const works = [
  { name: 'Q4 frame: the rim and the sea', cam: [1083.7, 30, 36.7], look: [1330, 22, -150] },
  { name: 'Far Head: the trestle back to the quarry', cam: [1362, 31, -166], look: [1083, 24, 37] },
  { name: 'Pier: Ring Island to the north', cam: [1402, 12, -372], look: [1330, 70, -1120] },
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
        { name: 'Greybox fog (3.6 km)', query: 'dev=1&greybox=sickle&labels=0' },
        { name: 'Live game fog (1.5 km)', query: 'dev=1&greybox=sickle&labels=0&gbfog=game' },
      ],
    },
    {
      name: 'Line 2 works and survey line',
      query: 'dev=1&greybox=sickle&labels=0',
      warm: 4,
      cameras: works,
      variants: [{ name: 'Greybox fog (3.6 km)', query: 'dev=1&greybox=sickle&labels=0' }],
    },
  ],
} satisfies ShotList;
