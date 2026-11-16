import { definePrefab } from '../../prefab/types.ts';

// Both are view-only: the town keeps its existing closed shell and hulls; the Works arm adds no solid.
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
];
