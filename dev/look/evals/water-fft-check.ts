// Isolated FFT readback against the CPU reference, through production modules. Use proto=place.
const fftModule = '/src/render/water/fft.ts';
const spectrumModule = '/src/render/water/spectrum.ts';
const { readFftCheck } = (await import(fftModule)) as typeof import('../../../src/render/water/fft.ts');
const { bakeSlopeTile } = (await import(spectrumModule)) as typeof import('../../../src/render/water/spectrum.ts');
const params = new URLSearchParams(location.search);
const size = params.get('n') === '128' ? 128 : 256;
const cascade = Number(params.get('band') ?? 0);
const { slopes, residue } = await readFftCheck(cascade, size);
const cpu = bakeSlopeTile(cascade, size, 0);
const data = cpu.tex.image.data as Uint16Array;
// Decode the CPU's actual half-float tile, including its second moments, without another three.js import in page code.
function fromHalf(h: number) {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 31,
    frac = h & 1023;
  return (
    sign * (exp === 0 ? frac * 2 ** -24 : exp === 31 ? (frac ? NaN : Infinity) : (1 + frac / 1024) * 2 ** (exp - 15))
  );
}
let maxError = 0,
  sumError = 0,
  maxImaginary = 0,
  sumImaginary = 0,
  maxPacking = 0,
  peak = 0;
for (let i = 0; i < slopes.length; i++) {
  const expected = fromHalf(data[i]!);
  const error = Math.abs(slopes[i]! - expected);
  if (!Number.isFinite(error) || !Number.isFinite(residue[i]!)) throw new Error(`FFT non-finite output at ${i}`);
  maxError = Math.max(maxError, error);
  sumError += error;
  peak = Math.max(peak, Math.abs(expected));
  if (i % 4 < 2) {
    maxImaginary = Math.max(maxImaginary, Math.abs(residue[i]!));
    sumImaginary += Math.abs(residue[i]!);
  } else maxPacking = Math.max(maxPacking, Math.abs(residue[i]!));
}
cpu.tex.dispose();
const meanError = sumError / slopes.length;
const meanImaginary = sumImaginary / (size * size * 2);
// fp32 FFT versus fp64 CPU, then rgba16float rounding: allow two half-float ULPs near the peak.
// Imaginary residue has no half conversion and must stay at fp32 roundoff, not another visible field.
const errorLimit = Math.max(2e-6, peak * 0.002);
const imaginaryLimit = Math.max(2e-6, peak * 2e-5);
const pass = maxError <= errorLimit && maxImaginary <= imaginaryLimit && maxPacking <= imaginaryLimit;
console.info(
  'FFT', // look forwards uppercase-prefixed page messages to its terminal output
  JSON.stringify({
    pass,
    size,
    cascade,
    time: 0,
    choppiness: 0,
    maxError,
    meanError,
    maxImaginary,
    meanImaginary,
    maxPacking,
    errorLimit,
    imaginaryLimit,
  }),
);
if (!pass) throw new Error('FFT disagrees with the CPU slope tile or retains an imaginary field; see water-fft-check');

export {};
