import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHex, keyOut, bleed, check, trimSquare, seamScore, tile2x2 } from '../dev/concepts/chroma.ts';
import type { Img } from '../dev/concepts/chroma.ts';

const MAGENTA = [255, 0, 255];

// A w x h image filled with `bg`, with `paint(x, y)` returning a colour (or null) per pixel.
function image(w: number, h: number, bg: number[], paint: (x: number, y: number) => number[] | null = () => null): Img {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data.set([...(paint(x, y) || bg), 255], (y * w + x) * 4);
  }
  return { width: w, height: h, data };
}
const px = (img: Img, x: number, y: number) =>
  Array.from(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

test('chroma: parses key colours', () => {
  assert.deepEqual(parseHex('#ff00ff'), MAGENTA);
  assert.deepEqual(parseHex('00FF00'), [0, 255, 0]);
  assert.throws(() => parseHex('magenta'));
});

test('chroma: keys out the background and its halo, keeps the subject, bleeds its colour outward', () => {
  // A 3 x 3 white square at (3..5, 3..5) on magenta, with a pink anti-aliased ring around it.
  const img = image(9, 9, MAGENTA, (x, y) => {
    const inner = x >= 3 && x <= 5 && y >= 3 && y <= 5;
    const ring = x >= 2 && x <= 6 && y >= 2 && y <= 6;
    return inner ? [255, 255, 255] : ring ? [255, 200, 255] : null;
  });
  const cut = keyOut(img, MAGENTA);
  assert.equal(px(cut, 0, 0)[3], 0);
  assert.equal(px(cut, 4, 4)[3], 255);
  // The pink ring leans only slightly towards magenta, so it survives the loose pass but loses its tint.
  const ring = px(cut, 2, 4);
  assert.ok(ring[3] > 0 && ring[3] < 255);
  assert.ok(ring[0] - ring[1] < 55 && ring[2] - ring[1] < 55);
  // Transparent pixels carry the nearest opaque colour, not magenta.
  assert.notDeepEqual(px(cut, 0, 0).slice(0, 3), MAGENTA);
  const c = check(img, cut, MAGENTA);
  assert.equal(c.corners, 4);
  assert.equal(c.subjects, 1);
  assert.ok(c.transparent > 0.6);
});

test('chroma: a strong halo next to the key goes, a magenta-free subject colour stays', () => {
  const img = image(5, 1, MAGENTA, (x) => (x === 1 ? [240, 30, 220] : x === 2 ? [40, 160, 60] : null));
  const cut = keyOut(img, MAGENTA);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((x) => px(cut, x, 0)[3]),
    [0, 0, 255, 0, 0],
  );
});

test('chroma: a scene background is reported, not keyed', () => {
  const img = image(6, 6, [120, 180, 90]);
  const cut = keyOut(img, MAGENTA);
  const c = check(img, cut, MAGENTA);
  assert.equal(c.corners, 0);
  assert.equal(c.transparent, 0);
});

test('chroma: counts separate subjects', () => {
  const img = image(20, 10, MAGENTA, (x, y) => (y > 2 && y < 7 && (x < 5 || x > 14) ? [20, 20, 200] : null));
  const c = check(img, keyOut(img, MAGENTA), MAGENTA);
  assert.equal(c.subjects, 2);
});

test('chroma: bleed leaves alpha alone and fills from the nearest opaque pixel', () => {
  const img = { width: 3, height: 1, data: new Uint8Array([10, 20, 30, 255, 0, 0, 0, 0, 0, 0, 0, 0]) };
  const out = bleed(img);
  assert.deepEqual(Array.from(out.data), [10, 20, 30, 255, 10, 20, 30, 0, 10, 20, 30, 0]);
});

test('chroma: trimSquare crops to the subject and anchors it', () => {
  const cut = keyOut(
    image(12, 8, MAGENTA, (x, y) => (x >= 2 && x < 6 && y >= 1 && y < 3 ? [0, 0, 0] : null)),
    MAGENTA,
  );
  const sq = trimSquare(cut, { pad: 0, anchor: 'bottom' });
  assert.equal(sq.width, 4);
  assert.equal(sq.height, 4);
  assert.equal(px(sq, 0, 0)[3], 0);
  assert.equal(px(sq, 0, 3)[3], 255);
  assert.equal(px(trimSquare(cut, { pad: 0 }), 0, 1)[3], 255);
});

test('chroma: seam score is about 1 for a wrapping texture and high for one with a hard edge', () => {
  const wraps = image(16, 16, [0, 0, 0], (x, y) => {
    const v = Math.round(127 + 100 * Math.sin((2 * Math.PI * x) / 16) * Math.cos((2 * Math.PI * y) / 16));
    return [v, v, v];
  });
  assert.ok(seamScore(wraps) < 1.5);
  const ramp = image(16, 16, [0, 0, 0], (x, y) => [x * 16, y * 16, 0]);
  assert.ok(seamScore(ramp) > 5);
  const big = tile2x2(ramp);
  assert.equal(big.width, 32);
  assert.deepEqual(px(big, 17, 18), px(ramp, 1, 2));
});
