// The game owns this renderer. The asset stage supplies its own to the same atmosphere implementation.
import { renderer } from '../scene.ts';
import { createWaterSkyFor, type SkyArt, type SkyCubeSize, type SunStyle } from './sky-core.ts';

export type { SkyParams } from './sky-core.ts';
export const createWaterSky = (bakedArt?: SkyArt, cubeSize?: SkyCubeSize, sunStyle?: SunStyle) =>
  createWaterSkyFor(renderer, bakedArt, cubeSize, sunStyle);
