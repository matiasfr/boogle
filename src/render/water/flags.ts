// Temporary graduation gate. Shared without importing the sea's resource owner or terrain.
import { newWaterEnabled } from '../../proto/flags.ts';

export { newWaterEnabled } from '../../proto/flags.ts';

const query = new URLSearchParams(location.search);

// Local look experiment; never affects the retained demo or the flag-off shader graphs.
export const toySkyEnabled = newWaterEnabled && query.get('sky') === 'toy';
export const toyWaterEnabled = toySkyEnabled && query.get('toyWater') !== 'off';
export const toyNeutral = toySkyEnabled && query.get('toyTone') === 'neutral';
export const toyVariant =
  query.get('toyVariant') === 'soft' ? 'soft' : query.get('toyVariant') === 'punch' ? 'punch' : 'clear';
