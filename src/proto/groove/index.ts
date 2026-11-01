// The groove prototype (research docs/research/audio-and-music.md, recs 1-3, 5, 7, 9, 12; loaded by
// src/features/proto-groove.ts behind ?proto=groove). An 8-bar house loop in four layers on one clock every tab shares,
// switched by what you're doing: idle, moving, riding, and a one-beat drop when you wipe out. Sound effects land on its
// grid and in its key. The music is a synthesized placeholder until the owner's stems are in assets/audio/ (stems.ts).
// Serves DESIGN.md 4 (Cooperation is automatic: everyone hears the same downbeat) and 10 (Slapstick over precision).
// Local: each tab plays its own music from shared time; nothing is sent.
//
// Two clocks (web.dev, "A tale of two clocks"): a 25 ms timer schedules every 16th due in the next 100 ms on the
// AudioContext's clock, mapped from sharedSeconds() (src/netplay/shared-time.ts) through a smoothed offset, so the
// downbeat lands together in every tab and survives main-thread stalls.
import './groove.css';
import { onFrame } from '../../loop.ts';
import { getAudio, installMixer, setNoteSnap } from '../../render/audio.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { me } from '../../player/player.ts';
import { carry } from '../../physics/platforms.ts';
import { SPAWN } from '../../constants.ts';
import { createMixer, dbToGain, MIX, type Mixer } from './mixer.ts';
import { stepLen, stepTime, nextGrid, barOf, posOf, parseChord, snapToChord } from './grid.ts';
import { pickManifest, isSynth, loadStems, type GrooveState } from './stems.ts';
import { kick, hat, bass, stab, slide } from './synth.ts';

const V = new URLSearchParams(location.search).get('v');
const VARIANT = V === 'silent-first' || V === 'always' ? V : 'base';

export const GROOVE = {
  lookahead: 0.1, // s scheduled ahead on the audio clock
  everyMs: 25, // scheduler wake-up
  moveSpeed: 1.2, // m/s that counts as moving
  holdS: 3, // s the groove keeps going after you stop
  spawnR: 22, // m around spawn that counts as "near spawn" (silent when idle, base variant)
  splatSpeed: 13.5, // m/s fall speed that counts as a wipeout (the same as feel.ts's splat)
};

const song = pickManifest();
const chords = song.chords.map(parseChord);
const LEN = stepLen(song);
const BEAT = LEN * 4;
const LOOP = song.bars * 16;

// ---------------------------------------------------------------- mixer and clock
let mixer: Mixer | null = null;
installMixer((ctx, master) => (mixer = createMixer(ctx, master)).bus);

let off = NaN; // audio-clock time minus the shared time heard at that moment
let samples = 0;
let outAt = { ctx: 0, perf: 0 }; // the latest output timestamp, for the trace
function syncClock(ctx: AudioContext) {
  const now = performance.now();
  const ts = ctx.getOutputTimestamp?.();
  const ok = ts && ts.contextTime && ts.performanceTime;
  const c = ok ? ts.contextTime! : ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  const p = ok ? ts.performanceTime! : now;
  outAt = { ctx: c, perf: p };
  const sample = c - (sharedSeconds() - (now - p) / 1000);
  // sharedSeconds() steps with the 10 Hz world tick; smooth it (faster for the first seconds, while a joining tab's
  // world clock settles), but jump when it jumps (a snapshot load).
  const k = Math.max(0.05, 0.3 - samples * 0.0025);
  samples++;
  off = off === off && Math.abs(sample - off) < 0.2 ? off + (sample - off) * k : sample;
}
const ctxAt = (shared: number) => shared + off;

// Sound effects on the grid and in the current chord (rec 2; src/render/audio.ts onBeat).
setNoteSnap((t, freq, grid) => {
  if (off !== off) return { t, freq };
  const s = nextGrid(song, t - off, grid);
  const tones = chords[barOf(song, Math.round(s / LEN))].tones;
  return { t: Math.max(t, ctxAt(s)), freq: freq > 0 ? snapToChord(freq, tones) : freq };
});

// ---------------------------------------------------------------- layers and state
const layers: Record<string, GainNode> = {};
let state: GrooveState = 'silent',
  playing: GrooveState = 'silent', // what the layers are set to (changes on bar lines)
  wasPlaying: GrooveState = 'silent', // the bar before, so fading layers keep their notes
  dropAt = -1; // the step of a pending one-beat drop

