// Seat anchors inside the existing vehicle GLBs. Visuals and bodies stay with the vehicles until step 12.
// The railhead rack's tag (docs/plans/gap-readability.md, step 7): a standing plate in the rack's empty bed; the view
// (src/entities/railway/railhead-view.ts) owns its text, where it stands and when it shows.
import { definePrefab } from '../../prefab/types.ts';
import { PLAYER_R } from '../../constants.ts';

export const prefabs = [
  // R2b blockout: rail-local coordinates, four window openings per side; door gaps at both ends.
  // The train's existing makeCar owns its one moving envelope collider.
  definePrefab({
    key: 'railway.coach-body',
    scope: 'owner',
    colliders: [],
    visual: { builder: 'railway.coach-parts', params: { kind: 'body' } },
  }),
  definePrefab({
    key: 'railway.coach-underframe',
    scope: 'owner',
    colliders: [],
    visual: { builder: 'railway.coach-parts', params: { kind: 'underframe' } },
  }),
  definePrefab({
    key: 'railway.machine-chair',
    visual: { none: true },
    colliders: [],
    scope: 'owner',
    layout: {
      kind: 'seat-attachments',
      attach: {
        seat: {
          kind: 'seat',
          at: [0, 0.32 + 0.63, -1.15],
          yawDegrees: 180,
          exit: [0, PLAYER_R, -1.85],
          group: 'machine-deck',
          anchorView: true,
        },
      },
    },
    interactions: [{ action: 'seat.sit', at: 'seat', gate: 'open' }],
  }),
  definePrefab({
    key: 'railway.car-bench',
    visual: { none: true },
    colliders: [],
    scope: 'owner',
    layout: {
      kind: 'seat-attachments',
      attach: Object.fromEntries(
        [1, -1].flatMap((side, sideIndex) =>
          [-0.85, 0.45].map((bz, i) => [
            `seat${sideIndex * 2 + i}`,
            {
              kind: 'seat' as const,
              idSuffix: `-seat${sideIndex * 2 + i}`,
              anchorView: true as const,
              at: [side * 0.45, 0.32 + 0.63, side * bz] as const,
              yawDegrees: -side * 90,
              exit: [side * 0.85, PLAYER_R, side * bz] as const,
              forward: 0.16,
              perch: 0.32,
            },
          ]),
        ),
      ),
    },
    interactions: [0, 1, 2, 3].map((i) => ({ action: 'seat.sit' as const, at: `seat${i}`, gate: 'open' as const })),
  }),
  definePrefab({
    key: 'railway.rack-tag',
    visual: { none: true },
    colliders: [],
    scope: 'owner',
    attach: { sign: { kind: 'label', at: [0, 0.75, 0], facing: [0, 0, 1], w: 2.3, h: 0.5, posts: 'two' } },
  }),
  // Boards whose second line is a count the owning view repaints (footings-signalling A3, A4): the Works rack's
  // "Footings" bill on its posts, and the pier's plaque, hung on the jib's mast.
  definePrefab({
    key: 'railway.footings-bill',
    visual: { none: true },
    colliders: [],
    scope: 'owner',
    attach: { sign: { kind: 'label', at: [0, 1.4, 0], facing: [0, 0, 1], w: 2.2, h: 1, posts: 'two' } },
  }),
  definePrefab({
    key: 'railway.footings-plaque',
    visual: { none: true },
    colliders: [],
    scope: 'owner',
    attach: { sign: { kind: 'label', at: [0, 2.4, 0], facing: [0, 0, 1], w: 1.8, h: 0.8, posts: 'none' } },
  }),
  // One tall far jamb with a broad landing and a visibly vacant square socket. Top is placement y.
  definePrefab({
    key: 'railway.sea-jamb',
    visual: {
      builder: 'greybox.box',
      params: { colour: '#917b5e' },
      batch: 'railway:sea-jamb',
      instances: [
        { pos: [0, -7, 0], scale: [1.8, 14, 1.8] },
        // Tie the taller jamb into the existing gate base; its top stays below the headstock reach bound.
        { pos: [1.1, -10.95, 0.35], scale: [2.2, 6.1, 1.8] },
        { pos: [0, -0.3, 0], scale: [4.4, 0.6, 4.4] },
        { pos: [-0.83, 0.12, 0], scale: [0.14, 0.24, 1.8] },
        { pos: [0.83, 0.12, 0], scale: [0.14, 0.24, 1.8] },
        { pos: [0, 0.12, -0.83], scale: [1.5, 0.24, 0.14] },
        { pos: [0, 0.12, 0.83], scale: [1.5, 0.24, 0.14] },
      ],
    },
    colliders: [
      { shape: 'box', at: [0, -7, 0], half: [0.9, 7, 0.9] },
      { shape: 'box', at: [1.1, -10.95, 0.35], half: [1.1, 3.05, 0.9] },
      { shape: 'box', at: [0, -0.3, 0], half: [2.2, 0.3, 2.2] },
      // The hook ring's post (hook-view.ts draws it), under SEA_RING at the landing's near corner.
      { shape: 'box', at: [-1.8, 0.925, 1.8], half: [0.13, 0.925, 0.13] },
    ],
    scope: 'owner',
  }),
];
