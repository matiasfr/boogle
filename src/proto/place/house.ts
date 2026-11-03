// The house: Pip's home office. A bed, a very senior chair, a stove and a desk where a little guy gravely stamps a leaf the size
// of a tray, next to an ordinary mug. Serves DESIGN.md 11: the joke reads with the sound off. It has no task and gives nothing.
// What's happened to the town turns up on Pip's desk: a model of your bridge, a rail for a paperweight, a toy train. Local.
import { stageOf } from './growth.ts';
import { DOOR, addSolid, plate, plankFloor, roomMesh, rooms, type Part } from './rooms.ts';
import { BOARDS, type Fact } from './town-lines.ts';

const r = rooms.house;
const { w, d } = r;
const OAK = '#7f5630',
  PINE = '#a9794c',
  LEAF = '#5fa83a';
const FACTS: Fact[] = ['path', 'forge', 'trains', 'town'];

const room: Part[] = [
  ...plankFloor(r, '#bb9360', '#c7a06e'),
  ['c', 0, 0.04, 0.6, 1.9, 0.03, 1.9, '#b5533c'], // a rug
  ['c', 0, 0.05, 0.6, 1.5, 0.03, 1.5, '#d4a24e'],
  // The bed, in its corner.
  ['b', -2.55, 0.25, -2.25, 1.6, 0.5, 2.5, OAK],
  ['b', -2.55, 0.55, -2.1, 1.5, 0.16, 2.2, '#3f6fb0'],
  ['s', -2.55, 0.68, -3.05, 0.55, 0.14, 0.32, '#f4f1e8'],
  ['b', -2.55, 0.65, -3.5, 1.6, 1.3, 0.12, OAK],
  // The desk: wide, tidy and very ready.
  ['b', 1.6, 0.96, -2.0, 2.7, 0.1, 1.15, PINE],
  ['b', 0.45, 0.46, -2.0, 0.14, 0.92, 1.0, OAK],
  ['b', 2.75, 0.46, -2.0, 0.14, 0.92, 1.0, OAK],
  // What Pip stands on: little guys are small, and it's a big desk.
  ['b', 1.6, 0.19, -3.0, 0.8, 0.38, 0.7, '#8a6236'],
  // The leaf, the size of a tray, and already stamped all over.
  ['s', 1.3, 1.04, -2.05, 0.62, 0.03, 0.42, LEAF],
  ['b', 1.3, 1.07, -2.05, 1.0, 0.01, 0.03, '#3f7a24'],
  ['c', 1.05, 1.08, -2.15, 0.08, 0.01, 0.08, '#c4453a'],
  ['c', 1.5, 1.08, -1.9, 0.08, 0.01, 0.08, '#c4453a'],
  ['c', 1.6, 1.08, -2.2, 0.08, 0.01, 0.08, '#c4453a'],
  // A stack of them filed.
  ['s', 2.3, 1.03, -2.2, 0.36, 0.02, 0.26, LEAF],
  ['s', 2.31, 1.06, -2.19, 0.36, 0.02, 0.26, '#6db345'],
  ['s', 2.29, 1.09, -2.2, 0.36, 0.02, 0.26, '#79be4e'],
  // An ordinary mug, so you can tell.
  ['c', 2.38, 1.09, -1.72, 0.07, 0.14, 0.07, '#f4f1e8'],
  // The filing cabinet, a leaf sticking out of the top drawer.
  ['b', 3.15, 0.75, -3.1, 0.8, 1.5, 0.8, '#6b7a78'],
  ['b', 3.15, 1.15, -2.69, 0.68, 0.34, 0.03, '#56625f'],
  ['b', 3.15, 0.75, -2.69, 0.68, 0.34, 0.03, '#56625f'],
  ['b', 3.15, 0.35, -2.69, 0.68, 0.34, 0.03, '#56625f'],
  ['s', 3.15, 1.2, -2.6, 0.26, 0.03, 0.14, LEAF],
  // The very senior chair: nobody's allowed.
  ['b', -3.1, 0.3, 1.2, 0.8, 0.6, 0.8, '#8a2f28'],
  ['b', -3.46, 1.15, 1.2, 0.14, 1.9, 0.86, '#8a2f28'],
  ['s', -3.46, 2.15, 1.2, 0.12, 0.14, 0.43, '#d9a23a'],
  // The stove, under the chimney.
  ['c', 2.8, 0.55, 1.45, 0.5, 1.1, 0.5, '#2c2e33'],
  ['c', 2.8, 1.14, 1.45, 0.56, 0.06, 0.56, '#3f4145'],
  ['c', 2.8, 1.25, 1.45, 0.2, 0.2, 0.2, '#a9794c'],
  // A plant, doing well, unlike some.
  ['c', 3.0, 0.2, 3.0, 0.24, 0.4, 0.24, '#b5533c'],
  ['s', 3.0, 0.75, 3.0, 0.42, 0.5, 0.42, LEAF],
  // The board.
  ['b', -0.2, 1.5, -3.2, 1.6, 1.15, 0.08, OAK],
  ['b', -0.2, 0.5, -3.25, 0.12, 1.0, 0.12, OAK],
];
addSolid(r, -2.55, -2.25, 0.8, 1.25, 1.2);
addSolid(r, 1.6, -2.0, 1.35, 0.58, 1.05);
addSolid(r, 3.15, -3.1, 0.4, 0.4, 1.5);
addSolid(r, -3.15, 1.2, 0.42, 0.45, 2.2);
addSolid(r, 2.8, 1.45, 0.5, 0.5, 1.2);
addSolid(r, 3.0, 3.0, 0.26, 0.26, 1.2);
addSolid(r, -0.2, -3.22, 0.8, 0.06, 2.1);

