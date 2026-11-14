import { definePrefab, type ColliderDef, type PrefabDef } from '../../prefab/types.ts';
const box = (x: number, z: number, hx: number, hz: number, height: number): ColliderDef => ({
  shape: 'box',
  at: [x, height / 2, z],
  half: [hx, height / 2, hz],
});
const piece = (name: string, colliders: ColliderDef[] = []): PrefabDef =>
  definePrefab({
    key: `town.shop-${name}`,
    visual: { builder: 'town.shop-parts', params: { piece: name } },
    colliders,
    scope: 'owner',
  });
const stand = (n: number, x: number, z: number, headingDegrees: number): PrefabDef => ({
  ...piece(`stand-${n}`, [box(x, z, 0.45, 0.45, 1)]),
  visual: { builder: 'town.shop-parts', params: { piece: 'stand', x, z, headingDegrees } },
  attach: { target: { kind: 'point', at: [x, 1.5, z] } },
  interactions: [{ action: 'town.shop-stock', at: 'target' }],
});
export const prefabs: PrefabDef[] = [
  piece('floor'),
  piece('counter', [box(-3, -2.45, 1.9, 0.58, 1.1)]),
  piece('step'),
  piece('rug'),
  { ...piece('rail', [box(1, -3.45, 1.7, 0.08, 1.75)]), interactions: [{ action: 'town.shop-rail' }] },
  piece('counter-detail'),
  piece('hangers'),
  stand(0, 3.8, -1.9, -90),
  stand(1, 3.8, 0.2, -90),
  stand(2, 3.8, 2.3, -90),
  stand(3, -3.8, 0.2, 90),
  stand(4, -3.8, 2.3, 90),
  piece('highlight'),
  piece('awning'),
  piece('front-table', [box(-2.8, 5, 0.85, 0.45, 1)]),
  piece('front-box', [box(2.7, 5, 0.45, 0.45, 1.7)]),
  {
    key: 'town.shop-sign',
    visual: { none: true },
    colliders: [],
    scope: 'owner',
    attach: { sign: { kind: 'label', at: [0, 3.42, 4.34], facing: [0, 0, 1], w: 4.4, h: 0.72, posts: 'none' } },
  },
];
