import { defineLevel } from '../../src/prefab/types.ts';

// Narrow beds on the two inward-facing chalk walls. The route view uses only the kit
// geometry. These are vertical face details, well above the halt and below either rim.
export const canopyCleft = defineLevel({
  place: 'canopy-cleft',
  placements: [
    {
      id: 'north-low',
      prefab: 'terrain.sea-face-10',
      pos: [-1032.54, 23, -372.1],
      rot: [0.87, 0, 0],
      scale: [1.7, 1.4, 0.12],
    },
    {
      id: 'north-high',
      prefab: 'terrain.sea-face-10',
      pos: [-1043.87, 33, -360.21],
      rot: [0.74, 0, 0],
      scale: [1.3, 1, 0.12],
    },
    {
      id: 'south-low',
      prefab: 'terrain.sea-face-10',
      pos: [-1027.52, 28, -234.29],
      rot: [2.86, 0, 0],
      scale: [0.82, 1.3, 0.12],
    },
  ],
});
