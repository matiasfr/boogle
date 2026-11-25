import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { r2 } from '../../src/math.ts';
import { censusWalls } from '../ground/cliff-walls.ts';
import { dressSlope, raysAlong } from './cliff-kit-slope.ts';
import type { Area } from './cliff-kit.ts';

export const gorgeMouth: Area = {
  id: 'gorge-mouth',
  walls: [[-22, 138], [64, 184], [-42, 152]],
  stranded: { x: 20, z: 158, half: 87 },
  dress(kit) {
    const { wallAt } = censusWalls();
    const rock = (x: number, z: number) => wallAt(x, z) !== undefined;
    const courses = (name: string, rays: ReturnType<typeof raysAlong>, levels: number[]) =>
      dressSlope(kit, name, rays, levels, { rock });
    courses('east bank', raysAlong(-22, 138, -26, 177, 1, 0), [2, 7, 12, 17]);
    courses('west bank', raysAlong(-40, 144, -53, 177, -1, 0), [6, 11]);
    courses('south coast, west outcrop', raysAlong(40, 179, 56, 182, 0, -1), [8, 10]);
    courses('south coast, east outcrop', raysAlong(69, 184, 92, 184, 0, -1), [7, 9.5]);
    for (const [x, z, yaw] of [[-53, 183, 0.6], [-26, 185, -0.4], [68, 190, 0.9]] as const)
      kit.place('terrain.shore-rock-m', [x, r2(H(x + ORIGIN.x, z) - 0.2), z], [yaw, 0, 0], 'waterline');
  },
};
