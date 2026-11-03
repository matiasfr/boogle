// Retained demo adapter; the shared field owns its entity and resources.
import { createSnow as createField } from '../../render/water/snow.ts';
import type { Ocean } from './surface.ts';
import { demoSky } from './sky.ts';
export const createSnow = (ocean: Ocean) => createField(ocean, demoSky);
