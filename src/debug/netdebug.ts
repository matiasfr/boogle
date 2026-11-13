// Local room/replica diagnostics, enabled by ?netdebug=1. No classic hash protocol remains.
import { onStart } from '../loop.ts';
import { net } from '../netplay/net.ts';
import { BUILD } from '../build-id.ts';
import { otherBuilds } from '../netplay/builds.ts';
import { worldStatus, world } from '../world/sync.ts';

onStart(() => {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;right:8px;bottom:8px;margin:0;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.6);' +
    'color:#d8f3ff;font:11px/1.35 ui-monospace,monospace;pointer-events:none;z-index:50;white-space:pre';
  document.body.append(el);
  let rtt: number | null = null;
  setInterval(() => {
    net.room
      ?.linkStats()
      .then((rows) => (rtt = rows[0]?.rttMs ?? null))
      .catch(() => {});
    const s = worldStatus();
    const other = [...otherBuilds()].map(([b, n]) => `${b ?? 'old'} x${n}`).join(', ');
    el.textContent =
      `sync ${s.mode}${s.ready ? '' : ' (waiting for clock)'}  tick ${world.tick}\n` +
      'shared state: server replication\n' +
      `room ${net.room?.transport ?? 'none'}${net.room?.isLead() ? '  (lead)' : ''}${rtt != null ? `  rtt ${rtt} ms` : ''}` +
      `\nbuild ${BUILD}  ${other ? `mixed: ${other}` : 'same as everyone heard'}`;
  }, 500);
});
