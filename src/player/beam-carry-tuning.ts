// Pure Local presentation settings; metadata discovery never loads a renderer or a railway owner.
import type { NumberSpec } from '../tunables/catalog.ts';

export const BEAM_CARRY_PARAMETERS = {
  stiffness: { default: 520 / 12, min: 10, max: 100, units: '1/s²' },
  damping: { default: 95 / 12, min: 4, max: 30, units: '1/s' },
  maxLag: { default: 0.2, min: 0, max: 0.3, units: 'metres' },
  maxAngle: { default: 0.12, min: 0, max: 0.2, units: 'radians' },
  grip: { default: 1, min: 0, max: 1, units: 'blend' },
} as const;
export type BeamCarryKey = keyof typeof BEAM_CARRY_PARAMETERS;
export const beamCarry = Object.fromEntries(
  Object.entries(BEAM_CARRY_PARAMETERS).map(([key, spec]) => [key, spec.default]),
) as Record<BeamCarryKey, number>;
export const BEAM_CARRY_SPECS: readonly NumberSpec[] = Object.entries(BEAM_CARRY_PARAMETERS).map(([key, spec]) => ({
  ...spec,
  id: `beamCarry.${key}`,
  type: 'number',
  scope: 'local',
  integer: false,
  at: 'next presentation frame',
  owner: key === 'grip' ? 'src/player/buddy/life.ts' : 'src/entities/railway/beam-drag.ts',
}));
