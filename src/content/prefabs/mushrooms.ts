// The mushroom stall (src/adapters/mushroom-stall.ts), where you take a bag of seeds. Its builder is
// src/prefab/builders/mushrooms.ts.
import { definePrefab } from '../../prefab/types.ts';

export const prefabs = [
  // Origin: the ground under the counter's middle. `pickup` is where the bags sit; Take a bag is offered just above it.
  // `footprint`: the ground it claims, which scattered props and the level check keep clear.
  definePrefab({
    key: 'mushrooms.stall',
    scope: 'place',
    visual: { builder: 'mushrooms.stall', params: {} },
    // The counter.
    colliders: [{ shape: 'box', at: [0, 0.5, 0], half: [1.4, 0.5, 0.45] }],
    attach: { pickup: { kind: 'point', at: [0, 1.2, 0] } },
    interactions: [{ action: 'mushrooms.take-seeds', at: 'pickup' }],
    footprint: 1.5,
  }),
];
