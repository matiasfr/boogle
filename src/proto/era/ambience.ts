// The era's ambience bed (docs/research/era-progression.md, recs 1, 4 and 7; docs/research/audio-and-music.md,
// "Ambience"): two synthesized beds that crossfade at the swap, judged with the screen off. Called each frame by
// ./index.ts with the crossfade (0 era 1 .. 1 era 2). Local, quiet, built on the shared audio context
// (src/render/audio.ts) once it is running.
//
// Wood age (v2, after the owner's sound audit: "less white noise, and more chill"). Mostly tonal, mostly quiet:
// - surf: brown noise (no hiss), low-passed, swelling in slow waves, left and right on their own unrelated periods;
// - a breeze far under it, a band of brown noise that wanders;
// - a soft pad in F (Fmaj9, Dm9, Bbmaj9), one chord every 20 s or so, sometimes resting for a whole chord;
// - now and then a phrase of one to three marimba-like notes on the F pentatonic, through a dotted-eighth echo;
// - far off and rare: a gull, a mallet on wood, a rope creaking; all through one dark reverb, panned.
// Steam: a low works rumble, a chuffing rhythm and a distant whistle. Over both, the same island motif comes round
// every so often, re-arranged per era rather than replaced: marimba in the wood age, brass with an oompah bass in
// steam.
import { getAudio } from '../../render/audio.ts';

const LEVEL = 0.5; // the whole bed, under the game's own sounds
const MOTIF = [0, 2, 4, 7, 4]; // semitones over the root: the island motif
const ROOT = 349.23; // F4: the wood bed's key, and the steam brass's
const BEAT = 60 / 84; // the bed's slow pulse (84 BPM): note spacing and the echo
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const CHORDS = [
  [65, 69, 72, 76, 79], // Fmaj9, from F4: above where phone and tablet speakers roll off
  [62, 65, 69, 72, 76], // Dm9
  [58, 62, 65, 69, 72], // Bbmaj9
];
const PLUCKS = [65, 67, 69, 72, 74, 77, 79, 81]; // F major pentatonic, F4 to A5
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

type Surf = { filter: BiquadFilterNode; gain: GainNode; foam: GainNode; next: number };
type Beds = {
  ctx: AudioContext;
  noise: AudioBuffer; // white: the steam bed's chuffs and the wood knock's click
  out: GainNode;
  wood: GainNode; // everything of the wood age, faded by the crossfade
  dry: GainNode; // wood one-shots and the pad, into `wood`
  echo: GainNode; // send: the dotted-eighth echo, which feeds the reverb
  verb: GainNode; // send: the reverb
  surf: Surf[];
  breeze: { filter: BiquadFilterNode; gain: GainNode };
  wind: GainNode; // steam: a thin white wind
  rumble: GainNode;
};
let beds: Beds | null = null;
let next = { pad: 0, pluck: 0, gull: 0, knock: 0, creak: 0, breeze: 0, chuff: 0, whistle: 0, motif: 0 },
  chuffs = 0,
  chord = 0;

