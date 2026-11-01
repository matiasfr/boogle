// The groove's musical grid and harmony, as plain numbers (no audio, no three.js): steps are 16th notes counted from
// shared time zero, so every tab numbers the same bar the same way. Cosmetic (Local); never read by the simulation.

export type Song = {
  bpm: number;
  bars: number; // loop length
  swing: number; // 0.5 = straight; the off 16ths land this far through each 8th (garage shuffle ~0.56-0.6)
  chords: string[]; // one per bar, e.g. 'Am7'
};

export const stepLen = (song: Song) => 60 / song.bpm / 4;

// Shared seconds of a 16th step, with swing on the odd ones.
export function stepTime(song: Song, step: number) {
  const len = stepLen(song);
  return step * len + (step & 1 ? (song.swing - 0.5) * 2 * len : 0);
}

// The first grid point at or after shared second `sec` (16 = 16th notes, swung; 8 = 8th notes, straight).
export function nextGrid(song: Song, sec: number, grid: 8 | 16) {
  const len = stepLen(song) * (grid === 8 ? 2 : 1);
  const eps = 1e-4;
  let k = Math.ceil(sec / len - eps);
  if (grid === 8) return k * len;
  // Swung 16ths: an odd step lands later than k * len, so the even step before it may still be the next one.
  k = Math.max(0, k - 1);
  while (stepTime(song, k) < sec - eps) k++;
  return stepTime(song, k);
}

// Which bar of the loop (0 .. bars-1) a step falls in, and its 16th within the bar.
export const barOf = (song: Song, step: number) => Math.floor(step / 16) % song.bars;
export const posOf = (step: number) => ((step % 16) + 16) % 16;

// ---------------------------------------------------------------- harmony
const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// Intervals above the root for the chord qualities a producer writes most.
const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  '9': [0, 4, 7, 10, 14],
  m11: [0, 3, 7, 10, 14, 17],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
};

// 'F#m7' -> { root: 6, tones: [6, 9, 1, 4] } (pitch classes, C = 0). Unknown qualities fall back to the triad.
export function parseChord(name: string) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name.trim());
  if (!m) return { root: 9, tones: [9, 0, 4] }; // A minor
  const root = (ROOTS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? 11 : 0)) % 12;
  const ivs = QUALITIES[m[3]] ?? (m[3].startsWith('m') ? QUALITIES.m : QUALITIES['']);
  return { root, tones: ivs.map((i) => (root + i) % 12) };
}

export const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
export const hzToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);

// The chord tone nearest to a pitch in Hz, in any octave.
export function snapToChord(freq: number, tones: number[]) {
  const n = hzToMidi(freq);
  let best = Math.round(n),
    gap = Infinity;
  for (let o = Math.floor(n / 12) - 1; o <= Math.floor(n / 12) + 1; o++)
    for (const pc of tones) {
      const c = o * 12 + pc;
      if (Math.abs(c - n) < gap) {
        gap = Math.abs(c - n);
        best = c;
      }
    }
  return midiToHz(best);
}
