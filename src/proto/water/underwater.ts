// Retained demo adapter: shared HDR optics, then the demo's own output treatment.
import { pipeline } from '../../render/scene.ts';
import { createUnderwater as createVolume } from '../../render/water/underwater.ts';
import type { Ocean } from './surface.ts';
import { demoSky } from './sky.ts';
export function createUnderwater(ocean: Ocean) {
  const volume = createVolume(ocean, demoSky);
  pipeline.outputNode = volume.outputNode;
  pipeline.needsUpdate = true;
  return volume;
}
