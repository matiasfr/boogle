// Pure metadata for the flag-local cove material. No renderer, prototype or runtime state imports.
import type { NumberSpec } from './catalog.ts';

type Parameter = { default: number; min: number; max: number; units: string; meaning: string };
const parameter = (value: number, min: number, max: number, units: string, meaning: string): Parameter => ({
  default: value,
  min,
  max,
  units,
  meaning,
});
const pigment = (value: number, meaning: string) => parameter(value, 0, 1, 'linear RGB', meaning);

export const COVE_PARAMETERS = {
  strataStrength: parameter(0.18, 0, 1, 'blend', 'Strength of Sunshine-style height-driven sandstone strata.'),
  bandScale: parameter(1.45, 0.4, 5, 'metres', 'Vertical repeat distance of sandstone strata.'),
  bandWidth: parameter(0.12, 0.02, 0.4, 'period fraction', 'Width of a recessed sandstone band within its repeat.'),
  bandWarp: parameter(0.18, 0, 1, 'metres', 'Gentle spatial wandering of otherwise height-aligned strata.'),
  slopeThreshold: parameter(0.72, 0.5, 0.95, 'normal Y', 'Geometric upward-normal threshold selecting rock coverage.'),
  slopeBlend: parameter(0.12, 0.02, 0.3, 'normal Y', 'Soft transition width around the rock slope threshold.'),
  sandHeight: parameter(2.4, 0, 5, 'metres', 'Upper elevation of the broad beach-sand coverage rule.'),
  sandBlend: parameter(1.6, 0.1, 4, 'metres', 'Elevation width of the broad sand-to-turf transition.'),
  heightBlend: parameter(0.22, 0, 0.5, 'blend', 'Microheight influence within existing material coverage transitions.'),
  layerBlend: parameter(0.75, 0.1, 1, 'coverage fraction', 'Width of the microheight contest between surface layers.'),
  rockScale: parameter(6, 1, 12, 'metres', 'Island-aligned rock pigment repeat size.'),
  grassScale: parameter(4, 1, 12, 'metres', 'Top-down turf pigment repeat size.'),
  noiseScale: parameter(0.25, 0.05, 2, 'cycles/metre', 'Spatial frequency of broad procedural surface variation.'),
  pigmentStrength: parameter(0.35, 0, 1, 'blend', 'Repeating pigment influence relative to each surface base colour.'),
  detailStrength: parameter(0.08, 0, 0.4, 'blend', 'Small-scale dry surface detail strength.'),
  normalSmoothing: parameter(
    1,
    0,
    1,
    'blend',
    'Shading-normal continuity from faceted control to smooth sculpted form.',
  ),
  roughness: parameter(0.93, 0.5, 1, 'roughness', 'Dry terrain roughness before the existing wet receiver.'),
  lipWidth: parameter(0.15, 0.02, 0.6, 'coverage fraction', 'Width of the clean turf lip transition.'),
  lipShade: parameter(0.25, 0, 0.8, 'blend', 'Restrained soil tint immediately beneath the turf lip.'),
  rockR: pigment(0.62, 'Sandstone red channel.'),
  rockG: pigment(0.35, 'Sandstone green channel.'),
  rockB: pigment(0.12, 'Sandstone blue channel.'),
  grassR: pigment(0.19, 'Turf red channel.'),
  grassG: pigment(0.32, 'Turf green channel.'),
  grassB: pigment(0.04, 'Turf blue channel.'),
  sandR: pigment(0.72, 'Dry sand red channel.'),
  sandG: pigment(0.57, 'Dry sand green channel.'),
  sandB: pigment(0.32, 'Dry sand blue channel.'),
  pathR: pigment(0.74, 'Worn path red channel.'),
  pathG: pigment(0.45, 'Worn path green channel.'),
  pathB: pigment(0.19, 'Worn path blue channel.'),
  dampHeight: parameter(1.3, 0, 3, 'metres', 'Upper extent of the persistent damp beach band above mean water.'),
  dampWidth: parameter(0.5, 0.1, 2, 'metres', 'Softness of the persistent damp-to-dry sand transition.'),
  dampStrength: parameter(0.35, 0, 1, 'blend', 'Additional darkening of damp cove sand.'),
  tideMarkStrength: parameter(0.18, 0, 1, 'blend', 'Pigment contrast of the wet/dry tide-mark bands.'),
  rippleScale: parameter(1, 0.2, 4, 'scale', 'Scale multiplier for the demo-inspired sand ripples.'),
  rippleStrength: parameter(0.12, 0, 0.5, 'blend', 'Strength of the restrained sand ripple relief.'),
  filmTint: parameter(0.4, 0, 1, 'blend', 'Extra wet-sand tint under moving swash film.'),
  sheenStrength: parameter(1, 0, 1, 'blend', 'Thin-film sand sheen layered with the existing water receiver.'),
} satisfies Record<string, Parameter>;

export type CoveTunableKey = keyof typeof COVE_PARAMETERS;
export const COVE_SPECS: readonly NumberSpec[] = Object.entries(COVE_PARAMETERS).map(([key, spec]) => ({
  ...spec,
  id: `cove.${key}`,
  type: 'number',
  scope: 'local',
  integer: false,
  at: 'next presentation frame',
  owner: 'src/proto/place/cove-material.ts',
}));
