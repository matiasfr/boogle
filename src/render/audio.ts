// One gesture-unlocked context. All levels are Local presentation, never simulation state.
// source → authored bus → user category → duck → compressor → profile → user master → speakers.
// Character/work/social feed SFX; they never bypass its parent trim.
import { clamp } from '../math-pure.ts';
import { audioSettings, onAudioSettingChange, type AudioSetting } from './audio-tuning.ts';

export type Bus = 'music' | 'ambience' | 'sfx' | 'ui' | 'voice' | 'character' | 'work' | 'social';
const BUS_NAMES: readonly Bus[] = ['music', 'ambience', 'sfx', 'ui', 'voice', 'character', 'work', 'social'];
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
const duckDb = (bus: Bus) =>
  !voiceDucking
    ? 0
    : bus === 'music'
      ? audioSettings.duckMusicDb
      : bus === 'ambience'
        ? audioSettings.duckAmbienceDb
        : 0;
const w = window as Window & { webkitAudioContext?: typeof AudioContext };
const nav = navigator as Navigator & { audioSession?: { type: string } };

function smooth(param: AudioParam, value: number) {
  if (!ctx) return;
  param.cancelAndHoldAtTime(ctx.currentTime);
  param.linearRampToValueAtTime(value, ctx.currentTime + 0.03);
}
function applyDuck() {
  if (!ctx) return;
  const seconds = (voiceDucking ? audioSettings.duckAttackMs : audioSettings.duckReleaseMs) / 1000;
  for (const [bus, nodes] of buses) {
    nodes.duck.gain.cancelAndHoldAtTime(ctx.currentTime);
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
  try {
    if (!ctx) {
      const AC = window.AudioContext || w.webkitAudioContext;
      if (!AC) return;
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
        duck.connect(bus === 'character' || bus === 'work' || bus === 'social' ? buses.get('sfx')!.authored : comp);
        buses.set(bus, { authored, user, duck });
      }
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
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
        effectiveGain: nodes
          ? nodes.authored.gain.value *
            nodes.user.gain.value *
            nodes.duck.gain.value *
            (bus === 'character' || bus === 'work' || bus === 'social'
              ? buses.get('sfx')!.authored.gain.value *
                buses.get('sfx')!.user.gain.value *
                buses.get('sfx')!.duck.gain.value
              : 1)
          : null,
        parent: bus === 'character' || bus === 'work' || bus === 'social' ? 'sfx' : null,
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
