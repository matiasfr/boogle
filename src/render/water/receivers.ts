// Real ground keeps its own colour, normals, shadows and cave masks. Only wetness and submerged light are layered on.
// Local; Ultra Water research recommendations 4/7. The terrain registers before the sea owns its shared resources.
import type { MeshStandardNodeMaterial } from 'three/webgpu';
import { patchNode } from '../material-patch.ts';
import { newWaterEnabled } from './flags.ts';
import { CAUSTIC_TEXELS_PER_M, type CausticSample } from './caustics.ts';
import { swashNodes, vnoise, type ShoreFields } from './shore-nodes.ts';
import { seaU } from './state.ts';
import { LOOK, ULTRA } from './tuning.ts';
import { TSL, type N } from './tsl.ts';
import { scalar, vector, tuningEnabled } from './live.ts';

const { Fn, If, exp, float, fwidth, log2, materialColor, materialRoughness, max, min, mix } = TSL;
const { normalWorldGeometry, positionWorld, refract, smoothstep, vec3, vec4 } = TSL;
type Context = { field: ShoreFields; caustics: CausticSample };
/** Optional Local sand response. Nodes are owned by the material's terrain owner, never by the sea. */
export type WetSandProfile = {
  mask: N;
  dampHeight: N;
  dampWidth: N;
  dampStrength: N;
  tideMarkStrength: N;
  filmTint: N;
  sheenStrength: N;
};
const materials = new Set<MeshStandardNodeMaterial>();
const sandProfiles = new WeakMap<MeshStandardNodeMaterial, WetSandProfile>();
let current: Context | null = null;
const restore = new Map<MeshStandardNodeMaterial, () => void>();
const causticStrength = scalar('water.caustics', ULTRA, 'caustics');

