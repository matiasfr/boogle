import { definePrefab } from '../../prefab/types.ts';
import { PAD_SIZE } from '../../prefab/greybox-constants.ts';
export const prefabs = [
  definePrefab({
    key: 'greybox.pad',
    visual: {
      builder: 'greybox.box',
      params: { colour: '#e4e5e6' },
      batch: 'route-greybox:massing',
      instances: [
        { pos: [0, 0.03, -PAD_SIZE.along / 2], scale: [PAD_SIZE.across, 0.06, 0.15] },
        { pos: [0, 0.03, PAD_SIZE.along / 2], scale: [PAD_SIZE.across, 0.06, 0.15] },
        { pos: [-PAD_SIZE.across / 2, 0.03, 0], scale: [0.15, 0.06, PAD_SIZE.along] },
        { pos: [PAD_SIZE.across / 2, 0.03, 0], scale: [0.15, 0.06, PAD_SIZE.along] },
      ],
    },
    colliders: [],
    scope: 'place',
  }),
  definePrefab({
    key: 'greybox.sign-post',
    visual: { none: true },
    colliders: [],
    attach: { label: { kind: 'label', at: [0, 1.2, 0], facing: [0, 0, 1], w: 4.6, h: 4.6 * 0.32, posts: 'two' } },
    scope: 'place',
  }),
  definePrefab({
    key: 'greybox.sign-post-high',
    visual: { none: true },
    colliders: [],
    attach: { label: { kind: 'label', at: [0, 2.4, 0], facing: [0, 0, 1], w: 3.4, h: 3.4 * 0.32, posts: 'one' } },
    scope: 'place',
  }),
  definePrefab({
    key: 'greybox.decoration',
    visual: { builder: 'greybox.box', params: { colour: '#9c9ea1' }, batch: 'route-greybox:massing' },
    colliders: [],
    scope: 'place',
  }),
  definePrefab({
    key: 'greybox.collider',
    visual: { none: true },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
    scope: 'place',
  }),
  definePrefab({
    key: 'greybox.box',
    visual: { builder: 'greybox.box', params: { colour: '#9c9ea1' }, batch: 'route-greybox:massing' },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
    scope: 'place',
  }),
];
