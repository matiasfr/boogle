import { definePrefab } from '../../prefab/types.ts';

// The Works arm adds no solid. The town's loader yard is an open shed, a jib and footings (yard-shape.ts); its solids
// are one record the construction site enables, so the jib's own visual carries none.
export const prefabs = [
  definePrefab({
    key: 'railway.loader-arm',
    scope: 'owner',
    visual: { builder: 'railway.loader-parts', params: { kind: 'arm' } },
    colliders: [],
  }),
  definePrefab({
    key: 'town.loader-jib',
    scope: 'owner',
    visual: { builder: 'railway.loader-parts', params: { kind: 'yard' } },
    colliders: [],
  }),
  definePrefab({
    key: 'town.plot-yard',
    scope: 'owner',
    visual: { builder: 'town.yard-shell', params: {} },
    colliders: [],
  }),
  definePrefab({
    key: 'town.plot-yard-hull',
    scope: 'owner',
    visual: { none: true },
    // Authored literals; test/town-yard.test.ts holds them to yardHulls() in src/place/yard-shape.ts.
    colliders: [
      { shape: 'box', at: [0, 0.07, 0], half: [4.5, 0.07, 4.5] }, // slab
      { shape: 'box', at: [-3.5, 1.72, -3.5], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [-3.5, 1.72, -0.4], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [-0.1, 1.72, -3.5], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [-0.1, 1.72, -0.4], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [3.3, 1.72, -3.5], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [3.3, 1.72, -0.4], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [-0.1, 1.72, -3.5], half: [3.58, 1.58, 0.09] }, // back wall
      { shape: 'box', at: [-0.1, 3.53, -1.95], half: [3.8, 0.23, 1.95] }, // roof and beams
      { shape: 'box', at: [-1.4, 0.47, -2.85], half: [1.5, 0.33, 0.45] }, // timber stack
      { shape: 'box', at: [-1.65, 0.54, 1.6], half: [0.41, 0.4, 0.41] }, // footing
      { shape: 'box', at: [-0.75, 0.54, 1.6], half: [0.41, 0.4, 0.41] }, // footing
      { shape: 'box', at: [-1.2, 0.54, 0.65], half: [0.41, 0.4, 0.41] }, // footing
      { shape: 'box', at: [-1.2, 1.34, 1.6], half: [0.41, 0.4, 0.41] }, // footing (top)
      { shape: 'box', at: [2.9, 0.39, 2.6], half: [0.55, 0.25, 0.55] }, // jib base
      { shape: 'box', at: [2.9, 3.12, 2.6], half: [0.21, 2.48, 0.21] }, // jib mast
      { shape: 'box', at: [0.7, 5.81, 2.6], half: [2.9, 0.21, 0.21] }, // jib boom
      { shape: 'box', at: [3.36, 5.25, 2.6], half: [0.23, 0.35, 0.45] }, // counterweight
    ],
  }),
];
