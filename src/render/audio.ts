// One shared WebAudio context for cosmetic feature sounds (impact, ping, honk). Created and resumed on the first
// user gesture, since browsers refuse to start audio before one. Mobile browsers only count the end of a tap
// (touchend / pointerup / click) as a gesture, not touchstart / pointerdown. Local only; never read by the simulation.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
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
      m.gain.value = 0.8;
      m.connect(comp);
      comp.connect(ctx.destination);
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

// Mixer buses. Without a mixer installed every bus is the master; the groove prototype (src/proto/groove/, behind
// ?proto=groove) installs one with a gain per bus and the music ducked under big sound effects.
export type Bus = 'music' | 'sfx' | 'ui' | 'voice';
type Mixer = (ctx: AudioContext, master: GainNode) => (bus: Bus) => AudioNode;
let makeMixer: Mixer | null = null;
let route: ((bus: Bus) => AudioNode) | null = null;
export function installMixer(make: Mixer) {
  makeMixer = make;
}

// { ctx, out } once audio is running, otherwise null (callers just skip the sound). `out` is the bus's input.
export function getAudio(bus: Bus = 'sfx'): { ctx: AudioContext; out: AudioNode } | null {
  if (!ctx || !master || ctx.state !== 'running') return null;
  if (makeMixer && !route) route = makeMixer(ctx, master);
  return { ctx, out: route ? route(bus) : master };
}

// When (AudioContext time) and at what pitch a musical sound effect plays: as asked, unless a music prototype snaps
// sound effects to its beat grid (`grid`: 16 = the next 16th note, 8 = the next 8th) and to its current chord (a
// pitch in Hz; 0 leaves an unpitched sound alone). The action itself never waits, only its sound.
type NoteSnap = (t: number, freq: number, grid: 8 | 16) => { t: number; freq: number };
let snap: NoteSnap | null = null;
export function setNoteSnap(fn: NoteSnap | null) {
  snap = fn;
}
export const onBeat = (t: number, freq = 0, grid: 8 | 16 = 16) => (snap ? snap(t, freq, grid) : { t, freq });
