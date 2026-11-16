import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ORIGIN, PATHS, type Pt } from '../src/place/layout.ts';
import { SHORE_PATH } from '../src/place/shore-layout.ts';
import { surfaceHeight } from '../src/place/terrain.ts';
import { pathAt } from '../src/place/path-field.ts';

const ground = (x: number, z: number) => surfaceHeight(x + ORIGIN.x, z + ORIGIN.z);
function checkTread(pts: Pt[], half: number, tolerance: number) {
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k]!,
      b = pts[k + 1]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / length,
      uz = (b[1] - a[1]) / length;
    for (let s = 0; s <= length; s += 0.25) {
      const x = a[0] + ux * s,
        z = a[1] + uz * s,
        y = ground(x, z);
      for (let o = -half; o <= half; o += 0.25) {
        const px = x - uz * o,
          pz = z + ux * o;
        assert.ok(Math.abs(ground(px, pz) - y) <= tolerance, `cross slope at (${x}, ${z}), offset ${o}`);
        assert.ok(Math.abs(ground(px, pz) - pathAt(px, pz).height) < 0.6, `paint follows the bench at (${px}, ${pz})`);
      }
    }
  }
}

test('both quarry descents hold a four-metre bench through the cart skirt and bridge run-ins', () => {
  const q = PATHS[1]!;
  checkTread(q.pts.slice(4, q.bridgeAt + 1), 2, 0.12);
  checkTread(q.pts.slice(q.bridgeAt + 1, 13), 2, 0.12);
});

test('the quarry turn has a six-metre square level landing', () => {
  for (let x = -13; x <= -7; x += 0.25) for (let z = 147; z <= 153; z += 0.25) assert.equal(ground(x, z), 8);
});

test('the shore climb stays level across its full six-metre tread, including the fine-grid seam', () => {
  checkTread(SHORE_PATH.slice(1, 5), 3, 0.15);
});
