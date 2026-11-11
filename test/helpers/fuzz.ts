// The knobs every rail fuzz reads, in one place (docs/agents/ship-pipeline.md, "Unit test settings"; dev/test-env.ts
// sets them per run):
//
//   fuzzTicks(n)      FUZZ_TICKS, else the fuzz's own length n
//   FUZZ_STRIDE       the every-tick-offset sweeps branch at every FUZZ_STRIDE-th offset: 16 in a local run, 1 (every
//                     offset) in CI's unit job and the nightly long run
//   fuzzSeeds(own)    FUZZ_SEEDS=hex,hex,... replaces a fuzz's own seeds (the nightly long run: the R3a review's five)
//   SAVE_TICKS        the every-tick save check's length: 500, or the review's 2,500 in the long run
//   FUZZ_LIGHT        1: the trains fuzz asks at a playtest's rate, one lever ask every 60-90 s
//   FUZZ_TRAINS       the island fuzz's train count (the line's own, or 4: call 47)
//
// A count that is not a whole number of 1 or more throws: NaN would make a sweep skip every offset and pass.
function count(name: string, own: number): number {
  const given = process.env[name];
  if (given === undefined || given === '') return own;
  const n = Number(given);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name}=${given}: expected a whole number of 1 or more`);
  return n;
}
export const fuzzTicks = (own: number) => count('FUZZ_TICKS', own);
export const FUZZ_STRIDE = count('FUZZ_STRIDE', 16);
export const fuzzSeeds = (own: readonly number[]): readonly number[] =>
  process.env.FUZZ_SEEDS ? process.env.FUZZ_SEEDS.split(',').map((h) => Number.parseInt(h, 16)) : own;
export const SAVE_TICKS = count('SAVE_TICKS', 500);
export const FUZZ_LIGHT = process.env.FUZZ_LIGHT === '1';
export const fuzzTrains = (own: number) => count('FUZZ_TRAINS', own);
