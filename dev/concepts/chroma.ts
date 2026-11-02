// Image cleanup for generated assets: chroma-key cutouts, trimming, seam checks. Pure functions on
// { width, height, data } RGBA images (the shape pngjs reads), so test/chroma.test.ts can run them on tiny buffers.
//
// The keying chain follows the popular sprite skills (vexjoy-agent's game-sprite-pipeline, creating-sprites, imagegen2):
// image models can't be trusted with real alpha, so we prompt for a flat key colour and remove it here.
//   1. Tight pass: every pixel within TIGHT (sum of |dR|+|dG|+|dB|) of the key goes transparent.
//   2. Loose pass: grow from those pixels into neighbours within LOOSE that still lean towards the key (anti-aliased
//      halo). A neighbour whose colour leans away from the key is subject and stops the fill.
//   3. Unmix the rim: an anti-aliased edge pixel is a blend of the subject colour just inside it and the background.
//      Fit that blend, then keep the subject colour and turn the background share into transparency, so a pink rim
//      on a red mushroom becomes a soft red edge. Pixels that don't fit a blend (dark outlines) are left alone.
//   4. Bleed: transparent pixels take the RGB of the nearest opaque one. Under linear filtering and mipmaps, three.js
//      samples RGB beneath alpha 0, and a black or magenta RGB there draws a dark or pink outline.

export type Img = { width: number; height: number; data: Uint8Array };

export const TIGHT = 30;
export const LOOSE = 90;

