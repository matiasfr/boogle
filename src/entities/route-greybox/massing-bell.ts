// Bell's static massing and extras are compiled level placements (prefab-data step 7).
import level from '../../../content/built/levels/bell.json' with { type: 'json' };
import type { OwnedView } from '../../render/owned-view.ts';
import { leg2Massing, leg2Extras } from './leg2-draw.ts';
export const bellMassing = () => leg2Massing(level);
export function bellExtras(owner: OwnedView) {
  leg2Extras(owner, level);
}
