import { defineLevel, type PrefabKey } from '../../prefab/types.ts';
export const levels = [
  defineLevel({
    place: 'workshop-kit',
    placements: ['floor', 'chimney', 'anvil', 'tub', 'bellows', 'bench', 'logs', 'rails', 'lanterns'].map((name) => ({
      id: `forge-workshop-${name}`,
      prefab: `town.workshop-${name}` as PrefabKey,
      pos: [0, 0, 0] as const,
    })),
  }),
];
