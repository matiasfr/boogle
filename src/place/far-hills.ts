// Ring Island's far hills: land.ts's buildFar draws the island across the sea as four faceted cones, with no colliders
// and no cuttings. While the island's near view is mounted (src/entities/ring-island/index.ts) its own ground draws the
// same hills with the railway's cuttings carved in, on the heights the collider has, so the cones hide: left drawn they
// stood up to 24 m over the stack line's cutting as hillside across the track that nothing stopped you walking through
// (owner, 14 November 2026). Local scenery: no state, no sync.
import type { Object3D } from 'three/webgpu';

let hills: readonly Object3D[] = [],
  shown = true;

/** land.ts hands over the cones it built (an empty list when the land goes). */
export function setFarHills(meshes: readonly Object3D[]) {
  hills = meshes;
  for (const m of hills) m.visible = shown;
}
/** Shows or hides the cones, now and for any land built later. */
export function showFarHills(on: boolean) {
  shown = on;
  for (const m of hills) m.visible = on;
}
