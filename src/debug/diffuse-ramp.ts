// Dev-only material experiment. No scene, frame loop, post pass or production import.
import { MeshStandardNodeMaterial, type Material, type PhysicalLightingModel } from 'three/webgpu';
import { normalView, vec3, smoothstep, mix } from 'three/tsl';

export type Ramp = 'soft' | 'strong';
function lighting(model: PhysicalLightingModel, mode: Ramp) {
  const direct = model.direct;
  model.direct = (input, builder) => {
    // Let Three build its unchanged BRDF/specular path, but collect this light's diffuse separately.
    const diffuse = vec3(0).toVar();
    direct.call(model, { ...input, reflectedLight: { ...input.reflectedLight, directDiffuse: diffuse } }, builder);
    const n = normalView.dot(input.lightDirection as ReturnType<typeof vec3>).clamp();
    const ramp = mode === 'soft' ? mix(0.12, 1, smoothstep(0.18, 0.78, n)) : mix(0.08, 1, smoothstep(0.49, 0.51, n));
    // A short terminator fade avoids lighting backfaces. Shadow attenuation remains in lightColor.
    const response = ramp.mul(smoothstep(0, 0.08, n));
    (input.reflectedLight.directDiffuse as ReturnType<typeof vec3>).addAssign(
      diffuse.mul(response.div(n.max(0.00001))),
    );
  };
  return model;
}
// Distinct material types give the node builder separate cache identities without cache-key overrides.
class SoftRampMaterial extends MeshStandardNodeMaterial {
  static override get type() {
    return 'BuddySoftRampMaterial';
  }
  override setupLightingModel() {
    return lighting(super.setupLightingModel(), 'soft');
  }
}
class StrongRampMaterial extends MeshStandardNodeMaterial {
  static override get type() {
    return 'BuddyStrongRampMaterial';
  }
  override setupLightingModel() {
    return lighting(super.setupLightingModel(), 'strong');
  }
}
export function rampMaterial(original: Material, mode: Ramp): Material {
  if (!(original instanceof MeshStandardNodeMaterial)) throw new Error('Ramp needs an owned Standard node material');
  const result = (mode === 'soft' ? new SoftRampMaterial() : new StrongRampMaterial()).copy(original);
  // You-editor paints the rig's original clone. Both views must track that same paint, never stale cached colours.
  result.color = original.color;
  result.emissive = original.emissive;
  return result;
}
