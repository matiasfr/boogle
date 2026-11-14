import { definePrefab, type ColliderDef, type PrefabDef } from '../../prefab/types.ts';
const box = (x: number, z: number, hx: number, hz: number, height: number): ColliderDef => ({
  shape: 'box',
  at: [x, height / 2, z],
  half: [hx, height / 2, hz],
});
const piece = (name: string, colliders: ColliderDef[] = []): PrefabDef =>
  definePrefab({
    key: `town.museum-${name}`,
    visual: { builder: 'town.museum-parts', params: { piece: name } },
    colliders,
    scope: 'owner',
  });
const exhibit = (name: string): PrefabDef =>
  definePrefab({
    key: `town.museum-${name}`,
    visual: { builder: 'town.museum-exhibit', params: { piece: name, ...(name === 'bits' ? { capacity: 720 } : {}) } },
    colliders: [],
    scope: 'owner',
  });
export const prefabs: PrefabDef[] = [
  piece('plinth', [box(0, -3.75, 3.3, 1.45, 3.4)]),
  piece('table', [box(0, 1.05, 3.1, 2.1, 1)]),
  piece('bench', [box(-3.9, -1.3, 1.2, 0.35, 0.5)]),
  piece('alcove-back', [box(0, -5.65, 4.3, 0.1, 4.2)]),
  piece('alcove-left', [box(-4.3, -5.2, 0.1, 0.55, 4.2)]),
  piece('alcove-right', [box(4.3, -5.2, 0.1, 0.55, 4.2)]),
  ...['floor', 'cabinet-trim', 'apron', 'cornice', 'spire'].map((name) => piece(name)),
  {
    ...piece('label-specimen'),
    attach: { sign: { kind: 'label', at: [-2.8, 1.3, -2.45], facing: [0, 0, 1], w: 1.6, h: 0.6, posts: 'none' } },
  },
  {
    ...piece('label-table'),
    attach: { sign: { kind: 'label', at: [0, 1.3, 3.65], facing: [0, 0, 1], w: 2.1, h: 0.5, posts: 'none' } },
  },
  ...[-4.5, -3.3].map((x, k): PrefabDef => ({
    ...piece(`cushion-${k}`),
    visual: { builder: 'town.museum-parts', params: { piece: 'cushion', x } },
  })),
  ...[-2, 0, 2].map((x, k): PrefabDef => ({
    ...piece(`drawer-${k}`),
    visual: { builder: 'town.museum-parts', params: { piece: 'drawer', x } },
  })),
  ...[-2.7, 2.7].map((x, k): PrefabDef => ({
    ...piece(`reflector-${k}`),
    visual: { builder: 'town.museum-parts', params: { piece: 'reflector', x } },
  })),
  ...['specimen', 'pool', 'relief', 'bits'].map(exhibit),
  ...[-5.2, -2.6, 2.6, 5.2].map((x, k): PrefabDef => ({
    ...piece(`column-${k}`, [box(x, 7.5, 0.36, 0.36, 5)]),
    visual: { builder: 'town.museum-parts', params: { piece: 'column', x } },
  })),
  {
    ...piece('sign'),
    visual: { none: true },
    attach: {
      sign: { kind: 'label', at: [0, 5.32, 8.33], facing: [0, 0, 1], w: 5.4, h: 0.95, posts: 'none' },
    },
  },
];