// What the town's done, on Pip's desk.
const LATER: Part[][] = [
  // Your bridge, as a model: two legs and a plank.
  [
    ['b', 0.72, 1.08, -1.8, 0.05, 0.14, 0.05, PINE],
    ['b', 1.02, 1.08, -1.8, 0.05, 0.14, 0.05, PINE],
    ['b', 0.87, 1.17, -1.8, 0.56, 0.03, 0.1, OAK],
  ],
  // A rail for a paperweight.
  [['b', 1.3, 1.1, -2.0, 0.5, 0.05, 0.05, '#4c5058']],
  // A toy train on the cabinet, and a suitcase, for commuting.
  [
    ['b', 3.15, 1.57, -3.1, 0.34, 0.14, 0.16, '#d8392b'],
    ['c', 3.26, 1.68, -3.1, 0.05, 0.1, 0.05, '#24262c'],
    ['b', -1.2, 0.27, 3.1, 0.9, 0.54, 0.34, '#8a6236'],
    ['b', -1.2, 0.58, 3.1, 0.3, 0.06, 0.06, '#3f4145'],
  ],
  // A second mug: he's had visitors, or he's hopeful.
  [['c', 2.2, 1.09, -1.6, 0.07, 0.14, 0.07, '#d8392b']],
];
let stage = -1;
const inside = roomMesh(room);
r.near.add(inside, plate(BOARDS.pipDesk, 1.4, 1.0, -0.2, 1.5, -3.15));
export function updateHouse() {
  const n = stageOf(FACTS);
  if (n === stage) return;
  stage = n;
  inside.geometry.dispose();
  inside.geometry = roomMesh([...room, ...LATER.slice(0, n).flat()]).geometry;
}

// Outside: a mat, a post box, a window box. It's somebody's.
r.outside.add(
  roomMesh([
    ['b', 0, 0.02, d / 2 + 1.3, 1.5, 0.04, 0.9, '#8a6a48'],
    ['b', DOOR.w / 2 + 1.5, 0.55, d / 2 + 1.5, 0.12, 1.1, 0.12, OAK],
    ['b', DOOR.w / 2 + 1.5, 1.2, d / 2 + 1.5, 0.5, 0.36, 0.42, '#c4453a'],
    ['b', w / 2 + 0.18, 1.1, 0, 0.3, 0.2, 1.4, OAK],
    ['s', w / 2 + 0.2, 1.3, -0.4, 0.2, 0.18, 0.2, '#e4574a'],
    ['s', w / 2 + 0.2, 1.3, 0.05, 0.2, 0.18, 0.2, '#f0c030'],
    ['s', w / 2 + 0.2, 1.3, 0.45, 0.2, 0.18, 0.2, '#e4574a'],
  ]),
);
addSolid(r, DOOR.w / 2 + 1.5, d / 2 + 1.5, 0.25, 0.22, 1.4);
r.over.add(plate(BOARDS.pip, 2.0, 0.7, 0, 3.15, d / 2 + 0.34));
