// Seat anchors inside the existing vehicle GLBs. Visuals and bodies stay with the vehicles until step 12.
// The railhead rack's tag (docs/plans/gap-readability.md, step 7): a standing plate in the rack's empty bed; the view
// (src/entities/railway/railhead-view.ts) owns its text, where it stands and when it shows.
import { definePrefab } from '../../prefab/types.ts';
import { PLAYER_R } from '../../constants.ts';

export const prefabs = [
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
];