function attach(mat: MeshStandardNodeMaterial, { field, caustics }: Context) {
  if (restore.has(mat)) return;
  const sand = sandProfiles.get(mat);
  const previousColor = mat.colorNode,
    previousRoughness = mat.roughnessNode,
    previousNormal = mat.normalNode;
  const wash = Fn(() => {
    const result = vec3(0).toVar();
    // swashNodes already returns zero below this height; avoid its three atlas lookups on submerged beds.
    If(positionWorld.y.greaterThan(-0.3), () => {
      result.assign(swashNodes(positionWorld.xz, positionWorld.y, field));
    });
    return result;
  })().toVar();
  const surface = Fn(() => {
    const p = positionWorld;
    const depth = max(p.y.negate(), 0).toVar();
    // Only exposed receivers: roof/deck tops are dry, and walls/undersides reject projected sunlight.
    const up = smoothstep(0.05, 0.65, normalWorldGeometry.y).toVar();
    const wet = max(smoothstep(-0.1, 0.18, p.y).oneMinus(), wash.z).mul(up);
    const sunRay = refract(seaU.uSun.negate(), vec3(0, 1, 0), 1 / 1.33);
    const entry = p.xz.add(sunRay.xz.div(min(sunRay.y, -0.05)).mul(depth));
    const fw = fwidth(entry).toVar();
    const lod = log2(max(max(fw.x, fw.y).mul(CAUSTIC_TEXELS_PER_M), 1));
    const focused = float(1).toVar();
    // The existing depth fade is exactly zero here. Keep derivatives above the branch; all conditional
    // samples have explicit LOD. The offshore apron needs absorption, not invisible shore/caustic samples.
    If(depth.lessThan(24), () => {
      const sh = field.shore(p.xz).toVar();
      const light = caustics(entry, depth, lod).toVar();
      const exposed = smoothstep(0, 0.25, depth)
        .mul(smoothstep(12, 24, depth).oneMinus())
        .mul(smoothstep(0.02, 0.2, seaU.uSun.y))
        .mul(up)
        .mul(smoothstep(0.05, 1, field.surf(p.xz)))
        // The receiver IS the bed. A positive offset requirement erased light on matching triangles.
        .mul(smoothstep(-0.35, -0.05, p.y.sub(sh.x)))
        .mul(mix(1.35, 1, smoothstep(1.5, 3, depth)));
      focused.assign(max(mix(1, light, tuningEnabled ? exposed.mul(causticStrength) : exposed), 0));
    });
    const transmission = exp(vector('water.absorption', LOOK, 'absorption').mul(depth).mul(-0.35));
    // This multiplier stays in the lit albedo path, so the receiver's existing shadow term still occludes it.
    return vec4(transmission.mul(mix(1, 0.72, wet)).mul(focused), wet);
  })().toVar();
  const lace = smoothstep(0.48, 0.72, vnoise(positionWorld.xz.mul(24).add(seaU.uTime.mul(0.3))));
  const foam = wash.y
    .mul(lace)
    .mul(smoothstep(-0.02, 0.04, positionWorld.y))
    .mul(0.7);
  // The optional sand treatment uses this same wash result: one shore lookup/clock for film, foam and drying.
  // Keep the default path unchanged for all ordinary receivers.
  const sandMask = sand ? float(sand.mask).clamp(0, 1) : float(0);
  const sandUp = smoothstep(0.65, 0.9, normalWorldGeometry.y);
  const film = smoothstep(0, 0.004, wash.x).mul(smoothstep(-0.05, 0.05, positionWorld.y));
  const damp = sand
    ? (() => {
        const broad = vnoise(positionWorld.xz.mul(0.08));
        const high = float(sand.dampHeight).add(float(sand.dampWidth).mul(broad));
        const low = high.sub(max(sand.dampWidth, 0.05).mul(2));
        const persistent = smoothstep(low, high, positionWorld.y).oneMinus().mul(sand.dampStrength);
        // Preserve the drying clock even inside the persistent damp band; max(static, wet) hid it there.
        return persistent.add(wash.z.mul(sand.tideMarkStrength).mul(persistent.oneMinus())).mul(sandUp);
      })()
    : surface.a;
  patchNode(mat, 'colorNode', (previous: N) => {
    const base = previous ?? materialColor;
    const ordinary = base.mul(surface.rgb);
    if (!sand) return mix(ordinary, vec3(0.65, 0.7, 0.68), foam);
    // Ultra Water terrain.js: water fills pores, compounding pigment instead of a flat grey multiply.
    // Remove only this receiver's ordinary wet multiplier; keep its absorption and focused light.
    const light = surface.rgb.div(mix(1, 0.72, surface.a));
    const poreTint = mix(base.mul(0.8).add(0.06), vec3(0.6), smoothstep(-0.8, 0, positionWorld.y).oneMinus());
    const sandColour = base
      .mul(light)
      .mul(mix(vec3(1), poreTint, damp))
      .mul(mix(vec3(1), vec3(0.9, 0.97, 0.97), smoothstep(0, 0.06, wash.x).mul(film).mul(sand.filmTint)));
    return mix(mix(ordinary, sandColour, sandMask), vec3(0.65, 0.7, 0.68), foam);
  });
  // A wet film needs a continuous normal, as in the reference's smooth/rippled sand. Giving the dry terrain's
  // flat face normals a low roughness lit entire triangles as white shards, even with the ocean hidden.
  const gloss = surface.a.mul(smoothstep(-0.05, 0.05, positionWorld.y));
  const filmNormal = TSL.transformNormalToView(TSL.normalLocal).toVarying().normalize();
  patchNode(mat, 'normalNode', (previous: N) => {
    const base = previous ?? TSL.normalViewGeometry;
    const ordinary = mix(base, filmNormal, gloss).normalize();
    // Cove sand already supplies continuous, rippled normals. Do not erase those as its film becomes shiny.
    return sand ? mix(ordinary, base, sandMask).normalize() : ordinary;
  });
  patchNode(mat, 'roughnessNode', (previous: N) => {
    const base = previous ?? materialRoughness;
    const ordinary = mix(base, 0.32, gloss);
    if (!sand) return ordinary;
    const sandRoughness = mix(
      mix(base, 0.32, damp.mul(smoothstep(-0.05, 0.05, positionWorld.y)).mul(sand.sheenStrength)),
      0.2,
      film.mul(sand.sheenStrength),
    );
    return mix(ordinary, sandRoughness, sandMask);
  });
  const color = mat.colorNode,
    roughness = mat.roughnessNode,
    normal = mat.normalNode;
  restore.set(mat, () => {
    if (mat.colorNode === color) mat.colorNode = previousColor;
    if (mat.roughnessNode === roughness) mat.roughnessNode = previousRoughness;
    if (mat.normalNode === normal) mat.normalNode = previousNormal;
    mat.needsUpdate = true;
  });
}

export function registerWaterReceiver<T extends MeshStandardNodeMaterial>(mat: T, sand?: WetSandProfile): T {
  if (!newWaterEnabled) return mat;
  if (sand) sandProfiles.set(mat, sand);
  materials.add(mat);
  if (current) attach(mat, current);
  mat.addEventListener('dispose', () => {
    materials.delete(mat);
    sandProfiles.delete(mat);
    restore.delete(mat);
  });
  return mat;
}

export function installWaterReceivers(field: ShoreFields, caustics: CausticSample) {
  current = { field, caustics };
  for (const mat of materials) attach(mat, current);
  return () => {
    current = null;
    for (const undo of restore.values()) undo();
    restore.clear();
  };
}
