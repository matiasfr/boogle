import { definePrefab, type PrefabDef } from '../../prefab/types.ts';
const WIDE = 5.4;
const frame = (piece: string, halfHeight: number): PrefabDef =>
  definePrefab({
    key: `town.curio-${piece}`,
    visual: { builder: 'town.curio-parts', params: { piece, wide: WIDE, footHalf: [WIDE / 2 + 0.3, 0.6] } },
    colliders: [{ shape: 'box', at: [0, halfHeight, 0], half: [2.8, halfHeight, 0.4] }],
    scope: 'owner',
  });
const gift = (id: string, k: number, bay: boolean): PrefabDef => {
  const cols = bay ? 5 : 6,
    row = Math.floor(k / cols),
    col = k % cols;
  return definePrefab({
    key: `town.curio-gift-${id}`,
    visual: {
      builder: 'town.curio-parts',
      params: {
        piece: 'gift',
        gift: id,
        bay,
        x: (col - (cols - 1) / 2) * (WIDE / cols),
        boardY: (bay ? [1.31, 2.19] : [1.32, 2.36])[1 - row]!,
      },
    },
    colliders: [],
    scope: 'owner',
  });
};
export const prefabs: PrefabDef[] = [
  frame('shelf', 1.7),
  frame('bay', 1.4),
  {
    key: 'town.curio-dust-skirt',
    visual: { builder: 'town.curio-parts', params: { piece: 'dust-skirt' } },
    colliders: [],
    scope: 'owner',
  },
  ...[
    'hat',
    'beanie',
    'teacup',
    'scarf',
    'glasses',
    'headphones',
    'overalls',
    'raincoat',
    'festival',
    'critter',
    'egg',
    'scope',
  ].map((id, k) => gift(id, k, false)),
  ...[
    'strawhat',
    'lampcap',
    'mossscarf',
    'whistle',
    'goggles',
    'bucket',
    'pennant',
    'hardhat',
    'aviator',
    'diving',
  ].map((id, k) => gift(id, k, true)),
];
