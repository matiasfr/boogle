import { defineLevel } from '../../prefab/types.ts';
// Generator names denote the existing algorithms, not a new scatter. Their seeds are explicit portable inputs.
export const levels = [
  defineLevel({
    place: 'island-props',
    placements: [],
    generator: {
      name: 'island-props',
      seeds: [20261028, 20261029],
      prefabs: ['scenery.palm', 'scenery.broadleaf', 'scenery.rock'],
    },
  }),
  defineLevel({
    place: 'land-trees',
    placements: [],
    generator: { name: 'land-trees', seeds: [31, 77], prefabs: ['scenery.tree'] },
  }),
];
