// West's static massing and extras are compiled level placements (prefab-data step 7).
import level from '../../../content/built/levels/west.json' with { type: 'json' };
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Massing, leg2Extras } from './leg2-draw.ts';
const placements = leg2Massing(level);
export const westMassing = () => placements;
export function westExtras(owner: OwnedView) {
  leg2Extras(owner, level);
}
