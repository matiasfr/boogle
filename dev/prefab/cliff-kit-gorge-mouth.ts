import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { r2 } from '../../src/math.ts';
import { dressSlope, raysAlong } from './cliff-kit-slope.ts';
import type { Area } from './cliff-kit.ts';

export const gorgeMouth: Area = {
  id: 'gorge-mouth',
  walls: [[-22, 138], [64, 184], [-42, 152]],
  stranded: { x: 20, z: 158, half: 87 },
  dress(kit) {
    dressSlope(kit, 'east bank', raysAlong(-22, 138, -26, 177, 1, 0), [2, 7, 12, 17]);
    dressSlope(kit, 'path cutting', raysAlong(-17, 155, 6, 162, 0, 1), [9, 14, 19]);
    dressSlope(kit, 'west bank', raysAlong(-40, 144, -53, 177, -1, 0), [1, 6, 11, 15]);
    dressSlope(kit, 'south coast', raysAlong(40, 179, 96, 185, 0, -1), [5, 10]);
    for (const [x, z, yaw] of [[-52, 177, 0.6], [-25, 180, -0.4], [68, 193, 0.9]] as const)
      kit.place('terrain.shore-rock-m', [x, r2(H(x + ORIGIN.x, z) - 0.2), z], [yaw, 0, 0], 'waterline');
  },
};
