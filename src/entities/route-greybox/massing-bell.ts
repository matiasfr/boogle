// Bell Rock's greybox massing (docs/plans/greybox-leg2-massing.md, step 3: the lower level). The rock is cut in two for
// the lower line (call 115) and the cut is sea, so the `ns` row's unlaid bed, its two 40 m platforms and the lower
// deck stand on posts in it, with a slipway from the water (nobody is stranded) and the ramp up the cut's west wall
// to its landing. The rock itself is the horizon silhouette's mesh; here its two lands get one collider each, the
// map's own outline, so all the rock that is drawn is solid. Two labelled pads on the lower deck, each a pale outline
// and a placeholder sign. The numbers are ./leg2-layout.ts's; the level report walks the same ones
// (dev/level/route-leg2.ts). Step 4 adds the upper level: the bridge's beds, the upper platforms and deck, the
// pinnacle's collider, three more pads and the board post.
import * as THREE from 'three/webgpu';
import mapPage from '../../../docs/world/map-prototypes.html?raw';
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Boxes, leg2Signs } from './leg2-draw.ts';
import { LEG2, bellRockOutlines } from './leg2-layout.ts';

const B = LEG2.bell;
/** What step 3 builds of the layout (step 4 builds the rest and drops this list). */
const LOWER = new Set([
  'ns-bed',
  'lower-east',
  'lower-west',
  'lower-deck',
  'slipway',
  'ramp',
  'ramp-parapet',
  'ramp-landing',
  'pad-gorge',
  'pad-ring',
]);
const pads = () => B.pads.filter((p) => LOWER.has(p.id));

export const bellMassing = () =>
  leg2Boxes(
    B.pieces.filter((p) => LOWER.has(p.id)),
    pads(),
  );

/** One land as a collider: its outline's flat top at the rock's height and its walls down under the sea. */
function prism(outline: readonly { x: number; z: number }[]) {
  const n = outline.length,
    vertices: number[] = [],
    indices: number[] = [];
  for (const y of [B.rockTop, B.rockBase]) for (const p of outline) vertices.push(p.x, y, p.z);
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
    outline.map((p) => new THREE.Vector2(p.x, p.z)),
    [],
  ))
    indices.push(a!, b!, c!);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(i, n + i, j, j, n + i, n + j);
  }
  return { vertices, indices };
}

/** The rock's colliders, and the pads' boards facing the lower platforms (east), where a walker comes from. */
export async function bellExtras(owner: OwnedView) {
  const { addStatic } = await import('../../place/land.ts');
  for (const outline of bellRockOutlines(mapPage))
    addStatic({ kind: 'trimesh', ...prism(outline) }, { x: 0, y: 0, z: 0 }, undefined, undefined, owner);
  const east = B.at(0, 1),
    o = B.at(0, 0);
  leg2Signs(owner, pads(), { nx: east.x - o.x, nz: east.z - o.z }, []);
}
