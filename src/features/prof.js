// Frame profiler handle: `window.boogle.prof` (src/loop.ts: per-hook CPU ms over the last 240 frames), and with
// `?prof=1` an overlay of the most expensive sections (src/debug/prof-overlay.js, its own chunk). Local, dev and live.
import { onStart, prof } from '../loop.ts';

onStart(() => {
  if (window.boogle) window.boogle.prof = prof;
});
if (Number(new URLSearchParams(location.search).get('prof')) > 0) import('../debug/prof-overlay.js');
