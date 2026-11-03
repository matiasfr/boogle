// The foam texture, baked once on the CPU (Ultra Water's bakeTextures.js): tileable, mipmapped, RGBA8. R = lace pattern
// (coverage by erosion), G = whitewater billow height, BA = its gradient per tile (0.5 + d/duv / 64).
import * as THREE from 'three/webgpu';

const fract = (x: number) => x - Math.floor(x);
// David Hoskins, Hash without Sine.
function hash22(x: number, y: number, out: [number, number]) {
  let a = fract(x * 0.1031),
    b = fract(y * 0.103),
    c = fract(x * 0.0973);
  const d = a * b + b * c + c * a; // dot(p3, p3.yzx)
  const e = d + 33.33 * (a + b + c);
  a += e;
  b += e;
  c += e;
  out[0] = fract((a + b) * c);
  out[1] = fract((a + c) * b);
}

const o: [number, number] = [0, 0];
const v: [number, number] = [0, 0];
// Tileable voronoi: cell ids wrap at period. Writes the two nearest distances to v.
function voronoi(px: number, py: number, period: number) {
  const ix = Math.floor(px),
    iy = Math.floor(py),
    fx = px - ix,
    fy = py - iy;
  let f1 = 8,
    f2 = 8;
  for (let y = -1; y <= 1; y++)
    for (let x = -1; x <= 1; x++) {
      hash22(((ix + x) % period) + (ix + x < 0 ? period : 0), ((iy + y) % period) + (iy + y < 0 ? period : 0), o);
      const d = Math.hypot(x + o[0] - fx, y + o[1] - fy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  v[0] = f1;
  v[1] = f2;
}

const sat = (x: number) => Math.max(0, Math.min(1, x));
const sstep = (a: number, b: number, x: number) => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Cauliflower whitewater: every voronoi cell bulges, creased where cells meet, at three scales.
function billow(u: number, w: number) {
  voronoi(u * 7 + 0.3, w * 7 + 0.3, 7);
  const a = v[1] - v[0];
  voronoi(u * 17 + 0.7, w * 17 + 0.7, 17);
  const b = v[1] - v[0];
  voronoi(u * 41 + 0.1, w * 41 + 0.1, 41);
  const c = v[1] - v[0];
  return 0.5 * Math.sqrt(sat(a * 2.2)) + 0.32 * Math.sqrt(sat(b * 2.2)) + 0.18 * Math.sqrt(sat(c * 2.2));
}

export function bakeFoam(size = 512) {
  const data = new Uint8Array(size * size * 4),
    h = new Float32Array(size * size);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) h[j * size + i] = billow((i + 0.5) / size, (j + 0.5) / size);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const u = (i + 0.5) / size,
        w = (j + 0.5) / size;
      voronoi(u * 9, w * 9, 9);
      const a0 = v[0],
        a = v[1] - v[0];
      voronoi(u * 23 + 0.5, w * 23 + 0.5, 23);
      const b = v[1] - v[0];
      voronoi(u * 61, w * 61, 61);
      const lace = 1 - sstep(0, 0.22, a),
        fine = 1 - sstep(0, 0.16, b),
        bubbles = 1 - sstep(0.15, 0.55, v[0]);
      const pat = lace * 0.55 + fine * 0.3 + bubbles * 0.25 + (1 - a0) * 0.25;
      // The gradient, from the baked heights (the demo re-evaluates the billow at 1/1024 steps).
      const gx = ((h[j * size + ((i + 1) % size)]! - h[j * size + ((i + size - 1) % size)]!) * size) / 2,
        gy = ((h[((j + 1) % size) * size + i]! - h[((j + size - 1) % size) * size + i]!) * size) / 2;
      const k = (j * size + i) * 4;
      data[k] = Math.round(sat(pat * 0.85) * 255);
      data[k + 1] = Math.round(sat(h[j * size + i]!) * 255);
      data[k + 2] = Math.round(sat(0.5 + gx / 64) * 255);
      data[k + 3] = Math.round(sat(0.5 + gy / 64) * 255);
    }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