function setup(): Beds | null {
  const a = getAudio();
  if (!a) return null;
  const { ctx } = a;
  const sr = ctx.sampleRate;
  const out = ctx.createGain();
  out.gain.value = LEVEL;
  out.connect(a.out);
  const gain = (v: number, to: AudioNode) => {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(to);
    return g;
  };
  const wood = gain(0, out),
    dry = gain(1, wood);

  // The reverb: a dark, 3.5 s tail of decaying noise, low-passed as it fades (air soaks up the highs first).
  const len = Math.round(sr * 3.5),
    ir = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let k = 0; k < len; k++) {
      const u = k / len,
        damp = 0.5 - 0.42 * u; // the one-pole's coefficient: brighter early, darker late
      lp += damp * (Math.random() * 2 - 1 - lp);
      d[k] = lp * (1 - u) ** 2.2 * (k < sr * 0.012 ? k / (sr * 0.012) : 1);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const verb = gain(1, conv);
  conv.connect(gain(0.55, wood));
  // The echo: dotted eighths, each repeat duller and thinner, into the reverb.
  const echo = ctx.createGain(),
    delay = ctx.createDelay(2);
  delay.delayTime.value = BEAT * 0.75;
  const lo = ctx.createBiquadFilter(),
    hi = ctx.createBiquadFilter();
  lo.type = 'lowpass';
  lo.frequency.value = 1800;
  hi.type = 'highpass';
  hi.frequency.value = 350;
  echo.connect(delay).connect(lo).connect(hi);
  hi.connect(gain(0.32, delay)); // feedback
  hi.connect(gain(0.5, wood));
  hi.connect(gain(0.6, verb));

  // Noise: white for the steam bed and clicks; brown (integrated white) for surf and breeze, so there is no hiss.
  const noise = ctx.createBuffer(1, sr * 2, sr);
  const w = noise.getChannelData(0);
  for (let k = 0; k < w.length; k++) w[k] = Math.random() * 2 - 1;
  const brown = ctx.createBuffer(1, sr * 6, sr);
  const b = brown.getChannelData(0);
  for (let k = 0, v = 0; k < b.length; k++) b[k] = (v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02) * 3.5;
  const loop = (buf: AudioBuffer, type: BiquadFilterType, f: number, q: number, to: AudioNode, pan = 0) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = f;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    const hp = ctx.createBiquadFilter(); // nothing under 120 Hz: small speakers can't play it, the compressor would
    hp.type = 'highpass';
    hp.frequency.value = 120;
    src.connect(hp).connect(filter).connect(g).connect(p).connect(to);
    src.start(0, Math.random() * buf.duration);
    return { filter, gain: g };
  };
  const t = ctx.currentTime;
  next = {
    pad: t + 0.3,
    pluck: t + 3,
    gull: t + 9,
    knock: t + 14,
    creak: t + 21,
    breeze: t,
    chuff: t,
    whistle: t + 6,
    motif: t + 16,
  };
  return {
    ctx,
    noise,
    out,
    wood,
    dry,
    echo,
    verb,
    surf: [-0.55, 0.55].map((pan) => ({
      ...loop(brown, 'lowpass', 300, 0.5, dry, pan),
      foam: loop(noise, 'bandpass', 2600, 0.6, dry, pan).gain, // a breath of air on each crest, and only there
      next: t + rand(0, 4),
    })),
    breeze: loop(brown, 'bandpass', 450, 0.9, dry),
    wind: loop(noise, 'bandpass', 500, 0.5, out).gain,
    rumble: loop(noise, 'lowpass', 110, 0.7, out).gain,
  };
}

// Routes a one-shot through a panner into the wood bed: `dry` straight, `wet` into the reverb, `echo` into the echo.
function sendTo(b: Beds, node: AudioNode, pan: number, dry: number, wet: number, echo = 0): void {
  const p = b.ctx.createStereoPanner();
  p.pan.value = pan;
  node.connect(p);
  const g = (v: number, to: AudioNode) => {
    if (!v) return;
    const s = b.ctx.createGain();
    s.gain.value = v;
    p.connect(s).connect(to);
  };
  g(dry, b.dry);
  g(wet, b.verb);
  g(echo, b.echo);
}
// An envelope: silence, up to `vol` in `att` s, then an exponential fall to nothing by `len`.
function env(b: Beds, at: number, vol: number, att: number, len: number): GainNode {
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + att);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  return g;
}
function osc(b: Beds, at: number, type: OscillatorType, f: number, len: number): OscillatorNode {
  const o = b.ctx.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.start(at);
  o.stop(at + len + 0.05);
  return o;
}

