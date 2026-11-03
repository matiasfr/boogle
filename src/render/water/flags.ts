// Temporary graduation gate. Shared without importing the sea's resource owner or terrain.
import { protoOn } from '../../proto/flags.ts';

export const newWaterEnabled = new URLSearchParams(location.search).get('water') === 'new' && !protoOn('water');
