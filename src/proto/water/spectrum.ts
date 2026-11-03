// The ocean's spectrum and its filtered slopes, Ultra Water's OceanSim.js on the CPU: JONSWAP wind sea plus swell with
// cos-2s spreading, split between cascades by wavenumber so they don't count the same energy twice. Stage 1 bakes one frozen
// instant of each cascade into tiles of slope moments (sx, sz, sx², sz²): their mips give mean and second moment, so
// variance survives filtering and turns into roughness (LEAN style) instead of aliasing. Stage 2 evolves the same H0.
import * as THREE from 'three/webgpu';
import { mulberry32 } from '../../sim/rng.ts';

export const N = 256;
export const CASCADE_LENGTHS = [600, 85, 12, 2.1];
const G = 9.81,
  ST = 7.4e-5; // surface tension / density: w² = gk + (s/r)k³

// OceanSim.js defaultOceanParams.
export const OCEAN = {
  windSpeed: 9,
  windDirection: 20,
  fetchKm: 120,
  spreadBlend: 0.85,
  windSwell: 0.25,
  gamma: 3.3,
  shortWavesFade: 0.04,
  capillaryFade: 0.08, // the last cascade: keeps fine ripples up close and the water glossy
  waveScale: 1,
  swellScale: 0.7,
  swellWindSpeed: 7,
  swellDirection: -15,
  swellFetchKm: 900,
  swellSwell: 1,
  choppiness: 0.85,
};

const omega = (k: number) => Math.sqrt(G * k + ST * k * k * k);
function jonswapParams(windSpeed: number, fetchKm: number) {
  const fetch = fetchKm * 1000;
  return {
    alpha: 0.076 * Math.pow((G * fetch) / (windSpeed * windSpeed), -0.22),
    peak: 22 * Math.pow((windSpeed * fetch) / (G * G), -0.33),
  };
}
type Band = { scale: number; angle: number; blend: number; swell: number; alpha: number; peak: number };
function jonswap(w: number, b: Band) {
  const sigma = w <= b.peak ? 0.07 : 0.09;
  const r = Math.exp(-((w - b.peak) * (w - b.peak)) / (2 * sigma * sigma * b.peak * b.peak));
  const q = b.peak / w;
  return ((b.scale * b.alpha * G * G) / w ** 5) * Math.exp(-1.25 * q ** 4) * Math.pow(OCEAN.gamma, r);
}
function normalisation(s: number) {
  const s2 = s * s,
    s3 = s2 * s,
    s4 = s3 * s;
  if (s < 5) return -0.000564 * s4 + 0.00776 * s3 - 0.044 * s2 + 0.192 * s + 0.163;
  return -4.8e-8 * s4 + 1.07e-5 * s3 - 9.53e-4 * s2 + 5.9e-2 * s + 3.93e-1;
}
function directional(theta: number, w: number, b: Band) {
  const x = w / b.peak;
  let s = x > 1 ? 9.77 * Math.pow(x, -2.5) : 6.97 * x ** 5;
  s += 16 * Math.tanh(Math.min(x, 20)) * b.swell * b.swell;
  const t = theta - b.angle;
  const cosine2s = normalisation(s) * Math.pow(Math.abs(Math.cos(0.5 * t)), 2 * s);
  const flat = (2 / Math.PI) * Math.cos(t) * Math.cos(t);
  return flat + (cosine2s - flat) * b.blend;
}

const rad = (d: number) => (d * Math.PI) / 180;
const wind = jonswapParams(OCEAN.windSpeed, OCEAN.fetchKm),
  swellP = jonswapParams(OCEAN.swellWindSpeed, OCEAN.swellFetchKm);
const BANDS: Band[] = [
  {
    scale: OCEAN.waveScale,
    angle: rad(OCEAN.windDirection),
    blend: OCEAN.spreadBlend,
    swell: OCEAN.windSwell,
    alpha: wind.alpha,
    peak: wind.peak,
  },
  {
    scale: OCEAN.swellScale * OCEAN.waveScale,
    angle: rad(OCEAN.swellDirection),
    blend: 1,
    swell: OCEAN.swellSwell,
    alpha: swellP.alpha,
    peak: swellP.peak,
  },
];

