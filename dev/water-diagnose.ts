// Numerical inspection, not a unit test: node dev/water-diagnose.ts. Demo-only coast probes are in archive/water.
// Uses the production H0, IFFT and half-float shore bake. No browser, renderer, server or reference checkout execution.
// The historical configuration below is the owner-playtested water before the demo-scene revision.
import { bakeH0, bakeSlopeTile, CASCADE_LENGTHS, N, spectrumCellVariance } from '../src/render/water/spectrum.ts';

import { ULTRA } from '../src/render/water/tuning.ts';
const TAU = 2 * Math.PI;
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
