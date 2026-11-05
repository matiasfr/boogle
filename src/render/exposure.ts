// Local lighting calibration. Shared with readable-unlit material authoring; never sampled from scene colour.
import { TSL, type N } from './tone.ts';
import { scalar } from './water/live.ts';
import { newWaterEnabled } from './water/flags.ts';

export const exposureSettings = { centre: newWaterEnabled ? 0.12 : 1, underwaterEV: 1.22 };
export const surfaceExposure = scalar('post.centre', exposureSettings, 'centre');
const underwaterEV = scalar('post.underwaterEV', exposureSettings, 'underwaterEV');

/** color-vibrance-3's bounded post at widthEV=0: clamp(gain, centre, centre) is exactly centre.
 * Keep its signed wave-depth ramp, without constructing the meter or a scene-colour dependency.
 * Readable unlit surfaces can divide linear RGB by surfaceExposure, preserving alpha and water attenuation.
 */
export function fixedExposureGain(cameraDepth: N): N {
  return TSL.float(surfaceExposure).mul(TSL.exp2(TSL.smoothstep(0, 1.5, cameraDepth).mul(underwaterEV)));
}
