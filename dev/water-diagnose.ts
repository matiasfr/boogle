// Numerical inspection, not a unit test: node dev/water-diagnose.ts [--spectrum-only] [--coast=lagoon].
// Uses the production H0, IFFT and half-float shore bake. No browser, renderer, server or reference checkout execution.
// The historical configuration below is the owner-playtested water before the demo-scene revision.
import { bakeH0, bakeSlopeTile, CASCADE_LENGTHS, ifft2, N, spectrumCellVariance } from '../src/proto/water/spectrum.ts';
import { bakeShoreMap } from '../src/proto/water/shore.ts';
import { clamp, smoothstep } from '../src/math-pure.ts';

Object.defineProperty(globalThis, 'location', { value: new URL('http://localhost/?proto=water'), configurable: true });
const { islandHeight, fbm, rockObstacle } = await import('../src/proto/water/height.ts');
const { ULTRA, LOOK, SHORE } = await import('../src/proto/water/tuning.ts');
const TAU = 2 * Math.PI;
// Node 24 has f16round; this repo targets the older ES2023 TS library. Match WGSL packHalf2x16 round-to-nearest,
// not DataUtils.toHalfFloat's truncation (which remains correct for the production CPU shore bake).
const f16round = (Math as typeof Math & { f16round: (v: number) => number }).f16round;
const half = (v: number) => f16round(Math.fround(v));
const round = (x: number) => Number(x.toFixed(6));

function spectrum(scale: number) {
  const rows = CASCADE_LENGTHS.map((L, c) => {
    const h0 = bakeH0(c, N, scale);
    let integrated = 0,
      variance = 0,
      instant = 0,
      slope = 0;
    const dk = TAU / L;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const k = (j * N + i) * 4;
        integrated += spectrumCellVariance(c, i, j) * scale;
        const v = 2 * (h0[k]! ** 2 + h0[k + 1]! ** 2);
        variance += v;
        instant += (h0[k]! + h0[k + 2]!) ** 2 + (h0[k + 1]! + h0[k + 3]!) ** 2;
        slope += v * ((i - N / 2) ** 2 + (j - N / 2) ** 2) * dk * dk;
      }
    const tile = bakeSlopeTile(c, N, 0.85, scale);
    const chopped = tile.meanSquareSlope;
    tile.tex.dispose();
    return {
      c,
      L,
      integrated,
      variance,
      Hs: 4 * Math.sqrt(variance),
      HsAt0: 4 * Math.sqrt(instant),
      rawMss: slope,
      choppedMssAt0: chopped,
      rmsSlopeAt0: Math.sqrt(chopped),
    };
  });
  const sum = (key: 'integrated' | 'variance' | 'rawMss' | 'choppedMssAt0') => rows.reduce((s, r) => s + r[key], 0);
  return {
    energyScale: scale,
    cascades: rows,
    summed: {
      integrated: sum('integrated'),
      expectedVariance: 8 * sum('integrated'),
      measuredVariance: sum('variance'),
      Hs: 4 * Math.sqrt(sum('variance')),
      rawMss: sum('rawMss'),
      choppedMssAt0: sum('choppedMssAt0'),
      rmsSlopeAt0: Math.sqrt(sum('choppedMssAt0')),
      coxMunk: 0.003 + 0.00512 * 9,
    },
  };
}

function oneDimensionalJonswap(speed: number, fetchKm: number, scale: number) {
  const fetch = fetchKm * 1000,
    g = 9.81;
  const alpha = 0.076 * Math.pow((g * fetch) / (speed * speed), -0.22);
  const wp = 22 * Math.pow((speed * fetch) / (g * g), -0.33);
  const dw = 0.0001;
  let variance = 0;
  for (let w = dw; w < 30; w += dw) {
    const sigma = w <= wp ? 0.07 : 0.09;
    const r = Math.exp(-((w - wp) ** 2) / (2 * sigma * sigma * wp * wp));
    variance += ((scale * alpha * g * g) / w ** 5) * Math.exp(-1.25 * (wp / w) ** 4) * 3.3 ** r * dw;
  }
  return { speed, fetchKm, scale, variance, Hs: 4 * Math.sqrt(variance) };
}

