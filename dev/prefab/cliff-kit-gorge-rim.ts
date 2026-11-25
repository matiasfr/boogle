// The camp path's view of the gorge: the lookout bank (wall 6), the opposite bank
// below the climb and the high shoulder behind it (wall 0). Cross sections run
// from the river uphill, stopping at the tread for the bank below the climb.
import { ORIGIN } from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { r2 } from '../../src/math.ts';
import { pathAt } from '../../src/place/path-field.ts';
import { kitPieceProblems, layCourses, runAlong, type Area, type Kit } from './cliff-kit.ts';

type Point = [number, number];

function bank(kit: Kit, spine: Point[], uphill: 1 | -1, width: number, top: number, shoulder = false) {
  const axis = runAlong(spine);
  const rays = Array.from({ length: Math.floor(axis.length) + 1 }, (_, s) => {
    const { x, z } = axis.at(s);
    let reach = width;
    if (!shoulder && uphill === 1)
      for (let d = 0; d < width; d++) {
        if (pathAt(x + d, z).edge > 0) continue;
        reach = d;
        break;
      }
    return { x, z, reach };
  });
  for (let level = 2; level <= top; level += 3) {
    let contour: Point[] = [];
    function lay() {
      if (contour.length < 2) return;
      const run = runAlong(contour);
      layCourses(run, uphill, (prefab, c, yaw, s) => {
        // The six original canyon faces already cover the first 14 m above
        // their bench. Only add the high courses on that part of the shoulder.
        if (shoulder && c.z > -138 && c.z < -95 && level <= pathAt(c.x, c.z).height + 13) return;
        // Seat the back of the upper course in the bank. At a sheer cut the
        // face must stand proud of the contour for its bevels to show.
        const pos: [number, number, number] = [r2(c.x + c.nx * 1.2), level - 6, r2(c.z + c.nz * 1.2)];
        const rot: [number, number, number] = [r2(yaw), 0, 0];
        if (!kitPieceProblems({ id: 'rim', prefab, pos, rot }).length)
          kit.place(prefab, pos, rot, `tier ${level}, station ${s.toFixed(1)}`);
      });
    }
    for (const { x, z, reach } of rays) {
      let d = 0;
      while (d < reach && H(ORIGIN.x + x + d * uphill, z) < level) d += 0.25;
      const point: Point = [x + d * uphill, z];
      const last = contour.at(-1);
      if (d === 0 || d >= reach || (last && Math.hypot(point[0] - last[0], point[1] - last[1]) > 4)) {
        lay();
        contour = [];
      }
      if (d > 0 && d < reach) contour.push(point);
    }
    lay();
  }
}

export const gorgeRim: Area = {
  id: 'gorge-rim',
  walls: [
    [-94, -120],
    [-48, -108],
  ],
  stranded: { x: -66, z: -118, half: 67 },
  dress(kit) {
    const river: Point[] = [
      [-109, -156],
      [-91, -128],
      [-67, -98],
      [-46, -78],
    ];
    bank(kit, [...river.slice(0, 3), [-60, -92]], -1, 22, 18);
    bank(kit, river, 1, 26, 30);
    // Above the path's bench, from the camp bend past the existing canyon faces.
    bank(
      kit,
      [
        [-77, -159],
        [-61, -147],
        [-61, -121],
        [-41.5, -88],
        [-17, -65],
      ],
      1,
      26,
      30,
      true,
    );
  },
};
