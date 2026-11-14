import { defineLevel, type PrefabKey } from '../../prefab/types.ts';
export const levels = [
  defineLevel({
    place: 'shop',
    placements: [
      'floor',
      'counter',
      'step',
      'rug',
      'rail',
      'counter-detail',
      'hangers',
      'stand-0',
      'stand-1',
      'stand-2',
      'stand-3',
      'stand-4',
      'highlight',
      'awning',
      'front-table',
      'front-box',
      'sign',
    ].map((name) => ({
      id: `shop-${name}`,
      prefab: `town.shop-${name}` as PrefabKey,
      pos: [0, 0, 0] as const,
      ...(name === 'sign' ? { labels: { sign: 'shop' } } : {}),
    })),
  }),
];
