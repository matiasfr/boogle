import { defineLevel, type Placement } from '../../src/prefab/types.ts';

// Runs follow the inward contours of the two chalk islets. The bottom of each face
// enters the isle at 12 m, and its battered back disappears into the islet wall.
const beds = [
  // centre x, z, outward yaw, width in ten-metre units, vertical scale
  [-1006.9, -406.1, 1.05, 2.65, 2.6],
  [-1018.2, -386.3, 0.98, 2.35, 3.3],
  [-1030.8, -370.6, 0.86, 2.05, 3.5],
  [-1042.6, -358.7, 0.74, 1.75, 3],
  [-1053, -351.7, 0.62, 1.15, 2.5],
  [-1065.4, -345.4, 0.42, 0.85, 1.9],
  [-1071.9, -341, 0.14, 1.1, 1.4],
  [-1075.4, -252.2, -2.04, 1.9, 2.5],
  [-1067.7, -264.2, -2.3, 1.35, 3],
  [-1060, -269, -3.05, 1.25, 3.4],
  [-1053.4, -263.9, 2.35, 1.1, 3.3],
  [-1047, -258.3, 2.01, 1.65, 2.9],
  [-1040.9, -246.4, 2.08, 1.55, 2.4],
  [-1034.5, -239.7, 2.67, 1.15, 1.9],
  [-1027, -236.6, 2.86, 1.05, 1.5],
] as const;
export const canopyCleft = defineLevel({
  place: 'canopy-cleft',
  placements: beds.map(([x, z, yaw, width, height], i): Placement => ({
    id: `cleft-bed-${i}`,
    prefab: 'terrain.chalk-bed',
    pos: [x, 11, z],
    rot: [yaw, 0, 0],
    scale: [width, height, 2.2],
  })),
});