/** Cascade c's initial spectrum, N×N×4: h0(k), conj(h0(-k)). Seeded per cascade, like the demo's PCG (not the same draw). */
export function bakeH0(c: number) {
  const L = CASCADE_LENGTHS[c]!,
    dk = (2 * Math.PI) / L;
  // Cascade c owns [cut[c-1], cut[c]); each cut sits at 6 fundamentals of the next cascade.
  const lo = c === 0 ? 1e-4 : ((2 * Math.PI) / CASCADE_LENGTHS[c]!) * 6;
  const hi = c === CASCADE_LENGTHS.length - 1 ? 1e4 : ((2 * Math.PI) / CASCADE_LENGTHS[c + 1]!) * 6;
  const fade = c === CASCADE_LENGTHS.length - 1 ? OCEAN.capillaryFade : OCEAN.shortWavesFade;
  const rng = mulberry32(1337 + c * 7919);
  const re = new Float32Array(N * N),
    im = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const u1 = 1 - rng(),
        u2 = rng();
      const r = Math.sqrt(-2 * Math.log(u1)),
        gx = r * Math.cos(2 * Math.PI * u2),
        gy = r * Math.sin(2 * Math.PI * u2);
      const kx = (i - N / 2) * dk,
        kz = (j - N / 2) * dk,
        kl = Math.hypot(kx, kz);
      if (kl < lo || kl > hi) continue;
      const w = omega(kl),
        dwdk = (G + 3 * ST * kl * kl) / (2 * w),
        theta = Math.atan2(kz, kx);
      let S = 0;
      for (const b of BANDS) S += jonswap(w, b) * directional(theta, w, b) * Math.exp(-fade * fade * kl * kl);
      const a = Math.sqrt(((2 * S * dwdk) / kl) * dk * dk);
      re[j * N + i] = gx * a;
      im[j * N + i] = gy * a;
    }
  const out = new Float32Array(N * N * 4);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = j * N + i,
        m = ((N - j) % N) * N + ((N - i) % N);
      out[k * 4] = re[k]!;
      out[k * 4 + 1] = im[k]!;
      out[k * 4 + 2] = re[m]!;
      out[k * 4 + 3] = -im[m]!;
    }
  return out;
}

// In-place inverse FFT of one row or column (radix 2, e^{+i}).
function ifft1(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len,
      wr = Math.cos(ang),
      wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1,
        ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k,
          b = a + len / 2;
        const tr = re[b]! * cr - im[b]! * ci,
          ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Cascade c at t = 0 as a tile of slope moments, and its mean square slope (what the demo reads from the 1×1 mip). */
export function bakeSlopeTile(c: number) {
  const h0 = bakeH0(c),
    L = CASCADE_LENGTHS[c]!,
    dk = (2 * Math.PI) / L;
  const re = new Float64Array(N * N),
    im = new Float64Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = j * N + i,
        kx = (i - N / 2) * dk,
        kz = (j - N / 2) * dk;
      const hr = h0[k * 4]! + h0[k * 4 + 2]!,
        hi = h0[k * 4 + 1]! + h0[k * 4 + 3]!;
      // dh/dx + i dh/dz: i kx h + i (i kz h), two real fields as one complex one.
      re[k] = -hi * kx - hr * kz;
      im[k] = hr * kx - hi * kz;
    }
  const rowR = new Float64Array(N),
    rowI = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      rowR[i] = re[j * N + i]!;
      rowI[i] = im[j * N + i]!;
    }
    ifft1(rowR, rowI);
    for (let i = 0; i < N; i++) {
      re[j * N + i] = rowR[i]!;
      im[j * N + i] = rowI[i]!;
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      rowR[j] = re[j * N + i]!;
      rowI[j] = im[j * N + i]!;
    }
    ifft1(rowR, rowI);
    for (let j = 0; j < N; j++) {
      re[j * N + i] = rowR[j]!;
      im[j * N + i] = rowI[j]!;
    }
  }
  const half = new Uint16Array(N * N * 4);
  let mss = 0;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = j * N + i,
        s = (i + j) & 1 ? -1 : 1, // undo the centred-k frequency shift
        sx = re[k]! * s,
        sz = im[k]! * s;
      half[k * 4] = THREE.DataUtils.toHalfFloat(sx);
      half[k * 4 + 1] = THREE.DataUtils.toHalfFloat(sz);
      half[k * 4 + 2] = THREE.DataUtils.toHalfFloat(sx * sx);
      half[k * 4 + 3] = THREE.DataUtils.toHalfFloat(sz * sz);
      mss += sx * sx + sz * sz;
    }
  const tex = new THREE.DataTexture(half, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return { tex, length: L, meanSquareSlope: mss / (N * N) };
}
