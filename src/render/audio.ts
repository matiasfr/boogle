// One shared WebAudio context for cosmetic feature sounds (impact, ping, honk), and the game's mix. Created and resumed
// on the first user gesture, since browsers refuse to start audio before one. Mobile browsers only count the end of a
// tap (touchend / pointerup / click) as a gesture, not touchstart / pointerdown. Local only; never read by the simulation.
//
//   music, ambience -> duck \
//   sfx, ui, voice ----------> master (the player's volume) -> compressor -> speakers
import { clamp } from '../math-pure.ts';

export type Bus = 'music' | 'ambience' | 'sfx' | 'ui' | 'voice';
// The balance between the buses, in dB. Balance a kind of sound here, not in each sound.
const MIX_DB: Record<Bus, number> = { music: -13, ambience: 0, sfx: 0, ui: 0, voice: -12 };
const MASTER = 0.8;
const DUCK_DB = -9; // music and ambience while an NPC speaks
const VOLUME_KEY = 'boogle.volume';
const MUTED_KEY = 'boogle.muted';
export const dbToGain = (db: number) => 10 ** (db / 20);

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode: the setting lasts this visit
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode
  }
}
const savedVolume = Number(stored(VOLUME_KEY) ?? 1);
let volume = savedVolume >= 0 && savedVolume <= 1 ? savedVolume : 1;
let muted = stored(MUTED_KEY) === '1';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let duck: GainNode | null = null;
let buses: Record<Bus, GainNode> | null = null;
// Squared, so the slider's middle sounds about half as loud.
const masterGain = () => (muted ? 0 : MASTER * volume * volume);
// Older Safari's prefix, and iOS's audio session (not in the DOM types yet).
const w = window as Window & { webkitAudioContext?: typeof AudioContext };
const nav = navigator as Navigator & { audioSession?: { type: string } };

function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || w.webkitAudioContext;
      if (!AC) return;
      // iOS: play through the ring/silent switch like a game, instead of being muted as an "ambient" sound.
      if (nav.audioSession) nav.audioSession.type = 'playback';
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); // several players honking at once should stay pleasant
      comp.threshold.value = -20;
      comp.ratio.value = 6;
      const m = (master = ctx.createGain());
      m.gain.value = masterGain();
      m.connect(comp);
      comp.connect(ctx.destination);
      const d = (duck = ctx.createGain());
      d.connect(m);
      const make = (bus: Bus, to: AudioNode) => {
        const g = ctx!.createGain();
        g.gain.value = dbToGain(MIX_DB[bus]);
        g.connect(to);
        return g;
      };
      buses = {
        music: make('music', d),
        ambience: make('ambience', d),
        sfx: make('sfx', m),
        ui: make('ui', m),
        voice: make('voice', m),
      };
    }
    // 'interrupted' is iOS after a call or app switch; it needs a resume just like 'suspended'.
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}
for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown']) {
  addEventListener(ev, unlock, { passive: true, capture: true });
}

// { ctx, out } once audio is running, otherwise null (callers just skip the sound). `out` is the bus's input.
export function getAudio(bus: Bus = 'sfx'): { ctx: AudioContext; out: AudioNode } | null {
  if (!ctx || !buses || ctx.state !== 'running') return null;
  return { ctx, out: buses[bus] };
}

// The player's volume (0-1) and mute, from the pause view; remembered in this browser.
export const getVolume = () => volume;
export const isMuted = () => muted;
function applyVolume() {
  if (ctx && master) master.gain.setTargetAtTime(masterGain(), ctx.currentTime, 0.015);
}
export function setVolume(v: number) {
  volume = clamp(v, 0, 1);
  store(VOLUME_KEY, String(volume));
  applyVolume();
}
export function setMuted(on: boolean) {
  muted = on;
  store(MUTED_KEY, on ? '1' : '0');
  applyVolume();
}

// Music and ambience dip while an NPC speaks, and ease back after.
export function duckForVoice(on: boolean) {
  if (ctx && duck) duck.gain.setTargetAtTime(on ? dbToGain(DUCK_DB) : 1, ctx.currentTime, on ? 0.03 : 0.25);
}

// Musical sound effects currently play at the requested time and pitch, without added latency.
export const onBeat = (t: number, freq = 0, grid: 8 | 16 = 16) => {
  void grid;
  return { t, freq };
};
