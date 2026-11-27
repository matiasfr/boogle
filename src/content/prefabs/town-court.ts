import { definePrefab, type ColliderDef } from '../../prefab/types.ts';
const colliders: ColliderDef[] = [
  { shape: 'box', at: [-1.1, 0.55, 0], half: [0.05, 0.55, 0.05] },
  { shape: 'box', at: [1.1, 0.55, 0], half: [0.05, 0.55, 0.05] },
  { shape: 'box', at: [0, 1.1, 0], half: [1.15, 0.05, 0.05] },
];
export const prefabs = [
  definePrefab({
    key: 'town.choice-board',
    scope: 'owner',
    visual: { builder: 'town.choice-board', params: {} },
    colliders: [],
    attach: { label: { kind: 'label', at: [0, 1.05, 0], facing: [0, 0, 1], w: 1.9, h: 1.35, posts: 'one' } },
    interactions: [{ action: 'town.plot-buy' }],
  }),
  definePrefab({
    key: 'town.horn-pad',
    scope: 'owner',
    visual: { builder: 'town.horn-pad', params: {} },
    colliders: [],
  }),
  definePrefab({
    key: 'town.ball-court',
    scope: 'owner',
    visual: { builder: 'town.ball-court', params: {} },
    colliders,
  }),
  definePrefab({
    key: 'town.ball-lever',
    scope: 'owner',
    visual: { builder: 'town.ball-lever', params: {} },
    colliders: [{ shape: 'box', at: [0, 0.2, 0], half: [0.22, 0.2, 0.22] }],
    attach: { handle: { kind: 'point', at: [0, 0.65, 0] } },
    interactions: [{ action: 'town.ball-return', at: 'handle' }],
  }),
];
