// The magnet variant's arrival ticks (docs/research/ratchet-and-clank-feel.md rec 2, and rec 9's mix): one short
// wooden tick per piece landing on your back, a major pentatonic step higher each time from C5 (523 Hz) for 10 steps,
// then alternating the top two; the run starts over after 700 ms with nothing landing. Every 5th tick adds the low
// body of the pickup thock, and a burst of 4 or more closes on a root-and-fifth chord 80 ms after its last tick.
// Detune at most ±2 % (it stays in tune), pan alternating ±0.25, about −18 dBFS a tick on the ui bus, at most 6 voices
// (the oldest is cut). Through `onBeat`, so with ?proto=groove the ladder lands on the beat and in the current chord,
// as Peggle's pegs do. Local and cosmetic.
import { getAudio, onBeat } from '../../render/audio.ts';

const ROOT = 523.25; // C5
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
const note = (n: number): number => ROOT * 2 ** Math.floor(n / 5) * PENTA[((n % 5) + 5) % 5];
const STEPS = 10;
const RESET_MS = 700;
const PEAK = 0.126; // −18 dBFS
const VOICES = 6;

let step = -1,
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

function osc(
  ctx: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  f0: number,
  f1: number,
  at: number,
  dur: number,
  peak: number,
) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function click(ctx: AudioContext, dest: AudioNode, at: number, f: number, peak: number) {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.02), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length) ** 2;
  }
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f;
  bp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.value = peak;
  n.connect(bp).connect(g).connect(dest);
  n.start(at);
}

/** One piece landed: the next tick of the run. Returns the run's step (0-based) for the caller's bookkeeping. */
export function arrivalTick(): number {
  const now = performance.now();
  step = now - lastAt > RESET_MS ? 0 : step + 1;
  lastAt = now;
  const a = getAudio('ui');
  if (!a) return step;
  const { ctx, out } = a;
  const deg = step < STEPS ? step : STEPS - 2 + (step % 2); // capped: alternate the top two
  const want = note(deg) * (1 + (Math.random() * 2 - 1) * 0.02);
  const { t, freq } = onBeat(ctx.currentTime + 0.005, want, 16);
  pan = -pan;
  const g = voice(ctx, out, t, 0.06, pan * 0.25);
  g.gain.value = 1;
  osc(ctx, g, 'triangle', freq, freq * 0.97, t, 0.055, PEAK * 0.8); // the pitched knock
  osc(ctx, g, 'sine', freq * 2, freq * 2, t, 0.025, PEAK * 0.25); // a bright edge
  click(ctx, g, t, 2600, PEAK * 0.5); // the wood
  if ((step + 1) % 5 === 0) {
    const low = voice(ctx, out, t, 0.13, 0);
    osc(ctx, low, 'sine', 240, 110, t, 0.12, PEAK * 1.1); // the thock's body
  }
  return step;
}

/** A burst of 4 or more closes on root and fifth, 80 ms after its last tick. */
export function burstChord(): void {
  const a = getAudio('ui');
  if (!a) return;
  const { ctx, out } = a;
  const { t, freq } = onBeat(ctx.currentTime + 0.08, note(5), 16);
  const g = voice(ctx, out, t, 0.32, 0);
  osc(ctx, g, 'triangle', freq, freq, t, 0.3, PEAK * 0.55);
  osc(ctx, g, 'triangle', freq * 1.5, freq * 1.5, t + 0.01, 0.3, PEAK * 0.45);
  osc(ctx, g, 'sine', freq / 2, freq / 2, t, 0.22, PEAK * 0.3);
}
