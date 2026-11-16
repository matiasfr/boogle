import { definePrefab } from '../../prefab/types.ts';
// The closed housePlan hulls (7.4 x 7.4, wall 3.7, rise 2.5); three solid boxes, no interior.
export const prefabs = [
  definePrefab({
    key: 'town.plot-house',
    scope: 'owner',
    visual: {
      builder: 'town.room-shell',
      params: {
        all: true,
        spec: {
          w: 7.4,
          d: 7.4,
          high: 3.7,
          rise: 2.5,
          wall: '#e8dcc0',
          post: '#7f5630',
          roof: '#c9a86a',
          wallPalette: 'walls',
          postPalette: 'timber',
          closed: true,
        },
      },
    },
    colliders: [],
  }),
  definePrefab({
    key: 'town.plot-house-hull',
    scope: 'owner',
    visual: { none: true },
    colliders: [
      { shape: 'box', at: [0, 1.85, 0], half: [3.8, 1.85, 3.8] },
      { shape: 'box', at: [0, 4.45, 0], half: [3.7, 0.75, 2.59] },
      { shape: 'box', at: [0, 0.25, 0], half: [4.5, 0.25, 4.5] },
    ],
  }),
];
