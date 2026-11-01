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

// { ctx, out } once audio is running, otherwise null (callers just skip the sound).
export function getAudio() {
  return ctx && master && ctx.state === 'running' ? { ctx, out: master } : null;
}
