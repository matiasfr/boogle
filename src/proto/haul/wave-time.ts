// When the haul wave comes (?proto=haul&v=wave, ./wave.ts): a pure function of shared time and the room seed, so every
// tab in a room sees the same wave at the same moment with no messages. Not lockstep (nothing in the sim reads it):
// the wave is drawn by each tab and each player's own tab decides whether it caught them.
//
//   wavePhase(t, seed)  ->  { n, at, phase, u }   t: shared seconds (src/netplay/shared-time.ts)
//     n      which wave (0 is the first after the room's world started)
//     at     shared second the crest reaches the sandbar's seaward edge
//     phase  'calm' | 'warn' (the WARN s before `at`) | 'sweep' (SWEEP s: the surge runs up to the line) | 'recede'
//     u      0..1 through the phase ('calm': 0)

export const WAVE = {
  first: 45, // s: the first crest after the world's tick 0
  gapMin: 60, // s between crests (docs/research/roblox-patterns.md, pattern 1: every 60-90 s)
  gapMax: 90,
  warn: 25, // s of telegraph before the crest (20-30 s)
  sweep: 5, // s from the bar's seaward edge up to the high-water line
  recede: 4, // s for the water to run back out
};

export type WavePhase = { n: number; at: number; phase: 'calm' | 'warn' | 'sweep' | 'recede'; u: number };

/** 0..1 from a wave's index and the room seed (an integer hash: the same in every tab). */
export function gapShare(n: number, seed: number): number {
  let h = Math.imul((n + 1) ^ seed, 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
export const gapOf = (n: number, seed: number) => WAVE.gapMin + (WAVE.gapMax - WAVE.gapMin) * gapShare(n, seed);

// Walking the crests from the first is cheap (a long-lived room has a few thousand), and kept between calls.
let walk = { seed: NaN, n: 0, at: 0 };

export function wavePhase(t: number, seed: number): WavePhase {
  const end = WAVE.sweep + WAVE.recede;
  // back before the previous crest's window ended (a snapshot, another room): walk again from the first
  if (walk.seed !== seed || (walk.n > 0 && t < walk.at - gapOf(walk.n - 1, seed) + end))
    walk = { seed, n: 0, at: WAVE.first };
  while (t >= walk.at + end) {
    walk.at += gapOf(walk.n, seed);
    walk.n++;
  }
  const { n, at } = walk;
  const d = t - at;
  if (d < -WAVE.warn) return { n, at, phase: 'calm', u: 0 };
  if (d < 0) return { n, at, phase: 'warn', u: 1 + d / WAVE.warn };
  if (d < WAVE.sweep) return { n, at, phase: 'sweep', u: d / WAVE.sweep };
  return { n, at, phase: 'recede', u: (d - WAVE.sweep) / WAVE.recede };
}
