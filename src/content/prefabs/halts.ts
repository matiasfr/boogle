// Shared kit specifications. All halt-specific operands belong to generated level placements.
import { add, sub, mul, type Scalar } from '../../prefab/authoring.ts';
import type { JsonObject, PrefabDef } from '../../prefab/types.ts';
export type HaltPiece = 'deck' | 'shelter' | 'bench' | 'canopy' | 'mast' | 'display';
const POSTS = { shelter: [0.22, 3.2, 0.22], canopy: [0.24, 4.6, 0.24], mast: [0.14, 4.4, 0.14] } as const;
export const prefabs: PrefabDef[] = [
  ...(['signal', 'road-plaque'] as const).map((kind): PrefabDef => ({
    key: `railway.halt-${kind}`,
    visual: { builder: 'railway.halt-attachment', params: { kind } },
    colliders: [],
    scope: 'owner',
  })),
  { key: 'railway.halt-parts', visual: { builder: 'railway.halt-parts', params: {} }, colliders: [], scope: 'owner' },
  {
    key: 'railway.halt-lever',
    visual: { builder: 'railway.halt-lever', params: { handles: 1 } },
    colliders: [],
    interactions: [{ action: 'railway.request-stop' }],
    scope: 'owner',
  },
  ...(['deck', 'shelter', 'bench', 'canopy', 'mast', 'display'] as const).map((piece): PrefabDef => ({
    key: `railway.halt-${piece}`,
    visual: {
      builder: 'railway.halt-parts',
      params: { piece, ...(piece in POSTS ? { post: POSTS[piece as keyof typeof POSTS] } : {}) },
    },
    colliders: [],
    scope: 'owner',
  })),
  {
    key: 'railway.halt-ramp',
    visual: { builder: 'railway.halt-ramp', params: {} },
    colliders: [],
    scope: 'owner',
  },
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
  const post = piece in POSTS ? POSTS[piece as keyof typeof POSTS] : null;
  if (piece === 'shelter')
    for (const ds of [-3, 3])
      colliders.push(solid(-sign * 0.95, post![1] / 2, add(-4.8, ds), post![0] / 2, post![1] / 2, post![2] / 2));
  if (piece === 'bench') colliders.push(solid(-sign * 0.8, 0.28, -4.8, 0.3, 0.28, 1.5));
  if (piece === 'canopy')
    for (const f of [-0.75, -0.25, 0.25, 0.75])
      colliders.push(solid(0, post![1] / 2, mul(f, sub(mul(half, 2), 2)), post![0] / 2, post![1] / 2, post![2] / 2));
  if (piece === 'mast')
    colliders.push(
      solid(mul(sign, sub(hw, 0.3)), post![1] / 2, sub(half, 0.8), post![0] / 2, post![1] / 2, post![2] / 2),
    );
  return colliders;
}
