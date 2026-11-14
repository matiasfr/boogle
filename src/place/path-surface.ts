// How Home's footpaths are drawn on the land (docs/plans/terrain-pass.md, the paths round; owner, 14 November: "it
// should be more clearly looking like a path"). A per-pixel layer over whatever ground material is underneath, from a
// distance field of the paths (path-field.ts), so the tread's edge is finer than the land's 2 m cells and the tread
// wins over slope rock within its width. Brown compacted earth, lighter where feet go, a dark cut edge with a small
// painted bank (shading only: no vertex moves), a darker verge, small stones and timber risers on the climbs. Local.
import * as THREE from 'three/webgpu';
import {
  cameraViewMatrix,
  dFdx,
  dFdy,
  dot,
  floor,
  fract,
  fwidth,
  length,
  mix,
  normalFlat,
  positionView,
  positionWorld,
  sin,
  smoothstep,
  texture,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { patchNode } from '../render/material-patch.ts';
import { paletteNode } from '../render/material-palette.ts';
import { MATERIAL_PALETTES } from '../render/material-palette-tuning.ts';
import { GRID, ORIGIN } from './layout.ts';
import { FIELD_CELL, FIELD_H, FIELD_W, bakePathField } from './path-field.ts';

// TSL's types don't follow these graphs; kept loose like look.ts.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;

/** A colour as it should look under the Fresh palette, written as the 'sand' family's anchor so the other palettes
 * still move it. */
function sand(hex: string): N {
  const c = new THREE.Color(hex),
    anchor = new THREE.Color(MATERIAL_PALETTES.sand[0]),
    fresh = new THREE.Color(MATERIAL_PALETTES.sand[1]);
  return paletteNode(vec3((c.r * anchor.r) / fresh.r, (c.g * anchor.g) / fresh.g, (c.b * anchor.b) / fresh.b), 'sand');
}
const hash = (cell: N): N => fract(sin(dot(cell, vec2(127.1, 311.7))).mul(43758.5453));

let field: THREE.DataTexture | null = null;
/** The paths' distance field, one RGBA16F texture (1 m texels over the land's grid, 3.4 MB, no mips), made once. */
function pathFieldTexture() {
  if (field) return field;
  const baked = bakePathField(),
    half = new Uint16Array(baked.length);
  for (let k = 0; k < baked.length; k++) half[k] = THREE.DataUtils.toHalfFloat(baked[k]!);
  field = new THREE.DataTexture(half, FIELD_W, FIELD_H, THREE.RGBAFormat, THREE.HalfFloatType);
  field.name = 'place-path-field';
  field.minFilter = field.magFilter = THREE.LinearFilter;
  field.generateMipmaps = false;
  field.colorSpace = THREE.NoColorSpace;
  field.needsUpdate = true;
  return field;
}

/** Draw the paths over `material`'s colour and normal. Call it after every other ground layer. */
export function applyPathSurface(material: THREE.MeshStandardNodeMaterial) {
  const p: N = positionWorld;
  const uv: N = p.xz
    .sub(vec2(ORIGIN.x + GRID.x0, ORIGIN.z + GRID.z0))
    .div(FIELD_CELL)
    .add(0.5)
    .div(vec2(FIELD_W, FIELD_H));
  const sample: N = texture(pathFieldTexture(), uv);
  const raw: N = sample.r;
  const grade: N = sample.g;
  const along: N = sample.b; // the path's own height here: level across the tread
  // Which way is off the path, in world xz: the field's slope, from its change across the pixel.
  const ax: N = dFdx(p.xz),
    ay: N = dFdy(p.xz),
    rx: N = dFdx(raw),
    ry: N = dFdy(raw);
  const det: N = ax.x.mul(ay.y).sub(ax.y.mul(ay.x));
  const slope: N = vec2(rx.mul(ay.y).sub(ry.mul(ax.y)), ry.mul(ax.x).sub(rx.mul(ay.x))).mul(det); // direction only
  const away: N = slope.div(length(slope).max(0.0001));
  // A hand-cut edge: the line wanders a little, at two scales.
  const wobble: N = sin(p.x.mul(0.83).add(sin(p.z.mul(0.61)).mul(1.7)))
    .mul(sin(p.z.mul(1.07).sub(p.x.mul(0.37))))
    .mul(0.24)
    .add(sin(p.x.mul(2.9).sub(p.z.mul(2.3))).mul(0.07));
  const d: N = raw.add(wobble);
  // One pixel of feather, so the edge stays clean from across the sea as well as underfoot.
  const soft: N = fwidth(raw).max(0.05);
  // Only ground counts: where a wall is cut beside the tread, the wall's own facets stay rock.
  const facetUp: N = cameraViewMatrix.transpose().mul(vec4(normalFlat, 0)).y;
  const ground: N = smoothstep(0.5, 0.66, facetUp);
  const tread: N = smoothstep(soft.negate(), soft, d).oneMinus().mul(ground);
  const near: N = smoothstep(30, 70, positionView.z.negate()).oneMinus(); // detail too small to draw from afar
  // Compacted earth: brown and smooth, lighter down the middle where feet go, mottled, with a fine grit up close.
  const middle: N = smoothstep(0.3, 1.5, d.negate());
  const mottle: N = sin(p.x.mul(0.47).add(p.z.mul(0.31)))
    .mul(sin(p.z.mul(0.71).sub(p.x.mul(0.19))))
    .mul(0.05);
  const grit: N = hash(floor(p.xz.mul(23)))
    .sub(0.5)
    .mul(0.05)
    .mul(smoothstep(8, 22, positionView.z.negate()).oneMinus());
  const earth: N = mix(sand('#8f6f4a'), sand('#a98a5f'), middle).mul(mottle.add(grit).add(1));
  // Timber risers across the tread on the climbs: one every 0.6 m of the path's own height, so each lies square across it.
  const climb: N = smoothstep(0.1, 0.16, grade);
  const rise: N = fract(along.div(0.6));
  const riserWidth: N = fwidth(along.div(0.6)).max(0.01);
  const riser: N = smoothstep(0, riserWidth, rise)
    .mul(smoothstep(0.13, riserWidth.add(0.13), rise).oneMinus())
    .mul(climb)
    .mul(smoothstep(0.25, 0.5, d.negate()));
  const lit: N = smoothstep(0.13, riserWidth.add(0.13), rise).mul(smoothstep(0.2, 0.34, rise).oneMinus());
  const timber: N = sand('#6f5236');
  // The cut edge: dark earth just inside the line.
  const cut: N = smoothstep(0.06, 0.34, d.negate()).oneMinus().mul(tread);
  const soil: N = sand('#5e4833');
  // Small stones along the edge, one cell in four.
  const cell: N = floor(p.xz.div(0.42));
  const centre: N = cell
    .add(
      vec2(hash(cell), hash(cell.add(17.3)))
        .mul(0.5)
        .add(0.25),
    )
    .mul(0.42);
  const radius: N = hash(cell.add(5.1)).mul(0.06).add(0.045);
  const offset: N = p.xz.sub(centre);
  const stone: N = smoothstep(radius.sub(0.035), radius, length(offset))
    .oneMinus()
    .mul(hash(cell.add(9.7)).greaterThan(0.84))
    .mul(smoothstep(-0.9, -0.3, d))
    .mul(smoothstep(0.2, 0.55, d).oneMinus())
    .mul(ground)
    .mul(near);
  const pebble: N = sand('#b3a892').mul(
    dot(offset, vec2(-0.6, -0.8))
      .div(radius)
      .mul(0.16)
      .add(hash(cell.add(2.3)).mul(0.2).add(0.86)),
  );
  // The verge: the ground beside the path a little darker, grass or the foot of a cut wall alike, out to about a metre.
  const verge: N = smoothstep(0, 1.1, d.add(sin(p.x.mul(3.7).add(p.z.mul(2.9))).mul(0.12)))
    .oneMinus()
    .mul(tread.oneMinus());
  patchNode(material, 'colorNode', (previous: N) => {
    let c: N = mix(previous, previous.mul(vec3(0.7, 0.78, 0.64)), verge.mul(0.75));
    let path: N = mix(earth, timber, riser.mul(0.85));
    path = mix(path, path.mul(1.12), lit.mul(climb).mul(0.5));
    path = mix(path, soil, cut.mul(0.8));
    c = mix(c, path, tread);
    return mix(c, pebble, stone);
  });
  // The painted bank: just inside the edge the normal leans in towards the path, so one side catches the sun and the
  // other falls into shade, as a few centimetres of cut would. The drawn surface stays on the collider.
  const bank: N = smoothstep(-0.5, -0.12, d)
    .mul(smoothstep(-0.02, 0.14, d).oneMinus())
    .mul(ground);
  const lean: N = cameraViewMatrix.mul(vec4(away.x.negate(), 0, away.y.negate(), 0)).xyz;
  patchNode(material, 'normalNode', (previous: N) =>
    previous.add(lean.mul(bank.mul(0.55)).mul(near.mul(0.6).add(0.4))).normalize(),
  );
  return material;
}
