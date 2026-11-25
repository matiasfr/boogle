// Canopy's map-outline prisms (greybox leg 3, step 6): the isle and the White Wall's two chalk islets made solid as the
// horizon draws them (entities/sickle-backdrop/view.ts: a flat top on the outline, walls down to -10). Each top is a fan
// from its ring's baked centroid (every ring is star-shaped about it: dev/level/route-leg3.ts checks), wound to face up; each
// wall a quad an edge. Collision only: the horizon draws them.
import { definePrefab } from '../../prefab/types.ts';
import { CANOPY_CENTRES, CANOPY_LANDS, CANOPY_TOPS, LAND_BASE, landPoints, type CanopyLand } from '../levels/leg3.ts';

import { landPrism } from '../../prefab/authoring.ts';

export const prefabs = [
  definePrefab({
    key: 'greybox.canopy-lands',
    visual: { none: true },
    colliders: (Object.keys(CANOPY_LANDS) as CanopyLand[]).map((id) =>
      landPrism(landPoints(id), CANOPY_TOPS[id], CANOPY_CENTRES[id][0], CANOPY_CENTRES[id][1], LAND_BASE),
    ),
    scope: 'place',
  }),
];
