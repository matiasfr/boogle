import { definePrefab, type ColliderDef } from '../../prefab/types.ts';

// Room-local authored positions and sizes. Native visual math runs only in the builder.
const piece = (name: string, colliders: ColliderDef[] = []) =>
  definePrefab({
    key: `town.workshop-${name}` as const,
    visual: { builder: 'town.workshop-parts' as const, params: { piece: name, hw: 5, hd: 4 } },
    colliders,
    scope: 'owner' as const,
  });
const box = (x: number, y: number, z: number, w: number, h: number, d: number): ColliderDef => ({
  shape: 'box',
  at: [x, y, z],
  half: [w / 2, h / 2, d / 2],
});
export const prefabs = [
  piece('floor'),
  piece('chimney', [box(-3.6, 1.35, -2.8, 1.15, 2.7, 1.15)]),
  piece('anvil', [box(-0.4, 0.445, 0.35, 1.3, 0.89, 0.4)]),
  piece('tub', [box(0.95, 0.31, 0.25, 0.9, 0.62, 0.9)]),
  piece('bellows', [box(2.6, 0.35, 3.1, 1.2, 0.7, 0.6)]),
  piece('bench', [box(1, 0.45, -3.35, 3.2, 0.9, 0.9)]),
  piece('logs', [box(4.3, 0.5, -2.82, 1, 1, 1.92)]),
  piece('rails', [box(-4.45, 1, 1.65, 0.7, 2, 1.8)]),
  piece('lanterns'),
];
