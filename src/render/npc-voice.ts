// Formant babble: a line of text becomes a plan (when each character shows, and the syllables it says), and one lane of
// Web Audio nodes (a saw through three parallel vowel filters) performs it. The plan is seeded by the line, so the same
// line in the same mood always comes out the same. Its numbers start from docs/research/npc-babble-voices.md (sections
// 4, 7 and 9). Cosmetic and local; never read by the sim. A new speaker is a new VoiceSpec.
import { dbToGain, duckForVoice, getAudio, rampParam } from './audio.ts';
import { noiseBuffer } from './noise.ts';
import { audioSettings, onAudioSettingChange } from './audio-tuning.ts';
import { hash2 } from '../math-pure.ts';
import { FNV_SEED, foldStr } from '../sim/hash.ts';

/** One line being spoken as it types. It owns the typing clock, so sound and text stay together. */
export type LineSpeech = {
  shownAt: (ms: number) => number; // characters shown this long after the line started
  update: (ms: number) => void;
  stop: () => void; // skipped, closed or replaced: silent at once
};

export type VoiceSpec = {
  baseHz: number;
  rangeSemis: number; // ordinary pitch movement, ±
  formantScale: number; // < 1 sounds larger, whatever the pitch
  brightnessHz: number;
  cps: number; // characters typed per second
  grainMs: readonly [number, number];
  vowels: readonly [number, number, number, number, number]; // a e i o u: the voice's mouth, weights adding to 1
};

/** The villagers' shared voice (the town's residents, the ring folk, the chatter): only pitch, size, brightness and
 * typing speed tell them apart. */
export const folkVoice = (baseHz: number, cps: number, formantScale: number, brightnessHz: number): VoiceSpec => ({
  baseHz,
  rangeSemis: 3,
  formantScale,
  brightnessHz,
  cps,
  grainMs: [55, 85],
  vowels: [0.3, 0.15, 0.2, 0.25, 0.1],
});

type Kind = 'open' | 'stop' | 'hiss' | 'soft';
export type Syllable = { at: number; ms: number; vowel: number; kind: Kind; semis: number; db: number };
type Plan = { revealAt: Float32Array; syllables: Syllable[] };

// First three formants: Hz, bandwidths (Hz) and levels (dB) of Csound's tenor vowels.
const VOWELS = [
  { hz: [650, 1080, 2650], bw: [80, 90, 120], db: [0, -6, -7] }, // a
  { hz: [400, 1700, 2600], bw: [70, 80, 100], db: [0, -14, -12] }, // e
  { hz: [290, 1870, 2800], bw: [40, 90, 100], db: [0, -15, -18] }, // i
  { hz: [400, 800, 2600], bw: [70, 80, 100], db: [0, -10, -12] }, // o
  { hz: [350, 600, 2700], bw: [40, 60, 100], db: [0, -20, -17] }, // u
] as const;
const VOWEL_OF: Record<string, number> = { a: 0, e: 1, i: 2, y: 2, o: 3, u: 4 };
const WIDEN = 1.6; // wider than the tables: narrow bands would miss the harmonics of a low voice
const MIN_GAP = 83; // ms between syllables: 12 a second at most
const RELEASE = 0.012; // s
const HORIZON = 100; // ms scheduled ahead
const MAKEUP = 0.9; // the dry voice peaks near -6 dBFS
const MOODS: Record<string, { semis: number; pace: number; range: number; grain: number; skip: number }> = {
  smile: { semis: 0, pace: 1, range: 1, grain: 1, skip: 0 },
  joy: { semis: 2, pace: 1.15, range: 1.2, grain: 1, skip: 0 },
  grump: { semis: -2, pace: 0.85, range: 0.8, grain: 0.85, skip: 0 },
  worry: { semis: 0, pace: 0.9, range: 0.6, grain: 1, skip: 0.12 },
};

// The n-th number of a line's seeded series, 0..1, so a frame stall or a skipped sound can't change the rest.
const rand = hash2;

const baseLetter = (c: string) => (c.normalize('NFD')[0] ?? c).toLowerCase();
const vowelOf = (c: string) => VOWEL_OF[baseLetter(c)];
function kindOf(c: string): Kind {
  const l = baseLetter(c);
  if (vowelOf(l) !== undefined) return 'open';
  if ('pbtdkgcq'.includes(l)) return 'stop';
  if ('szfvxhj'.includes(l)) return 'hiss';
  return 'soft';
}

