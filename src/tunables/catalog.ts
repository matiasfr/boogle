// Discovery only. Runtime owners read direct fields, never this catalog in a frame loop.
import { TUNABLES } from '../sim/tune.ts';
import { EXPOSURE_SPEC } from '../render/exposure-tuning.ts';
import { FEEL_SPRING_SPEC } from '../player/feel-tuning.ts';
import { LIGHTING_SPECS } from '../render/lighting-tuning.ts';

import { validValue, type NumberSpec } from './spec.ts';
export { validValue, type NumberSpec };
/** Commands the dev tool and `npm run tune` both accept. */
export const TUNE_COMMANDS = ['list', 'get', 'validate', 'set', 'status', 'snapshot', 'diff', 'reset-local'] as const;
export const CATALOG: readonly NumberSpec[] = [
  ...TUNABLES.map((t) => ({
    id: `haul.${t.key}`,
    type: 'number' as const,
    scope: 'lockstep' as const,
    default: t.def,
    min: t.min,
    max: t.max,
    integer: true,
    units: t.label,
    at: t.key === 'yield' ? 'next accepted take' : 'existing rule boundary',
    owner: 'src/sim/tune.ts',
    meaning: t.label,
  })),
  EXPOSURE_SPEC,
  ...LIGHTING_SPECS,
  FEEL_SPRING_SPEC,
];
const byId = new Map(CATALOG.map((spec) => [spec.id, spec]));
export const tunableSpec = (id: unknown) => (typeof id === 'string' ? byId.get(id) : undefined);
