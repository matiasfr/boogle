// Local cove material settings. Live bindings share the existing dev tool and frozen look-development receipts.
import { scalar } from '../render/water/live.ts';
import { float } from 'three/tsl';
import { COVE_PARAMETERS, type CoveTunableKey } from '../tunables/terrain.ts';

export type { CoveTunableKey };
export const coveSettings = Object.fromEntries(
  Object.entries(COVE_PARAMETERS).map(([key, spec]) => [key, spec.default]),
) as Record<CoveTunableKey, number>;

/** Material construction calls this once per used control; live.ts caches each uniform by its full identifier. */
export function coveU(key: CoveTunableKey) {
  return float(scalar(`cove.${key}`, coveSettings, key));
}
