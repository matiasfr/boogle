// Ground under and beside the sea keeps its own colour, normals, shadows and cave masks; on top it is darkened where wet,
// tinted by the water above it and lit by the scrolling seabed light (./caustics.ts). Local. The terrain registers
// before the sea owns its shared resources.
import type { Material, MeshStandardNodeMaterial } from 'three/webgpu';
import { patchNode } from '../material-patch.ts';

import { CAUSTIC_TEXELS_PER_M, type CausticSample } from './caustics.ts';
import { seaU } from './state.ts';
import { LOOK } from './tuning.ts';
import { TSL, type N } from './tsl.ts';
import { scalar, vector, tuningEnabled } from './live.ts';

const { Fn, If, dot, exp, float, floor, fract, fwidth, log2, materialColor, materialRoughness, max, min, mix } = TSL;
const { normalWorldGeometry, positionWorld, refract, smoothstep, vec2, vec3, vec4 } = TSL;

// David Hoskins, Hash without Sine, and value noise over it (the cove's sand ripples use it too).
const hash12 = Fn(([p]: [N]) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  p3.addAssign(dot(p3, p3.yzx.add(33.33)));
  return fract(p3.x.add(p3.y).mul(p3.z));
}).setLayout({ name: 'hash12', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });
export const vnoise = Fn(([p]: [N]) => {
  const i = floor(p),
    f = fract(p);
  const u = f.mul(f).mul(f.mul(-2).add(3));
  return mix(
    mix(hash12(i), hash12(i.add(vec2(1, 0))), u.x),
    mix(hash12(i.add(vec2(0, 1))), hash12(i.add(1)), u.x),
    u.y,
  );
}).setLayout({ name: 'vnoise', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

/** Optional Local sand response: a damp band above the water and pore-darkened pigment below it. */
export type WetSandProfile = {
  mask: N;
  dampHeight: N;
  dampWidth: N;
  dampStrength: N;
  tideMarkStrength: N;
  sheenStrength: N;
};
const materials = new Set<MeshStandardNodeMaterial>();
const sandProfiles = new WeakMap<MeshStandardNodeMaterial, WetSandProfile>();
let current: CausticSample | null = null;
const restore = new Map<Material, { color: MeshStandardNodeMaterial['colorNode']; undo(): void }>();
/** The authored albedo before wetness, absorption and sunlight caustics; diagnostic readers only. */
export const receiverBaseColor = (mat: Material) => restore.get(mat)?.color;
const causticStrength = scalar('water.caustics', LOOK, 'caustics');

function attach(mat: MeshStandardNodeMaterial, caustics: CausticSample) {
  if (restore.has(mat)) return;
  const sand = sandProfiles.get(mat);
  const previousColor = mat.colorNode,
    previousRoughness = mat.roughnessNode,
    previousNormal = mat.normalNode;
  const y = positionWorld.y;
  const surface = Fn(() => {
    const p = positionWorld;
    const depth = max(p.y.negate(), 0).toVar();
    // Only exposed receivers: roof/deck tops are dry, and walls/undersides reject projected sunlight.
    const up = smoothstep(0.05, 0.65, normalWorldGeometry.y).toVar();
    const wet = smoothstep(-0.1, 0.18, p.y).oneMinus().mul(up);
    const sunRay = refract(seaU.uSun.negate(), vec3(0, 1, 0), 1 / 1.33);
    const entry = p.xz.add(sunRay.xz.div(min(sunRay.y, -0.05)).mul(depth));
    const fw = fwidth(entry).toVar();
    const lod = log2(max(max(fw.x, fw.y).mul(CAUSTIC_TEXELS_PER_M), 1));
    const focused = float(1).toVar();
    // The depth fade is exactly zero past 24 m. Keep derivatives above the branch; its samples have explicit LOD.
    If(depth.lessThan(24), () => {
      const light = caustics(entry, depth, lod).toVar();
      const exposed = smoothstep(0, 0.25, depth)
        .mul(smoothstep(12, 24, depth).oneMinus())
        .mul(smoothstep(0.02, 0.2, seaU.uSun.y))
        .mul(up)
        .mul(mix(1.35, 1, smoothstep(1.5, 3, depth)));
      focused.assign(max(mix(1, light, tuningEnabled ? exposed.mul(causticStrength) : exposed), 0));
    });
    const transmission = exp(vector('water.absorption', LOOK, 'absorption').mul(depth).mul(-0.35));
    // This multiplier stays in the lit albedo path, so the receiver's existing shadow term still occludes it.
    return vec4(transmission.mul(mix(1, 0.72, wet)).mul(focused), wet);
  })().toVar();
  const sandMask = sand ? float(sand.mask).clamp(0, 1) : float(0);
  const dampBand = sand
    ? (() => {
        const broad = vnoise(positionWorld.xz.mul(0.08));
        const high = float(sand.dampHeight).add(float(sand.dampWidth).mul(broad));
        const low = high.sub(max(sand.dampWidth, 0.05).mul(2));
        return smoothstep(low, high, y).oneMinus();
      })()
    : surface.a;
  const persistent = sand ? dampBand.mul(sand.dampStrength) : surface.a;
  const substrateWet = smoothstep(-0.05, 0, y).oneMinus();
  const damp = sand ? persistent.add(substrateWet.mul(sand.tideMarkStrength).mul(persistent.oneMinus())) : surface.a;
  patchNode(mat, 'colorNode', (previous: N) => {
    const base = previous ?? materialColor;
    const ordinary = base.mul(surface.rgb);
    if (!sand) return ordinary;
    // Water fills the pores, compounding pigment instead of a flat grey multiply: remove only the ordinary wet multiplier.
    const light = surface.rgb.div(mix(1, 0.72, surface.a));
    const poreTint = mix(base.mul(0.8).add(0.06), vec3(0.6), smoothstep(-0.8, 0, y).oneMinus());
    return mix(ordinary, base.mul(light).mul(mix(vec3(1), poreTint, damp)), sandMask);
  });
  // A wet film needs a continuous normal: giving the dry terrain's flat face normals a low roughness lit entire
  // triangles as white shards.
  const gloss = surface.a.mul(smoothstep(-0.05, 0.05, y));
  const filmNormal = TSL.transformNormalToView(TSL.normalLocal).toVarying().normalize();
  patchNode(mat, 'normalNode', (previous: N) => {
    const base = previous ?? TSL.normalViewGeometry;
    const ordinary = mix(base, filmNormal, gloss).normalize();
    // Cove sand already supplies continuous, rippled normals.
    return sand ? mix(ordinary, base, sandMask).normalize() : ordinary;
  });
  patchNode(mat, 'roughnessNode', (previous: N) => {
    const base = previous ?? materialRoughness;
    const ordinary = mix(base, 0.32, gloss);
    if (!sand) return ordinary;
    const sandWet = max(dampBand, substrateWet);
    const sandRoughness = mix(base, 0.32, sandWet.mul(smoothstep(-0.05, 0.05, y)).mul(sand.sheenStrength));
    return mix(ordinary, sandRoughness, sandMask);
  });
  const color = mat.colorNode,
    roughness = mat.roughnessNode,
    normal = mat.normalNode;
  restore.set(mat, {
    color: previousColor,
    undo() {
      if (mat.colorNode === color) mat.colorNode = previousColor;
      if (mat.roughnessNode === roughness) mat.roughnessNode = previousRoughness;
      if (mat.normalNode === normal) mat.normalNode = previousNormal;
      mat.needsUpdate = true;
    },
  });
}

export function registerWaterReceiver<T extends MeshStandardNodeMaterial>(mat: T, sand?: WetSandProfile): T {
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

export function installWaterReceivers(caustics: CausticSample) {
  current = caustics;
  for (const mat of materials) attach(mat, current);
  return () => {
    current = null;
    for (const entry of restore.values()) entry.undo();
    restore.clear();
  };
}
