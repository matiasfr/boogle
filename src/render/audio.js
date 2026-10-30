// One shared WebAudio context for cosmetic feature sounds (impact, ping, honk). Created and resumed on the first
// user gesture, since browsers refuse to start audio before one. Mobile browsers only count the end of a tap
// (touchend / pointerup / click) as a gesture, not touchstart / pointerdown. Local only; never read by the simulation.
let ctx = null;
let master = null;

function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      // iOS: play through the ring/silent switch like a game, instead of being muted as an "ambient" sound.
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); // several players honking at once should stay pleasant
      comp.threshold.value = -20;
      comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(comp);
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
  return ctx && ctx.state === 'running' ? { ctx, out: master } : null;
}
