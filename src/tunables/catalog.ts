// Discovery only. Runtime owners read direct fields, never this catalog in a frame loop.
import { TUNABLES, type TuneKey } from '../sim/tune.ts';
import { EXPOSURE_SPEC } from '../render/exposure-tuning.ts';
import { FEEL_SPRING_SPEC } from '../player/feel-tuning.ts';
import { LIGHTING_SPECS } from '../render/lighting-tuning.ts';

export type NumberSpec = {
  id: string;
  type: 'number';
  default: number;
  min: number;
  max: number;
  integer: boolean;
  units: string;
  at: string;
  owner: string;
  ruleOwner?: string;
  meaning?: string;
} & ({ scope: 'lockstep'; sharedKey: TuneKey } | { scope: 'local' | 'owner'; sharedKey?: never });
const supply = {
  railRegrowMinutes: {
    id: 'railway.regrowMinutes',
    meaning:
      'Wait after a source is depleted; earned progress stays. Later shoot, sapling, young and mature stages each need a separate accepted minute, outside finished track.',
  },
  railRecoveryMinutes: {
    id: 'railway.recoveryMinutes',
    meaning:
      'Wait after a drop before rack recovery is eligible, only with nobody near. Earned progress stays; eligibility is checked on accepted whole-minute pulses.',
  },
} as const;
/** Commands the dev tool and `npm run tune` both accept. */
export const TUNE_COMMANDS = ['list', 'get', 'validate', 'set', 'status', 'snapshot', 'diff', 'reset-local'] as const;
export const CATALOG: readonly NumberSpec[] = [
  ...TUNABLES.map((t) => {
    const railway = t.key === 'railRegrowMinutes' || t.key === 'railRecoveryMinutes' ? supply[t.key] : null;
    return {
      id: railway?.id ?? `haul.${t.key}`,
      type: 'number' as const,
      scope: 'lockstep' as const,
      sharedKey: t.key,
      default: t.def,
      min: t.min,
      max: t.max,
      integer: true,
      units: railway ? 'minutes' : t.label,
      at: railway
        ? 'next accepted supply-maintenance pulse'
        : t.key === 'yield'
          ? 'next accepted take'
          : 'existing rule boundary',
      owner: railway ? 'src/sim/railway-supply.ts' : 'src/sim/tune.ts',
      ...(railway ? { ruleOwner: 'src/world/rules/railway.ts' } : {}),
      meaning: railway?.meaning ?? t.label,
    };
  }),
  EXPOSURE_SPEC,
  ...LIGHTING_SPECS,
  FEEL_SPRING_SPEC,
];
const byId = new Map(CATALOG.map((spec) => [spec.id, spec]));
export const tunableSpec = (id: unknown) => (typeof id === 'string' ? byId.get(id) : undefined);
export const sharedTunableSpec = (key: unknown) =>
  CATALOG.find((spec) => spec.scope === 'lockstep' && spec.sharedKey === key);
export { validValue } from './spec.ts';
