// Desync visibility (dev only, `?netdebug=1`). sync.js already compares one hash per registered state; this shows it:
//   - an overlay with the role, hash checks, the status of every subsystem (water, terrain, mushrooms, ...) and
//     whether everyone in the room runs this tab's build (src/netplay/builds.ts)
//   - on a mismatch, both sides save the diverging subsystems' serialized state at that tick as JSON, to diff:
//     the client right away (before the resync replaces it), the host from a small cache of its states at hash ticks
// Serves the determinism principle (a desync is found and named, not silently repaired). Local only.
import { onStart } from '../loop.js';
import { net, onRoomReady } from '../netplay/net.ts';
import { BUILD, otherBuilds } from '../netplay/builds.ts';
import { onDesync, onHashSent, snapshot, worldStatus, world } from '../world/sync.ts';

const CACHE = 6; // host: states kept for the last few hash ticks

function save(name, data) {
  console.warn(`[sync] ${name}`, data);
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch {
    // no download in this context: the console copy is enough
  }
}
// Other builds in the room: '<build> x<count>', 'old' for a peer from before builds were published.
const builds = () => [...otherBuilds()].map(([b, n]) => `${b ?? 'old'} x${n}`).join(', ');
const pick = (data, keys) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]));

const cache = [];
onHashSent((tick) => {
  cache.push({ tick, data: snapshot().data });
  if (cache.length > CACHE) cache.shift();
});
let room = null;
onRoomReady((r) => {
  room = r;
  r.onMessage((m) => {
    if (m?.t !== 'sd:dump' || worldStatus().mode !== 'host' || !Array.isArray(m.keys)) return;
    const hit = cache.find((c) => c.tick === m.tick);
    if (hit) save(`desync-${m.tick}-host.json`, { tick: m.tick, side: 'host', states: pick(hit.data, m.keys) });
    else console.warn(`[sync] desync dump for tick ${m.tick} asked, but it is no longer cached`);
  });
});
onDesync(({ tick, keys }) => {
  save(`desync-${tick}-client.json`, { tick, side: 'client', states: pick(snapshot().data, keys) });
  room?.send({ t: 'sd:dump', tick, keys });
});

onStart(() => {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;right:8px;bottom:8px;margin:0;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.6);' +
    'color:#d8f3ff;font:11px/1.35 ui-monospace,monospace;pointer-events:none;z-index:50;white-space:pre';
  document.body.append(el);
  setInterval(() => {
    const s = worldStatus();
    const other = builds();
    const subs = Object.entries(s.subsystems ?? {})
      .map(([k, v]) => `${v === 'ok' ? '✓' : '✗'} ${k}`)
      .join('  ');
    el.textContent =
      `sync ${s.mode}${s.ready ? '' : ' (waiting)'}  tick ${world.tick}  queued ${s.queued}\n` +
      `hash ok ${s.hashOk}  bad ${s.hashBad}  resyncs ${s.resyncs}  late ${s.lateEdits}` +
      `  held drop ${s.heldDropped}\n` +
      (s.mode === 'host' ? 'authoritative: per-state hashes sent every 2 s' : subs || 'no hash check yet') +
      (s.lastBad ? `\nlast desync: tick ${s.lastBad.tick} in ${s.lastBad.keys.join(', ')}` : '') +
      `\nroom ${net.room?.transport ?? 'none'}${net.room?.isLead() ? '  (lead)' : ''}` +
      `\nbuild ${BUILD}  ${other ? `✗ mixed: ${other}` : '✓ same as everyone heard'}`;
  }, 500);
});
