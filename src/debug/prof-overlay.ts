// `?prof=1`: the frame's most expensive sections (avg and p95 CPU ms over the last 240 frames), twice a second, and
// the GPU's time per frame (every render pass: shadow, scene, output) from WebGPU timestamp queries where the device
// has `timestamp-query` (scene.ts turns three's trackTimestamp on for ?prof=1). 'frame' is the whole frame's
// main-thread CPU, from before the physics step to the end of the render call; GPU time is not in it. Names are module
// paths (src/loop.ts). Also logs the adapter's features and limits to the console once (src/debug/gpu-info.ts).
import { onFrame, onStart, prof } from '../loop.ts';
import { renderer, rendererReady } from '../render/scene.ts';
import { gpuInfo } from './gpu-info.ts';

const WINDOW = 240;
const gpu = new Float32Array(WINDOW);
const sorted = new Float32Array(WINDOW);
let gpuN = 0,
  gpuHead = 0,
  timestamps = false;

rendererReady.then(
  () => {
    timestamps = !!(renderer.backend as unknown as { trackTimestamp?: boolean }).trackTimestamp;
    gpuInfo().then((t) => console.info('[gpuinfo]\n' + t));
  },
  () => {},
);

// Resolve last frame's queries each frame (three returns the pending promise if one is still mapping, and its query
// pool overflows if nobody resolves). Asynchronous, so the value lands a frame or two late.
const record = (ms: number | undefined) => {
  if (!ms || !(ms > 0)) return;
  gpu[gpuHead] = ms;
  gpuHead = (gpuHead + 1) % WINDOW;
  if (gpuN < WINDOW) gpuN++;
};
onFrame(
  () => {
    if (timestamps) renderer.resolveTimestampsAsync('render').then(record, () => {});
  },
  { phase: 'late', order: 1990 },
);

onStart(() => {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;right:8px;top:72px;margin:0;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.6);' +
    'color:#d8f3ff;font:11px/1.35 ui-monospace,monospace;pointer-events:none;z-index:50;white-space:pre';
  document.body.append(el);
  const ms = (x: number) => x.toFixed(2).padStart(6);
  setInterval(() => {
    const rows = prof.table(14);
    let gpuRow = timestamps ? '     -      -  GPU (waiting)\n' : '  GPU: no timestamp-query\n';
    if (gpuN) {
      sorted.set(gpu);
      const s = sorted.subarray(0, gpuN).sort();
      const avg = s.reduce((a, b) => a + b, 0) / gpuN;
      gpuRow = `${ms(avg)} ${ms(s[Math.floor(gpuN * 0.95)])}  GPU, all passes\n`;
    }
    el.textContent =
      '   avg    p95  ms\n' + gpuRow + rows.map((r) => `${ms(r.avg)} ${ms(r.p95)}  ${r.name}`).join('\n');
  }, 500);
});
