// Real ground keeps its own colour, normals, shadows and cave masks. Only wetness and submerged light are layered on.
// Local; Ultra Water research recommendations 4/7. The terrain registers before the sea owns its shared resources.
import type { MeshStandardNodeMaterial } from 'three/webgpu';
import { patchNode } from '../material-patch.ts';
import { newWaterEnabled } from './flags.ts';
import { CAUSTIC_TEXELS_PER_M, type CausticSample } from './caustics.ts';
import { swashNodes, vnoise, type ShoreFields } from './shore-nodes.ts';
import { seaU } from './state.ts';
import { LOOK } from './tuning.ts';
import { TSL, type N } from './tsl.ts';

const { Fn, exp, fwidth, log2, materialColor, materialRoughness, max, min, mix } = TSL;
const { normalWorldGeometry, positionWorld, refract, smoothstep, vec3, vec4 } = TSL;
type Context = { field: ShoreFields; caustics: CausticSample };
const materials = new Set<MeshStandardNodeMaterial>();
let current: Context | null = null;
const restore = new Map<MeshStandardNodeMaterial, () => void>();

function attach(mat: MeshStandardNodeMaterial, { field, caustics }: Context) {
  if (restore.has(mat)) return;
  const previousColor = mat.colorNode,
    previousRoughness = mat.roughnessNode,
    previousNormal = mat.normalNode;
  const wash = Fn(() => swashNodes(positionWorld.xz, positionWorld.y, field))().toVar();
  const surface = Fn(() => {
    const p = positionWorld;
    const sh = field.shore(p.xz).toVar();
    const depth = max(p.y.negate(), 0).toVar();
    // Only exposed receivers: roof/deck tops are dry, and walls/undersides reject projected sunlight.
    const up = smoothstep(0.05, 0.65, normalWorldGeometry.y);
    const wet = max(smoothstep(-0.1, 0.18, p.y).oneMinus(), wash.z).mul(up);
    const sunRay = refract(seaU.uSun.negate(), vec3(0, 1, 0), 1 / 1.33);
    const entry = p.xz.add(sunRay.xz.div(min(sunRay.y, -0.05)).mul(depth));
    const fw = fwidth(entry).toVar();
    const lod = log2(max(max(fw.x, fw.y).mul(CAUSTIC_TEXELS_PER_M), 1));
    const light = caustics(entry, depth, lod).toVar();
    const exposed = smoothstep(0, 0.25, depth)
      .mul(smoothstep(12, 24, depth).oneMinus())
      .mul(smoothstep(0.02, 0.2, seaU.uSun.y))
      .mul(up)
      .mul(smoothstep(0.05, 1, field.surf(p.xz)))
      // The receiver IS the bed. A positive offset requirement erased light on matching triangles.
      .mul(smoothstep(-0.35, -0.05, p.y.sub(sh.x)))
      .mul(mix(1.35, 1, smoothstep(1.5, 3, depth)));
    const transmission = exp(
      vec3(...LOOK.absorption)
        .mul(depth)
        .mul(-0.35),
    );
    const focused = max(mix(1, light, exposed), 0);
    // This multiplier stays in the lit albedo path, so the receiver's existing shadow term still occludes it.
    return vec4(transmission.mul(mix(1, 0.72, wet)).mul(focused), wet);
  })().toVar();
  const lace = smoothstep(0.48, 0.72, vnoise(positionWorld.xz.mul(24).add(seaU.uTime.mul(0.3))));
  const foam = wash.y
    .mul(lace)
    .mul(smoothstep(-0.02, 0.04, positionWorld.y))
    .mul(0.7);
  patchNode(mat, 'colorNode', (previous: N) =>
    mix((previous ?? materialColor).mul(surface.rgb), vec3(0.65, 0.7, 0.68), foam),
  );
  // A wet film needs a continuous normal, as in the reference's smooth/rippled sand. Giving the dry terrain's
  // flat face normals a low roughness lit entire triangles as white shards, even with the ocean hidden.
  const gloss = surface.a.mul(smoothstep(-0.05, 0.05, positionWorld.y));
  const filmNormal = TSL.transformNormalToView(TSL.normalLocal).toVarying().normalize();
  patchNode(mat, 'normalNode', (previous: N) => mix(previous ?? TSL.normalViewGeometry, filmNormal, gloss).normalize());
  patchNode(mat, 'roughnessNode', (previous: N) => mix(previous ?? materialRoughness, 0.32, gloss));
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

export function registerWaterReceiver<T extends MeshStandardNodeMaterial>(mat: T): T {
  if (!newWaterEnabled) return mat;
  materials.add(mat);
  if (current) attach(mat, current);
  mat.addEventListener('dispose', () => {
    materials.delete(mat);
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
