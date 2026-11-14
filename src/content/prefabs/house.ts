import { definePrefab, type ColliderDef, type PrefabDef } from '../../prefab/types.ts';
const box = (x: number, z: number, hx: number, hz: number, height: number): ColliderDef => ({
  shape: 'box',
  at: [x, height / 2, z],
  half: [hx, height / 2, hz],
});
const piece = (name: string, colliders: ColliderDef[] = []): PrefabDef =>
  definePrefab({
    key: `town.house-${name}`,
    visual: { builder: 'town.house-parts', params: { piece: name, w: 7.4, d: 7.4 } },
    colliders,
    scope: 'owner',
  });
export const prefabs: PrefabDef[] = [
  piece('floor'),
  piece('rug'),
  piece('bed', [box(-2.55, -2.25, 0.8, 1.25, 1.2)]),
  piece('desk', [box(1.6, -2.0, 1.35, 0.58, 1.05)]),
  piece('step'),
  piece('leaf'),
  piece('filed'),
  piece('mug'),
  piece('cabinet', [box(3.15, -3.1, 0.4, 0.4, 1.5)]),
  piece('chair', [box(-3.15, 1.2, 0.42, 0.45, 2.2)]),
  piece('stove', [box(2.8, 1.45, 0.5, 0.5, 1.2)]),
  piece('plant', [box(3.0, 3.0, 0.26, 0.26, 1.2)]),
  {
    ...piece('board', [box(-0.2, -3.22, 0.8, 0.06, 2.1)]),
    attach: { sign: { kind: 'label', at: [-0.2, 1.5, -3.15], facing: [0, 0, 1], w: 1.4, h: 1, posts: 'none' } },
  },
  piece('quilt'),
  piece('drawers'),
  piece('lamp'),
  piece('chair-trim'),
  piece('stove-trim'),
  piece('cabinet-pulls'),
  piece('later-bridge'),
  piece('later-rail'),
  piece('later-train'),
  piece('later-mug'),
  piece('mat'),
  piece('postbox', [box(2.8, 5.2, 0.25, 0.22, 1.4)]),
  piece('window-box'),
  {
    key: 'town.house-sign',
    visual: { none: true },
    colliders: [],
    scope: 'owner',
    attach: { sign: { kind: 'label', at: [0, 3.15, 4.04], facing: [0, 0, 1], w: 2, h: 0.7, posts: 'none' } },
  },
];
