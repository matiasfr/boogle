// The sound of the place when nothing is happening: the sea, far gulls and a little breeze, under everything. Local and
// cosmetic, on the shared audio context's ambience bus (./audio.ts), so it starts after the first gesture, ducks under
// voices and follows the player's volume. docs/research/audio-and-music.md, section 12: brown noise rather than hiss,
// slow unrelated periods, one-shots far away on long gaps. Serves DESIGN.md 1 (Toys before chores: a place worth being in
// with nothing to do). src/features/ambience.ts starts it in the live game.
//
// Turn it off with &ambience=off; shift the whole bed with &ambience=-6 (dB). Everything else is in LEVELS and FEEL.
import { dbToGain, getAudio } from './audio.ts';
import { brownNoiseBuffer, darkReverbBuffer } from './noise.ts';
import { smoothstep } from '../math.ts';
import { cam, me } from '../player/player.ts';
import { defineKind, spawn } from '../entity/entity.ts';

// All in dB, before the bus and master. To hear them away from the game: node dev/audio/render.ts --only place.
const LEVELS = {
  bed: 0, // the whole thing: tune this first
  surfCrest: -21, // a wave at its top, standing on the beach
  surfRest: -38, // between waves: low, so the sea breathes rather than hisses
  inland: -11, // the sea as a whole, far from any water (0 on the shore)
  breeze: -32, // the wind inland, at its gustiest
  breezeAtShore: -9, // the breeze on the shore, on top of that: the sea takes over there
  gull: -29, // a near gull's call, before its distance
  gullFar: -9, // the farthest gull, on top of that
};