// ---------------------------------------------------------------- wood age
// One chord of the pad: two slightly detuned soft voices per note, a slow swell in and a long fade out, under a
// low-pass, so it reads as warmth rather than a synth.
function pad(b: Beds, at: number, notes: number[], len: number): void {
  const lp = b.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(500, at);
  lp.frequency.linearRampToValueAtTime(rand(800, 1100), at + len * 0.5);
  lp.frequency.linearRampToValueAtTime(450, at + len);
  lp.Q.value = 0.3;
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(0.006, at + 6);
  g.gain.setValueAtTime(0.006, at + len - 8);
  g.gain.linearRampToValueAtTime(0.0001, at + len);
  lp.connect(g);
  sendTo(b, g, 0, 0.8, 0.5);
  for (const n of notes)
    for (const [type, cents] of [
      ['sine', -5],
      ['triangle', 5],
    ] as const) {
      const o = osc(b, at, type, hz(n), len);
      o.detune.value = cents + rand(-2, 2);
      o.connect(lp);
    }
}
// A marimba-ish note: a sine with a quick fourth-harmonic "tok" on top, a soft click, a woody decay.
function mallet(b: Beds, at: number, f: number, vol: number, pan: number, echo: number): void {
  const g = env(b, at, vol, 0.004, rand(1.3, 1.9));
  osc(b, at, 'sine', f, 2).connect(g);
  const tok = env(b, at, vol * 0.3, 0.002, 0.14);
  osc(b, at, 'sine', f * 3.93, 0.2).connect(tok);
  const both = b.ctx.createGain();
  g.connect(both);
  tok.connect(both);
  sendTo(b, both, pan, 0.9, 0.35, echo);
}
// A gull far off: a "kee-ow", up and down, a little wobble, dulled by distance and mostly reverb.
function gull(b: Beds, at: number, pan: number, vol: number): void {
  const f0 = rand(1050, 1300),
    o = osc(b, at, 'triangle', f0, 0.45);
  o.frequency.setValueAtTime(f0, at);
  o.frequency.linearRampToValueAtTime(f0 * 1.25, at + 0.07);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.72, at + 0.4);
  const lp = b.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1900;
  const g = env(b, at, vol, 0.05, 0.42);
  o.connect(lp).connect(g);
  sendTo(b, g, pan, 0.35, 0.9);
}
// A mallet on timber, far away: a low hollow thump and a soft click.
function knock(b: Beds, at: number, pan: number, vol: number): void {
  const f = rand(170, 230),
    o = osc(b, at, 'sine', f, 0.3);
  o.frequency.setValueAtTime(f * 1.4, at);
  o.frequency.exponentialRampToValueAtTime(f, at + 0.02);
  const g = env(b, at, vol, 0.002, 0.22);
  o.connect(g);
  const src = b.ctx.createBufferSource();
  src.buffer = b.noise;
  const bp = b.ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1100;
  bp.Q.value = 4;
  const c = env(b, at, vol * 0.4, 0.001, 0.03);
  src.connect(bp).connect(c);
  src.start(at, Math.random() * 1.5);
  src.stop(at + 0.06);
  const both = b.ctx.createGain();
  g.connect(both);
  c.connect(both);
  sendTo(b, both, pan, 0.5, 0.7);
}
// A rope or a hull creaking: a slow stick-slip pulse train through a woody resonance, its rate bending.
function creak(b: Beds, at: number, pan: number, vol: number): void {
  const len = rand(0.7, 1.3),
    r = rand(22, 34),
    o = osc(b, at, 'square', r, len);
  o.frequency.setValueAtTime(r, at);
  o.frequency.linearRampToValueAtTime(r * rand(0.6, 1.5), at + len);
  const bp = b.ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = rand(550, 800);
  bp.Q.value = 7;
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + len * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, at + len);
  o.connect(bp).connect(g);
  sendTo(b, g, pan, 0.4, 0.7);
}

function wood(b: Beds, t: number, ahead: number, on: boolean): void {
  // Surf: each side swells in its own slow waves (a rise, a longer wash back), opening the low-pass as it comes in.
  for (const s of b.surf)
    if (s.next < ahead) {
      const at = s.next,
        rise = rand(2.2, 3.6),
        fall = rand(4, 6.5),
        peak = rand(0.03, 0.045);
      s.gain.gain.cancelScheduledValues(at);
      s.gain.gain.setTargetAtTime(peak, at, rise / 3);
      s.gain.gain.setTargetAtTime(0.008, at + rise, fall / 3);
      s.foam.gain.cancelScheduledValues(at);
      s.foam.gain.setTargetAtTime(peak * 0.25, at + rise * 0.5, rise / 3);
      s.foam.gain.setTargetAtTime(0, at + rise, fall / 5);
      s.filter.frequency.cancelScheduledValues(at);
      s.filter.frequency.setTargetAtTime(rand(520, 700), at, rise / 3);
      s.filter.frequency.setTargetAtTime(260, at + rise, fall / 3);
      s.next = at + rise + fall + rand(0, 2.5);
    }
  // The breeze wanders: a new centre and level every few seconds, approached slowly.
  if (next.breeze < ahead) {
    b.breeze.filter.frequency.setTargetAtTime(rand(280, 650), t, 2.5);
    b.breeze.gain.gain.setTargetAtTime(rand(0.004, 0.012), t, 2.5);
    next.breeze += rand(3, 7);
  }
  if (!on) return; // the steam bed has taken over: no new wood-age events
  if (next.pad < ahead) {
    const len = rand(18, 26);
    // Rest for a whole chord now and then: silence is part of the bed (Breath of the Wild, Minecraft).
    if (Math.random() < 0.8) pad(b, next.pad, CHORDS[chord], len);
    chord = (chord + 1 + Math.floor(Math.random() * 2)) % CHORDS.length;
    next.pad += len - 5; // the next chord swells in under this one's fade
  }
  if (next.pluck < ahead) {
    if (Math.random() < 0.75) {
      const n = 1 + Math.floor(Math.random() * 3),
        pan = rand(-0.4, 0.4);
      let k = PLUCKS.indexOf(pick(PLUCKS));
      for (let i = 0, at = next.pluck; i < n; i++, at += BEAT * pick([0.5, 0.75, 1, 1.5])) {
        mallet(b, at, hz(PLUCKS[k]), rand(0.035, 0.06), pan, i === n - 1 ? 0.5 : 0.2);
        k = Math.max(0, Math.min(PLUCKS.length - 1, k + pick([-2, -1, 1, 2])));
      }
    }
    next.pluck += rand(7, 16);
  }
  if (next.gull < ahead) {
    const n = 1 + Math.floor(Math.random() * 3),
      pan = rand(-0.8, 0.8),
      vol = rand(0.012, 0.022);
    for (let k = 0; k < n; k++) gull(b, next.gull + k * rand(0.38, 0.55), pan, vol * (1 - k * 0.15));
    next.gull += rand(20, 45);
  }
  if (next.knock < ahead) {
    const n = 2 + Math.floor(Math.random() * 2),
      pan = rand(-0.7, 0.7);
    for (let k = 0; k < n; k++) knock(b, next.knock + k * BEAT * 0.75 + rand(-0.02, 0.02), pan, rand(0.05, 0.08));
    next.knock += rand(16, 34);
  }
  if (next.creak < ahead) {
    creak(b, next.creak, rand(-0.8, 0.8), rand(0.03, 0.05));
    next.creak += rand(25, 55);
  }
}

