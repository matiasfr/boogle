// Shared kit specifications. All halt-specific operands belong to generated level placements.
import { add, sub, mul, type Scalar } from '../../prefab/authoring.ts';
import type { JsonObject, PrefabDef } from '../../prefab/types.ts';
export type HaltPiece = 'deck' | 'shelter' | 'bench' | 'canopy' | 'mast' | 'display';
const POSTS = { shelter: [0.22, 3.2, 0.22], canopy: [0.24, 4.6, 0.24], mast: [0.14, 4.4, 0.14] } as const;
// A halt yard's bay (docs/plans/halt-yard.md, "The view"): a low timber bay 4 m along the line by 2 m deep, 1.2 m at
// the posts, with a log cradle, a rails shelf and a stone bin. One table of boxes is both its collider record (below)
// and its drawn pieces (src/entities/railway/halt-yard-view.ts), so what looks solid is solid. Whole centimetres in
// the bay's frame: +x across toward the platform (the open side), +z along the line, y up from the ground; each box is
// its centre and size. `hand` is the side (±z) the cradle is on: the end nearer the halt's back ramp.
export type BayBox = readonly [x: number, y: number, z: number, w: number, h: number, d: number, colour: string];
export type BayHand = -1 | 1;
const PLANK = '#b98a52',
  POST = '#5c4530',
  BOARD = '#9a6b3c',
  SILL = '#7a5236';
/** The collider record of a bay with its cradle at `hand`. */
export const bayKey = (hand: BayHand) => (hand < 0 ? 'railway.halt-yard-bay-a' : 'railway.halt-yard-bay-b');
/** Where each bin's middle is along the bay (cm): logs (0), stone (1), rails (2). */
export const bayBin = (hand: BayHand, kind: number) => (kind === 0 ? hand : kind === 1 ? -hand : 0) * 140;
export function haltYardBay(hand: BayHand): BayBox[] {
  const out: BayBox[] = [];
  const part = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string) =>
    out.push([x, y, z, w, h, d, colour]);
  // The base: a plank floor, low enough to step onto.
  part(0, 6, 0, 200, 12, 400, PLANK);
  // The posts at the corners, and two between the bins along the back.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(sx * 92, 60, sz * 192, 16, 120, 16, POST);
  for (const sz of [-70, 70]) part(-92, 55, sz, 12, 110, 12, POST);
  // Two boards along the back and across each end.
  for (const by of [38, 82]) {
    part(-92, by, 0, 8, 18, 368, BOARD);
    for (const sz of [-1, 1]) part(0, by, sz * 192, 168, 18, 8, BOARD);
  }
  // The cradle: two saddles across the bay, each a sill with a stake at either end.
  const cradle = bayBin(hand, 0);
  for (const dz of [-38, 38]) {
    part(0, 19, cradle + dz, 150, 14, 14, SILL);
    for (const sx of [-1, 1]) part(sx * 70, 43, cradle + dz, 10, 62, 10, POST);
  }
  // The rails shelf: two bearers along the line on short legs.
  for (const sx of [-45, 45]) {
    part(sx, 42, 0, 12, 10, 120, SILL);
    for (const dz of [-45, 45]) part(sx, 19, dz, 10, 38, 10, POST);
  }
  // The stone bin: a low lip on the open side and a wall toward the shelf; the end boards close its far side.
  const stone = bayBin(hand, 1);
  part(85, 24, stone, 8, 24, 120, BOARD);
  part(0, 30, stone + hand * 62, 160, 36, 8, BOARD);
  return out;
}
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
  // A halt yard's bay, its cradle at -z (a) or +z (b): the solids of the boxes its view draws (haltYardBay, below).
  ...([-1, 1] as const).map((hand): PrefabDef => ({
    key: bayKey(hand),
    visual: { none: true },
    colliders: haltYardBay(hand).map(([x, y, z, w, h, d]) => ({
      shape: 'box' as const,
      at: [x / 100, y / 100, z / 100],
      half: [w / 200, h / 200, d / 200],
    })),
    scope: 'owner',
  })),
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
