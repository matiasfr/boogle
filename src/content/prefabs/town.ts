import { definePrefab } from '../../prefab/types.ts';
export const prefabs = [
  definePrefab({
    key: 'town.workshop-chair',
    visual: { builder: 'seat.chair', params: {} },
    colliders: [
      { shape: 'box', at: [0, 0.275, 0], half: [0.4, 0.275, 0.325] },
      { shape: 'box', at: [0, 0.95, -0.3], half: [0.4, 0.4, 0.06] },
    ],
    attach: { seat: { kind: 'seat', at: [0, 1, 0.25], yaw: 0, exit: [0, 0.46, 1.1] } },
    interactions: [{ action: 'seat.sit', at: 'seat', gate: 'open' }],
    scope: 'owner',
  }),
];
