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
    const courses = (name: string, rays: ReturnType<typeof raysAlong>, levels: number[]) =>
      dressSlope(kit, name, rays, levels, { seatEnds: true });
    courses('east bank', raysAlong(-22, 138, -26, 177, 1, 0), [2, 7, 12, 17]);
    courses('path cutting', raysAlong(-17, 155, 6, 162, 0, 1), [9, 14, 19]);
    courses('west bank', raysAlong(-40, 144, -53, 177, -1, 0), [6, 11]);
    courses('west headland', raysAlong(-66, 180, -52, 180, 0, -1), [4, 9]);
    courses('east headland', raysAlong(-21, 182, 2, 182, 0, -1), [4, 9, 14]);
    courses('south coast', raysAlong(40, 179, 96, 185, 0, -1), [5]);
    for (const [x, z, yaw] of [[-52, 177, 0.6], [-25, 180, -0.4], [68, 193, 0.9]] as const)
      kit.place('terrain.shore-rock-m', [x, r2(H(x + ORIGIN.x, z) - 0.2), z], [yaw, 0, 0], 'waterline');
  },
};
