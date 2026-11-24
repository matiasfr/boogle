// Canopy's map-outline prisms (greybox leg 3, step 6): the isle and the White Wall's two chalk islets made solid as the
// horizon draws them (entities/sickle-backdrop/view.ts: a flat top on the outline, walls down to -10). Each top is a fan
// from its ring's baked centroid (every ring is star-shaped about it: dev/level/route-leg3.ts checks), wound to face up; each
// wall a quad an edge. Collision only: the horizon draws them.
import { definePrefab } from '../../prefab/types.ts';
import { CANOPY_CENTRES, CANOPY_LANDS, CANOPY_TOPS, LAND_BASE, landPoints, type CanopyLand } from '../levels/leg3.ts';

function prism(id: CanopyLand) {
  const ring = landPoints(id),
    n = ring.length,
    top = CANOPY_TOPS[id],
    [cx, cz] = CANOPY_CENTRES[id];
  // 0..n-1 the top's ring, n..2n-1 the foot's, 2n the top's centre.
  const vertices = [
    ...ring.flatMap((p) => [p.x, top, p.z]),
    ...ring.flatMap((p) => [p.x, LAND_BASE, p.z]),
    cx,
    top,
    cz,
  ];
  // Counter-clockwise seen from above (x east, z south): (b - a) x (c - a) has +y.
  const up = (a: number, b: number, c: number) => {
    const ax = vertices[3 * a]!,
      az = vertices[3 * a + 2]!,
      cross =
        (vertices[3 * b + 2]! - az) * (vertices[3 * c]! - ax) - (vertices[3 * b]! - ax) * (vertices[3 * c + 2]! - az);
    return cross >= 0 ? [a, b, c] : [a, c, b];
  };
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(...up(2 * n, i, j), i, j, n + i, j, n + j, n + i);
  }
  return { shape: 'trimesh' as const, at: [0, 0, 0] as const, vertices, indices };
}

export const prefabs = [
  definePrefab({
    key: 'greybox.canopy-lands',
    visual: { none: true },
    colliders: (Object.keys(CANOPY_LANDS) as CanopyLand[]).map(prism),
    scope: 'place',
  }),
];
