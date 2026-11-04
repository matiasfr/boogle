// The game owns this renderer. The asset stage supplies its own to the same atmosphere implementation.
import { renderer } from '../scene.ts';
import { createWaterSkyFor } from './sky-core.ts';
import type { N } from './tsl.ts';

export type { SkyParams } from './sky-core.ts';
export const createWaterSky = (bakedArt?: (direction: N, sunColor: N) => N) => createWaterSkyFor(renderer, bakedArt);
