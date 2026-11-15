import { definePrefab } from '../../prefab/types.ts';
export const prefabs = [
  definePrefab({
    key: 'town.workshop-chair',
    visual: { builder: 'seat.chair', params: {} },
    // The drawn stool has no back, so neither does its solid (an unseen 0.8 m backrest box stood behind it).
    colliders: [{ shape: 'box', at: [0, 0.275, 0], half: [0.4, 0.275, 0.325] }],
    // Buddy faces the front wall and the rack (yaw 0 faces -z: into the stool), hips on the 0.55 m top (SEATED_HIPS).
    layout: {
      kind: 'seat-attachments',
      attach: { seat: { kind: 'seat', at: [0, 1.18, 0.2], yawDegrees: 180, exit: [0, 0.46, 1.1] } },
    },
    interactions: [{ action: 'seat.sit', at: 'seat', gate: 'open' }],
    scope: 'owner',
  }),
  // Kept and not placed (owner, 15 November): the unfinished statue below stands on the footing until the room has
  // met The Boogler; `BOOGLER_STATUE_UNVEILED` in content/levels/town-blockout.ts is the switch.
  // The Boogler's statue on the town green (owner, 14 November): his own shape at three times his size, in one
  // stone grey, on a stepped round plinth 1.2 m tall. Origin: the plinth's foot; he faces +z. The solids are
  // the plinth's two steps, a drum for his body (from the plinth's top to the top of his head, his own radius) and a
  // post for the hat, leaning with it; test/town-plan.test.ts ties them to src/boogler/shape.ts.
  definePrefab({
    key: 'town.statue',
    visual: {
      builder: 'town.boogler-statue',
      params: {
        colour: '#a3a29c',
        scale: 3,
        plinth: [
          [2.45, 0.3],
          [2.3, 0.9],
        ],
      },
    },
    colliders: [
      { shape: 'trunk', at: [0, 0.15, 0], r: 2.45, h: 0.3 },
      { shape: 'trunk', at: [0, 0.75, 0], r: 2.3, h: 0.9 },
      { shape: 'trunk', at: [0, 2.085, 0], r: 2.4, h: 1.77 },
      { shape: 'trunk', at: [-0.0929, 4.2492, 0], rot: [0, 0, 0.07], r: 0.42, h: 2.655 },
    ],
    scope: 'place',
  }),
  // The unfinished statue (owner, 15 November): the statue's own plinth with a sheeted lump on it, inside a timber
  // scaffold 4.8 m square and 5.5 m tall, and the builders' notice hung under the front rail. It shows nothing of
  // The Boogler. Origin and front as `town.statue`. The solids are the plinth's two steps, four drums stepping in
  // under the sheet, the four corner poles and the two decks; the rails and braces are not solid. Every solid is
  // lower than the statue's hat, so it is no better a perch than the statue is (test/town-plan.test.ts).
  definePrefab({
    key: 'town.statue-works',
    visual: {
      builder: 'town.statue-scaffold',
      params: {
        stone: '#a3a29c',
        cloth: '#c4b997',
        timber: '#8a6238',
        plinth: [
          [2.45, 0.3],
          [2.3, 0.9],
        ],
        half: 2.4,
        high: 5.5,
        levels: [2.1, 4],
      },
    },
    colliders: [
      { shape: 'trunk', at: [0, 0.15, 0], r: 2.45, h: 0.3 },
      { shape: 'trunk', at: [0, 0.75, 0], r: 2.3, h: 0.9 },
      { shape: 'trunk', at: [0, 1.7, 0], r: 1.75, h: 1 },
      { shape: 'trunk', at: [0, 2.8, 0], r: 1.3, h: 1.2 },
      { shape: 'trunk', at: [0, 3.9, 0], r: 0.8, h: 1 },
      { shape: 'trunk', at: [0, 4.7, 0], r: 0.45, h: 0.6 },
      { shape: 'trunk', at: [-2.4, 2.75, -2.4], r: 0.07, h: 5.5 },
      { shape: 'trunk', at: [-2.4, 2.75, 2.4], r: 0.07, h: 5.5 },
      { shape: 'trunk', at: [2.4, 2.75, -2.4], r: 0.07, h: 5.5 },
      { shape: 'trunk', at: [2.4, 2.75, 2.4], r: 0.07, h: 5.5 },
      { shape: 'box', at: [0, 2.175, -2.07], half: [2.4, 0.025, 0.32] },
      { shape: 'box', at: [2.07, 4.075, 0], half: [0.32, 0.025, 2.4] },
    ],
    attach: { notice: { kind: 'label', at: [0, 1.3, 2.5], facing: [0, 0, 1], w: 2.6, h: 0.75, posts: 'none' } },
    scope: 'place',
  }),
];
