// Route ownership and retained Local look experiments; water=old/new are no longer selectors.
import { newWaterEnabled } from '../../proto/flags.ts';

export { newWaterEnabled } from '../../proto/flags.ts';

const query = new URLSearchParams(location.search);

export const eveningPreview = query.get('evening');
export const prepareEvening = eveningPreview === '1' || eveningPreview === 'preview';
const size = query.get('skySize');
export const skyCubeSize = size === '256' ? 256 : size === '512' ? 512 : 1024;

// Local look experiment; never affects classic home's shader graphs.
export const toySkyEnabled = newWaterEnabled && query.get('sky') === 'toy';
export const toyWaterEnabled = toySkyEnabled && query.get('toyWater') !== 'off';
export const toyNeutral = toySkyEnabled && query.get('toyTone') === 'neutral';
export const toyVariant =
  query.get('toyVariant') === 'soft' ? 'soft' : query.get('toyVariant') === 'punch' ? 'punch' : 'clear';
