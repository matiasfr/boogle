// The retained demo uses the production splat renderer with its diagnostic resolution override.
import { createCaustics as create, CAUSTIC_TEXELS_PER_M as texels } from '../../render/water/caustics.ts';
import { waterQuality } from './quality.ts';
import type { N } from './tsl.ts';
export type { CausticSample } from '../../render/water/caustics.ts';
export const CAUSTIC_TEXELS_PER_M = texels * waterQuality.causticScale;
export const createCaustics = (slope: N, layer: number, resolution: number) =>
  create(slope, layer, resolution, waterQuality.causticScale);
