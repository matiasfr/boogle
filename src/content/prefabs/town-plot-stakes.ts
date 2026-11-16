// Cosmetic only: no plot collider, interaction or shared state (town-economy-visible A2).
import { definePrefab, type Transform } from '../../prefab/types.ts';
const batched = (colour: string, instances?: readonly Transform[]) => ({
  builder: 'greybox.box' as const,
  params: { colour },
  batch: 'route-greybox:massing',
  ...(instances ? { instances } : {}),
});
export const prefabs = [
  definePrefab({
    key: 'town.plot-stakes',
    visual: batched(
      '#bd742d',
      [-1, 1].flatMap((x) =>
        [-1, 1].map(
          (z) =>
            ({
              pos: [x * 4, 0.7, z * 4],
              scale: [0.18, 1.4, 0.18],
            }) as const,
        ),
      ),
    ),
    colliders: [],
    scope: 'place',
  }),
  definePrefab({
    key: 'town.plot-string',
    visual: batched('#f3daa0', [
      { pos: [0, 1.04, -4], scale: [7.82, 0.05, 0.05] },
      { pos: [0, 1.04, 4], scale: [7.82, 0.05, 0.05] },
      { pos: [-4, 1.04, 0], scale: [0.05, 0.05, 7.82] },
      { pos: [4, 1.04, 0], scale: [0.05, 0.05, 7.82] },
    ]),
    colliders: [],
    scope: 'place',
  }),
  definePrefab({ key: 'town.plot-crate', visual: batched('#ab6b34'), colliders: [], scope: 'place' }),
  definePrefab({
    key: 'town.plot-board',
    visual: { none: true },
    colliders: [],
    attach: { label: { kind: 'label', at: [0, 1.05, 0], facing: [0, 0, 1], w: 2.1, h: 1.1, posts: 'one' } },
    scope: 'place',
  }),
];
