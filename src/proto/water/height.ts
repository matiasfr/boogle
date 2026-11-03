// The test island's shape, Ultra Water's islandHeight (scene/islandHeight.js) at about half its size, so the shelf and the
// surf have room: heights over sea level at island-local x, z. Its noise is scene/noise.js. Pure, for the bake and the mesh.
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

const S = 0.45; // the demo's island, in x and z
/** Ground height over sea level at island-local x, z: the coast at about 150 m, the shelf to about 300 m, then deep. */
export function islandHeight(lx: number, lz: number) {
  const x = lx / S,
    z = lz / S;
  const warp = fbm(x * 0.0035 + 11.3, z * 0.0035 - 4.1, 4, 3);
  const r = Math.hypot(x - 40 * warp, z + 30 * warp) * (1 + 0.32 * fbm(x * 0.003, z * 0.003, 3, 7));
  let h = 62 * Math.exp(-((r / 190) ** 2)) + 15 * Math.exp(-((r / 430) ** 2)) - 10;
  h -= 32 * smoothstep(380, 1100, r);
  if (h > 0 && h < 5) h *= 0.55 + 0.09 * h;
  else if (h <= 0 && h > -14) h = -14 * Math.pow(-h / 14, 1.8);
  h += 1.2 * fbm(x * 0.05, z * 0.05, 3, 9) * smoothstep(-30, 2, h);
  return h > 0 ? h * 0.55 : h; // a toy hill, on the demo's real depths
}

/** The surf rock: on the swell-exposed coast (the demo's -15° bearing), in about 2.5 m of water. */
export const ROCK = (() => {
  const a = (ULTRA.swellBearing * Math.PI) / 180;
  let r = 60;
  while (r < 500 && islandHeight(Math.cos(a) * r, Math.sin(a) * r) > -2.5) r += 1;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, r: 8.5 }; // the demo's radius: smaller, the bake's blur all but erases it
})();

export const rockObstacle = (x: number, z: number) => {
  const q = ((x - ROCK.x) ** 2 + (z - ROCK.z) ** 2) / (ROCK.r * ROCK.r);
  return q < 1 ? 4 * (1 - q) : -Infinity;
};