const layerOn = (s: GrooveState, l: string) => song.states[s].includes(l);
const layerGain = (l: string) => dbToGain(song.gainDb?.[l] ?? 0);

function layer(ctx: AudioContext, music: AudioNode, l: string) {
  if (!layers[l]) {
    layers[l] = ctx.createGain();
    layers[l].gain.value = 0;
    layers[l].connect(music);
  }
  return layers[l];
}

// ---------------------------------------------------------------- the placeholder's patterns
// Voicings near A3, so the stabs move by small steps between chords.
const voicing = (tones: number[]) => tones.slice(0, 4).map((pc) => 57 + ((pc - 9 + 12) % 12));
const bassNote = (root: number) => 36 + root;

function synthStep(ctx: AudioContext, music: AudioNode, step: number, t: number) {
  const pos = posOf(step);
  const bar = barOf(song, step);
  const ch = chords[bar];
  const live = (l: string) => layerOn(playing, l) || layerOn(wasPlaying, l);
  const sparse = playing === 'sparse';
  if (live('kick') && pos % 4 === 0) kick(ctx, layer(ctx, music, 'kick'), t);
  if (live('hats')) {
    const g = layer(ctx, music, 'hats');
    if (pos % 4 === 2) hat(ctx, g, t, sparse ? 0.7 : 1, true);
    else if (!sparse && pos % 2 === 1) hat(ctx, g, t, 0.55, false);
    else if (!sparse) hat(ctx, g, t, 0.3, false);
  }
  if (live('bass')) {
    const g = layer(ctx, music, 'bass');
    if (pos % 4 === 2) bass(ctx, g, t, bassNote(ch.root), LEN * 1.6);
    if (pos === 15 && bar % 2 === 1) bass(ctx, g, t, bassNote(ch.root) + 12, LEN * 0.8);
  }
  if (live('stabs')) {
    const hits = sparse ? (bar % 2 === 0 ? [2] : []) : bar % 2 === 0 ? [2, 10] : [2, 7, 10];
    if (hits.includes(pos)) stab(ctx, layer(ctx, music, 'stabs'), t, voicing(ch.tones), BEAT, sparse ? 0.3 : 1);
  }
}

// ---------------------------------------------------------------- stems
let buffers: Record<string, AudioBuffer> | null = null,
  stemsFrom = -1; // the step the stems were last started from
function stemsStep(ctx: AudioContext, music: AudioNode, step: number, t: number) {
  if (!buffers || posOf(step) !== 0) return;
  const inLoop = ((step % LOOP) + LOOP) % LOOP;
  if (stemsFrom >= 0 && inLoop !== 0) return; // started already; the next start is the loop's top
  stemsFrom = step;
  for (const [l, buf] of Object.entries(buffers)) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(layer(ctx, music, l));
    s.start(t, inLoop * LEN); // tails ring past the loop's end into the next pass
  }
}

// ---------------------------------------------------------------- scheduler
const trace: { step: number; bar: number; beat: number; wall: number }[] = [];
let last = -1; // the last step scheduled
let loading = false;

function setLayers(t: number) {
  for (const l of Object.keys(song.layers)) {
    const g = layers[l];
    if (!g) continue;
    const on = layerOn(playing, l);
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(on ? layerGain(l) : 0, t, on ? 0.01 : BEAT * 0.4);
  }
}

function scheduleStep(ctx: AudioContext, music: AudioNode, step: number, t: number) {
  const pos = posOf(step);
  if (pos === 0 && playing !== state) {
    wasPlaying = playing;
    playing = state;
    setLayers(t);
  } else if (pos === 0) wasPlaying = playing;
  if (pos % 4 === 0) {
    trace.push({
      step,
      bar: Math.floor(step / 16),
      beat: pos / 4,
      wall: performance.timeOrigin + outAt.perf + (t - outAt.ctx) * 1000,
    });
    if (trace.length > 64) trace.shift();
    if (dropAt >= 0 && step >= dropAt) {
      // The pratfall: one beat of silence with a slide down through it, then the groove comes back (rec 7).
      dropAt = -1;
      if (playing !== 'silent') {
        for (const l of Object.keys(layers)) {
          const g = layers[l].gain;
          g.cancelScheduledValues(t);
          g.setTargetAtTime(0, t, 0.008);
          g.setTargetAtTime(layerOn(playing, l) ? layerGain(l) : 0, t + BEAT, 0.01);
        }
        slide(ctx, music, t, BEAT);
      }
    }
  }
  if (isSynth(song)) synthStep(ctx, music, step, t);
  else stemsStep(ctx, music, step, t);
}

