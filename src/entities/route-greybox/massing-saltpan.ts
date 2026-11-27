import level from '../../../content/built/levels/saltpan.json' with { type: 'json' };
import { compiled } from '../../prefab/catalogue.ts';
import { leg2Extras, leg2Massing, leg2Placements } from './leg2-draw.ts';
import { coverNear, AREA_CENTRES } from './leg2-layout.ts';
import type { OwnedView } from '../../render/owned-view.ts';

export function coastalArea(
  id: 'saltpan' | 'quay' | 'wall-south' | 'wall-north' | 'notch' | 'original',
  value: unknown,
) {
  const centre = AREA_CENTRES[id];
  const boxes = leg2Massing(value);
  return {
    id,
    centre,
    near: coverNear(leg2Placements(value), compiled.prefabs, centre),
    build: () => boxes,
    baseExtras: (owner: OwnedView) => leg2Extras(owner, value),
  };
}
export const saltpanArea = {
  ...coastalArea('saltpan', level),
  extras: async (owner: OwnedView) => (await import('./cave-shore.ts')).saltShore(owner),
};
