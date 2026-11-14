// Seat anchors inside the existing vehicle GLBs. Visuals and bodies stay with the vehicles until step 12.
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
];
