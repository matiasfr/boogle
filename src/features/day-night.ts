// Day and night: a 20-minute cycle with a sun and a phased moon (src/render/sky.ts), on the shared world clock
// (src/sim/sky-clock.ts), so everyone on the island sees the same time of day.
//
// `?tod=0.8` holds this tab's sky at a time of day (0 sunrise, 0.3 noon, 0.6 sunset, 0.8 midnight) and `&moon=0.5` at a
// moon phase (0 new, 0.5 full), to judge a look without waiting for it. Display only: the world clock is untouched.
import { onFrame, onStart } from '../loop.ts';
import { createSky, updateSky, skyDebug } from '../render/sky.ts';

const q = new URLSearchParams(location.search);
const num = (k: string) => (q.has(k) && Number.isFinite(Number(q.get(k))) ? Number(q.get(k)) : null);
const tod = num('tod');

onStart(() => {
  createSky();
  if (tod !== null) skyDebug.preview(tod, num('moon'));
  if (window.boogle) window.boogle.sky = skyDebug; // debug handle: boogle.sky.preview(0.55)
});
// After the world tick (order -10), before the other per-frame features.
onFrame(({ dt }) => updateSky(dt), { order: -5 });
