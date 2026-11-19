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
      { shape: 'box', at: [-3.5, 1.72, -0.2], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [-3.5, 1.72, 3.1], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [0.4, 1.72, -3.5], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [0.4, 1.72, -0.2], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [0.4, 1.72, 3.1], half: [0.18, 1.58, 0.18] }, // post
      { shape: 'box', at: [-1.55, 1.72, -3.5], half: [2.13, 1.58, 0.09] }, // back wall
      { shape: 'box', at: [-1.55, 3.53, -0.2], half: [2.35, 0.23, 3.7] }, // roof and beams
      { shape: 'box', at: [-1.55, 0.47, -2.75], half: [1.5, 0.33, 0.45] }, // timber stack
      { shape: 'box', at: [2.3, 0.54, 1.5], half: [0.41, 0.4, 0.41] }, // footing
      { shape: 'box', at: [3.2, 0.54, 1.5], half: [0.41, 0.4, 0.41] }, // footing
      { shape: 'box', at: [2.75, 0.54, 2.45], half: [0.41, 0.4, 0.41] }, // footing
      { shape: 'box', at: [2.75, 1.34, 1.5], half: [0.41, 0.4, 0.41] }, // footing (top)
      { shape: 'box', at: [2.75, 0.39, -2.6], half: [0.55, 0.25, 0.55] }, // jib base
      { shape: 'box', at: [2.75, 3.12, -2.6], half: [0.21, 2.48, 0.21] }, // jib mast
      { shape: 'box', at: [2.75, 5.81, -0.75], half: [0.21, 0.21, 2.75] }, // jib boom
      { shape: 'box', at: [2.75, 5.25, -3.15], half: [0.45, 0.35, 0.3] }, // counterweight
    ],
  }),
];
