// The sea's own textures (docs/plans/water-sunshine.md, "Art it needs"), baked once on the CPU at load from
// tiled Worley noise. Original procedural art; nothing sampled, traced or derived from any game.
import * as THREE from 'three/webgpu';
import { smoothstep } from '../../math-pure.ts';

const fract = (x: number) => x - Math.floor(x);
// David Hoskins, Hash without Sine.
function hash22(x: number, y: number, out: number[]) {
  let a = fract(x * 0.1031),
    b = fract(y * 0.103),
    c = fract(x * 0.0973);
  const e = a * b + b * c + c * a + 33.33 * (a + b + c);
  a += e;
  b += e;
  c += e;
  out[0] = fract((a + b) * c);
  out[1] = fract((a + c) * b);
}
const o = [0, 0];
/** Tiled Worley: the nearest two feature distances (cell units) at (px, py), cells wrapping at `period`. */
function worley(px: number, py: number, period: number, seed: number) {
  const ix = Math.floor(px),
    iy = Math.floor(py);
  let f1 = 9,
    f2 = 9;
  for (let y = -1; y <= 1; y++)
    for (let x = -1; x <= 1; x++) {
      const cx = (((ix + x) % period) + period) % period,
        cy = (((iy + y) % period) + period) % period;
      hash22(cx + seed * 17.3, cy + seed * 31.7, o);
      const d = Math.hypot(ix + x + o[0]! - px, iy + y + o[1]! - py);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  return f2 - f1;
}
const sat = (x: number) => Math.max(0, Math.min(1, x));
// Tiled value noise for the slow blotch.
function vnoise(px: number, py: number, period: number) {
  const ix = Math.floor(px),
    iy = Math.floor(py),
    fx = px - ix,
    fy = py - iy;
  const h = (x: number, y: number) => {
    hash22((((x % period) + period) % period) + 101, (((y % period) + period) % period) + 7, o);
    return o[0]!;
  };
  const u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  return (h(ix, iy) * (1 - u) + h(ix + 1, iy) * u) * (1 - v) + (h(ix, iy + 1) * (1 - u) + h(ix + 1, iy + 1) * u) * v;
}

export const WAVE_SIZE = 128;
export type WaveArt = { cells: number; detail: number; line: number };
const WAVE_ART: WaveArt = { cells: 5, detail: 9, line: 2.2 };
/**
 * The wave cell, 128² RGBA8, tiling: R bright rounded cell borders (two octaves), G the same blurred for far levels,
 * B a low-frequency blotch for macro variation. Mipmapped by the GPU.
 */
export function bakeWaveCell(art: WaveArt = WAVE_ART) {
  const n = WAVE_SIZE;
  const lines = new Float32Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n,
        v = (j + 0.5) / n;
      // Border width in texels -> cell units at each octave.
      const a = 1 - smoothstep(0, (art.line * art.cells) / n, worley(u * art.cells, v * art.cells, art.cells, 1));
      const b =
        1 - smoothstep(0, (art.line * 0.8 * art.detail) / n, worley(u * art.detail, v * art.detail, art.detail, 2));
      lines[j * n + i] = sat(Math.max(a, b * 0.6));
    }
  const blur = new Float32Array(n * n);
  const R = 4;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let y = -R; y <= R; y++)
        for (let x = -R; x <= R; x++) s += lines[((j + y + n) % n) * n + ((i + x + n) % n)]!;
      blur[j * n + i] = s / ((2 * R + 1) * (2 * R + 1));
    }
  const data = new Uint8Array(n * n * 4);
  for (let k = 0; k < n * n; k++) {
    const i = k % n,
      j = Math.floor(k / n);
    data[k * 4] = Math.round(lines[k]! * 255);
    data[k * 4 + 1] = Math.round(sat(blur[k]! * 2) * 255);
    data[k * 4 + 2] = Math.round(vnoise((i / n) * 2, (j / n) * 2, 2) * 255);
    data[k * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export const CAUSTIC_SIZE = 256;
/** The seabed's caustic tile, 256² R8, tiling: a thin bright web from the same Worley noise at another scale. */
export function bakeCausticTile() {
  const n = CAUSTIC_SIZE,
    cells = 7;
  const data = new Uint8Array(n * n);
  let sum = 0;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const w = worley(((i + 0.5) / n) * cells, ((j + 0.5) / n) * cells, cells, 3);
      sum += data[j * n + i] = Math.round(Math.pow(1 - smoothstep(0, 0.22, w), 1.6) * 255);
    }
  const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return { texture: tex, mean: sum / (n * n * 255) };
}
