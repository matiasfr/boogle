// Local lighting calibration. Shared with readable-unlit material authoring; never sampled from scene colour.
import { scalar } from './water/live.ts';

import { EXPOSURE_SPEC } from './exposure-tuning.ts';

export const exposureSettings: { centre: number } = { centre: EXPOSURE_SPEC.default };
/** The fixed output gain. Readable unlit surfaces can divide linear RGB by it, preserving alpha and water attenuation. */
export const surfaceExposure = scalar('post.centre', exposureSettings, 'centre');
