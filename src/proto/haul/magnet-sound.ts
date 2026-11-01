// The magnet variant's sounds (docs/research/ratchet-and-clank-feel.md recs 2 and 9; v2 after the 2026-11-02 audit,
// "more Ratchet & Clank-y": docs/research/collect-sounds.md has the recipe).
//   whooshIn(n)    pieces leave a pile: a soft band-passed swell that rises into the first landing
//   arrivalTick()  one piece landed on your back: a bolt clink (render/clink.ts, mostly metal with a little wood), up
//                  the C major pentatonic one step per piece from C6 for 6 steps (to C7), then a payout shimmer
//                  that picks among the top three notes at random, never twice running. Every 4th tick is accented
//                  (+2 dB, a brighter bounce), pan alternates ±0.3 (the classic Sonic ring trick) with a little
//                  jitter. The run starts over after 700 ms with nothing landing.
//   burstChord()   a burst of 4 or more closes with a "cha-ching" 60 ms after its last tick: C6, G6, C7 clinks 40 ms
//                  apart (E7 too after 10 or more), a detuned octave-and-fifth shimmer, and a low wooden knock under it.
// About −18 dBFS a tick on the ui bus, at most 8 voices (the oldest is cut). Through `onBeat`, so once music installs
// a snap the ladder lands on the beat and in the current chord, as Peggle's pegs do (none does today). Local and
// cosmetic.
import { getAudio, onBeat } from '../../render/audio.ts';
import { clink, pentatonic } from '../../render/clink.ts';

const note = (n: number): number => pentatonic(n + 5); // from C6
const CLIMB = 6; // C6 D6 E6 G6 A6 C7
const RESET_MS = 700;
const PEAK = 0.1;
const VOICES = 8;

let step = -1,
  deg = 0,
  lastAt = -1e9,
  pan = 1;
const voices: { g: GainNode; end: number }[] = [];
let noise: AudioBuffer | null = null;

function voice(ctx: AudioContext, out: AudioNode, at: number, dur: number, p: number): GainNode {
  for (let k = voices.length - 1; k >= 0; k--) if (voices[k].end < ctx.currentTime) voices.splice(k, 1);
  while (voices.length >= VOICES) {
    const old = voices.shift()!; // drop the oldest, never the newest
    old.g.gain.cancelScheduledValues(ctx.currentTime);
    old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.004);
  }
  const g = ctx.createGain();
  let node: AudioNode = g;
  if (ctx.createStereoPanner) {
    const sp = ctx.createStereoPanner();
    sp.pan.value = p;
    g.connect(sp);
    node = sp;
  }
  node.connect(out);
  voices.push({ g, end: at + dur + 0.05 });
  return g;
}

function tone(ctx: AudioContext, dest: AudioNode, f: number, at: number, ring: number, peak: number, attack = 0.002) {
  const o = ctx.createOscillator();
  o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.setTargetAtTime(0, at + attack, ring / 6.9);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + attack + ring + 0.02);
}

/** Pieces set off from a pile: a short swell that rises into the first landing (about 0.2 s later). */
export function whooshIn(n: number): void {
  const a = getAudio('ui');
  if (!a || n <= 0) return;
  const { ctx, out } = a;
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.3), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + 0.01;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.6;
  bp.frequency.setValueAtTime(500, t);
  bp.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
  const g = ctx.createGain();
  const peak = PEAK * 0.35 * Math.min(1, 0.6 + n / 20);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.17);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  src.connect(bp).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.26);
}

/** One piece landed: the next tick of the run. Returns the run's step (0-based) for the caller's bookkeeping. */
export function arrivalTick(): number {
  const now = performance.now();
  step = now - lastAt > RESET_MS ? 0 : step + 1;
  lastAt = now;
  const a = getAudio('ui');
  if (!a) return step;
  const { ctx, out } = a;
  // climb, then the payout shimmer: one of the top three, never the same twice running
  if (step < CLIMB) deg = step;
  else {
    let d = deg;
    while (d === deg) d = CLIMB - 3 + Math.floor(Math.random() * 3);
    deg = d;
  }
  const { t, freq } = onBeat(ctx.currentTime + 0.005, note(deg), 16);
  const accent = step % 4 === 3;
  pan = -pan;
  const g = voice(ctx, out, t, 0.3, pan * 0.3 + (Math.random() - 0.5) * 0.1);
  clink(ctx, g, { at: t, freq, level: PEAK * (accent ? 1.25 : 1), metal: 0.8, ring: 0.22, bounce: accent ? 0.5 : 0.3 });
  return step;
}

/** A burst of 4 or more closes on a "cha-ching", 60 ms after its last tick; bigger after 10 or more. */
export function burstChord(): void {
  const a = getAudio('ui');
  if (!a) return;
  const { ctx, out } = a;
  const big = step >= 9;
  const { t, freq } = onBeat(ctx.currentTime + 0.06, note(0), 16);
  const g = voice(ctx, out, t, 0.7, 0);
  const notes = big ? [1, 1.5, 2, 2.5] : [1, 1.5, 2]; // root, fifth, octave (and the third above it)
  notes.forEach((r, k) =>
    clink(ctx, g, { at: t + k * 0.04, freq: freq * r, level: PEAK * 0.8, metal: 0.85, ring: 0.4, bounce: 0.25 }),
  );
  // the shimmer: octave and fifth, each doubled ±6 cents, swelling in under the arpeggio
  const at = t + 0.03;
  for (const r of [1, 1.5])
    for (const c of [-6, 6]) tone(ctx, g, freq * r * 2 ** (c / 1200), at, 0.6, PEAK * 0.12, 0.02);
  // the logs settling on your back: a low wooden knock on the root, three octaves down
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime((freq / 8) * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(freq / 8, t + 0.06);
  const k = ctx.createGain();
  k.gain.setValueAtTime(0, t);
  k.gain.linearRampToValueAtTime(PEAK * 1.6, t + 0.004);
  k.gain.setTargetAtTime(0, t + 0.004, 0.035);
  o.connect(k).connect(g);
  o.start(t);
  o.stop(t + 0.25);
}
