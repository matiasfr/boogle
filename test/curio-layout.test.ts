// The curio shelf, the finders' bay, its trophy plinth and its missed boxes stay off every walk line at Home.
// Footprints are oriented boxes in each piece's own frame (+z its front, three.js yaw), measured against path
// centrelines sampled every 10 cm.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATHS, SHELF } from '../src/place/layout.ts';
import { SHORE_PATH } from '../src/place/shore-layout.ts';
import {
  BAY_BOXES,
  FINDERS_B,
  HALL,
  PLINTH_OUT,
  SHELF_B,
  SHELF_SIZE,
  bayBoxPoint,
  bayPoint,
  toAxis,
} from '../src/place/home-station.ts';

type XZ = { x: number; z: number };
/** Half the crate's width, with a little over: the box block is the boxes' centres grown by this. */
const BOX_HALF = 0.4;
/** The bay's frame is the shelf's (`curio-shelf.ts`): the same crown, a little shallower behind. */
const CROWN = { across: SHELF_SIZE.crown, front: SHELF_SIZE.front, back: SHELF_SIZE.back };

const lines = [...PATHS.map((p) => p.pts), SHORE_PATH].map((pts) => {
  const out: XZ[] = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k]!,
      b = pts[k + 1]!,
      n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 10);
    for (let i = 0; i <= n; i++) out.push({ x: a[0] + ((b[0] - a[0]) * i) / n, z: a[1] + ((b[1] - a[1]) * i) / n });
  }
  return out;
});
/** Distance from p to a box in a frame at `at`, turned by `yaw`: `across` either side, `front` ahead and `back` behind. */
function boxDistance(p: XZ, at: XZ, yaw: number, size: { across: number; front: number; back: number }) {
  const dx = p.x - at.x,
    dz = p.z - at.z,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const across = dx * c - dz * s,
    out = dx * s + dz * c;
  return Math.hypot(Math.max(0, Math.abs(across) - size.across), Math.max(0, out - size.front, -size.back - out));
}
const nearest = (at: XZ, yaw: number, size: { across: number; front: number; back: number }) =>
  Math.min(...lines.map((line) => Math.min(...line.map((p) => boxDistance(p, at, yaw, size)))));

test('the bay is at the Round’s spot beside the hall, the shelf beside it in its frame; boxes and plinth in its frame', () => {
  assert.deepEqual(SHELF, SHELF_B);
  const s = toAxis(SHELF_B),
    b = toAxis(FINDERS_B);
  // Side by side (owner, 14 November): one line across the axis, the shelf on the bay's far side from the hall.
  assert.ok(Math.abs(b.a - s.a) < 1e-9 && s.c > b.c && b.c > HALL.c + HALL.w / 2);
  assert.equal(FINDERS_B.yaw, SHELF_B.yaw);
  assert.ok(Math.hypot(FINDERS_B.x + 88.0, FINDERS_B.z - 21.37) < 0.01, 'the bay is at (-88.00, 21.37)');
  const plinth = bayPoint(0, PLINTH_OUT);
  assert.ok(Math.hypot(plinth.x + 94.17, plinth.z - 23.61) < 0.01, 'the plan put the plinth at (-94.17, 23.61)');
  // The shelf is on the bay's own front line, to its side, and the boxes stand between the bay and the plinth.
  const side = { x: Math.cos(FINDERS_B.yaw), z: -Math.sin(FINDERS_B.yaw) },
    toShelf = { x: SHELF_B.x - FINDERS_B.x, z: SHELF_B.z - FINDERS_B.z };
  assert.ok((side.x * toShelf.x + side.z * toShelf.z) / Math.hypot(toShelf.x, toShelf.z) > 0.999);
  for (let k = 0; k < 9; k++) {
    const p = bayBoxPoint(k),
      d = Math.hypot(p.x - FINDERS_B.x, p.z - FINDERS_B.z);
    assert.ok(d > 1.4 && d < PLINTH_OUT - 1, `box ${k} in front of the bay, short of the plinth`);
  }
});

test('every curio footprint is 2.5 m off each path centreline, the box block 3 m', () => {
  const pieces: [string, XZ, number, { across: number; front: number; back: number }][] = [
    ['shelf', SHELF, SHELF.yaw, CROWN],
    ['bay', FINDERS_B, FINDERS_B.yaw, CROWN],
    ['plinth', bayPoint(0, PLINTH_OUT), 0, { across: 0.75, front: 0.75, back: 0.75 }],
  ];
  for (const [label, at, yaw, size] of pieces) {
    const d = nearest(at, yaw, size);
    assert.ok(d >= 2.5, `${label}: ${d.toFixed(2)} m from a path centreline`);
  }
  const out = BAY_BOXES.out,
    across = BAY_BOXES.across;
  const block = {
    across: Math.max(...across.map(Math.abs)) + BOX_HALF,
    front: out[out.length - 1]! + BOX_HALF,
    back: -(out[0]! - BOX_HALF),
  };
  const d = nearest(FINDERS_B, FINDERS_B.yaw, block);
  assert.ok(d >= 3, `box block: ${d.toFixed(2)} m from a path centreline`);
});
