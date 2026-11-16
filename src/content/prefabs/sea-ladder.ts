import { definePrefab, type Transform } from '../../prefab/types.ts';

// Local +z runs down the ladder. Its owner inclines this whole prefab at 45 degrees.
// A 24 m length reaches below the water from the helmet's 15 m stack.
const rungs: Transform[] = Array.from({ length: 49 }, (_, i) => ({
  pos: [0, -0.06, i / 2],
  scale: [1.8, 0.12, 0.36],
}));
export const prefabs = [
  definePrefab({
    key: 'railway.sea-ladder',
    scope: 'owner',
    visual: {
      builder: 'greybox.box',
      batch: 'railway:sea-ladder',
      params: { colour: '#c79a3e' },
      instances: [
        ...rungs,
        ...[-1, 1].map((side): Transform => ({
          pos: [side, 0.25, 12],
          scale: [0.14, 0.18, 25],
        })),
      ],
    },
    // The plane meets the rung tops, so the player's sphere need not climb 49 sharp edges.
    colliders: [{ shape: 'box', at: [0, -0.08, 12], half: [0.9, 0.08, 12] }],
  }),
];
