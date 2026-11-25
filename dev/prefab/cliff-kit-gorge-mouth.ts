import { FACE_TOP, SEA_FACE } from '../../src/content/prefabs/terrain.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { r2 } from '../../src/math.ts';
import { censusWalls } from '../ground/cliff-walls.ts';
import { dressSlope, raysAlong } from './cliff-kit-slope.ts';
import { layCourses, runAlong, type Area } from './cliff-kit.ts';

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
    // At the west toe the rock rises almost vertically. One full-height canyon face can
    // replace that cut, with its crown below the lower of the two ends of the rim.
    const west = runAlong([[-47.9, 158], [-48.6, 159], [-50.2, 165], [-52.4, 175]]);
    layCourses(west, -1, (seaFace, c, yaw) => {
      const half = seaFace === 'terrain.sea-face-10' ? 4.8 : 2.8;
      let foot = Infinity, rim = Infinity;
      for (const across of [-half, 0, half]) {
        const x = c.x + across * c.nz, z = c.z - across * c.nx;
        if (!rock(x - c.nx, z - c.nz)) return;
        foot = Math.min(foot, H(ORIGIN.x + x, z));
        rim = Math.min(rim, H(ORIGIN.x + x - c.nx * 3, z - c.nz * 3));
      }
      const tall = rim - foot > 9;
      const face = tall ? (half > 3 ? 'terrain.face-10' : 'terrain.face-6') : seaFace;
      const base = Math.min(foot - 0.4, rim - (tall ? FACE_TOP : SEA_FACE) - 0.6);
      kit.place(face, [r2(c.x), r2(base), r2(c.z)], [r2(yaw), 0, 0], 'west rock cut');
    });
    courses('south coast, west outcrop', raysAlong(40, 179, 56, 182, 0, -1), [7.5]);
    courses('west outcrop crown', raysAlong(43, 180, 53, 182, 0, -1), [9]);
    courses('south coast, east outcrop', raysAlong(69, 184, 92, 184, 0, -1), [7]);
    courses('east outcrop crown', raysAlong(74, 184, 86, 184, 0, -1), [9]);
    for (const [x, z, yaw] of [[-53, 183, 0.6], [-26, 185, -0.4], [68, 190, 0.9]] as const)
      kit.place('terrain.shore-rock-m', [x, r2(H(x + ORIGIN.x, z) - 0.2), z], [yaw, 0, 0], 'waterline');
  },
};