// OceanSim's PCG draw, inspected from INIT_FRAG. This comparison executes no code from the reference checkout.
function referencePcgHs() {
  const pcg = (x: number, y: number) => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    y = (Math.imul(y, 1664525) + 1013904223) >>> 0;
    x = (x + Math.imul(y, 1664525)) >>> 0;
    y = (y + Math.imul(x, 1664525)) >>> 0;
    x ^= x >>> 16;
    y ^= y >>> 16;
    x = (x + Math.imul(y, 1664525)) >>> 0;
    y = (y + Math.imul(x, 1664525)) >>> 0;
    return [(x ^ (x >>> 16)) >>> 0, (y ^ (y >>> 16)) >>> 0];
  };
  let variance = 0;
  for (let c = 0; c < 4; c++)
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const [x] = pcg(i + c * 7919 + 1337, j + c * 104729 + 1337);
        variance += 4 * spectrumCellVariance(c, i, j) * -2 * Math.log((x! + 1) / 4294967296);
      }
  return { variance, Hs: 4 * Math.sqrt(variance) };
}

console.log(
  JSON.stringify(
    {
      before: spectrum(1),
      after: spectrum(ULTRA.waveScale),
      referencePcg: referencePcgHs(),
      jonswapFrequencyIntegral: [oneDimensionalJonswap(9, 120, 1), oneDimensionalJonswap(7, 900, 0.7)],
    },
    (_, v: unknown) => (typeof v === 'number' ? round(v) : v),
    2,
  ),
);
if (process.argv.includes('--spectrum-only')) process.exit(0);

function oldHeight(lx: number, lz: number) {
  const x = lx / 0.45,
    z = lz / 0.45;
  const warp = fbm(x * 0.0035 + 11.3, z * 0.0035 - 4.1, 4, 3);
  const r = Math.hypot(x - 40 * warp, z + 30 * warp) * (1 + 0.32 * fbm(x * 0.003, z * 0.003, 3, 7));
  let h = 62 * Math.exp(-((r / 190) ** 2)) + 15 * Math.exp(-((r / 430) ** 2)) - 10;
  h -= 32 * smoothstep(380, 1100, r);
  if (h > 0 && h < 5) h *= 0.55 + 0.09 * h;
  else if (h <= 0 && h > -14) h = -14 * Math.pow(-h / 14, 1.8);
  h += 1.2 * fbm(x * 0.05, z * 0.05, 3, 9) * smoothstep(-30, 2, h);
  return h > 0 ? h * 0.55 : h;
}
let rockR = 60;
const bearing = (-15 * Math.PI) / 180;
while (rockR < 500 && oldHeight(Math.cos(bearing) * rockR, Math.sin(bearing) * rockR) > -2.5) rockR++;
const oldRock = (x: number, z: number) => {
  const q = ((x - rockR * Math.cos(bearing)) ** 2 + (z - rockR * Math.sin(bearing)) ** 2) / 8.5 ** 2;
  return q < 1 ? 4 * (1 - q) : -Infinity;
};

type Bake = ReturnType<typeof bakeShoreMap>;
function field(bake: Bake, data: Float32Array, channels: number, x: number, z: number, ch: number) {
  const u = clamp((x / bake.extent + 0.5) * bake.size - 0.5, 0, bake.size - 1);
  const v = clamp((z / bake.extent + 0.5) * bake.size - 0.5, 0, bake.size - 1);
  const i = Math.floor(u),
    j = Math.floor(v),
    i1 = Math.min(i + 1, bake.size - 1),
    j1 = Math.min(j + 1, bake.size - 1);
  const at = (xx: number, zz: number) => data[(zz * bake.size + xx) * channels + ch]!;
  return (
    (at(i, j) * (1 - (u - i)) + at(i1, j) * (u - i)) * (1 - (v - j)) +
    (at(i, j1) * (1 - (u - i)) + at(i1, j1) * (u - i)) * (v - j)
  );
}

// Same fp32 hash as the production CPU spray sampler; FP64 changes the hash's fractional part significantly.
const f = Math.fround,
  fract = (v: number) => v - Math.floor(v);
const mix = (a: number, b: number, t: number) => f(f(a * f(1 - t)) + f(b * t));
function hash(x: number, z: number) {
  let px = f(fract(f(f(x) * f(0.1031)))),
    pz = f(fract(f(f(z) * f(0.1031))));
  const d = f(f(f(px * f(pz + f(33.33))) + f(pz * f(px + f(33.33)))) + f(px * f(px + f(33.33))));
  const py = f(pz + d);
  px = f(px + d);
  pz = px;
  return fract(f(f(px + py) * pz));
}
function noise(x: number, z: number) {
  x = f(x);
  z = f(z);
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = f(x - ix),
    fz = f(z - iz);
  const ux = f(f(fx * fx) * f(f(fx * -2) + 3)),
    uz = f(f(fz * fz) * f(f(fz * -2) + 3));
  return mix(mix(hash(ix, iz), hash(ix + 1, iz), ux), mix(hash(ix, iz + 1), hash(ix + 1, iz + 1), ux), uz);
}

