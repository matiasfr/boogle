import { SEA_FACE } from '../../src/content/prefabs/terrain.ts';
import { r2 } from '../../src/math.ts';
import { H } from '../../src/place/terrain.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { runAlong, type Area, type Kit } from './cliff-kit.ts';

type Section = readonly [toeX: number, toeZ: number, rimX: number, rimZ: number];
const height = (x: number, z: number) => H(ORIGIN.x + x, z);

// Follow level contours across the surveyed rock, from the toe to the rim.
function dressCut(kit: Kit, sections: Section[], levels: number[], side: 1 | -1, outset: number) {
  for (const top of levels) {
    let contour: [number, number][] = [];
    const lay = () => {
      if (contour.length < 2) return;
      const run = runAlong(contour);
      if (run.length < 4) return;
      const count = Math.round(run.length / 5.55);
      for (let i = 0; i < count; i++) {
        const a = run.at((run.length * i) / count),
          b = run.at((run.length * (i + 1)) / count);
        const span = Math.hypot(b.x - a.x, b.z - a.z);
        const nx = (side * (a.z - b.z)) / span,
          nz = (side * (b.x - a.x)) / span;
        const pos: [number, number, number] = [
          r2((a.x + b.x) / 2 + nx * outset),
          top - SEA_FACE,
          r2((a.z + b.z) / 2 + nz * outset),
        ];
        const rot: [number, number, number] = [r2(Math.atan2(nx, nz)), 0, 0];
        kit.place('terrain.sea-face-6', pos, rot, 'rock contour');
      }
    };
    for (let j = 1; j < sections.length; j++) {
      const a = sections[j - 1]!,
        b = sections[j]!;
      const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (let i = j === 1 ? 0 : 1; i <= steps; i++) {
        const p = a.map((v, k) => v + ((b[k]! - v) * i) / steps);
        const [x, z, rx, rz] = p as [number, number, number, number];
        // Seat the front near mid-height. Anchoring at the crown buries the face in the slope.
        const anchor = top - 2.8;
        if (height(x, z) > anchor || height(rx, rz) < anchor) {
          lay();
          contour = [];
          continue;
        }
        let lo = 0,
          hi = 1;
        for (let k = 0; k < 8; k++) {
          const m = (lo + hi) / 2;
          if (height(x + (rx - x) * m, z + (rz - z) * m) < anchor) lo = m;
          else hi = m;
        }
        contour.push([x + (rx - x) * hi, z + (rz - z) * hi]);
      }
    }
    lay();
  }
}

export const northRidge: Area = {
  id: 'north-ridge',
  walls: [[-40, -182]],
  stranded: { x: -42, z: -179, half: 48 },
  dress(kit) {
    dressCut(
      kit,
      [
        [-77, -174, -77, -177],
        [-65, -177, -65, -182],
        [-53, -181, -53, -188],
        [-48, -181, -48, -188],
        [-43, -179, -43, -187],
        [-36, -177, -36, -184],
        [-32, -175, -32, -185],
        [-24, -176, -24, -188],
        [-7, -183, -7, -188],
      ],
      [27, 30, 33, 36, 39, 42, 45, 47],
      1,
      1.35,
    );
  },
};

export const eastCutting: Area = {
  id: 'east-cutting',
  walls: [[190, -48]],
  stranded: { x: 145, z: -3, half: 65 },
  dress(kit) {
    dressCut(
      kit,
      [
        [188, -52, 186, -52],
        [191, -46, 187, -46],
        [194, -42, 186, -42],
        [196, -37, 188, -37],
        [198, -32, 191, -32],
        [198, -30, 192, -30],
      ],
      [9, 12, 15, 18, 21, 23],
      -1,
      1.15,
    );
  },
};
