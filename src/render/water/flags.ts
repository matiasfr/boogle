// Temporary graduation gate. Shared without importing the sea's resource owner or terrain.
import { protoOn } from '../../proto/flags.ts';

export const newWaterEnabled = new URLSearchParams(location.search).get('water') === 'new' && !protoOn('water');

// Local look experiment; never affects the retained demo or the flag-off shader graphs.
const query = new URLSearchParams(location.search);
export const toySkyEnabled = newWaterEnabled && query.get('sky') === 'toy';
export const toyWaterEnabled = toySkyEnabled && query.get('toyWater') !== 'off';
export const toyNeutral = toySkyEnabled && query.get('toyTone') === 'neutral';
export const toyVariant =
  query.get('toyVariant') === 'soft' ? 'soft' : query.get('toyVariant') === 'punch' ? 'punch' : 'clear';
