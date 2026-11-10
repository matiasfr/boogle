// One gesture-unlocked context. All levels are Local presentation, never simulation state.
// source → authored bus → user category → duck → compressor → profile → user master → speakers.
// Character/work/social feed SFX; they never bypass its parent trim.
import { clamp } from '../math-pure.ts';
import { audioSettings, onAudioSettingChange, type AudioSetting } from './audio-tuning.ts';
import { startupWork } from '../boot/startup-frames.ts';

const BUS_NAMES = ['music', 'ambience', 'sfx', 'ui', 'voice', 'character', 'work', 'social'] as const;
export type Bus = (typeof BUS_NAMES)[number];
/** Buses that feed another bus instead of the compressor. Parents come first in BUS_NAMES. */
const PARENT: Partial<Record<Bus, Bus>> = { character: 'sfx', work: 'sfx', social: 'sfx' };
/** The voice-duck depth for each ducked bus. */
const DUCK: Partial<Record<Bus, AudioSetting>> = { music: 'duckMusicDb', ambience: 'duckAmbienceDb' };
const VOLUME_KEY = 'boogle.volume';
const MUTED_KEY = 'boogle.muted';
export const dbToGain = (db: number) => 10 ** (db / 20);

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode retains settings for this visit.
  }
}
const savedVolume = Number(stored(VOLUME_KEY) ?? 1);
let volume = savedVolume >= 0 && savedVolume <= 1 ? savedVolume : 1;
let muted = stored(MUTED_KEY) === '1';
let voiceDucking = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let profile: GainNode | null = null;
type BusNodes = { authored: GainNode; user: GainNode; duck: GainNode };
const buses = new Map<Bus, BusNodes>();
const masterGain = () => (muted ? 0 : volume * volume);
const authoredDb = (bus: Bus) => audioSettings[`${bus}Db`];
const duckDb = (bus: Bus) => {
  const key = DUCK[bus];
  return voiceDucking && key ? audioSettings[key] : 0;
};
const w = window as Window & { webkitAudioContext?: typeof AudioContext };
const nav = navigator as Navigator & { audioSession?: { type: string } };

/** Stops `param`'s automation at `now`, holding the value it has reached. Firefox has no cancelAndHoldAtTime (it threw
 * once a session on Daniel's Firefox 159, 10 November), so there it cancels and pins the current value instead. */
function holdParam(param: AudioParam, now: number) {
  if (typeof param.cancelAndHoldAtTime === 'function') return void param.cancelAndHoldAtTime(now);
  const value = param.value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(value, now);
}
/** A click-free 30 ms move to `value`, for live level edits. */
export function rampParam(param: AudioParam, value: number, now: number) {
  holdParam(param, now);
  param.linearRampToValueAtTime(value, now + 0.03);
}
function smooth(param: AudioParam, value: number) {
  if (ctx) rampParam(param, value, ctx.currentTime);
}
function applyDuck() {
  if (!ctx) return;
  const seconds = (voiceDucking ? audioSettings.duckAttackMs : audioSettings.duckReleaseMs) / 1000;
  for (const [bus, nodes] of buses) {
    holdParam(nodes.duck.gain, ctx.currentTime);
    nodes.duck.gain.setTargetAtTime(dbToGain(duckDb(bus)), ctx.currentTime, seconds);
  }
}
onAudioSettingChange((key: AudioSetting) => {
  if (!ctx) return; // Values survive until the first gesture; edits never unlock audio.
  for (const [bus, nodes] of buses) if (key === `${bus}Db`) smooth(nodes.authored.gain, dbToGain(authoredDb(bus)));
  if (key === 'profileDb' && profile) smooth(profile.gain, dbToGain(audioSettings.profileDb));
  if (key.startsWith('duck')) applyDuck();
});

