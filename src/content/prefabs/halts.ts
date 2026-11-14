// Shared kit specifications. All halt-specific operands belong to generated level placements.
import { add, sub, mul, type Scalar } from '../../prefab/authoring.ts';
import type { JsonObject, PrefabDef } from '../../prefab/types.ts';
export type HaltPiece = 'deck' | 'shelter' | 'bench' | 'canopy' | 'mast';
export const prefabs: PrefabDef[] = [
  ...(['deck', 'shelter', 'bench', 'canopy', 'mast'] as const).map((piece): PrefabDef => ({
    key: `railway.halt-${piece}`,
    visual: { builder: 'railway.halt-parts', params: { piece } },
    colliders: [],
    scope: 'owner',
  })),
  {
    key: 'railway.halt-solid',
    visual: { none: true },
    colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],
    scope: 'owner',
  },
];
export function haltSolids(piece: HaltPiece, sign: number, hw: number, half: number): JsonObject[] {
  const solid = (x: Scalar, y: Scalar, z: Scalar, hx: number, hy: number, hz: number) => ({
    at: [x, y, z],
    half: [hx, hy, hz],
  });
  const colliders: JsonObject[] = [];
  if (piece === 'shelter')
    for (const ds of [-3, 3]) colliders.push(solid(-sign * 0.95, 1.6, add(-4.8, ds), 0.11, 1.6, 0.11));
  if (piece === 'bench') colliders.push(solid(-sign * 0.8, 0.28, -4.8, 0.3, 0.28, 1.5));
  if (piece === 'canopy')
    for (const f of [-0.75, -0.25, 0.25, 0.75])
      colliders.push(solid(0, 2.3, mul(f, sub(mul(half, 2), 2)), 0.12, 2.3, 0.12));
  if (piece === 'mast') colliders.push(solid(mul(sign, sub(hw, 0.3)), 2.2, sub(half, 0.8), 0.07, 2.2, 0.07));
  return colliders;
}
