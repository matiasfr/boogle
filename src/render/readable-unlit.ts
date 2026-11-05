// Local display-range ink/rewards in the HDR scene. dark-unlit-exposure research, recommendations 1 and 3:
// a fixed reference avoids scene -> current meter -> scene feedback and needs no GPU readback.
import type { NodeMaterial } from 'three/webgpu';
import { materialColor, vec4 } from 'three/tsl';
import { newWaterEnabled } from '../proto/flags.ts';
import { patchNode } from './material-patch.ts';
import { bind, derived } from './water/live.ts';

let referenceGain = 0.09157925; // measured station calibration; reciprocal = 10.9195, not a universal exposure
bind(
  'readable.referenceGain',
  () => referenceGain,
  (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) referenceGain = Math.max(0.05, Math.min(1, value));
  },
);
/** CPU-fold into emitted RGB. Default particle intensity remains one (dust/smoke/foam/already-HDR stars). */
export const readableIntensity = () => (newWaterEnabled ? 1 / referenceGain : 1);
const intensity = derived(readableIntensity);

/** Owned unlit materials only; retain texture alpha, opacity, fog, depth and the underwater composite. */
export function readableUnlit<M extends NodeMaterial>(material: M): M {
  return patchNode(material, 'colorNode', (previous) => {
    const c = vec4(previous ?? materialColor);
    return vec4(c.rgb.mul(intensity), c.a);
  });
}
