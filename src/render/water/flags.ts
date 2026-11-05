// Route ownership and retained Local look experiments; water=old/new are no longer selectors.
import { newWaterEnabled } from '../../proto/flags.ts';

export { newWaterEnabled } from '../../proto/flags.ts';

const query = new URLSearchParams(location.search);

// Local look experiment; never affects classic home's shader graphs.
export const toySkyEnabled = newWaterEnabled && query.get('sky') === 'toy';
export const toyWaterEnabled = toySkyEnabled && query.get('toyWater') !== 'off';
export const toyNeutral = toySkyEnabled && query.get('toyTone') === 'neutral';
export const toyVariant =
  query.get('toyVariant') === 'soft' ? 'soft' : query.get('toyVariant') === 'punch' ? 'punch' : 'clear';
