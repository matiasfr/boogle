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
import { BEAM_CARRY_SPECS } from '../player/beam-carry-tuning.ts';

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
/** The glide numbers are read by the Owner glide step, not by a rule. */
const GLIDE_OWNER = 'src/entities/railway/glide-step.ts';
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
  railBeamGraceS: {
    id: 'railway.beamGraceS',
    units: 'seconds',
    at: 'next carrier absence',
    meaning:
      'How long the unique beam stays with a carrier who left (a hidden tab, a reload, a lost link) before it goes down where they last stood.',
  },
  railGlideSpeed: {
    id: 'railway.glideSpeed',
    units: 'centimetres per second',
    at: 'next owner glide step',
    meaning: 'Forward glide speed at full stick (BotW target 10 m/s).',
    owner: GLIDE_OWNER,
  },
  railGlideSink: {
    id: 'railway.glideSink',
    units: 'centimetres per second',
    at: 'next owner glide step',
    meaning: 'Downward speed under the open canopy, moving or not (BotW target 3.2 m/s).',
    owner: GLIDE_OWNER,
  },
  railGlideAccel: {
    id: 'railway.glideAccel',
    units: 'centimetres per second squared',
    at: 'next owner glide step',
    meaning: 'Glide acceleration from rest to full stick.',
    owner: GLIDE_OWNER,
  },
  railGlideBrake: {
    id: 'railway.glideBrake',
    units: 'centimetres per second squared',
    at: 'next owner glide step',
    meaning: 'Glide deceleration with the stick let go.',
    owner: GLIDE_OWNER,
  },
  railGlideOver: {
    id: 'railway.glideOver',
    units: 'centimetres per second squared',
    at: 'next owner glide step',
    meaning: 'How fast a glide entered above glide speed settles to it, with no boost.',
    owner: GLIDE_OWNER,
  },
  railGlideTurnTau: {
    id: 'railway.glideTurnTau',
    units: 'milliseconds',
    at: 'next owner glide step',
    meaning: 'Time constant of the glide heading toward the stick.',
    owner: GLIDE_OWNER,
  },
  railGlideTurnMax: {
    id: 'railway.glideTurnMax',
    units: 'degrees per second',
    at: 'next owner glide step',
    meaning: 'Most the glide heading turns in a second.',
    owner: GLIDE_OWNER,
  },
  railGlideDeploy: {
    id: 'railway.glideDeploy',
    units: 'milliseconds',
    at: 'next owner glide step',
    meaning: 'Time from the fall speed to the glide sink once the canopy holds you, with no overshoot.',
    owner: GLIDE_OWNER,
  },
  railBoilerSoloSpeed: {
    id: 'railway.boilerSoloSpeed',
    units: 'centimetres per second',
    at: 'next owner movement update',
    meaning: 'Movement speed while hauling the boiler on its rope alone; the shared room value drives Owner movement.',
  },
  railBoilerHelpSpeed: {
    id: 'railway.boilerHelpSpeed',
    units: 'centimetres per second',
    at: 'next owner movement update',
    meaning: "Movement speed while a friend's Help carry lifts the hauled boiler; no second inventory claim.",
  },
  railFootSoloSpeed: {
    id: 'railway.footSoloSpeed',
    units: 'centimetres per second',
    at: 'next owner movement update',
    meaning: 'Movement speed with a footing on your back alone; sprinting goes 1.3 times this.',
  },
  railFootHelpSpeed: {
    id: 'railway.footHelpSpeed',
    units: 'centimetres per second',
    at: 'next owner movement update',
    meaning: "Movement speed while a friend's Help carry lifts your footing (no sprint while helped).",
  },
  railTrainHeadPct: {
    id: 'railway.trainHeadPct',
    units: 'percent of an even split',
    at: 'next train departure from a line end',
    owner: 'src/sim/railway-trains.ts',
    meaning:
      "The headway hold: a train leaves a line's end no sooner than this share of the round trip split between its trains after the last one left it.",
  },
  railFarePct: {
    id: 'railway.farePct',
    units: 'percent of the stand-in fare',
    at: 'next rider stepping off a train',
    owner: 'src/sim/railway-queries-trade.ts',
    meaning: "Every route's fare, from 2 to board and 1 a 100 m; rounded down to whole Boogles.",
  },
  railRiderPct: {
    id: 'railway.riderPct',
    units: 'percent of the stand-in rate',
    at: 'next rule tick',
    owner: 'src/sim/railway-sys-trade.ts',
    meaning: 'Riders each town sends to its route halts, from 2 a minute a building each way.',
  },
  railPricePct: {
    id: 'railway.pricePct',
    units: 'percent of the stand-in prices',
    at: 'next buy (slice 5 R4; read by nothing yet)',
    owner: 'src/sim/railway-trade-layout.ts',
    meaning: "Every plot's price, from the stand-ins; R4's buy reads it.",
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
        ? 'owner' in railway
          ? railway.owner
          : railway.at === 'next accepted supply-maintenance pulse'
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
  ...BEAM_CARRY_SPECS,
  FEEL_SPRING_SPEC,
];
const byId = new Map(CATALOG.map((spec) => [spec.id, spec]));
export const tunableSpec = (id: unknown) => (typeof id === 'string' ? byId.get(id) : undefined);
export const sharedTunableSpec = (key: unknown) =>
  CATALOG.find((spec) => spec.scope === 'lockstep' && spec.sharedKey === key);
export { validValue } from './spec.ts';
