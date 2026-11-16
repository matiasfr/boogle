// One kit in its building's frame. The view repeats it at each priced plot via townBuilding/townLocal.
import { defineLevel, type Placement } from '../../prefab/types.ts';
export const levels = [
  defineLevel({
    place: 'town-plot-stakes',
    placements: [
      { id: 'stakes', prefab: 'town.plot-stakes', pos: [0, 0, 0] },
      { id: 'string', prefab: 'town.plot-string', pos: [0, 0, 0] },
      // z is relative to the front wall, resolved with the plot's d/2 by the view.
      { id: 'board', prefab: 'town.plot-board', pos: [2.2, 0, 1.2], labels: { label: 'plot' } },
      ...Array.from({ length: 8 }, (_, i): Placement => ({
        id: `crate.${i}`,
        prefab: 'town.plot-crate',
        pos: [i % 2 ? -1.98 : -2.82, i < 4 ? 0.39 : 1.17, Math.floor(i / 2) % 2 ? 1.62 : 0.78],
        scale: [0.78, 0.78, 0.78],
      })),
    ],
  }),
];
