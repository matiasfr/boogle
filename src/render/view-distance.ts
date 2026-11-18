// Distance as the eye sees it (docs/plans/world-streaming.md, design): a distance from the camera scaled by its field of
// view against the default 62° (src/render/scene.ts), so a narrower view (the lookout telescope's zoom) counts what it
// looks at as nearer and draws it at the detail its size on screen asks for. At 62° it is the plain distance. Local
// rendering only: nothing here reaches a rule, a replica or the sim.
import { camera } from './scene.ts';

const DEFAULT_HALF_TAN = Math.tan((31 * Math.PI) / 180);

/** The camera's field-of-view factor: tan(fov / 2) / tan(31°), 1 at the default view and under 1 when zoomed in. */
export const viewScale = () => Math.tan((camera.fov * Math.PI) / 360) / DEFAULT_HALF_TAN;

/** The horizontal camera distance to (`x`, `z`), scaled by `viewScale()`. */
export const viewDistance = (x: number, z: number) =>
  Math.hypot(camera.position.x - x, camera.position.z - z) * viewScale();
