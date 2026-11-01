// Frame profiler handle: `window.boogle.prof` (src/loop.ts: per-hook CPU ms over the last 240 frames), and with
// `?prof=1` an overlay of the most expensive sections (src/debug/prof-overlay.ts, its own chunk). Local, dev and live.
import { onStart, prof } from '../loop.ts';

onStart(() => {
  if (window.boogle) window.boogle.prof = prof;
});
const params = new URLSearchParams(location.search);
if (Number(params.get('prof')) > 0) import('../debug/prof-overlay.ts');
// `?gpuinfo=1`: the adapter's features and limits in a panel, to read on a device without Web Inspector.
if (Number(params.get('gpuinfo')) > 0) onStart(() => import('../debug/gpu-info.ts').then((m) => m.showGpuInfo()));
