// The knobs every rail fuzz reads, in one place (docs/agents/ship-pipeline.md, "Unit test settings"; dev/test-env.ts
// sets them per run):
//
//   fuzzTicks(n)      FUZZ_TICKS, else the fuzz's own length n
//   FUZZ_STRIDE       the every-tick-offset sweeps branch at every FUZZ_STRIDE-th offset: 16 in a local run, 1 (every
//                     offset) in CI's unit job and the nightly long run
//   fuzzSeeds(own)    FUZZ_SEEDS=hex,hex,... replaces a fuzz's own seeds (the nightly long run: the R3a review's five)
//   SAVE_TICKS        the every-tick save check's length: 500, or the review's 2,500 in the long run
export const fuzzTicks = (own: number) => Number(process.env.FUZZ_TICKS ?? own);
export const FUZZ_STRIDE = Math.max(1, Number(process.env.FUZZ_STRIDE ?? 16));
export const fuzzSeeds = (own: readonly number[]): readonly number[] =>
  process.env.FUZZ_SEEDS ? process.env.FUZZ_SEEDS.split(',').map((h) => Number.parseInt(h, 16)) : own;
export const SAVE_TICKS = Number(process.env.SAVE_TICKS ?? 500);