type Config = { name: string; bake: Bake; amp: number; lambda: number; scale: number; phaseOffset: number };
const configs: Config[] = [
  {
    name: 'before',
    bake: bakeShoreMap(oldHeight, 1400, 512, oldRock),
    amp: 0.7,
    lambda: 22,
    scale: 1,
    phaseOffset: 2400,
  },
  {
    name: 'after',
    bake: bakeShoreMap(islandHeight, SHORE.extent, SHORE.size, rockObstacle),
    amp: LOOK.shoreAmp,
    lambda: LOOK.shoreLambda,
    scale: Math.sqrt(ULTRA.waveScale),
    phaseOffset: 0,
  },
];

// The rendered displacement atlas, including repeat-linear sampling and half-rounded box mips. The transform computes
// Dy + iDx, then Dz (real): mathematically the same two-real-fields packing used by fft.ts.
const seeds = [0, 1, 2].map((c) => bakeH0(c));
const real = new Float64Array(N * N),
  imag = new Float64Array(N * N),
  zr = new Float64Array(N * N),
  zi = new Float64Array(N * N);
const waves = seeds.map((h0, c) => {
  const kx = new Float64Array(N * N),
    kz = new Float64Array(N * N),
    invK = new Float64Array(N * N),
    omega = new Float64Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = j * N + i;
      kx[k] = ((i - N / 2) * TAU) / CASCADE_LENGTHS[c]!;
      kz[k] = ((j - N / 2) * TAU) / CASCADE_LENGTHS[c]!;
      const kl = Math.hypot(kx[k]!, kz[k]!);
      invK[k] = kl > 1e-6 ? 1 / kl : 0;
      omega[k] = (Math.floor(Math.sqrt(9.81 * kl + 7.4e-5 * kl ** 3) / (TAU / 300)) * TAU) / 300;
    }
  const levels = configs.map(() => {
    const mips: Float32Array[] = [];
    for (let size = N; size >= 1; size /= 2) mips.push(new Float32Array(size * size * 3));
    return mips;
  });
  return { h0, kx, kz, invK, omega, levels };
});
function evolve(time: number) {
  for (const w of waves) {
    for (let k = 0; k < N * N; k++) {
      const co = Math.cos(w.omega[k]! * time),
        si = Math.sin(w.omega[k]! * time),
        off = k * 4;
      const hr = (w.h0[off]! + w.h0[off + 2]!) * co + (w.h0[off + 3]! - w.h0[off + 1]!) * si;
      const hi = (w.h0[off]! - w.h0[off + 2]!) * si + (w.h0[off + 1]! + w.h0[off + 3]!) * co;
      const kx = w.kx[k]! * w.invK[k]!,
        kz = w.kz[k]! * w.invK[k]!;
      real[k] = hr - hr * kx * 0.85;
      imag[k] = hi - hi * kx * 0.85;
      // h + i*(i kx/k h): real=hr - kx*hr, imag=hi - kx*hi.
      zr[k] = -hi * kz * 0.85;
      zi[k] = hr * kz * 0.85;
    }
    ifft2(real, imag, N);
    ifft2(zr, zi, N);
    configs.forEach((conf, ci) => {
      const levels = w.levels[ci]!;
      const level = levels[0]!;
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const k = j * N + i,
            sign = (i + j) & 1 ? -1 : 1;
          level[k * 3] = half(imag[k]! * sign * conf.scale);
          level[k * 3 + 1] = half(real[k]! * sign * conf.scale);
          level[k * 3 + 2] = half(zr[k]! * sign * conf.scale);
        }
      let width = N;
      for (let mip = 1; mip < levels.length; mip++) {
        const from = levels[mip - 1]!,
          to = levels[mip]!,
          next = width / 2;
        for (let j = 0; j < next; j++)
          for (let i = 0; i < next; i++)
            for (let ch = 0; ch < 3; ch++) {
              const k = (j * width * 2 + i * 2) * 3 + ch;
              to[(j * next + i) * 3 + ch] = half(
                (from[k]! + from[k + 3]! + from[k + width * 3]! + from[k + width * 3 + 3]!) * 0.25,
              );
            }
        width = next;
      }
    });
  }
}
function fftAt(c: number, x: number, z: number, cell: number, ch: number, config: number) {
  const lod = clamp(Math.log2(Math.max((cell * N) / CASCADE_LENGTHS[c]!, 1e-6)) + 1, 0, 8);
  const low = Math.floor(lod),
    high = Math.min(low + 1, 8);
  const sample = (mip: number) => {
    const size = N / 2 ** mip,
      data = waves[c]!.levels[config]![mip]!;
    const u = fract(x / CASCADE_LENGTHS[c]!) * size - 0.5,
      v = fract(z / CASCADE_LENGTHS[c]!) * size - 0.5;
    const i = Math.floor(u),
      j = Math.floor(v);
    const at = (xx: number, zz: number) => data[(((zz + size) % size) * size + ((xx + size) % size)) * 3 + ch]!;
    return (
      (at(i, j) * (1 - (u - i)) + at(i + 1, j) * (u - i)) * (1 - (v - j)) +
      (at(i, j + 1) * (1 - (u - i)) + at(i + 1, j + 1) * (u - i)) * (v - j)
    );
  };
  return sample(low) * (1 - (lod - low)) + sample(high) * (lod - low);
}

