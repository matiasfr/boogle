import { definePrefab } from '../../prefab/types.ts';
export const prefabs = [
  definePrefab({
    key: 'railway.yoke',
    scope: 'owner',
    colliders: [],
    visual: { builder: 'railway.yoke-block', params: {} },
    attach: { pickup: { kind: 'point', at: [0, 1.35, 0] } },
    interactions: [{ action: 'railway.take-yoke', at: 'pickup' }],
  }),
];
