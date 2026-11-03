// Ultra Water's unscaled islandHeight, including its mountain ridges: metres above sea level at island-local x,z.
// scene/islandHeight.js and scene/noise.js. One pure function for the bake, mesh and collider.
import { smoothstep } from '../../math.ts';
import { ULTRA } from './tuning.ts';

function hash2(x: number, z: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function valueNoise(x: number, z: number, seed: number) {
  const xi = Math.floor(x),
    zi = Math.floor(z);
  const xf = x - xi,
    zf = z - zi;
  const u = xf * xf * (3 - 2 * xf),
    v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, seed),
    b = hash2(xi + 1, zi, seed),
    c = hash2(xi, zi + 1, seed),
    d = hash2(xi + 1, zi + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export function fbm(x: number, z: number, octaves: number, seed: number) {
  let sum = 0,
    amp = 0.5,
    norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x, z, seed + i * 17);
    norm += amp;
    const nx = 1.6 * x - 1.2 * z;
    z = 1.2 * x + 1.6 * z;
    x = nx;
    amp *= 0.5;
  }
  return sum / norm;
}

function ridged(x: number, z: number) {
  let sum = 0,
    amp = 0.5,
    norm = 0;
  for (let i = 0; i < 5; i++) {
    const n = 1 - Math.abs(valueNoise(x, z, 1 + i * 31));
    sum += amp * n * n;
    norm += amp;
    const nx = 1.6 * x - 1.2 * z;
    z = 1.2 * x + 1.6 * z;
    x = nx;
    amp *= 0.5;
  }
  return sum / norm;
}
/** Ground height over sea level: coast around 330 m, shelf then deep seabed. */
export function islandHeight(x: number, z: number) {
  const warp = fbm(x * 0.0035 + 11.3, z * 0.0035 - 4.1, 4, 3);
  const r = Math.hypot(x - 40 * warp, z + 30 * warp) * (1 + 0.32 * fbm(x * 0.003, z * 0.003, 3, 7));
  let h = 62 * Math.exp(-((r / 190) ** 2)) + 15 * Math.exp(-((r / 430) ** 2)) - 10;
  h -= 32 * smoothstep(380, 1100, r);
  h += smoothstep(4, 40, h) * 26 * (ridged(x * 0.009, z * 0.009) - 0.45);
  if (h > 0 && h < 5) h *= 0.55 + 0.09 * h;
  else if (h <= 0 && h > -14) h = -14 * Math.pow(-h / 14, 1.8);
  h += 1.2 * fbm(x * 0.05, z * 0.05, 3, 9) * smoothstep(-30, 2, h);
  return h;
}

/** The surf rock: on the swell-exposed coast (the demo's -15° bearing), in about 2.5 m of water. */
export const ROCK = (() => {
  const a = (ULTRA.swellBearing * Math.PI) / 180;
  let r = 100;
  while (r < 900 && islandHeight(Math.cos(a) * r, Math.sin(a) * r) > -2.5) r += 1;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, r: 8.5 }; // the demo's radius: smaller, the bake's blur all but erases it
})();

export const rockObstacle = (x: number, z: number) => {
  const q = ((x - ROCK.x) ** 2 + (z - ROCK.z) ** 2) / (ROCK.r * ROCK.r);
  return q < 1 ? 4 * (1 - q) : -Infinity;
};
