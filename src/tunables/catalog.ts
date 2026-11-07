// Discovery only. Runtime owners read direct fields, never this catalog in a frame loop.
import { TUNABLES, type TuneKey } from '../sim/tune.ts';
import { EXPOSURE_SPEC } from '../render/exposure-tuning.ts';
import { FEEL_SPRING_SPEC } from '../player/feel-tuning.ts';
import { LIGHTING_SPECS, SKY_AUTHORING_SPECS } from '../render/lighting-tuning.ts';
import { VIEW_SPECS } from '../render/view-tuning.ts';
import { MATERIAL_PALETTE_SPECS } from '../render/material-palette-tuning.ts';
import { AUDIO_SPECS } from '../render/audio-tuning.ts';
import { COVE_SPECS } from './terrain.ts';
import { WOOD_SPECS } from './surfaces.ts';

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
    units: 'minutes',
    at: 'next accepted supply-maintenance pulse',
    meaning:
      'Wait after a source is depleted; earned progress stays. Trees then advance one growth stage per accepted minute outside track. Spent rocks re-form as counted stone production.',
  },
  railRecoveryMinutes: {
    id: 'railway.recoveryMinutes',
    units: 'minutes',
    at: 'next accepted supply-maintenance pulse',
    meaning:
      'Wait after a drop before rack recovery is eligible, only with nobody near. Earned progress stays; eligibility is checked on accepted whole-minute pulses.',
  },
  railFeedMs: {
    id: 'railway.feedMs',
    units: 'milliseconds',
    at: 'next funded station',
    meaning: 'Interval between accepted construction feed launches; funded jobs retain their captured schedule.',
  },
  railLaySpeed: {
    id: 'railway.laySpeed',
    units: 'centimetres per tick',
    at: 'next funded station',
    meaning: 'Cruise laying speed; funded jobs retain their captured schedule.',
  },
  railDepartureTicks: {
    id: 'railway.departureTicks',
    units: 'ticks',
    at: 'next funded station',
    meaning: 'Duration of the quadratic departure ease; funded jobs retain their captured schedule.',
  },
  railBeamSoloSpeed: {
    id: 'railway.beamSoloSpeed',
    units: 'centimetres per second',
    at: 'next owner movement update',
    meaning: 'Movement speed while carrying the unique beam alone; the shared room value drives Owner movement.',
  },
  railBeamHelpSpeed: {
    id: 'railway.beamHelpSpeed',
    units: 'centimetres per second',
    at: 'next owner movement update',
    meaning: 'Movement speed while another capable player helps the unique beam carrier; no second inventory claim.',
  },
  railJumpImpulse: {
    id: 'railway.jumpImpulse',
    units: 'centimetres per second',
    at: 'next owner jump',
    meaning: 'Upward impulse of the discovered second jump.',
  },
  railJumpTurn: {
    id: 'railway.jumpTurn',
    units: 'percent',
    at: 'next owner jump',
    meaning: 'Fraction of travel redirected toward player input on the second jump.',
  },
  railJumpSteer: {
    id: 'railway.jumpSteer',
    units: 'centimetres per second squared',
    at: 'next owner movement update',
    meaning: 'Air steering acceleration after the second jump.',
  },
  railJumpApexSpeed: {
    id: 'railway.jumpApexSpeed',
    units: 'centimetres per second',
    at: 'next owner movement update',
    meaning: 'Vertical-speed threshold for the second-jump apex presentation.',
  },
} as const;
/** Commands the dev tool and `npm run tune` both accept. */
export const TUNE_COMMANDS = ['list', 'get', 'validate', 'set', 'status', 'snapshot', 'diff', 'reset-local'] as const;
export const CATALOG: readonly NumberSpec[] = [
  ...TUNABLES.map((t) => {
    const railway = Object.hasOwn(supply, t.key) ? supply[t.key as keyof typeof supply] : null;
    return {
      id: railway?.id ?? `haul.${t.key}`,
      type: 'number' as const,
      scope: 'lockstep' as const,
      sharedKey: t.key,
      default: t.def,
      min: t.min,
      max: t.max,
      integer: true,
      units: railway?.units ?? t.label,
      at: railway ? railway.at : t.key === 'yield' ? 'next accepted take' : 'existing rule boundary',
      owner: railway
        ? railway.at === 'next accepted supply-maintenance pulse'
          ? 'src/sim/railway-supply.ts'
          : 'src/sim/railway-line.ts'
        : 'src/sim/tune.ts',
      ...(railway ? { ruleOwner: 'src/world/railway-server.ts' } : {}),
      meaning: railway?.meaning ?? t.label,
    };
  }),
  EXPOSURE_SPEC,
  ...LIGHTING_SPECS,
  ...VIEW_SPECS,
  ...MATERIAL_PALETTE_SPECS,
  ...SKY_AUTHORING_SPECS,
  ...AUDIO_SPECS,
  ...COVE_SPECS,
  ...WOOD_SPECS,
  FEEL_SPRING_SPEC,
];
const byId = new Map(CATALOG.map((spec) => [spec.id, spec]));
export const tunableSpec = (id: unknown) => (typeof id === 'string' ? byId.get(id) : undefined);
export const sharedTunableSpec = (key: unknown) =>
  CATALOG.find((spec) => spec.scope === 'lockstep' && spec.sharedKey === key);
export { validValue } from './spec.ts';
