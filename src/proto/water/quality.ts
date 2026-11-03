// Ultra Water's coarse-pointer mobile selection, adapted to Boogle's 0.6..1 adaptive-res range.
// Local presentation only. Stored 4x MSAA, wave energy and the near-water grid stay the same.
import { TSL } from './tsl.ts';

const params = new URLSearchParams(location.search);
const requested = params.get('q');
const mobile = requested === 'mobile' || (requested !== 'high' && matchMedia('(pointer: coarse)').matches);
const full = (key: string) => params.get(key) === 'full' || (params.get(key) !== 'cheap' && !mobile);

export const waterQuality = {
  name: mobile ? 'mobile' : 'high',
  resolution: params.get('waterScale') === '1' ? 1 : params.get('waterScale') === '0.6' || mobile ? 0.6 : 1,
  causticScale: full('waterCaustics') ? 1 : 0.5,
  // Uniform so a diagnostic capture can compare fine terrain work in the same run.
  fineTerrain: TSL.uniform(full('waterTerrain')),
};
