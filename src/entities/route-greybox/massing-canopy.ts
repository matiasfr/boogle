// Canopy's static massing and extras are compiled level placements (src/content/levels/leg3.ts): the isle's beach and
// the bay row's bank, Canopy Town's platforms and deck, the Notch board, and the isle's, islets' and trunks' colliders
// (the horizon draws them). This view reads no progress.
import level from '../../../content/built/levels/canopy.json' with { type: 'json' };
import { compiled as records } from '../../prefab/catalogue.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Massing, leg2Extras } from './leg2-draw.ts';
const placements = leg2Massing(level);
export const canopyMassing = () => placements;
export function canopyExtras(owner: OwnedView) {
  leg2Extras(owner, level);
}

/** Canopy isle's top (the `greybox.canopy-lands` prism's first collider: its top ring, then its foot's), for the leg
 * view's bents and head 2's steps: the ground height at (x, z), or null off the isle. */
const isle = (() => {
  const c = records.prefabs['greybox.canopy-lands']!.colliders[0]!;
  if (c.shape !== 'trimesh') throw new Error('massing-canopy: the isle is not a prism');
  const n = (c.vertices.length / 3 - 1) / 2,
    ring: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) ring.push({ x: c.vertices[3 * i]!, z: c.vertices[3 * i + 2]! });
  return { ring, top: c.vertices[1]! };
})();
export function canopyGround(x: number, z: number) {
  let inside = false;
  const { ring } = isle;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!,
      b = ring[j]!;
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside ? isle.top : null;
}
