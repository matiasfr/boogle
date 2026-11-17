import { definePrefab } from '../../prefab/types.ts';
export const prefabs = [
  definePrefab({
    key: 'town.green-kerb',
    visual: { builder: 'town.green-kerb', params: {} },
    colliders: [],
    scope: 'place',
  }),
];
