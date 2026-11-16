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
              pos: [x * 4, 0.45, z * 4],
              scale: [0.18, 0.9, 0.18],
            }) as const,
        ),
      ),
    ),
    colliders: [],
    scope: 'place',
  }),
  definePrefab({
    key: 'town.plot-stake-bands',
    // The existing paintedToy red, on the same shared greybox material. A sleeve reads from every approach.
    visual: batched(
      '#c83a2a',
      [-1, 1].flatMap((x) =>
        [-1, 1].map(
          (z) =>
            ({
              pos: [x * 4, 1.15, z * 4],
              scale: [0.3, 0.5, 0.3],
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
      { pos: [0, 1.04, -4], scale: [7.7, 0.09, 0.09] },
      { pos: [0, 1.04, 4], scale: [7.7, 0.09, 0.09] },
      { pos: [-4, 1.04, 0], scale: [0.09, 0.09, 7.7] },
      { pos: [4, 1.04, 0], scale: [0.09, 0.09, 7.7] },
    ]),
    colliders: [],
    scope: 'place',
  }),
  definePrefab({ key: 'town.plot-crate', visual: batched('#ab6b34'), colliders: [], scope: 'place' }),
  definePrefab({
    key: 'town.plot-board',
    visual: { none: true },
    colliders: [],
    attach: { label: { kind: 'label', at: [0, 1.05, 0], facing: [0, 0, 1], w: 2.8, h: 1.4, posts: 'one' } },
    scope: 'place',
  }),
];
