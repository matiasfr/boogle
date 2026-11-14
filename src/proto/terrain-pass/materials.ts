// The terrain pass's wedge materials (docs/plans/terrain-pass.md). Each starts from Place's own groundMaterial() and
// blends to it over the wedge's last metres, so the wedge has no seam at region 0. Local look experiment.
import * as THREE from 'three/webgpu';
import {
  abs,
  attribute,
  float,
  floor,
  fract,
  mix,
  normalFlat,
  normalViewGeometry,
  positionWorld,
  normalWorldGeometry,
  sin,
  smoothstep,
  texture,
  vec3,
  vertexColor,
} from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { registerWaterReceiver } from '../../render/water/receivers.ts';
import { paletteNode } from '../../render/material-palette.ts';
import { MATERIAL_PALETTES } from '../../render/material-palette-tuning.ts';
import { groundMaterial, selectiveColour } from '../../place/look.ts';
import { coveU } from '../../place/cove-tuning.ts';
import { coveTextures } from '../../place/cove-textures.ts';
import { applyCoveLayers } from '../../place/cove-material.ts';
import { ORIGIN } from '../../place/layout.ts';
import { STRATA, WEDGE } from './surface.ts';

// TSL's types don't follow these graphs; kept loose like look.ts.
// oxlint-disable-next-line typescript/no-explicit-any
type N = any;
const linear = (hex: string) => {
  const c = new THREE.Color(hex);
  return vec3(c.r, c.g, c.b);
};
/** A colour as it should look under the Fresh palette, as the 'sand' family's anchor (paletteNode is applied later). */
const freshSand = (hex: string) => {
  const c = new THREE.Color(hex),
    anchor = new THREE.Color(MATERIAL_PALETTES.sand[0]),
    fresh = new THREE.Color(MATERIAL_PALETTES.sand[1]);
  return vec3((c.r * anchor.r) / fresh.r, (c.g * anchor.g) / fresh.g, (c.b * anchor.b) / fresh.b);
};

/** 1 inside the wedge, 0 at its border, over `fade` m. */
function region(fade = 10): N {
  const p = positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z));
  const inset = p.x.sub(WEDGE.x0).min(float(WEDGE.x1).sub(p.x)).min(p.z.sub(WEDGE.z0)).min(float(WEDGE.z1).sub(p.z));
  return smoothstep(0, fade, inset);
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

/** Round two (owner, 10 November: the coast mostly grass down to a beach, sandstone only on unwalkable cliffs, subtle
 * rock layers). Ground you can stand on keeps today's colours, from the same vertex colours and recipe as look.ts's
 * groundMaterial, but without its per-pixel facet rock, which painted the whole walkable coast slope tan. On it: a
 * darker wet band at the sea; paths are the shared path surface (place/path-surface.ts), laid over it by the caller. Rock only where the collider is unwalkable: the cove's sandstone pigment
 * and triplanar tile (shared, already resident), beds keyed to the drawn 1 m ledges at about a third of the cove's
 * contrast, no rust bed. Fades to today's material over the wedge's last 24 m. */
