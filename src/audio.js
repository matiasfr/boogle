// One shared WebAudio context for cosmetic feature sounds (impact, ping, honk). Created and resumed on the first
// user gesture, since browsers refuse to start audio before one. Local only; never read by the simulation.
let ctx = null;
let master = null;

function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); // several players honking at once should stay pleasant
      comp.threshold.value = -20;
      comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}
for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, unlock, { passive: true });

// { ctx, out } once audio is running, otherwise null (callers just skip the sound).
export function getAudio() {
  return ctx && ctx.state === 'running' ? { ctx, out: master } : null;
}