// The pause after punctuation that ends a run ("...", '?"') and is followed by a space or the end, in ms.
function pauseAfter(text: string, i: number) {
  const next = text[i + 1];
  if (next !== undefined && next !== ' ' && next !== '\n') return 0;
  let run = '';
  for (let k = i; k >= 0 && /[,;:.!?…—"'”’)]/.test(text[k]!); k--) run = text[k]! + run;
  if (/…|\.\./.test(run)) return 300;
  if (/[.!?]/.test(run)) return 220;
  if (/[;:—]/.test(run)) return 150;
  return run.includes(',') ? 100 : 0;
}

// Where a word's sounds start: its first letter, then each later vowel group (a silent final e says nothing).
function onsets(word: string) {
  const out: { i: number; lead: string; vowel: string | undefined }[] = [];
  const letters = [...word.matchAll(/\p{L}|\p{N}/gu)].map((m) => m.index);
  for (let n = 0; n < letters.length; n++) {
    const i = letters[n]!;
    const c = word[i]!;
    const v = vowelOf(c) !== undefined;
    const prevV = n > 0 && vowelOf(word[letters[n - 1]!]!) !== undefined;
    const silent = baseLetter(c) === 'e' && n === letters.length - 1 && out.length > 0;
    if (n === 0 || (v && !prevV && !silent)) {
      out.push({ i, lead: v && n > 0 ? word[letters[n - 1]!]! : c, vowel: v ? c : undefined });
    }
  }
  const after = (i: number) => [...word.slice(i)].find((c) => vowelOf(c) !== undefined);
  for (const o of out) o.vowel ??= after(o.i);
  return out;
}

export function buildPlan(text: string, mood: string, v: VoiceSpec): Plan {
  const m = MOODS[mood] ?? MOODS.smile!;
  const seed = foldStr(FNV_SEED, `${mood}|${text}`);
  const step = 1000 / (v.cps * m.pace);
  const revealAt = new Float32Array(text.length);
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    revealAt[i] = t;
    t += step + pauseAfter(text, i);
  }

  // One word list per sentence, so each sentence gets its own fall and ending.
  const syllables: Syllable[] = [];
  let n = 0;
  for (const sentence of text.matchAll(/[^.!?…]+[.!?…"'”’)]*/gu)) {
    const from = syllables.length;
    const words = [...sentence[0].matchAll(/[\p{L}\p{N}]+(?:['’]\p{L}+)*/gu)];
    for (const w of words) {
      const shout = w[0].length > 1 && w[0] === w[0].toUpperCase() && /\p{L}/u.test(w[0]);
      for (const o of onsets(w[0])) {
        const at = revealAt[sentence.index + w.index + o.i]!;
        const last = syllables[syllables.length - 1];
        if (last && at - last.at < MIN_GAP) continue;
        if (rand(seed, n++) < m.skip) continue;
        const letter = o.vowel ? vowelOf(o.vowel)! : -1;
        syllables.push({
          at,
          ms: 0,
          vowel: letter >= 0 && rand(seed, n++) < 0.6 ? letter : pickVowel(v.vowels, rand(seed, n++)),
          kind: kindOf(o.lead),
          semis: (rand(seed, n++) * 2 - 1) * v.rangeSemis * m.range + (shout ? 1 : 0),
          db: shout ? 1.5 : 0,
        });
      }
    }
    // The contour: a fall across the sentence, then its ending (a question lifts, a statement drops).
    const count = syllables.length - from;
    const end = /\?/.test(sentence[0]) ? 3 : /!/.test(sentence[0]) ? 1 : /\./.test(sentence[0]) ? -2 : 0;
    for (let k = 0; k < count; k++) {
      const s = syllables[from + k]!;
      s.semis += m.semis - (1.5 * k) / Math.max(1, count - 1);
      if (k === 0) s.semis += 1; // announcing
      if (k >= count - 2) s.semis += (end * (k - (count - 3))) / 2;
    }
  }
  const [lo, hi] = v.grainMs;
  syllables.forEach((s, i) => {
    const next = syllables[i + 1];
    const room = (next ? next.at - s.at : 400) - RELEASE * 1000 - 2;
    s.ms = Math.max(24, Math.min(room, (lo + (hi - lo) * rand(seed, 5000 + i)) * m.grain));
  });
  return { revealAt, syllables };
}

function pickVowel(weights: readonly number[], x: number) {
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i]!;
    if (x < 0) return i;
  }
  return 0;
}

// One voice's nodes. Reused for a whole line, gone when it ends.
export function createLane(ctx: BaseAudioContext, out: AudioNode, v: VoiceSpec) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const env = ctx.createGain();
  env.gain.value = 0;
  const bright = ctx.createBiquadFilter();
  bright.type = 'lowpass';
  bright.frequency.value = v.brightnessHz;
  const cut = ctx.createGain();
  // Move the former voice-bus compensation to the phrase itself; retain vowel/formant and chatter proportions.
  const calibration = ctx.createGain();
  calibration.gain.value = dbToGain(audioSettings.voicePhraseDb);
  const releaseCalibration = onAudioSettingChange((key, value) => {
    if (key !== 'voicePhraseDb') return;
    rampParam(calibration.gain, dbToGain(value), ctx.currentTime);
  });
  env.connect(bright).connect(cut).connect(calibration).connect(out);
  const bands = [0, 1, 2].map(() => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const gain = ctx.createGain();
    osc.connect(filter).connect(gain).connect(env);
    return { filter, gain };
  });
  const nodes = [osc, env, bright, cut, calibration, ...bands.flatMap((b) => [b.filter, b.gain])];
  osc.onended = () => {
    releaseCalibration();
    nodes.forEach((n) => n.disconnect());
  };
  osc.start();

  function consonant(t: number, kind: Kind) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.05);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.value = (kind === 'stop' ? 2400 : 4800) * v.formantScale;
    const g = ctx.createGain();
    const [peak, ms] = kind === 'stop' ? [0.5, 0.006] : [0.14, 0.026];
    g.gain.setValueAtTime(peak, t);
    g.gain.setTargetAtTime(0, t + ms * 0.5, ms * 0.4);
    src.connect(f).connect(g).connect(bright);
    src.onended = () => [src, f, g].forEach((n) => n.disconnect());
    src.start(t);
    src.stop(t + ms * 3);
  }

  return {
    grain(s: Syllable, t: number) {
      const vowel = VOWELS[s.vowel]!;
      const hz = v.baseHz * 2 ** (s.semis / 12);
      const sec = s.ms / 1000;
      // The lips: a soft sound opens from a darker mouth and slower; a hiss voices only after its noise.
      const close = s.kind === 'open' ? 0.92 : s.kind === 'hiss' ? 0.95 : 0.7;
      const attack = s.kind === 'soft' ? 0.016 : s.kind === 'stop' ? 0.003 : 0.005;
      const voiceAt = s.kind === 'hiss' ? t + 0.016 : t;
      osc.frequency.setValueAtTime(hz * 0.97, t);
      osc.frequency.setTargetAtTime(hz, t, 0.012);
      bands.forEach((b, i) => {
        const f = vowel.hz[i]! * v.formantScale;
        b.filter.frequency.setValueAtTime(f * close, t);
        b.filter.frequency.setTargetAtTime(f, t, 0.012);
        b.filter.Q.setValueAtTime(f / (vowel.bw[i]! * v.formantScale * WIDEN), t);
        b.gain.gain.setValueAtTime(dbToGain(vowel.db[i]!), t);
      });
      const peak = MAKEUP * dbToGain(s.db);
      env.gain.setValueAtTime(0, voiceAt);
      env.gain.linearRampToValueAtTime(peak, voiceAt + attack);
      env.gain.setValueAtTime(peak, t + Math.max(sec, attack + 0.01));
      env.gain.linearRampToValueAtTime(0, t + Math.max(sec, attack + 0.01) + RELEASE);
      if (s.kind === 'stop' || s.kind === 'hiss') consonant(t, s.kind);
    },
    // The line ran out: its last syllable rings out.
    end(t: number) {
      osc.stop(t);
    },
    // Skipped, closed or replaced: gone within about 15 ms.
    stop(now: number) {
      cut.gain.setTargetAtTime(0, now, 0.004);
      osc.stop(now + 0.03);
    },
  };
}

// The session the talk box runs: it reveals text by the plan's clock and schedules a short way ahead. With no audio yet
// (no gesture, an interrupted iPad) the text still types, and only syllables after audio arrives speak.
export function speak(text: string, mood: string, v: VoiceSpec): LineSpeech {
  const { revealAt, syllables } = buildPlan(text, mood, v);
  let shown = 0;
  let next = 0;
  let lane: ReturnType<typeof createLane> | null = null;
  let audio: ReturnType<typeof getAudio> = null;
  let zero = 0; // audio time at ms = 0
  let done = false;
  return {
    shownAt(ms) {
      while (shown < text.length && revealAt[shown]! <= ms) shown++;
      return shown;
    },
    update(ms) {
      if (done) return;
      if (!lane) {
        audio = getAudio('voice');
        if (!audio) return;
        lane = createLane(audio.ctx, audio.out, v);
        zero = audio.ctx.currentTime - ms / 1000;
        duckForVoice(true);
      }
      const now = audio!.ctx.currentTime;
      for (; next < syllables.length && syllables[next]!.at <= ms + HORIZON; next++) {
        const s = syllables[next]!;
        const t = zero + s.at / 1000;
        if (t >= now - 0.02) lane.grain(s, Math.max(t, now)); // a stall drops what it missed, never a burst
      }
      if (next === syllables.length) {
        const last = syllables[next - 1];
        lane.end(Math.max(now, zero + (last ? (last.at + last.ms) / 1000 : 0)) + RELEASE + 0.02);
        duckForVoice(false);
        done = true;
      }
    },
    stop() {
      if (done) return;
      done = true;
      if (lane) {
        lane.stop(audio!.ctx.currentTime);
        duckForVoice(false);
      }
    },
  };
}
