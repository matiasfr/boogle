import { defineLevel } from '../../prefab/types.ts';

export const levels = Object.entries({
  'wall-south': ['wall-s2', 'wall-s1'],
  'wall-north': ['wall-n2', 'wall-n1'],
}).map(([place, lands]) => defineLevel({
  place,
  placements: lands.map((id) => ({ id, prefab: 'greybox.' + id, pos: [0, 0, 0] })),
}));
