// The soapbox's sounds, all synthesized (no samples), quiet, and local (vehicle-feel.md recommendation 5): the wheels'
// rolling in two crossfaded layers (a low rumble up to 8 m/s, a wooden rattle above it), each pitched over a narrow
// 0.8-1.3 so it never goes chipmunk; wind from 10 m/s; a tick as the drift charge reaches each tier; a whoosh for the
// boost; a thump for a crash. Nothing plays until the shared context is unlocked by a gesture (src/render/audio.ts).
import { getAudio } from '../../render/audio.ts';
import { clamp } from '../../math.ts';

type Loop = { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode };
type Bed = { rumble: Loop; rattle: Loop; wind: Loop; out: GainNode };
let bed: Bed | null = null;
let noise: AudioBuffer | null = null;
let clicks: AudioBuffer | null = null;

const VOLUME = 0.32; // the whole soapbox bed, under the honk and the ball's thuds

function buffers(ctx: AudioContext) {
  if (noise && clicks) return { noise, clicks };
  const n = ctx.sampleRate * 2;
  noise = ctx.createBuffer(1, n, ctx.sampleRate);
  const a = noise.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < n; i++) {
    // half white, half brown: enough body for the rumble's low-pass, enough hiss for the wind's band-pass
    const w = Math.random() * 2 - 1;
    brown = (brown + 0.02 * w) / 1.02;
    a[i] = w * 0.5 + brown * 3;
  }
  // the rattle: short decaying clicks at an uneven ~28 a second, like planks and coconut shells knocking
  clicks = ctx.createBuffer(1, n, ctx.sampleRate);
  const c = clicks.getChannelData(0);
  for (let t = 0; t < n;) {
    const amp = 0.4 + Math.random() * 0.6;
    const len = Math.floor(ctx.sampleRate * 0.006);
    for (let i = 0; i < len && t + i < n; i++) c[t + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (len / 4));
    t += Math.floor(ctx.sampleRate * (0.02 + Math.random() * 0.03));
  }
  return { noise, clicks };
}

function loop(ctx: AudioContext, buf: AudioBuffer, out: AudioNode, type: BiquadFilterType, freq: number, q = 0.7) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopStart = Math.random(); // the layers never line up
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(out);
  src.start();
  return { src, gain, filter };
}

function ensureBed() {
  const a = getAudio();
  if (!a) return null;
  if (bed) return { a, bed };
  const { noise, clicks } = buffers(a.ctx);
  const out = a.ctx.createGain();
  out.gain.value = VOLUME;
  out.connect(a.out);
  bed = {
    out,
    rumble: loop(a.ctx, noise, out, 'lowpass', 180),
    rattle: loop(a.ctx, clicks, out, 'bandpass', 1400, 0.9),
    wind: loop(a.ctx, noise, out, 'bandpass', 500, 1.2),
  };
  return { a, bed };
}

const set = (p: AudioParam, v: number, now: number, tc = 0.06) => p.setTargetAtTime(v, now, tc);

/** Each frame: speed in m/s, whether the wheels are on the ground, and whether anyone is in the cart. */
export function rollSound(speed: number, grounded: boolean, seated: boolean) {
  if (!seated && !bed) return;
  const r = ensureBed();
  if (!r) return;
  const { a, bed: b } = r;
  const now = a.ctx.currentTime;
  const on = seated && grounded ? 1 : 0;
  // low rumble: in from 1 m/s, full by 5, giving way to the rattle above 8
  const low = on * clamp((speed - 1) / 4, 0, 1) * (1 - 0.6 * clamp((speed - 8) / 6, 0, 1));
  const high = on * clamp((speed - 6) / 6, 0, 1);
  set(b.rumble.gain.gain, low * 0.9, now);
  set(b.rumble.src.playbackRate, 0.8 + 0.5 * clamp(speed / 8, 0, 1), now);
  set(b.rumble.filter.frequency, 140 + speed * 12, now);
  set(b.rattle.gain.gain, high * 0.55, now);
  set(b.rattle.src.playbackRate, 0.8 + 0.5 * clamp((speed - 8) / 10, 0, 1), now);
  // wind: from 10 m/s, rising and brightening to 20, in the air too
  const wind = (seated ? 1 : 0) * clamp((speed - 10) / 10, 0, 1);
  set(b.wind.gain.gain, wind * 0.5, now, 0.15);
  set(b.wind.filter.frequency, 450 + wind * 900, now, 0.15);
}

function blip(freq: number, dur: number, vol: number, type: OscillatorType = 'triangle', to = freq) {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  const o = a.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** The drift charge reached a tier: 1 sparks, 2 ready, 3 big. */
export function chargeTick(tier: number) {
  if (tier >= 2) blip(tier === 2 ? 880 : 1320, 0.09, 0.07, 'square');
}

/** A boost fired: a short noise whoosh rising in pitch, longer and louder for the big one. */
export function boostSound(big: boolean) {
  const a = getAudio();
  if (!a) return;
  const { noise } = buffers(a.ctx);
  const t = a.ctx.currentTime;
  const dur = big ? 0.6 : 0.35;
  const src = a.ctx.createBufferSource();
  src.buffer = noise;
  const f = a.ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(big ? 2400 : 1600, t + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(big ? 0.35 : 0.22, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
  blip(big ? 520 : 440, dur * 0.8, 0.05, 'sawtooth', big ? 1100 : 760);
}

/** A crash: a low thump and a clatter. */
export function crashSound() {
  blip(150, 0.35, 0.35, 'sine', 45);
  const a = getAudio();
  if (!a) return;
  const { clicks } = buffers(a.ctx);
  const t = a.ctx.currentTime;
  const src = a.ctx.createBufferSource();
  src.buffer = clicks;
  src.playbackRate.value = 1.6;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.connect(g).connect(a.out);
  src.start(t, Math.random());
  src.stop(t + 0.55);
}
