// Two look experiments on one lawn wedge of Home, off by default (docs/research/small-magic-look.md, "What was
// built"). `?meadow=tint` blends four of the lawn's own greens in large soft patches; `?meadow=flowers` plants flower
// drifts and grass tufts (meadow-flowers.ts); `?meadow=tint,flowers` (or `all`) does both. With no flag neither the
// ground's graph nor the scene changes. Local view only: no sim, world, net or saved state.
import * as THREE from 'three/webgpu';
import { mix, smoothstep, texture, vec2, vec3 } from 'three/tsl';
import { ORIGIN } from './layout.ts';
import { CELL } from './terrain.ts';
import { MEADOW_H, MEADOW_W, MEADOW_WEDGE, bakeMeadowField } from './meadow-field.ts';

const asked = new Set((new URLSearchParams(location.search).get('meadow') ?? '').split(','));
export const MEADOW = {
  tint: asked.has('tint') || asked.has('all'),
  flowers: asked.has('flowers') || asked.has('all'),
};

// TSL's types don't follow these graphs; kept loose like look.ts.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const linear = (hex: string) => {
  const c = new THREE.Color(hex);
  return vec3(c.r, c.g, c.b);
};

let field: THREE.DataTexture | null = null;
/** The wedge's field, one RGBA16F texture on the land's 2 m grid (height, allowed, sun, zone), made once. */
export function meadowFieldTexture() {
  if (field) return field;
  const baked = bakeMeadowField(),
    half = new Uint16Array(baked.length);
  for (let k = 0; k < baked.length; k++) half[k] = THREE.DataUtils.toHalfFloat(baked[k]!);
  field = new THREE.DataTexture(half, MEADOW_W, MEADOW_H, THREE.RGBAFormat, THREE.HalfFloatType);
  field.name = 'place-meadow-field';
  field.minFilter = field.magFilter = THREE.LinearFilter;
  field.generateMipmaps = false;
  field.colorSpace = THREE.NoColorSpace;
  field.needsUpdate = true;
  return field;
}

/** A world xz as the field's grid coordinates (texel units; texel centres sit on whole numbers). */
export const meadowGrid = (worldXZ: N): N =>
  worldXZ.sub(vec2(ORIGIN.x + MEADOW_WEDGE.x0, ORIGIN.z + MEADOW_WEDGE.z0)).div(CELL);
/** The field at grid coordinates, blended between its four texels. */
export const meadowTap = (grid: N): N => texture(meadowFieldTexture(), grid.add(0.5).div(vec2(MEADOW_W, MEADOW_H)));

/** The lawn's four greens, all already in the game: the land's two grass vertex colours (land.ts) and the lawn's own
 * warm and dry tints of the lighter one (ground-material.ts), the warm one pushed a little. Written before the grass
 * palette is applied, as the lawn is. */
const GREENS = {
  lush: linear('#568740'),
  fresh: linear('#6c9a42'),
  sunny: linear('#6c9a42').mul(vec3(1.24, 1.1, 0.72)),
  pale: linear('#6c9a42').mul(vec3(1.14, 1.12, 0.9)),
};
/** The meadow's green at a field sample: lush to fresh to sunny along `sun`, with pale where the zone noise peaks. */
export function meadowGreen(sample: N): N {
  const sun: N = sample.b,
    zone: N = sample.a;
  const green: N = mix(
    mix(GREENS.lush, GREENS.fresh, smoothstep(0.08, 0.5, sun)),
    GREENS.sunny,
    smoothstep(0.5, 0.92, sun),
  );
  return mix(green, GREENS.pale, smoothstep(0.6, 0.95, zone).mul(0.6));
}

/** `?meadow=tint`: the lawn's colour inside the wedge, soft at its edges. `p` is the Place-local position. One texture
 * tap a pixel; no geometry. Rock, sand and paths are mixed over the lawn afterwards, so they are unaffected. */
export function meadowLawn(lawn: N, p: N, mottle: N): N {
  const inside: N = smoothstep(MEADOW_WEDGE.x0, MEADOW_WEDGE.x0 + 14, p.x)
    .mul(smoothstep(MEADOW_WEDGE.x1 - 14, MEADOW_WEDGE.x1, p.x).oneMinus())
    .mul(smoothstep(MEADOW_WEDGE.z0, MEADOW_WEDGE.z0 + 14, p.z))
    .mul(smoothstep(MEADOW_WEDGE.z1 - 14, MEADOW_WEDGE.z1, p.z).oneMinus());
  const sample: N = meadowTap(meadowGrid(p.xz.add(vec2(ORIGIN.x, ORIGIN.z))));
  return mix(lawn, meadowGreen(sample).mul(mottle.add(1)), inside);
}