function shoreAt(conf: Config, x: number, z: number, t: number, cell: number) {
  const { bake } = conf;
  const sh = (ch: number) => field(bake, bake.data, 4, x, z, ch);
  const tr = (ch: number) => field(bake, bake.travelData, 4, x, z, ch);
  const depth = -sh(0),
    gl = Math.hypot(sh(2), sh(3)),
    tl = Math.hypot(tr(1), tr(2));
  const dx = tl > 0.5 ? tr(1) / tl : -sh(2) / Math.max(gl, 1e-3);
  const dz = tl > 0.5 ? tr(2) / tl : -sh(3) / Math.max(gl, 1e-3);
  const exposure = 0.25 + 0.75 * smoothstep(-0.3, 0.7, -dx * Math.cos(bearing) - dz * Math.sin(bearing));
  const env = (1 - smoothstep(70, 180, sh(1))) * smoothstep(0.35, 0.8, gl) * smoothstep(-0.9, 0.5, depth) * exposure;
  const surf = field(bake, bake.surfData, 1, x, z, 0);
  const shoal = tl > 0.5 ? tr(3) : Math.pow(clamp(Math.max(depth, 0.6) / 14, 0.04, 1), -0.25);
  const amax = 0.42 * Math.min(Math.max(depth, 0), surf) + 0.14 * smoothstep(0.5, 2, surf) + 0.02;
  const gate = 1 - smoothstep(1.05, 1.4, depth / Math.max(surf, 0.05));
  const nx = x + conf.phaseOffset;
  const phase =
    noise(f(nx * f(0.0042)), f(z * f(0.0042))) * 9 + noise(f(f(nx * f(0.011)) + 7), f(f(z * f(0.011)) + 7)) * 2.5;
  const group = 0.45 + 0.55 * noise(f(f(nx * f(0.004)) + f(t * f(0.021))), f(f(z * f(0.004)) + f(t * f(-0.017))));
  let y = 0,
    push = 0,
    pinch = 0.85;
  for (let i = 0; i < 2; i++) {
    const w = Math.sqrt((9.81 * TAU) / (conf.lambda * (i === 0 ? 1 : 0.61)));
    const k = w / Math.sqrt(9.81 * clamp(depth, 0.3, 14));
    const a = Math.min(conf.amp * (i === 0 ? 1 : 0.45) * env * shoal * group, amax * (i === 0 ? 1 : 0.5));
    const ph = w * (tr(0) + t) + phase * (i === 0 ? 1 : 1.37) + i * 2.1;
    const co = 0.5 + 0.5 * Math.cos(ph),
      si = Math.sin(ph),
      rel = a / Math.max(depth, 0.05);
    let pitch = i === 0 ? 2 * a * smoothstep(0.16, 0.28, rel) * (1 - smoothstep(0.4, 0.6, rel)) * gate : 0;
    pitch = Math.min(pitch, 0.35 / (1.08 * k)) * (1 - smoothstep(0.03, 0.1, (k * cell) / TAU));
    pinch -= 1.08 * pitch * k;
    const qak = Math.min(pinch, a * k * 8);
    pinch -= qak;
    const bl = 1 - smoothstep(0.1, 0.3, (k * cell) / TAU);
    y += bl * a * (2 * Math.max(co, 0) ** 1.6 - 0.78);
    push += bl * ((qak / k) * si + pitch * co ** 6);
  }
  const R = 0.55 * Math.min(conf.amp * exposure * group, 0.42 * surf + 0.02) * smoothstep(0.35, 0.8, gl);
  const s = fract((Math.sqrt((9.81 * 6.2831853) / conf.lambda) * t + phase) / 6.2831853);
  const swash = R < 0.02 ? 0 : R * (s < 0.3 ? Math.sin((s / 0.3) * 1.5708) : Math.cos(((s - 0.3) / 0.7) * 1.5708));
  return { displacement: [push * dx, y, push * dz], swash, depth };
}

