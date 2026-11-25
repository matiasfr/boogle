import { SEA_FACE } from '../../src/content/prefabs/terrain.ts';
import { r2 } from '../../src/math.ts';
import { HEAD, ORIGIN } from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { kitPieceProblems, layCourses, runAlong, type Area } from './cliff-kit.ts';

// Trace each bench around the actual headland, including the cuts made for the railway.
function contour(top: number) {
  const points: [number, number][] = [];
  for (let degree = 0; degree <= 360; degree += 2) {
    const angle = degree * Math.PI / 180;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    let inner = 36, outer = 98;
    for (let step = 0; step < 12; step++) {
      const r = (inner + outer) / 2;
      if (H(ORIGIN.x + HEAD.x + dx * r, HEAD.z + dz * r) >= top - 2.8) inner = r;
      else outer = r;
    }
    points.push([HEAD.x + dx * outer, HEAD.z + dz * outer]);
  }
  return runAlong(points);
}

export const farHead: Area = {
  id: 'far-head',
  walls: [[455, -170]],
  stranded: { x: HEAD.x, z: HEAD.z, half: 88 },
  dress(kit) {
    for (const top of [1, 5, 9, 13, 17, 21, 24]) {
      layCourses(contour(top), -1, (prefab, at, yaw) => {
        const ground = (offset: number) =>
          H(ORIGIN.x + at.x + at.nx * offset, at.z + at.nz * offset);
        // Leave gentle ground, rail landings and the grassy crown bare.
        if (ground(-2) - ground(2) < 3 || ground(-4) < top - 1) return;
        const pos: [number, number, number] = [r2(at.x + at.nx), r2(top - SEA_FACE), r2(at.z + at.nz)];
        const rot: [number, number, number] = [r2(yaw), 0, 0];
        if (!kitPieceProblems({ id: 'head course', prefab, pos, rot }).length)
          kit.place(prefab, pos, rot, 'headland contour');
      });
    }
  },
};
