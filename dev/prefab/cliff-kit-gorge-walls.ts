import { r2 } from '../../src/math.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { H } from '../../src/place/terrain.ts';
import { FACE_TOP, SEA_FACE } from '../../src/content/prefabs/terrain.ts';
import { kitPieceProblems, layCourses, runAlong, type Area, type Kit } from './cliff-kit.ts';

type Point = [number, number];

// Stations through census walls 2 and 3. Trace each tier on the actual cut
// between stations so the river bends and the sloping rims carry through.
function wall(kit: Kit, spine: Point[], uphill: 1 | -1) {
  const axis = runAlong(spine);
  const height = (x: number, z: number) => H(ORIGIN.x + x, z);
  for (const upper of [false, true]) {
    let contour: Point[] = [];
    function lay() {
      if (contour.length < 2) return;
      layCourses(runAlong(contour), uphill, (seaFace, c, yaw, station) => {
        const crest = height(c.x - c.nx * 4, c.z - c.nz * 4);
        const top = Math.min(upper ? Infinity : 14, crest - 0.55);
        const tall = !upper || top > 20;
        const prefab = tall ? (seaFace === 'terrain.sea-face-10' ? 'terrain.face-10' : 'terrain.face-6') : seaFace;
        const out = tall ? 1.7 : 0.65;
        const pos: [number, number, number] = [
          r2(c.x + c.nx * out),
          r2(top - (tall ? FACE_TOP : SEA_FACE)),
          r2(c.z + c.nz * out),
        ];
        const rot: [number, number, number] = [r2(yaw), 0, 0];
        if (!kitPieceProblems({ id: 'wall', prefab, pos, rot }).length)
          kit.place(prefab, pos, rot, `station ${station.toFixed(1)} at ${top.toFixed(1)} m`);
        // Across from the village the lip has a few exposed cap stones.
        if (upper && uphill === 1 && c.z > 0 && c.z < 85 && Math.floor(station / 10) % 3 === 0) {
          const x = r2(c.x - c.nx * 1.2),
            z = r2(c.z - c.nz * 1.2);
          const cap = {
            id: 'lip',
            prefab: 'terrain.rim-cap' as const,
            pos: [x, r2(height(x, z) - 0.95), z] as [number, number, number],
            rot,
          };
          if (!kitPieceProblems(cap).length) kit.place(cap.prefab, cap.pos, rot, 'village-facing rim');
        }
      });
    }
    for (let s = 0; s <= axis.length; s++) {
      const { x, z, nx, nz } = axis.at(s);
      const sample = (d: number) => height(x - nx * d * uphill, z - nz * d * uphill);
      const crest = sample(8);
      const top = Math.min(upper ? Infinity : 14, crest - 0.55);
      let d = -9;
      while (d < 8 && sample(d) < top) d += 0.2;
      const point: Point = [x - nx * d * uphill, z - nz * d * uphill];
      const last = contour.at(-1);
      const valid = d > -9 && d < 8 && top > (upper ? 15 : 3);
      if (!valid || (last && Math.hypot(point[0] - last[0], point[1] - last[1]) > 3)) {
        lay();
        contour = [];
      }
      if (valid) contour.push(point);
    }
    lay();
  }
}

export const gorgeWalls: Area = {
  id: 'gorge-walls',
  walls: [
    [30, -32],
    [-20, 34],
  ],
  stranded: { x: -4, z: -25, half: 184 },
  dress(kit) {
    wall(
      kit,
      [
        [81, -202],
        [71, -162],
        [55, -122],
        [37, -82],
        [30, -42],
        [28, -22],
        [20, 8],
        [15, 38],
        [0, 68],
        [-15, 98],
        [-17, 108],
        [-10, 128],
        [-5, 138],
        [5, 151],
      ],
      1,
    );
    wall(
      kit,
      [
        [-91, -95],
        [-67, -76],
        [-45, -56],
        [-25, -36],
        [-10, -16],
        [-6, -6],
        [-10, 14],
        [-22, 44],
        [-36, 74],
        [-44, 104],
        [-51, 138],
      ],
      -1,
    );
  },
};
