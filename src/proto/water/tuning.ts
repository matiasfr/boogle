// Demo-only framing and diagnostics over the production water's unchanged defaults.
import { protoV } from '../flags.ts';
import { RAW, GRADE, FFT as BASE_FFT, GRID as BASE_GRID } from '../../render/water/tuning.ts';
export { ULTRA, UNDER, WAVES, SHORE } from '../../render/water/tuning.ts';

export const ISLAND_AT = { x: 2400, z: 0 }; // far enough that home is a smudge on the horizon
export const LOOK = protoV('water') === 'pop' ? GRADE : RAW;

// Keep the reference demo's long range and independent terrain/cost diagnostics.
const query = new URLSearchParams(location.search);
export const GRID = { ...BASE_GRID, angular: Number(query.get('grid')) || 384, far: 80000 };
export const TERRAIN = {
  flatGround: query.get('groundFlat') === '1',
  flatRocks: query.get('rockFlat') === '1',
};
const fftInteger = (key: string, fallback: number, lo: number, hi: number) => {
  const v = Number(query.get(key) ?? fallback);
  return Number.isInteger(v) && v >= lo && v <= hi ? v : fallback;
};
const firstBand = fftInteger('band', 0, 0, 3);
export const FFT = {
  ...BASE_FFT,
  size: query.get('n') === '128' ? 128 : 256,
  bands: Array.from({ length: Math.min(fftInteger('cascades', 4, 1, 4), 4 - firstBand) }, (_, c) => firstBand + c),
};
