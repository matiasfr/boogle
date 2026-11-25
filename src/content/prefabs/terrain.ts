// The canyon kit (docs/plans/terrain-clean.md, Part 3; Chunky Sunshine blocks, docs/decisions-look.md
// d-2026-11-24-canyon-kit-chunky-sunshine): pieces of assets/src/terrain-kit.py, drawn by the `terrain.kit` builder
// (src/prefab/builders/terrain-kit.ts), one instance batch per piece, and placed by dev/prefab/cliff-kit.ts (one level an area;
// the canyon's is content/built/levels/canyon-kit.json).
// Scenery only: nothing to climb, break or use. What looks solid is solid, a little inside the drawn rock, so a block
// standing proud is drawn over the box you bump. Origin: the middle of the piece's base front edge (boulders: the middle
// of their base); +z is out of the wall, toward the path.
import { definePrefab, type ColliderDef, type Vec3 } from '../../prefab/types.ts';

/** A sandstone face `width` m wide: one slab leaning back 7.6 degrees into the wall, as the courses step back
 * (LEAN 0.32 m a 2.4 m course), its front 0.2 m out at the foot. Its top is the face's top, 14.4 m up. */
const FACE_LEAN = -0.133;
/** A face's top over its origin, m (six 2.4 m courses). */
export const FACE_TOP = 14.4;
const faceSlab = (width: number): ColliderDef => ({
  shape: 'box',
  at: [0, 7.2, -1.56],
  rot: [0, FACE_LEAN, 0],
  half: [width / 2 - 0.2, 7.2, 1],
});
const box = (at: Vec3, half: Vec3): ColliderDef => ({ shape: 'box', at, half });
/** The shore's pieces (docs/plans/cliff-kit-everywhere.md, step 1). A sea-cliff face: two courses over a 1.2 m wave-cut
 * foot, SEA_FACE m tall, its solid one leaning slab like the canyon's, 0.1 m out at the foot (the foot's undercut is
 * drawn, not solid) and its top the face's near-level top: centre z 0.1 - depth / 2 - (height / 2) tan(lean), written
 * out. A low face: one course and a short broken top, 2.9 m. The corner (origin its outside corner's foot): two
 * such slabs 4.2 m long and 1.8 m deep, one along -x facing +z and one turned a quarter to run along -z facing +x. */
export const SEA_FACE = 6;
const leaning = (at: Vec3, half: Vec3, yaw = 0): ColliderDef => ({ shape: 'box', at, rot: [yaw, FACE_LEAN, 0], half });
/** Shore rocks across and tall, m (assets/src/terrain-kit.py shore_rock); each solid is the main slab, sunk:
 * centre (0, 0.3, 0) and half (0.42, 0.42, 0.3) of size, height and size, written out. */
export const SHORE_ROCK = {
  'terrain.shore-rock-s': [1.2, 0.45],
  'terrain.shore-rock-m': [2, 0.7],
  'terrain.shore-rock-l': [3.2, 1],
} as const;
/** Boulders across, metres (assets/src/terrain-kit.py); their boxes below hold both leaning blocks, sunk 0.12 of the
 * size into the ground: centre (0.08, 0.22, 0) and half (0.56, 0.33, 0.42) times the size, written out. */
export const BOULDER_SIZE = { 'terrain.boulder-s': 0.9, 'terrain.boulder-m': 1.6, 'terrain.boulder-l': 2.6 } as const;

const piece = (key: `terrain.${string}`, node: string, colliders: ColliderDef[]) =>
  definePrefab({
    key,
    scope: 'place',
    visual: { builder: 'terrain.kit', params: { piece: node }, batch: key },
    colliders,
  });

export const prefabs = [
  piece('terrain.face-6', 'face_6', [faceSlab(6)]),
  piece('terrain.face-10', 'face_10', [faceSlab(10)]),
  // Three blocks along a lip, 4 m: 0.7 to 1.6 m tall drawn, 1.1 m solid.
  piece('terrain.rim-cap', 'rim_cap', [box([0, 0.15, -1.3], [1.9, 0.95, 1.2])]),
  piece('terrain.boulder-s', 'boulder_s', [box([0.07, 0.2, 0], [0.5, 0.3, 0.38])]),
  piece('terrain.boulder-m', 'boulder_m', [box([0.13, 0.35, 0], [0.9, 0.53, 0.67])]),
  piece('terrain.boulder-l', 'boulder_l', [box([0.21, 0.57, 0], [1.46, 0.86, 1.09])]),
  // Three low slabs at the waterline, 3 m along it, at most 0.7 m tall.
  piece('terrain.bank-rock', 'bank_rock', [box([0, 0.1, -0.2], [1.6, 0.3, 0.6])]),
  piece('terrain.sea-face-6', 'sea_face_6', [leaning([0, 3, -1.3], [2.8, 3, 1])]),
  piece('terrain.sea-face-10', 'sea_face_10', [leaning([0, 3, -1.3], [4.8, 3, 1])]),
  piece('terrain.low-face', 'low_face', [leaning([0, 1.45, -0.99], [2.3, 1.45, 0.9])]),
  piece('terrain.sea-corner', 'sea_corner', [
    leaning([-1.9, 3, -1.2], [1.9, 3, 0.9]),
    leaning([-1.2, 3, -1.9], [1.9, 3, 0.9], 1.5708),
  ]),
  piece('terrain.shore-rock-s', 'shore_rock_s', [box([0, 0.135, 0], [0.504, 0.189, 0.36])]),
  piece('terrain.shore-rock-m', 'shore_rock_m', [box([0, 0.21, 0], [0.84, 0.294, 0.6])]),
  piece('terrain.shore-rock-l', 'shore_rock_l', [box([0, 0.3, 0], [1.344, 0.42, 0.96])]),
];
