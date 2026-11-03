// The demo is a client of the same FFT as the real sea, with its explicit diagnostic settings and phase origin.
import { fftWaves as createFftWaves } from '../../render/water/fft.ts';
import { FFT, ISLAND_AT, ULTRA } from './tuning.ts';
export { readFftCheck } from '../../render/water/fft.ts';
export const fftWaves = () => createFftWaves({ fft: FFT, energy: ULTRA.waveScale, phaseOrigin: ISLAND_AT });
