// Local display-range ink/rewards in the HDR scene. Share the fixed surface gain, never scene metering.
import type { NodeMaterial } from 'three/webgpu';
import { materialColor, materialEmissive, vec3, vec4 } from 'three/tsl';
import { patchNode } from './material-patch.ts';
import { exposureSettings, surfaceExposure } from './exposure.ts';

/** CPU-fold into emitted RGB. Default particle intensity remains one (dust/smoke/foam/already-HDR stars). */
export const readableIntensity = () => 1 / exposureSettings.centre;
const compensated = new WeakSet<NodeMaterial>();

/** Owned unlit materials only; retain texture alpha, opacity, fog, depth and the underwater composite. */
export function readableUnlit<M extends NodeMaterial>(material: M): M {
  if (compensated.has(material)) return material;
  compensated.add(material);
  return patchNode(material, 'colorNode', (previous) => {
    const c = vec4(previous ?? materialColor);
    return vec4(c.rgb.div(surfaceExposure), c.a);
  });
}

/** Owned lit materials whose emissive is a display-range glow (devices, lamps, crystals, fires): divide only the
 * emission by the same surface gain, so it reads as authored while the albedo keeps taking scene light. Live
 * emissiveIntensity changes (flicker, fades) still apply. Not for fills that lift shaded faces. */
export function readableGlow<M extends NodeMaterial>(material: M): M {
  if (compensated.has(material)) return material;
  compensated.add(material);
  return patchNode(material, 'emissiveNode', (previous) => vec3(previous ?? materialEmissive).div(surfaceExposure));
}