export function roundTwoMaterial(whole = false) {
  const m = groundMaterial();
  const inside: N = whole ? float(1) : region(24);
  const p = positionWorld.sub(vec3(ORIGIN.x, 0, ORIGIN.z));
  const wx: N = positionWorld.x;
  // One vec4 for the four inputs: a pipeline takes at most eight vertex buffers, and the land already carries five.
  const layers: N = attribute('tpLayers', 'vec4');
  const steep: N = layers.x,
    foot: N = layers.y,
    soil: N = layers.z,
    gorge: N = layers.w;
  // Today's lawn, sand and path (look.ts groundMaterial's grass branch, world coordinates), so colours match outside.
  const slow: N = sin(wx.mul(0.031).add(1.3))
    .mul(sin(p.z.mul(0.027).sub(0.4)))
    .mul(0.55);
  const mid: N = sin(wx.mul(0.11).add(p.z.mul(0.07))).mul(0.42);
  const fine: N = sin(wx.mul(0.37).sub(p.z.mul(0.29))).mul(0.2);
  const breathe: N = slow.add(mid).add(fine).mul(0.5).add(0.5);
  // Low ground is drawn per pixel, not from the 2 m vertex blend (which washed the lower slopes to a pale, milky
  // green): under 3 m the vertex colour gives way to one mean green, and the beach is a line that wanders with height.
  const raw: N = vertexColor().rgb;
  const v: N = mix(raw, linear('#618f41'), smoothstep(3, 3.6, p.y).oneMinus());
  const shoreLine: N = sin(p.x.mul(0.19).add(p.z.mul(0.13)))
    .mul(0.3)
    .add(sin(p.x.mul(0.53).sub(p.z.mul(0.47))).mul(0.12));
  const sandy: N = smoothstep(2.05, 2.6, p.y.add(shoreLine)).oneMinus();
  const dry: N = smoothstep(
    0.25,
    0.75,
    sin(wx.mul(0.052).sub(p.z.mul(0.038)).add(0.7))
      .mul(sin(p.z.mul(0.071).add(wx.mul(0.019))))
      .mul(1.1)
      .add(0.3),
  );
  const mottle: N = sin(wx.mul(2.3).add(sin(p.z.mul(1.7)).mul(1.4)))
    .mul(sin(p.z.mul(2.9).sub(wx.mul(0.9))))
    .mul(0.05);
  const tint: N = mix(vec3(0.74, 0.9, 0.78), vec3(1.04, 1.04, 0.82), breathe);
  const lawn: N = mix(v.mul(tint), v.mul(vec3(1.24, 1.1, 0.72)), dry.mul(0.55)).mul(mottle.add(1));
  // Sand a little darker than today's: on a sun-facing smooth slope today's pigment tone-maps to near white (today's
  // facet rock hid it). Darker still where the broad slope is steep, so a bank reads damp, not bright.
  const sandTone: N = smoothstep(0.75, 0.95, soil).mul(0.12).add(0.68);
  // The beach is sand by the sea; the gorge's low floor keeps its grey-green bank.
  // Colours as they should look under Fresh, written as the sand family's anchor so the other palettes still move them:
  // a warm beach (today's pale pigment tone-maps to white on a sunlit slope) and a damp, mossy bank on the gorge's floor.
  const beach: N = freshSand('#d2b680').mul(sandTone.add(0.25));
  const bank: N = freshSand('#7d8760').mul(mottle.mul(2).add(1));
  const low: N = mix(beach, bank, gorge);
  const ground: N = mix(selectiveColour(lawn, 'grass'), paletteNode(low, 'sand'), sandy);
  // The sea's wet band, on sand only and only ever darker than today's sand.
  const wet: N = smoothstep(0.05, 0.6, p.y).oneMinus().mul(sandy);
  // Rock: unwalkable only, with a little wander so the border isn't the grid's.
  const wander: N = sin(p.x.mul(0.37).add(p.z.mul(0.23)))
    .mul(0.5)
    .add(sin(p.x.mul(0.91).sub(p.z.mul(0.67))).mul(0.3));
  // The broad 3 m slope too, so a few walkable cells inside a cliff face don't sprout grass blotches.
  // Both borders are narrow and broken by a finer wander: a soft blend over a 2 m cell reads as an airbrushed smear
  // from the path, a crisp ragged edge as rock coming through the turf.
  const ragged: N = sin(p.x.mul(1.9).add(p.z.mul(1.1)).add(p.y.mul(1.7)))
    .mul(0.06)
    .add(sin(p.z.mul(2.7).sub(p.x.mul(0.8))).mul(0.05))
    .add(wander.mul(0.07));
  const broad: N = smoothstep(0.54, 0.6, soil.add(wander.mul(0.03))).oneMinus();
  const rock: N = smoothstep(0.3, 0.42, steep.add(ragged)).max(broad);
  const tiles = coveTextures();
  const n: N = normalWorldGeometry.normalize();
  const an: N = abs(n);
  const axes: N = an.div(an.x.add(an.y).add(an.z).max(0.0001));
  const repeat = coveU('rockScale');
  const paint: N = texture(tiles.rock, p.zy.div(repeat))
    .mul(axes.x)
    .add(texture(tiles.rock, p.xz.div(repeat)).mul(axes.y))
    .add(texture(tiles.rock, p.xy.div(repeat)).mul(axes.z)).rgb;
  const pigment = (family: 'rock' | 'strata' | 'sediment') =>
    vec3(coveU(`${family}R`), coveU(`${family}G`), coveU(`${family}B`));
  const warp: N = sin(p.x.mul(0.08))
    .mul(0.35)
    .add(sin(p.z.mul(0.06).add(1.3)).mul(0.3));
  const q: N = p.y.add(warp).div(STRATA);
  const tone: N = fract(sin(floor(q).mul(7.13).add(2.39)).mul(43758.5453));
  const bed: N = mix(pigment('strata'), pigment('sediment'), smoothstep(0.6, 0.61, tone));
  // Halfway between the cove's sandstone and today's tan rock (look.ts), so the gorge stays the same family of rock.
  const today: N = mix(linear('#a98558'), linear('#d0a872'), smoothstep(2, 18, p.y));
  // Beds you can see from the path, still subtle (10 November: "subtle layers"): two in three take the bed pigment at
  // just over half strength, every bed is a little lighter or darker than the next, and a thin dark seam parts them.
  const layered: N = mix(
    mix(pigment('rock'), today, 0.5),
    mix(bed, today, 0.5),
    smoothstep(0.35, 0.36, tone).mul(0.55),
  ).mul(fract(tone.mul(7.7)).mul(0.16).add(0.92));
  const tread: N = smoothstep(0.05, 0.3, fract(q)).oneMinus();
  const seam: N = smoothstep(0.02, 0.07, fract(q)).mul(smoothstep(0.93, 0.98, fract(q)).oneMinus());
  const rockColour: N = layered
    .mul(mix(vec3(1), paint, 0.45))
    .mul(smoothstep(0, 0.45, foot).mul(0.2).add(0.8))
    .mul(tread.mul(0.05).add(1))
    .mul(seam.mul(0.14).add(0.86));
  // A dry lip only at the rim.
  const lip: N = smoothstep(0.02, 0.12, steep)
    .mul(rock.oneMinus())
    .mul(smoothstep(0.5, 0.8, foot));
  patchNode(m, 'colorNode', (previous: N) => {
    let c: N = mix(ground, ground.mul(vec3(1.12, 1.04, 0.8)), lip.mul(0.5));
    c = mix(c, c.mul(0.72), wet);
    c = mix(c, rockColour, rock);
    return mix(previous, c, inside);
  });
  // Rock takes its drawn facets (the ledges and a crisp rim); everything you can walk on keeps the smooth normals.
  patchNode(m, 'normalNode', (previous: N) =>
    mix(previous, mix(normalViewGeometry, normalFlat, rock).normalize(), inside).normalize(),
  );
  // The whole land registers with the sea through its cove layers (land.ts); a wedge of its own does it here.
  return whole ? m : registerWaterReceiver(m);
}
