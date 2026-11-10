// The terrain pass's two wedge materials (docs/plans/terrain-pass.md). Both start from Place's own groundMaterial() and
// blend to it over the wedge's last 10 m, so the wedge has no seam at region 0. Local look experiment.
import * as THREE from 'three/webgpu';
import {
  attribute,
  float,
  floor,
  fract,
  mix,
  normalFlat,
  normalViewGeometry,
  positionWorld,
  sin,
  smoothstep,
  vec3,
} from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { registerWaterReceiver } from '../../render/water/receivers.ts';
import { paletteNode } from '../../render/material-palette.ts';
import { groundMaterial } from '../place/look.ts';
import { applyCoveLayers } from '../place/cove-material.ts';
import { ORIGIN } from '../place/layout.ts';
import { STRATA, WEDGE } from './surface.ts';

// TSL's types don't follow these graphs; kept loose like look.ts.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const linear = (hex: string) => {
  const c = new THREE.Color(hex);
  return vec3(c.r, c.g, c.b);
};

/** 1 inside the wedge, 0 at its border, over 10 m. */
function region(): N {
  const p = positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z));
  const inset = p.x.sub(WEDGE.x0).min(float(WEDGE.x1).sub(p.x)).min(p.z.sub(WEDGE.z0)).min(float(WEDGE.z1).sub(p.z));
  return smoothstep(0, 10, inset);
}

/** A: colour bands from world position and normal, no texture reads. Rock by the collider's steepness (an attribute,
 * so the drawn ledges' flat treads stay rock), strata keyed to the same height rhythm as the drawn ledges, a darker
 * foot, a dry grass lip at the rim, a beach with a wet band only where the sea is (not the gorge's floor), and worn
 * paths with an irregular edge. */
export function bandsMaterial() {
  const m = groundMaterial();
  const inside = region();
  const p = positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z));
  const steep: N = attribute('tpSteep', 'float'),
    foot: N = attribute('tpFoot', 'float'),
    path: N = attribute('covePath', 'float'),
    gorge: N = attribute('tpGorge', 'float');
  const wander: N = sin(p.x.mul(0.37).add(p.z.mul(0.23)))
    .mul(0.5)
    .add(sin(p.x.mul(0.91).sub(p.z.mul(0.67))).mul(0.3));
  const rock: N = smoothstep(0.1, 0.45, steep.add(wander.mul(0.08)));
  // Strata: the drawn ledges' period and warp (surface.ts ledge()), so a bed's colour sits on its own step.
  const warp: N = sin(p.x.mul(0.08))
    .mul(0.35)
    .add(sin(p.z.mul(0.06).add(1.3)).mul(0.3));
  const q: N = p.y.add(warp).div(STRATA);
  const bed: N = floor(q);
  const tone: N = fract(sin(bed.mul(7.13).add(2.39)).mul(43758.5453));
  // Today's rock pigments (look.ts: deep low, warm high), each bed a little lighter or darker, one in five rust.
  const body: N = mix(linear('#a98558'), linear('#d0a872'), smoothstep(2, 18, p.y));
  const bedColour: N = mix(body.mul(tone.mul(0.16).add(0.9)), linear('#a5694a'), smoothstep(0.8, 0.81, tone).mul(0.7));
  const tread: N = smoothstep(0.05, 0.3, fract(q)).oneMinus(); // the flat top of each ledge catches a little more colour
  const rockColour: N = paletteNode(
    mix(linear('#7a5c3e'), bedColour, smoothstep(0, 0.45, foot)).mul(tread.mul(0.06).add(1)),
    'stone',
  );
  // Grass gives way to rock through a narrow dry lip at the rim (not at the foot).
  const lip: N = smoothstep(0.02, 0.12, steep)
    .mul(rock.oneMinus())
    .mul(smoothstep(0.5, 0.8, foot));
  const lipColour: N = paletteNode(linear('#a6a24e'), 'grass');
  // Beach only by the sea; the gorge's low floor keeps its bank colour.
  const beach: N = smoothstep(1.7, 2.9, p.y.add(wander.mul(0.35)))
    .oneMinus()
    .mul(gorge.oneMinus())
    .mul(rock.oneMinus());
  const wet: N = smoothstep(0.05, 0.55, p.y).oneMinus();
  const sand: N = paletteNode(mix(linear('#e6cf98'), linear('#b39668'), wet), 'sand');
  // Paths: an irregular edge and a worn, darker middle where feet go.
  const edge: N = sin(p.x.mul(1.3).add(sin(p.z.mul(0.9)).mul(1.5)))
    .mul(sin(p.z.mul(1.7).sub(p.x.mul(0.6))))
    .mul(0.18);
  const worn: N = smoothstep(0.42, 0.58, path.add(edge));
  const rut: N = smoothstep(0.85, 1, path);
  const dirt: N = paletteNode(mix(linear('#d8a865'), linear('#b98950'), rut.mul(0.6)), 'sand');
  patchNode(m, 'colorNode', (previous: N) => {
    let c: N = mix(previous, lipColour, lip.mul(0.55));
    c = mix(c, sand, beach);
    c = mix(c, dirt, worn);
    c = mix(c, rockColour, rock);
    return mix(previous, c, inside);
  });
  // Rock takes its drawn facets (crisp ledges and rim); grass keeps the smooth-surface normals surface.ts baked.
  patchNode(m, 'normalNode', (previous: N) =>
    mix(previous, mix(normalViewGeometry, normalFlat, rock).normalize(), inside).normalize(),
  );
  // Caustics and the wet film under and at the sea, as Place's ground has through the cove's sand registration.
  return registerWaterReceiver(m);
}

/** B: the west cove's textured layers (three 512² tiles, triplanar rock, Sunshine strata, height-blended turf, sand and
 * wetness), as they already ship in the cove, over the wedge. The gorge's low floor keeps today's colour. */
export function coveLayersMaterial() {
  const m = groundMaterial();
  applyCoveLayers(m, region().mul(attribute('tpGorge', 'float').oneMinus()), false, attribute('tpSoil', 'float'));
  return m;
}