const FEEL = {
  rise: [2.6, 4.6], // s: a wave coming in
  fall: [4.5, 8], // s: its wash back
  pause: [1, 5], // s: before the next one
  swell: [0.4, 1], // how big a wave is, of surfCrest; rests are heard too
  crestHz: [600, 1150], // the low-pass at a wave's top: inland (the highs don't carry), then on the shore
  restHz: 320, // the low-pass between waves
  gullGap: [28, 75], // s: between calls on the shore; long silences are the point
  gullGapInland: 1.7, // ... times this, inland
  seaNear: 18, // m to the sea (height counts): the full wash from here
  seaFar: 150, // ... down to `inland` by here
  riverNear: 6, // m to the river: the same, much tighter, since the gorge walls hide it
  riverFar: 50,
  riverWash: 0.7, // how much of the shore's wash the river bank gets
  spread: 0.22, // how much the side the water is on leads when you turn
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const between = ([a, b]: number[]) => rand(a!, b!);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- how far the water is
// Two distance fields on a 4 m grid, baked once when the sound starts (a chamfer transform).
const CELL = 4,
  EXT = 260,
  CELLS = (EXT * 2) / CELL + 1;
const RIVER_WITHIN = 185; // m from the spire: water further out is the sea, even where the river meets it

function distances(water: Uint8Array) {
  const d = new Float32Array(CELLS * CELLS);
  for (let k = 0; k < d.length; k++) d[k] = water[k] ? 0 : 1e6;
  const STEPS = [
    [-1, 0, CELL],
    [0, -1, CELL],
    [-1, -1, CELL * 1.414],
    [1, -1, CELL * 1.414],
  ] as const;
  for (const dir of [1, -1])
    for (let j = dir > 0 ? 0 : CELLS - 1; j >= 0 && j < CELLS; j += dir)
      for (let i = dir > 0 ? 0 : CELLS - 1; i >= 0 && i < CELLS; i += dir) {
        let best = d[i + j * CELLS]!;
        for (const [sx, sz, cost] of STEPS) {
          const a = i + sx * dir,
            b = j + sz * dir;
          if (a >= 0 && b >= 0 && a < CELLS && b < CELLS) best = Math.min(best, d[a + b * CELLS]! + cost);
        }
        d[i + j * CELLS] = best;
      }
  return d;
}
// Place's land (src/place/terrain.ts and layout.ts), which startAmbience loads; the railway has loaded it already.
type Land = { H: (x: number, z: number) => number; ORIGIN: { x: number; z: number }; SPIRE: { x: number; z: number } };
let land: Land | null = null;
let seaField: Float32Array | null = null,
  riverField: Float32Array | null = null,
  bakeMs = 0;
// One height sample a cell, sorted into sea and river.
function bakeFields({ H, ORIGIN, SPIRE }: Land) {
  const t0 = performance.now();
  const sea = new Uint8Array(CELLS * CELLS),
    river = new Uint8Array(CELLS * CELLS);
  for (let j = 0; j < CELLS; j++)
    for (let i = 0; i < CELLS; i++) {
      const x = -EXT + i * CELL + ORIGIN.x,
        z = -EXT + j * CELL + ORIGIN.z;
      if (H(x, z) >= 0) continue;
      const fromSpire = Math.hypot(x - ORIGIN.x - SPIRE.x, z - ORIGIN.z - SPIRE.z);
      (fromSpire >= RIVER_WITHIN ? sea : river)[i + j * CELLS] = 1;
    }
  seaField = distances(sea);
  riverField = distances(river);
  bakeMs = performance.now() - t0;
}
// Off the grid is open sea: distance 0.
function fieldAt(f: Float32Array, x: number, z: number) {
  const { ORIGIN } = land!;
  const i = Math.round((x - ORIGIN.x + EXT) / CELL),
    j = Math.round((z - ORIGIN.z + EXT) / CELL);
  return i < 0 || j < 0 || i >= CELLS || j >= CELLS ? 0 : f[i + j * CELLS]!;
}

// ---------------------------------------------------------------- the graph
type Side = { filter: BiquadFilterNode; wave: GainNode; level: GainNode; next: number };
type Bed = {
  ctx: AudioContext;
  out: GainNode;
  dry: GainNode;
  verb: GainNode;
  sides: [Side, Side];
  breeze: { filter: BiquadFilterNode; gain: GainNode; next: number };
};
let bed: Bed | null = null;
let nextGull = 0,
  nextField = 0,
  wash = 0.5, // 0 inland .. 1 on the shore
  voices = 0;
const USER_DB = Number(new URLSearchParams(location.search).get('ambience')) || 0;
const OFF = new URLSearchParams(location.search).get('ambience') === 'off';
const bedGain = () => dbToGain(LEVELS.bed + USER_DB);

function setup(): Bed | null {
  const a = getAudio('ambience');
  if (!a) return null;
  const { ctx } = a;
  const t = ctx.currentTime;
  if (!seaField) bakeFields(land!);
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.setTargetAtTime(bedGain(), t, 1.5); // eases in, so the first press doesn't switch the sea on
  out.connect(a.out);
  const dry = ctx.createGain();
  dry.connect(out);
  const conv = ctx.createConvolver();
  conv.buffer = darkReverbBuffer(ctx, 1.5);
  const verb = ctx.createGain();
  verb.connect(conv).connect(out);

  const brown = brownNoiseBuffer(ctx, 6);
  // One looping brown noise through a high-pass (the iPad's speaker starts at 100 Hz; sub only pumps the compressor), a
  // moving low-pass and a gain. Different rates, so no two ever line up.
  const noise = (rate: number, type: BiquadFilterType, hz: number, q: number) => {
    const src = ctx.createBufferSource();
    src.buffer = brown;
    src.loop = true;
    src.playbackRate.value = rate;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 150;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = hz;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(hp).connect(filter).connect(gain);
    src.start(0, rand(0, brown.duration));
    voices++;
    return { filter, gain };
  };
  const side = (rate: number, pan: number, next: number): Side => {
    const n = noise(rate, 'lowpass', FEEL.restHz, 0.5);
    n.gain.gain.value = dbToGain(LEVELS.surfRest);
    const level = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    n.gain.connect(level).connect(p).connect(dry);
    return { filter: n.filter, wave: n.gain, level, next };
  };
  const breeze = noise(0.93, 'bandpass', 450, 0.9);
  breeze.gain.connect(dry);
  nextGull = t + rand(14, 30);
  nextField = t;
  return {
    ctx,
    out,
    dry,
    verb,
    sides: [side(1, -0.6, t + rand(0, 2)), side(0.89, 0.6, t + rand(3, 6))],
    breeze: { ...breeze, next: t },
  };
}

// ---------------------------------------------------------------- the sea and the breeze
function wave(s: Side, t: number) {
  const at = Math.max(s.next, t),
    rise = between(FEEL.rise),
    fall = between(FEEL.fall),
    size = between(FEEL.swell);
  const crest = dbToGain(LEVELS.surfCrest) * size,
    rest = dbToGain(LEVELS.surfRest),
    hz = lerp(FEEL.crestHz[0]!, FEEL.crestHz[1]!, wash) * (0.7 + 0.3 * size);
  s.wave.gain.cancelScheduledValues(at);
  s.wave.gain.setTargetAtTime(crest, at, rise / 3);
  s.wave.gain.setTargetAtTime(rest, at + rise, fall / 3);
  s.filter.frequency.cancelScheduledValues(at);
  s.filter.frequency.setTargetAtTime(hz, at, rise / 3);
  s.filter.frequency.setTargetAtTime(FEEL.restHz, at + rise, fall / 3);
  s.next = at + rise + fall + between(FEEL.pause);
}

// Where the player stands sets the level; which way they face leans it towards the water's side.
function follow(b: Bed, t: number) {
  const p = me.body!.position,
    y = Math.max(0, p.y);
  const reach = (f: Float32Array, x: number, z: number) => Math.sqrt(fieldAt(f, x, z) ** 2 + y * y);
  const sea = smoothstep(FEEL.seaFar, FEEL.seaNear, reach(seaField!, p.x, p.z)),
    river = smoothstep(FEEL.riverFar, FEEL.riverNear, reach(riverField!, p.x, p.z));
  wash = Math.max(sea, river * FEEL.riverWash);
  // Which way is the nearer water: down the slope of the distance field.
  const f = sea >= river ? seaField! : riverField!,
    dx = fieldAt(f, p.x - CELL, p.z) - fieldAt(f, p.x + CELL, p.z),
    dz = fieldAt(f, p.x, p.z - CELL) - fieldAt(f, p.x, p.z + CELL),
    len = Math.hypot(dx, dz) || 1,
    right = ((dx * Math.cos(cam.yaw) - dz * Math.sin(cam.yaw)) / len) * wash * FEEL.spread;
  const level = dbToGain(LEVELS.inland * (1 - wash));
  b.sides[0].level.gain.setTargetAtTime(level * (1 - right), t, 1.2);
  b.sides[1].level.gain.setTargetAtTime(level * (1 + right), t, 1.2);
}

function gust(b: Bed, t: number) {
  const atShore = LEVELS.breezeAtShore * wash;
  b.breeze.filter.frequency.setTargetAtTime(rand(300, 620), t, 2.5);
  b.breeze.gain.gain.setTargetAtTime(dbToGain(LEVELS.breeze + atShore) * rand(0.35, 1), t, 2.5);
  b.breeze.next = t + rand(3, 7);
}

// ---------------------------------------------------------------- gulls
// A herring gull's "kyow" at a distance: a reedy tone that snaps up and falls away, with a little rasp, through a nasal
// band. The distance is the low-pass and the reverb: never bright, never close.
type Call = { to: AudioNode; f0: number };
function kyow(b: Bed, c: Call, at: number, len: number, vol: number, drop: number) {
  const { ctx } = b;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  const f = c.f0;
  o.frequency.setValueAtTime(f * 0.8, at);
  o.frequency.exponentialRampToValueAtTime(f * 1.14, at + len * 0.18);
  o.frequency.setValueAtTime(f * 1.14, at + len * 0.3);
  o.frequency.exponentialRampToValueAtTime(f * drop, at + len);
  const rasp = ctx.createOscillator();
  rasp.frequency.value = rand(24, 34);
  const depth = ctx.createGain();
  depth.gain.value = f * 0.022;
  rasp.connect(depth).connect(o.frequency);
  const nose = ctx.createBiquadFilter();
  nose.type = 'bandpass';
  nose.frequency.value = rand(1250, 1650);
  nose.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.035);
  g.gain.setValueAtTime(vol, at + len * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(nose).connect(g).connect(c.to);
  for (const n of [o, rasp]) {
    n.start(at);
    n.stop(at + len + 0.02);
  }
  voices += 2;
  o.onended = () => (voices -= 2);
}

export type GullPattern = 'mew' | 'pair' | 'long' | 'answered';
// `far` 0..1. The patterns: a lone drawn-out mew, a pair, or the long call, a run that hurries and tires.
export function gullCall(pattern: GullPattern, far = Math.random(), pan = rand(-0.85, 0.85)): void {
  const b = bed;
  if (!b) return;
  const { ctx } = b;
  const at = ctx.currentTime + 0.05;
  const vol = dbToGain(LEVELS.gull + LEVELS.gullFar * far);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lerp(2700, 1600, far);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  const dry = ctx.createGain();
  dry.gain.value = lerp(0.7, 0.45, far);
  const wet = ctx.createGain();
  wet.gain.value = lerp(0.25, 0.4, far);
  lp.connect(p);
  p.connect(dry).connect(b.dry);
  p.connect(wet).connect(b.verb);
  const c: Call = { to: lp, f0: rand(640, 900) };
  if (pattern === 'mew') kyow(b, c, at, rand(0.75, 1.05), vol, rand(0.62, 0.74));
  else if (pattern === 'long') {
    const n = 3 + Math.floor(Math.random() * 3);
    let when = at,
      gap = rand(0.46, 0.56);
    for (let k = 0; k < n; k++) {
      const len = k ? rand(0.26, 0.34) : rand(0.5, 0.62);
      kyow(b, c, when, len, vol * (1 - k * 0.12), rand(0.68, 0.78));
      when += (k ? gap : len) + rand(0.02, 0.08);
      gap *= 0.9;
    }
  } else {
    kyow(b, c, at, rand(0.42, 0.55), vol, rand(0.66, 0.76));
    kyow(b, c, at + rand(0.55, 0.72), rand(0.36, 0.48), vol * 0.8, rand(0.62, 0.72));
  }
  // Another gull further off answers, on the other side.
  if (pattern === 'answered') setTimeout(() => gullCall('pair', Math.min(1, far + 0.4), -pan * 0.8), rand(1800, 4000));
}
const PATTERNS: GullPattern[] = ['mew', 'mew', 'pair', 'pair', 'long', 'answered'];

// ---------------------------------------------------------------- each frame
function update() {
  if (!me.body || !me.entered || document.hidden) return;
  if (!bed) bed = setup();
  const b = bed;
  if (!b) return;
  const t = b.ctx.currentTime;
  if (t >= nextField) {
    follow(b, t);
    nextField = t + 0.25;
  }
  for (const s of b.sides) if (s.next < t + 0.15) wave(s, t);
  if (b.breeze.next < t) gust(b, t);
  if (t >= nextGull) {
    gullCall(PATTERNS[Math.floor(Math.random() * PATTERNS.length)]!);
    nextGull = t + between(FEEL.gullGap) * lerp(FEEL.gullGapInland, 1, wash);
  }
}

// What's sounding, for the listening checks in a page (`await import('/src/render/ambience.ts')`).
export const ambienceState = () => ({
  on: !!bed,
  wash,
  voices,
  bakeMs,
  out: bed?.out.gain.value ?? 0,
  sides: bed?.sides.map((s) => s.level.gain.value) ?? [],
});

defineKind('ambience', { update: -3 });
let started = false;
/** Starts the bed once Place's land has loaded; the sound itself waits for the first gesture. Once a page. */
export async function startAmbience(): Promise<void> {
  if (OFF || started) return;
  started = true;
  const [{ H }, { ORIGIN, SPIRE }] = await Promise.all([
    import('../place/terrain.ts'),
    import('../place/layout.ts'),
  ]);
  land = { H, ORIGIN, SPIRE };
  // Baked now, while the page loads, not in the first frame after Jump in: the arrival's roll began with it (10 November).
  bakeFields(land);
  spawn({ kind: 'ambience', update });
  // A hidden tab stops frames, so nothing new is scheduled: the bed fades instead of holding one note of sea.
  document.addEventListener('visibilitychange', () => {
    if (bed) bed.out.gain.setTargetAtTime(document.hidden ? 0 : bedGain(), bed.ctx.currentTime, 0.3);
  });
}
