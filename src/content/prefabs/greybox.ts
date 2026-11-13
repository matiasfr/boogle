import { definePrefab } from '../../prefab/types.ts';
export const prefabs = [
  definePrefab({
    key: 'greybox.box',
    visual: { builder: 'greybox.box', params: { colour: '#9c9ea1' }, batch: 'route-greybox:massing' },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
    scope: 'place',
  }),
];
