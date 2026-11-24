// Canopy's static massing and extras are compiled level placements (src/content/levels/leg3.ts): the isle's beach and
// the bay row's bank, Canopy Town's platforms and deck, the Notch board, and the isle's, islets' and trunks' colliders
// (the horizon draws them). This view reads no progress.
import level from '../../../content/built/levels/canopy.json' with { type: 'json' };
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Massing, leg2Extras } from './leg2-draw.ts';
import { AREA_CENTRES, coverNear } from './leg2-layout.ts';
const placements = leg2Massing(level);
export const canopyMassing = () => placements;
export const canopyExtras = (owner: OwnedView) => leg2Extras(owner, level);
/** Canopy mounts far enough out to cover the whole isle and its beach, not the usual 400 m, so a swimmer reaches no
 * beach before its collider (dev/level/route-leg3.ts checks the same number). */
export const canopyNear = coverNear(placements, AREA_CENTRES.canopy);
/** Canopy isle's ground height at (x, z), or null off it: the leg view's bents and head 2's steps stand on it. */
export { isleGround as canopyGround } from '../../content/levels/leg3.ts';
