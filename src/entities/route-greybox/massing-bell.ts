// Bell Rock's greybox massing (docs/plans/greybox-leg2-massing.md, steps 3 and 4). The rock is cut in two for the
// lower line (call 115) and the cut is sea. The lower level stands in it on posts: the `ns` row's unlaid bed, its two
// 40 m platforms and the lower deck, with a slipway from the water (nobody is stranded) and the ramp up the cut's
// west wall. The upper level: the `bay` row's two unlaid bed halves bridging the cut, four straight platform halves
// with end ramps down to the rock (provisional: the 52 degree kink moves them), the upper deck 1.9 m over the west
// rock with a short ramp down, and the pinnacle's collider. Five labelled pads, two lower and three upper, each a
// pale outline and a placeholder sign, and one inert board at the ramp's head. The rock itself is the horizon
// silhouette's mesh; here its two lands get one collider each, the map's own outline, so all the rock that is drawn
// is solid. The numbers are ./leg2-layout.ts's; the level report walks the same ones (dev/level/route-leg2.ts).
import * as THREE from 'three/webgpu';
import mapPage from '../../../docs/world/map-prototypes.html?raw';
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Boxes, leg2Signs } from './leg2-draw.ts';
import { LEG2, bellRockOutlines } from './leg2-layout.ts';

const B = LEG2.bell;

export const bellMassing = () => leg2Boxes(B.pieces, B.pads);

/** One land as a collider: its outline's flat top at the rock's height and its walls down under the sea. */
function prism(outline: readonly { x: number; z: number }[]) {
  const n = outline.length,
    vertices: number[] = [],
    indices: number[] = [];
  for (const y of [B.rockTop, B.rockBase]) for (const p of outline) vertices.push(p.x, y, p.z);
  // Every face is wound to look outwards (the top's up): the collider's edge fix reads a triangle's side from it,
  // and a body fell through a top wound the other way.
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
    outline.map((p) => new THREE.Vector2(p.x, p.z)),
    [],
  )) {
    const A = outline[a!]!,
      P = outline[b!]!,
      C = outline[c!]!;
    const up = (P.z - A.z) * (C.x - A.x) - (P.x - A.x) * (C.z - A.z) > 0;
    indices.push(a!, up ? b! : c!, up ? c! : b!);
  }
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = outline[i]!,
      q = outline[(i + 1) % n]!;
    area += p.x * q.z - q.x * p.z;
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (area > 0) indices.push(i, j, n + i, j, n + j, n + i);
    else indices.push(i, n + i, j, j, n + i, n + j);
  }
  return { vertices, indices };
}

/** The rock's colliders, the pads' boards (facing east: the lower platforms, and the ramp's head) and the post. */
export async function bellExtras(owner: OwnedView) {
  const { addStatic } = await import('../../place/land.ts');
  for (const outline of bellRockOutlines(mapPage))
    addStatic({ kind: 'trimesh', ...prism(outline) }, { x: 0, y: 0, z: 0 }, undefined, undefined, owner);
  const east = B.at(0, 1),
    o = B.at(0, 0);
  leg2Signs(owner, B.pads, { nx: east.x - o.x, nz: east.z - o.z }, B.posts);
}