const probeAngle = process.argv.includes('--coast=lagoon')
    ? Math.atan2(Math.cos((205 * Math.PI) / 180), Math.sin((205 * Math.PI) / 180)) - 1.48
    : (-35 * Math.PI) / 180,
  cell = 0.25,
  cameraDistance = 30;
const probes = configs.map((conf) =>
  [0, 0.5, 1, 2, 5].map((depth) => {
    const h = (r: number) => field(conf.bake, conf.bake.data, 4, Math.cos(probeAngle) * r, Math.sin(probeAngle) * r, 0);
    let hi = 60;
    while (hi < 850 && h(hi) > -depth) hi += 0.25;
    let lo = hi - 0.25;
    for (let n = 0; n < 30; n++) {
      const mid = (lo + hi) / 2;
      if (h(mid) > -depth) lo = mid;
      else hi = mid;
    }
    const x = Math.cos(probeAngle) * hi,
      z = Math.sin(probeAngle) * hi;
    return {
      depth,
      x,
      z,
      min: Infinity,
      max: -Infinity,
      fftMin: Infinity,
      fftMax: -Infinity,
      swashMax: 0,
      horizontalMax: 0,
    };
  }),
);
console.log(
  `Minute probes: coast ${((probeAngle * 180) / Math.PI).toFixed(3)}°; 0..60 s at 10 Hz; fixed world xz with four-step horizontal inversion; 0.25 m cell, 30 m clearance distance.`,
);
const start = performance.now();
for (let frame = 0; frame <= 600; frame++) {
  const time = frame / 10;
  evolve(time);
  configs.forEach((conf, ci) => {
    const displace = (x: number, z: number, withShore: boolean) => {
      const shore = shoreAt(conf, x, z, time, cell);
      const swell = smoothstep(2, 26, shore.depth);
      const chop = smoothstep(-0.4, 2, shore.depth) * (0.55 + 0.45 * smoothstep(0, 10, shore.depth));
      const d = [0, 0, 0];
      for (let c = 0; c < 3; c++)
        for (let ch = 0; ch < 3; ch++)
          d[ch] = d[ch]! + fftAt(c, x + conf.phaseOffset, z, cell, ch, ci) * (c === 0 ? swell : chop);
      if (withShore) for (let ch = 0; ch < 3; ch++) d[ch] = d[ch]! + shore.displacement[ch]!;
      return d;
    };
    for (const p of probes[ci]!) {
      let x = p.x,
        z = p.z;
      for (let n = 0; n < 4; n++) {
        const d = displace(x, z, true);
        x = p.x - d[0]!;
        z = p.z - d[2]!;
      }
      const d = displace(x, z, true);
      const bed = field(conf.bake, conf.bake.data, 4, x + d[0]!, z + d[2]!, 0);
      const y = d[1]! < 0 ? Math.max(d[1]!, Math.min(bed + 0.04 + 2e-7 * cameraDistance ** 2, 0)) : d[1]!;
      p.min = Math.min(p.min, y);
      p.max = Math.max(p.max, y);
      const fft = displace(p.x, p.z, false);
      p.fftMin = Math.min(p.fftMin, fft[1]!);
      p.fftMax = Math.max(p.fftMax, fft[1]!);
      p.horizontalMax = Math.max(p.horizontalMax, Math.hypot(fft[0]!, fft[2]!));
      p.swashMax = Math.max(p.swashMax, shoreAt(conf, p.x, p.z, time, cell).swash);
    }
  });
  if (frame % 100 === 0) console.log(`Minute probe ${time}s (${((performance.now() - start) / 1000).toFixed(1)}s CPU)`);
}
console.log(
  JSON.stringify(
    configs.map((conf, ci) => ({
      name: conf.name,
      probes: probes[ci]!.map((p) => ({ ...p, range: p.max - p.min, fftRange: p.fftMax - p.fftMin })),
    })),
    (_, v: unknown) => (typeof v === 'number' ? round(v) : v),
    2,
  ),
);
