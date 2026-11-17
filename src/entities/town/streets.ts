import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { ORIGIN } from '../../place/layout.ts';
import { TOWN_CENTRE } from '../../place/town-plan.ts';
import level from '../../../content/built/levels/town-green-kerb.json' with { type: 'json' };

export function createTownStreets(owner: OwnedView) {
  for (const placement of loadLevelArtifact(level, definitions).placements) {
    const placed = { ...placement, pos: [ORIGIN.x + TOWN_CENTRE.x, 0, ORIGIN.z + TOWN_CENTRE.z] as const };
    instantiate(placed.prefab, placed, { owner }).setEnabled(true);
  }
}