function unlock() {
  create();
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}
/** The context and its graph, suspended until a gesture resumes it. */
function create() {
  const t = performance.now();
  try {
    if (!ctx) {
      const AC = window.AudioContext || w.webkitAudioContext;
      if (!AC) return;
      // Named in the startup frames (and a long frame past them): the 9 November iPhone's 440 ms load hitches fell
      // outside any frame's own work, around the first gesture.
      queueMicrotask(() => startupWork('audio unlock', performance.now() - t));
      if (nav.audioSession) nav.audioSession.type = 'playback';
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 6;
      profile = ctx.createGain();
      profile.gain.value = dbToGain(audioSettings.profileDb);
      master = ctx.createGain();
      master.gain.value = masterGain();
      comp.connect(profile).connect(master).connect(ctx.destination);
      for (const bus of BUS_NAMES) {
        const authored = ctx.createGain(),
          user = ctx.createGain(),
          duck = ctx.createGain();
        authored.gain.value = dbToGain(authoredDb(bus));
        user.gain.value = 1;
        duck.gain.value = dbToGain(duckDb(bus));
        authored.connect(user).connect(duck);
        const parent = PARENT[bus];
        duck.connect(parent ? buses.get(parent)!.authored : comp);
        buses.set(bus, { authored, user, duck });
      }
    }
  } catch {
    // Do not retain a half-built graph if the platform refused context creation.
    if (ctx) void ctx.close().catch(() => {});
    ctx = null;
    master = profile = null;
    buses.clear();
  }
}
for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown']) {
  addEventListener(ev, unlock, { passive: true, capture: true });
}
/** Behind the loading screen (main.ts): building the context took 220-250 ms on a Mac, in the first gesture's frame,
 * which on a first visit is Jump in and the arrival's first frame (10 November 2026). It waits suspended, silent; the
 * first gesture only resumes it. */
export const prepareAudio = () => create();

/** Voice chat holds the mic (src/features/voice.ts): Safari's audio session must allow recording while it does, and
 * opening the mic can interrupt this context on iOS, so it is resumed (a later gesture's unlock retries too). */
export function micSession(on: boolean) {
  if (nav.audioSession) nav.audioSession.type = on ? 'play-and-record' : 'playback';
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}
/** The context for a level meter that never reaches the speakers (voice chat's talking dots); null before unlock. */
export const meterContext = () => (ctx?.state === 'running' ? ctx : null);

export function getAudio(bus: Bus = 'sfx'): { ctx: AudioContext; out: AudioNode } | null {
  const nodes = buses.get(bus);
  return ctx?.state === 'running' && nodes ? { ctx, out: nodes.authored } : null;
}
/** Measurement taps the exact final output, including user master/mute, without changing the graph. */
export function audioOutput(): { ctx: AudioContext; out: AudioNode } | null {
  return ctx?.state === 'running' && master ? { ctx, out: master } : null;
}
export const getVolume = () => volume;
export const isMuted = () => muted;
function applyVolume() {
  if (master) smooth(master.gain, masterGain());
}
export function setVolume(v: number) {
  if (!Number.isFinite(v)) return;
  volume = clamp(v, 0, 1);
  store(VOLUME_KEY, String(volume));
  applyVolume();
}
export function setMuted(on: boolean) {
  muted = on;
  store(MUTED_KEY, on ? '1' : '0');
  applyVolume();
}
/** A bus's own gain stages times its parent's: what reaches the compressor. */
function chainGain(bus: Bus): number {
  const nodes = buses.get(bus)!,
    parent = PARENT[bus];
  const own = nodes.authored.gain.value * nodes.user.gain.value * nodes.duck.gain.value;
  return parent ? own * chainGain(parent) : own;
}
export function audioSnapshot() {
  return {
    context: ctx?.state ?? 'locked',
    settings: { ...audioSettings },
    volume,
    muted,
    voiceDucking,
    masterGain: master?.gain.value ?? null,
    profileGain: profile?.gain.value ?? null,
    buses: BUS_NAMES.map((bus) => {
      const nodes = buses.get(bus);
      return {
        bus,
        authoredDb: authoredDb(bus),
        userVolume: 1,
        duckDb: duckDb(bus),
        authoredGain: nodes?.authored.gain.value ?? null,
        userGain: nodes?.user.gain.value ?? null,
        duckGain: nodes?.duck.gain.value ?? null,
        effectiveGain: nodes ? chainGain(bus) : null,
        parent: PARENT[bus] ?? null,
      };
    }),
  };
}
// Keep the existing boolean lifecycle for this pass; owned overlapping claims are ordered step 6.
export function duckForVoice(on: boolean) {
  voiceDucking = on;
  applyDuck();
}
export const onBeat = (t: number, freq = 0) => ({ t, freq });
