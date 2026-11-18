// Where the POIs' records stand, in their sites' frames (src/island/stamps.ts), so a layout that moves a site moves
// them too. The lighthouse is not turned with its site: x and z are from the site's centre, y above its pad (PAD_Y,
// src/pois/lighthouse/site.ts). The mills are site.ts's MILLS, each `pos[1]` above the ground under it
// (src/pois/windmills/ stands them). test/prefab-trees.test.ts holds these to site.ts and the tower's record.
import { defineLevel } from '../../prefab/types.ts';

export const levels = [
  defineLevel({
    place: 'lighthouse',
    placements: [
      { id: 'lighthouse', prefab: 'poi.lighthouse', pos: [0, 0, 0] },
      // On the gallery deck: the plinth and tower, 0.3 + 18 m.
      { id: 'lighthouse/lantern', prefab: 'poi.lighthouse-lantern', pos: [0, 18.3, 0] },
    ],
  }),
  defineLevel({
    place: 'windmills',
    // Sunk 0.15 m so the plinth meets the knoll all round.
    placements: [
      { id: 'mill1', prefab: 'poi.windmill', pos: [-17, -0.15, 4] },
      { id: 'mill2', prefab: 'poi.windmill', pos: [1, -0.15, -11] },
      { id: 'mill3', prefab: 'poi.windmill', pos: [18, -0.15, 3] },
    ],
  }),
];
