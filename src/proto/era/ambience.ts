// The era's ambience bed (docs/research/era-progression.md, recs 1, 4 and 7): two synthesized beds that crossfade at
// the swap, judged with the screen off. The wood age is a breeze, hand tools knocking and the odd gull; steam is a
// low works rumble, a chuffing rhythm and a distant whistle. Over both, the same little island motif comes round every
// so often, re-arranged per era rather than replaced: plucked in the wood age, brass with an oompah bass in steam.
// Local, quiet, built on the shared audio context (src/render/audio.ts) once it is running. Called each frame by
// ./index.ts with the crossfade (0 era 1 .. 1 era 2).
import { getAudio } from '../../render/audio.ts';

const LEVEL = 0.5; // the whole bed, under the game's own sounds
const MOTIF = [0, 2, 4, 7, 4]; // semitones over the root: the island motif
const ROOT = 392; // G4

type Beds = {
  ctx: AudioContext;
  noise: AudioBuffer;
  wind: GainNode;
  rumble: GainNode;
  out: GainNode;
};
let beds: Beds | null = null,
  level = LEVEL;
/** The bed's level (0 mutes it): the listening pack (dev/audio/render.ts) records the other sounds without it. */
export function setAmbienceLevel(v: number): void {
  level = v;
  if (beds) beds.out.gain.value = v;
}
let next = { knock: 0, gull: 0, chuff: 0, whistle: 0, motif: 0 },
  chuffs = 0;

function setup(): Beds | null {
  const a = getAudio();
  if (!a) return null;
  const { ctx } = a;
  const out = ctx.createGain();
  out.gain.value = level;
  out.connect(a.out);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  const loop = (type: BiquadFilterType, f: number, q: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = f;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(filter).connect(g).connect(out);
    src.start();
    return g;
  };
  const t = ctx.currentTime;
  next = { knock: t + 1, gull: t + 4, chuff: t, whistle: t + 6, motif: t + 2 };
  return { ctx, noise, wind: loop('bandpass', 500, 0.5), rumble: loop('lowpass', 110, 0.7), out };
}

// A short note: an oscillator through an envelope, optionally through a lowpass (brass).
function note(b: Beds, at: number, f: number, vol: number, len: number, type: OscillatorType, cut = 0): void {
  const o = b.ctx.createOscillator();
  o.type = type;
  o.frequency.value = f;
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + (cut ? 0.04 : 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  let node: AudioNode = o;
  if (cut) {
    const f2 = b.ctx.createBiquadFilter();
    f2.type = 'lowpass';
    f2.frequency.value = cut;
    node = o.connect(f2);
  }
  node.connect(g).connect(b.out);
  o.start(at);
  o.stop(at + len + 0.05);
}
// A burst of filtered noise (a knock, a chuff).
function burst(b: Beds, at: number, f: number, q: number, vol: number, len: number): void {
  const src = b.ctx.createBufferSource();
  src.buffer = b.noise;
  const filter = b.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = f;
  filter.Q.value = q;
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(g).connect(b.out);
  src.start(at, Math.random() * 1.5);
  src.stop(at + len + 0.05);
}
const semi = (n: number) => ROOT * 2 ** (n / 12);

export function updateAmbience(mix: number): void {
  if (!beds) beds = setup();
  const b = beds;
  if (!b) return;
  const t = b.ctx.currentTime,
    wood = 1 - mix,
    steam = mix;
  b.wind.gain.setTargetAtTime(0.05 * wood + 0.015 * steam, t, 0.3);
  b.rumble.gain.setTargetAtTime(0.16 * steam, t, 0.3);
  const ahead = t + 0.15; // schedule a little ahead of the clock
  for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] < t - 0.5) next[k] = t; // back from a hidden tab

  // Wood age: two or three knocks of a mallet, now and then; a gull.
  if (next.knock < ahead) {
    if (wood > 0.05) {
      const n = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < n; k++) burst(b, next.knock + k * 0.32, 900, 6, 0.22 * wood, 0.12);
    }
    next.knock += 3 + Math.random() * 4;
  }
  if (next.gull < ahead) {
    if (wood > 0.05)
      for (let k = 0; k < 2; k++) {
        const o = b.ctx.createOscillator(),
          g = b.ctx.createGain(),
          at = next.gull + k * 0.28;
        o.type = 'triangle';
        o.frequency.setValueAtTime(1500, at);
        o.frequency.exponentialRampToValueAtTime(950, at + 0.22);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(0.035 * wood, at + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
        o.connect(g).connect(b.out);
        o.start(at);
        o.stop(at + 0.3);
      }
    next.gull += 8 + Math.random() * 8;
  }
  // Steam: a chuff on every beat (accented every fourth), and a whistle now and then.
  if (next.chuff < ahead) {
    if (steam > 0.05) burst(b, next.chuff, 700, 1.2, (chuffs % 4 === 0 ? 0.2 : 0.11) * steam, 0.16);
    chuffs++;
    next.chuff += 0.42;
  }
  if (next.whistle < ahead) {
    if (steam > 0.05) {
      note(b, next.whistle, 880, 0.035 * steam, 1.1, 'sine');
      note(b, next.whistle, 1108, 0.03 * steam, 1.1, 'sine');
    }
    next.whistle += 12 + Math.random() * 10;
  }
  // The island motif, re-arranged: plucked (wood) and brass with an oompah bass (steam), crossfaded.
  if (next.motif < ahead) {
    MOTIF.forEach((n, k) => {
      const at = next.motif + k * 0.3;
      if (wood > 0.05) note(b, at, semi(n), 0.07 * wood, 0.45, 'triangle');
      if (steam > 0.05) {
        note(b, at, semi(n), 0.05 * steam, 0.32, 'sawtooth', 1400);
        if (k % 2 === 0) note(b, at, semi(n - 24), 0.07 * steam, 0.22, 'sawtooth', 500);
      }
    });
    next.motif += 14 + Math.random() * 6;
  }
}
