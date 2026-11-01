// `?prof=1`: the frame's most expensive sections (avg and p95 CPU ms over the last 240 frames), twice a second.
// 'frame' is the whole frame's main-thread CPU, from before the physics step to the end of the render call; GPU time
// is not in it. Names are module paths (src/loop.ts).
import { onStart, prof } from '../loop.ts';

onStart(() => {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;right:8px;top:72px;margin:0;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.6);' +
    'color:#d8f3ff;font:11px/1.35 ui-monospace,monospace;pointer-events:none;z-index:50;white-space:pre';
  document.body.append(el);
  const ms = (x: number) => x.toFixed(2).padStart(6);
  setInterval(() => {
    const rows = prof.table(14);
    el.textContent = '   avg    p95  ms CPU\n' + rows.map((r) => `${ms(r.avg)} ${ms(r.p95)}  ${r.name}`).join('\n');
  }, 500);
});
