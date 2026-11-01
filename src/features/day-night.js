// Day and night: a 20-minute cycle with a smiling sun and a phased, sleepy moon (src/render/sky.js), on the shared world clock
// (src/sim/sky-clock.ts), so everyone on the island sees the same time of day.
import { onFrame, onStart } from '../loop.ts';
import { createSky, updateSky, skyDebug } from '../render/sky.js';

onStart(() => {
  createSky();
  if (window.boogle) window.boogle.sky = skyDebug; // debug handle: boogle.sky.preview(0.55)
});
// After the world tick (order -10), before the other per-frame features.
onFrame(({ dt, elapsed }) => updateSky(dt, elapsed), { order: -5 });
