// Registers the service worker (./sw-worker.ts, built to sw.js) once the game is interactive, so its first-load
// precache never competes with the boot (docs/plans/loading.md). From the second visit on, hashed files (JS, WASM,
// CSS, models, the KTX2 transcoder) come from its cache with no request at all; the page itself, version.json and the
// server always go to the network, so src/features/updates.ts sees a new deploy as before.
// Production only. Kill switches: a build with BOOGLE_SW=off (VITE_SW below) unregisters it everywhere on the next
// load; `?sw=0` unregisters it and clears its caches in this browser, for this load.
import { bootDone } from './timeline.ts';
import { CACHE_PREFIX } from './sw-policy.ts';

const off = import.meta.env.VITE_SW === 'off' || new URLSearchParams(location.search).get('sw') === '0';

// The worker that served this page keeps serving it until it closes, so the caches go once the page is loaded.
async function unregister() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  await bootDone;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX)).map((n) => caches.delete(n)));
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  if (off) unregister().catch(() => {});
  else
    bootDone.then(() =>
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' })
        .catch((e) => console.warn('[sw] not registered:', e)),
    );
}
