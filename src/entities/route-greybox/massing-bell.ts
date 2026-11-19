// Bell's static massing and extras are compiled level placements (prefab-data step 7).
import level from '../../../content/built/levels/bell.json' with { type: 'json' };
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Massing, leg2Extras, leg2Pads } from './leg2-draw.ts';
const placements = leg2Massing(level);
export const bellMassing = () => placements;
/** Bell Rock's five stall pads (ruling 2), for the boxes that rise on them (./leg-view.ts). */
export const bellPads = leg2Pads(level);
export function bellExtras(owner: OwnedView) {
  leg2Extras(owner, level);
}
