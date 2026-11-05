// Pure signed noise retained for the shore rock experiment.
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