function schedule() {
  const a = getAudio('music');
  if (!a) return;
  const { ctx, out } = a;
  mixer?.update();
  syncClock(ctx);
  if (!isSynth(song) && !buffers && !loading) {
    loading = true;
    void loadStems(ctx, song).then((b) => (buffers = b));
  }
  const first = Math.ceil((ctx.currentTime - off) / LEN);
  if (last < first - 1 || last > first + 64) last = first - 1; // just started, or the clock jumped
  for (let s = last + 1; ctxAt(stepTime(song, s)) < ctx.currentTime + GROOVE.lookahead; s++) {
    scheduleStep(ctx, out, s, Math.max(ctx.currentTime, ctxAt(stepTime(song, s))));
    last = s;
  }
}
setInterval(schedule, GROOVE.everyMs);

// ---------------------------------------------------------------- what you're doing
let px = NaN,
  pz = 0,
  py = 0,
  vy = 0,
  speed = 0,
  movedAt = -1e9,
  everMoved = false,
  wasDown = false,
  tumbles = carry.tumbles;

function wipeout() {
  if (dropAt < 0) dropAt = last + 1; // the next beat at or after what's scheduled
  while (posOf(dropAt) % 4) dropAt++;
}

onFrame(
  ({ dt }) => {
    const b = me.body;
    if (!me.entered || !b || dt <= 0) {
      state = 'silent';
      return;
    }
    const p = b.position;
    if (px === px) {
      const h = Math.hypot(p.x - px, p.z - pz) / dt;
      speed += (h - speed) * Math.min(1, dt * 4);
      const nvy = (p.y - py) / dt;
      if (vy < -GROOVE.splatSpeed && nvy > -1) wipeout(); // a hard landing
      vy += (nvy - vy) * Math.min(1, dt * 20);
    }
    px = p.x;
    pz = p.z;
    py = p.y;
    if (me.down && !wasDown) wipeout(); // knocked flat by the ball
    wasDown = me.down;
    if (carry.tumbles !== tumbles) wipeout(); // a tumble off a moving deck
    tumbles = carry.tumbles;

    const now = performance.now();
    if (speed > GROOVE.moveSpeed || me.wish.lengthSq() > 0.01) {
      movedAt = now;
      everMoved = true;
    }
    const nearSpawn = Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z) < GROOVE.spawnR;
    if (carry.on) state = 'full';
    else if (now - movedAt < GROOVE.holdS * 1000) state = 'groove';
    else if (VARIANT === 'always') state = 'sparse';
    else if (VARIANT === 'silent-first') state = everMoved ? 'sparse' : 'silent';
    else state = nearSpawn ? 'silent' : 'sparse';
    chip();
  },
  { phase: 'late' },
);

// ---------------------------------------------------------------- the chip: state, beat and a music mute
const el = document.createElement('button');
el.className = 'groove-chip';
el.title = 'Music on or off (?proto=groove)';
const dot = document.createElement('span');
dot.className = 'groove-dot';
const label = document.createElement('span');
el.append(dot, label);
(document.querySelector('.hud') ?? document.body).append(el);
el.addEventListener('click', () => {
  MIX.musicMuted = !MIX.musicMuted;
  mixer?.setDb('music', MIX.db.music);
});

let shown = '';
function chip() {
  const s = sharedSeconds();
  const beat = Math.floor(s / BEAT);
  const phase = s / BEAT - beat;
  const bar = (Math.floor(beat / 4) % song.bars) + 1;
  const text = MIX.musicMuted ? '♪ off' : `♪ ${playing} · ${bar}.${(beat % 4) + 1}`;
  if (text !== shown) label.textContent = shown = text;
  const flash = playing === 'silent' || MIX.musicMuted ? 0 : Math.max(0, 1 - phase * 3);
  dot.style.transform = `scale(${1 + flash * 0.6})`;
  dot.style.opacity = String(0.35 + flash * 0.65);
  el.classList.toggle('down', beat % 4 === 0 && flash > 0);
}

// For the two-tab timing check and live tuning in the console.
Object.assign(window, { __groove: { GROOVE, MIX, song, trace, state: () => ({ state, playing, off, VARIANT }) } });