// ---------------------------------------------------------------- steam
// A short note: an oscillator through an envelope, optionally through a lowpass (brass).
function note(b: Beds, at: number, f: number, vol: number, len: number, type: OscillatorType, cut = 0): void {
  const g = env(b, at, vol, cut ? 0.04 : 0.005, len);
  let node: AudioNode = osc(b, at, type, f, len);
  if (cut) {
    const f2 = b.ctx.createBiquadFilter();
    f2.type = 'lowpass';
    f2.frequency.value = cut;
    node = node.connect(f2);
  }
  node.connect(g).connect(b.out);
}
// A burst of filtered noise (a chuff).
function burst(b: Beds, at: number, f: number, q: number, vol: number, len: number): void {
  const src = b.ctx.createBufferSource();
  src.buffer = b.noise;
  const filter = b.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = f;
  filter.Q.value = q;
  const g = env(b, at, vol, 0.01, len);
  src.connect(filter).connect(g).connect(b.out);
  src.start(at, Math.random() * 1.5);
  src.stop(at + len + 0.05);
}

function steam(b: Beds, ahead: number, steam: number): void {
  // A chuff on every beat (accented every fourth), and a whistle now and then.
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
}

// The island motif, re-arranged: unhurried marimba into the echo (wood), brass with an oompah bass (steam).
function motif(b: Beds, at: number, steam: number): void {
  MOTIF.forEach((n, k) => {
    const f = ROOT * 2 ** (n / 12);
    if (steam < 0.95) mallet(b, at + k * BEAT * 0.75, f, 0.05, 0.15, 0.25);
    if (steam > 0.05) {
      note(b, at + k * 0.3, f, 0.05 * steam, 0.32, 'sawtooth', 1400);
      if (k % 2 === 0) note(b, at + k * 0.3, f / 4, 0.07 * steam, 0.22, 'sawtooth', 500);
    }
  });
}

export function updateAmbience(mix: number): void {
  if (!beds) beds = setup();
  const b = beds;
  if (!b) return;
  const t = b.ctx.currentTime;
  b.wood.gain.setTargetAtTime(1 - mix, t, 0.3);
  b.wind.gain.setTargetAtTime(0.015 * mix, t, 0.3);
  b.rumble.gain.setTargetAtTime(0.16 * mix, t, 0.3);
  const ahead = t + 0.15; // schedule a little ahead of the clock
  for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] < t - 0.5) next[k] = t; // back from a hidden tab
  for (const s of b.surf) if (s.next < t - 0.5) s.next = t;
  steam(b, ahead, mix);
  wood(b, t, ahead, mix < 0.95);
  if (next.motif < ahead) {
    motif(b, next.motif, mix);
    next.motif += mix < 0.5 ? rand(45, 75) : rand(14, 20);
  }
}
