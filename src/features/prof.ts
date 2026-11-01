// Frame profiler handle: `window.boogle.prof` (src/loop.ts: per-hook CPU ms over the last 240 frames), and with
// `?prof=1` an overlay of the most expensive sections (src/debug/prof-overlay.ts, its own chunk). Local, dev and live.
// `window.boogle.boot`: the boot timeline (src/boot/timeline.ts): .line() for one line, .timeline() for the marks,
// .done (a promise) once the game is interactive and in a room.
import { onStart, prof } from '../loop.ts';
import { bootLine, bootTimeline, bootDone } from '../boot/timeline.ts';

onStart(() => {
  if (!window.boogle) return;
  window.boogle.prof = prof;
  window.boogle.boot = { line: bootLine, timeline: bootTimeline, done: bootDone };
});
const params = new URLSearchParams(location.search);
if (Number(params.get('prof')) > 0) import('../debug/prof-overlay.ts');
// `?gpuinfo=1`: the adapter's features and limits in a panel, to read on a device without Web Inspector.
if (Number(params.get('gpuinfo')) > 0) onStart(() => import('../debug/gpu-info.ts').then((m) => m.showGpuInfo()));
