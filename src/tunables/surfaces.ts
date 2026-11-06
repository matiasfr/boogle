// Pure metadata for the shared surface families (src/render/wood.ts). No renderer or runtime state imports.
import type { NumberSpec } from './catalog.ts';

export const WOOD_PARAMETERS = {
  contrast: { default: 1, min: 0, max: 2, units: 'scale', meaning: 'Strength of the baked timber grain and knots.' },
  repeat: { default: 3, min: 1, max: 8, units: 'metres', meaning: 'Length of timber one grain tile covers.' },
} as const;
export type WoodTunableKey = keyof typeof WOOD_PARAMETERS;
export const WOOD_SPECS: readonly NumberSpec[] = Object.entries(WOOD_PARAMETERS).map(([key, spec]) => ({
  ...spec,
  id: `wood.${key}`,
  type: 'number',
  scope: 'local',
  integer: false,
  at: 'next presentation frame',
  owner: 'src/render/wood.ts',
}));