export function parseHex(hex: string | undefined): number[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const diff = (d: Uint8Array, i: number, k: ArrayLike<number>) =>
  Math.abs(d[i] - k[0]) + Math.abs(d[i + 1] - k[1]) + Math.abs(d[i + 2] - k[2]);

// How far a pixel leans towards the key: mean of the key's strong channels minus mean of its weak ones. For magenta,
// (R + B) / 2 - G; for green, G - (R + B) / 2. Pure key scores 255, neutral grey 0, the key's complement negative.
function leaner(key: number[]) {
  const hi = [0, 1, 2].filter((c) => key[c] >= 128);
  const lo = [0, 1, 2].filter((c) => key[c] < 128);
  const mean = (d: Uint8Array, i: number, cs: number[]) =>
    cs.length ? cs.reduce((s, c) => s + d[i + c], 0) / cs.length : 0;
  return (d: Uint8Array, i: number) => mean(d, i, hi) - mean(d, i, lo);
}

function neighbours(i: number, w: number, h: number, fn: (o: number) => void) {
  const x = i % w;
  const y = (i - x) / w;
  if (x > 0) fn(i - 1);
  if (x < w - 1) fn(i + 1);
  if (y > 0) fn(i - w);
  if (y < h - 1) fn(i + w);
}

// Rim depth of opaque pixels: 1 touches transparency, 2 touches rim 1, ... up to `depth`; 0 for the interior and for
// transparent pixels.
function rims(d: Uint8Array, w: number, h: number, depth: number) {
  const rim = new Uint8Array(w * h);
  let front: number[] = [];
  for (let p = 0; p < w * h; p++) if (!d[p * 4 + 3]) front.push(p);
  for (let k = 1; k <= depth && front.length; k++) {
    const next: number[] = [];
    for (const p of front) {
      neighbours(p, w, h, (o) => {
        if (d[o * 4 + 3] && !rim[o]) {
          rim[o] = k;
          next.push(o);
        }
      });
    }
    front = next;
  }
  return rim;
}

// Mean colour of the interior (rim 0, opaque) pixels within `r` of p: the subject colour a rim pixel was blended from.
function inside(d: Uint8Array, rim: Uint8Array, p: number, w: number, h: number, r = 3): number[] | null {
  const x0 = p % w;
  const y0 = (p - x0) / w;
  const sum = [0, 0, 0];
  let count = 0;
  for (let y = Math.max(0, y0 - r); y <= Math.min(h - 1, y0 + r); y++) {
    for (let x = Math.max(0, x0 - r); x <= Math.min(w - 1, x0 + r); x++) {
      const o = y * w + x;
      if (rim[o] || !d[o * 4 + 3]) continue;
      for (let c = 0; c < 3; c++) sum[c] += d[o * 4 + c];
      count++;
    }
  }
  return count ? sum.map((v) => v / count) : null;
}

// Fit pixel i as bg + a * (subject - bg): returns the subject share a (0..1) and how far the pixel is off that line.
function blend(d: Uint8Array, i: number, subject: number[], bg: number[]) {
  const u = subject.map((v, c) => v - bg[c]);
  const uu = u[0] * u[0] + u[1] * u[1] + u[2] * u[2];
  if (uu < 900) return null;
  const a = Math.min(1, Math.max(0, u.reduce((s, v, c) => s + v * (d[i + c] - bg[c]), 0) / uu));
  const off = [0, 1, 2].reduce((s, c) => s + Math.abs(d[i + c] - (bg[c] + a * u[c])), 0);
  return { a, off };
}

// Returns a new image with the key colour removed. Options: tight, loose, rim (how many pixels deep to unmix).
export function keyOut(
  img: Img,
  key: number[],
  { tight = TIGHT, loose = LOOSE, rim: depth = 2 }: { tight?: number; loose?: number; rim?: number } = {},
): Img {
  const { width: w, height: h } = img;
  const d = Uint8Array.from(img.data);
  const n = w * h;
  const lean = leaner(key);
  const queue: number[] = [];
  const bgSum = [0, 0, 0];
  for (let p = 0; p < n; p++) {
    if (diff(d, p * 4, key) <= tight) {
      for (let c = 0; c < 3; c++) bgSum[c] += d[p * 4 + c];
      d[p * 4 + 3] = 0;
      queue.push(p);
    }
  }
  // The background the model actually painted, which is rarely the exact key.
  const bg = queue.length ? bgSum.map((v) => v / queue.length) : key;
  for (let q = 0; q < queue.length; q++) {
    neighbours(queue[q], w, h, (p) => {
      const i = p * 4;
      if (d[i + 3] && diff(d, i, key) <= loose && lean(d, i) >= 80) {
        d[i + 3] = 0;
        queue.push(p);
      }
    });
  }
  const rim = rims(d, w, h, depth);
  const src = Uint8Array.from(d);
  for (let p = 0; p < n; p++) {
    if (!rim[p]) continue;
    const subject = inside(src, rim, p, w, h, depth + 1);
    if (!subject) continue;
    const fit = blend(src, p * 4, subject, bg);
    if (!fit || fit.a > 0.97 || fit.off > 60) continue;
    for (let c = 0; c < 3; c++) d[p * 4 + c] = Math.round(subject[c]);
    d[p * 4 + 3] = Math.round(src[p * 4 + 3] * fit.a);
  }
  return { width: w, height: h, data: bleed({ width: w, height: h, data: d }).data };
}

// Fill the RGB of fully transparent pixels from the nearest opaque pixel (breadth first), leaving alpha alone.
export function bleed(img: Img): Img {
  const { width: w, height: h } = img;
  const d = Uint8Array.from(img.data);
  const done = new Uint8Array(w * h);
  let queue: number[] = [];
  for (let p = 0; p < w * h; p++) {
    if (!d[p * 4 + 3]) continue;
    done[p] = 1;
    queue.push(p);
  }
  if (!queue.length) return { width: w, height: h, data: d };
  while (queue.length) {
    const next: number[] = [];
    for (const p of queue) {
      neighbours(p, w, h, (o) => {
        if (done[o]) return;
        done[o] = 1;
        d.set(d.subarray(p * 4, p * 4 + 3), o * 4);
        next.push(o);
      });
    }
    queue = next;
  }
  return { width: w, height: h, data: d };
}

// Checks after keying, from creating-sprites' check_transparency.py plus a subject count:
// - corners: how many of the four corners were the key colour before keying (fewer means the model drew a scene, a
//   floor or a fake checkerboard instead of the flat background).
// - transparent: share of pixels with alpha 0.
// - fringe: share of opaque pixels touching transparency that lean towards the key more than the subject inside them
//   (a coloured outline left by the background).
// - subjects: opaque blobs bigger than 0.5% of the image (more than one: the model drew variations or extra props).
export function check(raw: Img, cut: Img, key: number[]) {
  const { width: w, height: h } = cut;
  const d = cut.data;
  const n = w * h;
  const corners = [0, w - 1, n - w, n - 1].filter((p) => diff(raw.data, p * 4, key) <= LOOSE).length;
  let clear = 0;
  let edges = 0;
  let fringe = 0;
  const lean = leaner(key);
  const rim = rims(d, w, h, 2);
  for (let p = 0; p < n; p++) {
    if (!d[p * 4 + 3]) clear++;
    if (rim[p] !== 1) continue;
    edges++;
    const subject = inside(d, rim, p, w, h);
    if (subject && lean(d, p * 4) - lean(Uint8Array.from(subject), 0) > 40) fringe++;
  }
  const seen = new Uint8Array(n);
  let subjects = 0;
  for (let p = 0; p < n; p++) {
    if (seen[p] || !d[p * 4 + 3]) continue;
    let size = 0;
    const stack = [p];
    seen[p] = 1;
    for (let q = stack.pop(); q !== undefined; q = stack.pop()) {
      size++;
      neighbours(q, w, h, (o) => {
        if (!seen[o] && d[o * 4 + 3]) {
          seen[o] = 1;
          stack.push(o);
        }
      });
    }
    if (size > n * 0.005) subjects++;
  }
  return { corners, transparent: clear / n, fringe: edges ? fringe / edges : 0, subjects };
}

// Crop to the opaque pixels, then centre them on a square canvas with `pad` of the side as margin. anchor 'bottom' sits
// the subject on the bottom margin (props and billboards stand on the ground); 'center' centres it (icons).
export function trimSquare(
  img: Img,
  { pad = 0.04, anchor = 'center' }: { pad?: number; anchor?: 'center' | 'bottom' } = {},
): Img {
  const { width: w, height: h, data: d } = img;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!d[(y * w + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) return img;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const margin = Math.round(Math.max(cw, ch) * pad);
  const side = Math.max(cw, ch) + 2 * margin;
  const ox = Math.floor((side - cw) / 2);
  const oy = anchor === 'bottom' ? side - margin - ch : Math.floor((side - ch) / 2);
  const out = new Uint8Array(side * side * 4);
  for (let y = 0; y < ch; y++) {
    const from = ((y0 + y) * w + x0) * 4;
    out.set(d.subarray(from, from + cw * 4), ((oy + y) * side + ox) * 4);
  }
  return bleed({ width: side, height: side, data: out });
}

// How visible the wrap seam of a texture is: the mean colour step across the wrap edges (last column to first, last
// row to first) divided by the mean step between all neighbouring pixels inside. The first generated texture scored
// 2.4 with no visible line; well above 3 shows one when the texture repeats.
export function seamScore(img: Img): number {
  const { width: w, height: h, data: d } = img;
  const step = (a: number, b: number) => diff(d, a * 4, [d[b * 4], d[b * 4 + 1], d[b * 4 + 2]]);
  let seam = 0;
  let inner = 0;
  for (let y = 0; y < h; y++) {
    seam += step(y * w + w - 1, y * w);
    for (let x = 0; x < w - 1; x++) inner += step(y * w + x, y * w + x + 1) / (w - 1);
  }
  for (let x = 0; x < w; x++) {
    seam += step((h - 1) * w + x, x);
    for (let y = 0; y < h - 1; y++) inner += step(y * w + x, (y + 1) * w + x) / (h - 1);
  }
  return inner ? seam / inner : seam ? Infinity : 1;
}

// The texture repeated 2 x 2, to look at the seams.
export function tile2x2(img: Img): Img {
  const { width: w, height: h, data: d } = img;
  const out = new Uint8Array(w * h * 16);
  for (let y = 0; y < h * 2; y++) {
    for (let k = 0; k < 2; k++) out.set(d.subarray((y % h) * w * 4, ((y % h) + 1) * w * 4), (y * w * 2 + k * w) * 4);
  }
  return { width: w * 2, height: h * 2, data: out };
}
