// The canyon kit (docs/plans/terrain-clean.md, Part 3; Chunky Sunshine blocks, docs/decisions-look.md
// d-2026-11-24-canyon-kit-chunky-sunshine): pieces of assets/src/terrain-kit.py, drawn by the `terrain.kit` builder
// (src/prefab/builders/terrain-kit.ts), one instance batch per piece, and placed by dev/prefab/cliff-kit.ts (one level an area;
// the canyon's is content/built/levels/canyon-kit.json).
// Scenery only: nothing to climb, break or use. What looks solid is solid, a little inside the drawn rock, so a block
// standing proud is drawn over the solid you bump; a face's solid is crowned so no one stands on it (FACE_PROFILE). Origin: the middle of the piece's base front edge (boulders: the middle
// of their base); +z is out of the wall, toward the path.
import { definePrefab, type ColliderDef, type Vec3 } from '../../prefab/types.ts';

/** A face's top over its origin, m (six 2.4 m courses). */
export const FACE_TOP = 14.4;
/** Kit faces stand no one on their tops (owner, 25 November 2026, docs/decisions-look.md
 * d-2026-11-25-non-standable-kit-everywhere): each face's solid is a closed prism along its width (x), its profile
 * (z out of the wall, y up) a slab leaning back 7.6 degrees as the courses step back (LEAN 0.32 m a 2.4 m course) whose
 * top is a crown: two roof planes 62 degrees from level meeting in a ridge at the face's top, steeper than the
 * controller's slope limit (WALKABLE_NY 0.55: 56.6 degrees), so no face of the solid is ground. The drawn top stays
 * level; the solid is inside the drawn rock. Profiles, written out: front foot, front edge, ridge, back edge, back foot. */
type Profile = readonly (readonly [number, number])[];
const FACE_PROFILE: Profile = [
  [0.2, 0],
  [-1.46, 12.4],
  [-2.52, 14.4],
  [-3.58, 12.4],
  [-3.58, 0],
];
const SEA_PROFILE: Profile = [
  [0.1, 0],
  [-0.44, 4],
  [-1.5, 6],
  [-2.56, 4],
  [-2.56, 0],
];
const LOW_PROFILE: Profile = [
  [0.1, 0],
  [-0.03, 1],
  [-1.04, 2.9],
  [-2.05, 1],
  [-2.05, 0],
];
/** The profile swept from x0 to x1: a closed prism, its triangles wound outward (as a clearance copy reads them).
 * `turned`: a quarter turn about the origin, (x, y, z) to (z, y, -x), for the corner's second leg. */
function crowned(profile: Profile, x0: number, x1: number, turned = false): ColliderDef {
  const n = profile.length;
  const points = [x0, x1].flatMap((x) => profile.map(([z, y]) => (turned ? [z, y, -x] : [x, y, z])));
  const indices: number[] = [];
  const centre = [0, 1, 2].map((a) => points.reduce((t, q) => t + q[a]!, 0) / points.length);
  const tri = (i: number, j: number, k: number) => {
    const [a, b, c] = [points[i]!, points[j]!, points[k]!];
    const u = [0, 1, 2].map((d) => b[d]! - a[d]!),
      v = [0, 1, 2].map((d) => c[d]! - a[d]!);
    const normal = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const out = normal.reduce((t, w, d) => t + w * (a[d]! - centre[d]!), 0) > 0;
    indices.push(...(out ? [i, j, k] : [i, k, j]));
  };
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n;
    tri(k, next, n + next);
    tri(k, n + next, n + k);
  }
  for (let k = 1; k + 1 < n; k++) {
    tri(0, k, k + 1);
    tri(n, n + k, n + k + 1);
  }
  return { shape: 'trimesh', at: [0, 0, 0], vertices: points.flat(), indices };
}
const face = (width: number, profile: Profile) => crowned(profile, 0.2 - width / 2, width / 2 - 0.2);
const box = (at: Vec3, half: Vec3): ColliderDef => ({ shape: 'box', at, half });
/** The shore's pieces (docs/plans/cliff-kit-everywhere.md, step 1). A sea-cliff face: two courses over a 1.2 m wave-cut
 * foot, SEA_FACE m tall, 0.1 m out at the foot (the foot's undercut is drawn, not solid). A low face: one course and a
 * short broken top, 2.9 m. The corner (origin its outside corner's foot): two sea-cliff legs, one along -x facing +z
 * and one turned a quarter to run along -z facing +x. */
export const SEA_FACE = 6;
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
  piece('terrain.face-6', 'face_6', [face(6, FACE_PROFILE)]),
  piece('terrain.face-10', 'face_10', [face(10, FACE_PROFILE)]),
  // Three blocks along a lip, 4 m: 0.7 to 1.6 m tall drawn, 1.1 m solid.
  piece('terrain.rim-cap', 'rim_cap', [box([0, 0.15, -1.3], [1.9, 0.95, 1.2])]),
  piece('terrain.boulder-s', 'boulder_s', [box([0.07, 0.2, 0], [0.5, 0.3, 0.38])]),
  piece('terrain.boulder-m', 'boulder_m', [box([0.13, 0.35, 0], [0.9, 0.53, 0.67])]),
  piece('terrain.boulder-l', 'boulder_l', [box([0.21, 0.57, 0], [1.46, 0.86, 1.09])]),
  // Three low slabs at the waterline, 3 m along it, at most 0.7 m tall.
  piece('terrain.bank-rock', 'bank_rock', [box([0, 0.1, -0.2], [1.6, 0.3, 0.6])]),
  piece('terrain.sea-face-6', 'sea_face_6', [face(6, SEA_PROFILE)]),
  piece('terrain.sea-face-10', 'sea_face_10', [face(10, SEA_PROFILE)]),
  definePrefab({
    key: 'terrain.chalk-bed',
    scope: 'place',
    visual: {
      builder: 'terrain.kit',
      params: { piece: 'sea_face_10', colour: '#c9c5bb' },
      batch: 'Canopy cleft ledges',
    },
    colliders: [],
  }),
  piece('terrain.low-face', 'low_face', [face(5, LOW_PROFILE)]),
  piece('terrain.sea-corner', 'sea_corner', [crowned(SEA_PROFILE, -4.1, 0.25), crowned(SEA_PROFILE, 0, 4.1, true)]),
  piece('terrain.shore-rock-s', 'shore_rock_s', [box([0, 0.135, 0], [0.504, 0.189, 0.36])]),
  piece('terrain.shore-rock-m', 'shore_rock_m', [box([0, 0.21, 0], [0.84, 0.294, 0.6])]),
  piece('terrain.shore-rock-l', 'shore_rock_l', [box([0, 0.3, 0], [1.344, 0.42, 0.96])]),
];
