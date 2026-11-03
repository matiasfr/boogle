// Ultra Water's mobile profile, adapted to Boogle's 0.6..1 adaptive-res range.
// Local presentation only. Stored 4x MSAA, wave energy and the near-water grid stay the same.
import { TSL } from './tsl.ts';

const params = new URLSearchParams(location.search);
const requested = params.get('q');
// The demo's own split, owner's call: a coarse pointer starts on mobile, everything else on high, and `q=` overrides.
// Mobile is its 0.6 resolution, the part of its profile WebGPU can take: no 2× MSAA here, and it never had bloom on.
const mobile = requested === 'mobile' || (requested !== 'high' && matchMedia('(pointer: coarse)').matches);
// Not part of mobile: no clear saving measured. Diagnostics only (docs/research/water-demo-validation.md).
const full = (key: string) => params.get(key) !== 'cheap';

export const waterQuality = {
  name: mobile ? 'mobile' : 'high',
  resolution: params.get('waterScale') === '1' ? 1 : params.get('waterScale') === '0.6' || mobile ? 0.6 : 1,
  causticScale: full('waterCaustics') ? 1 : 0.5,
  // Uniform so a diagnostic capture can compare fine terrain work in the same run.
  fineTerrain: TSL.uniform(full('waterTerrain')),
};
