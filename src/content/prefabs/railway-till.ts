import { definePrefab } from '../../prefab/types.ts';
export const prefabs = [
  definePrefab({
    key: 'railway.till',
    visual: { builder: 'railway.till-parts', params: { kind: 'counter' } },
    colliders: [{ shape: 'box', at: [-0.17, 0.5, 0], half: [0.4, 0.5, 0.5] }],
    attach: { sign: { kind: 'label', at: [0.18, 1.95, 0], facing: [-1, 0, 0], w: 1.8, h: 0.65, posts: 'none' } },
    scope: 'owner',
  }),
  definePrefab({
    key: 'railway.till-coins',
    visual: { builder: 'railway.till-parts', params: { kind: 'coins' } },
    colliders: [],
    scope: 'owner',
  }),
  definePrefab({
    key: 'railway.waiting-board',
    visual: { none: true },
    colliders: [],
    attach: { sign: { kind: 'label', at: [0, 1.45, 0], facing: [0, 0, 1], w: 1.2, h: 0.65, posts: 'one' } },
    scope: 'owner',
  }),
];
