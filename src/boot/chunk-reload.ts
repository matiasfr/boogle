// A deploy replaces every hashed file at once, so a page loading across one can ask for files that are gone: it would
// sit on the loading screen forever, or run without its caves or The Boogler's talk. Early in a page's life this reloads
// at most twice with backoff, and the new page names the new files. Later a reload would throw a player out of the game, so the update
// notice (src/features/updates.ts) covers it. In a build, Vite fires vite:preloadError for any import() that fails.
import { isChunkFetchError, RETRY_DELAYS } from './asset-fetch.ts';
const EARLY_MS = 60_000;
const KEY = 'boogle-chunk-retries';
let scheduled = false;

addEventListener('vite:preloadError', (e) => {
  if (performance.now() > EARLY_MS || scheduled) return;
  const error: unknown = (e as Event & { payload: unknown }).payload;
  // Vite also reports evaluation errors (including failed WASM). Those are not missing chunks.
  if (!isChunkFetchError(error)) return;
  let attempt = 0;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { at?: number; attempt?: number } | null;
    if (saved && typeof saved.at === 'number' && Date.now() - saved.at < EARLY_MS) {
      if (!Number.isInteger(saved.attempt) || saved.attempt! < 0) return;
      attempt = saved.attempt!;
    }
    if (attempt >= RETRY_DELAYS.length) return;
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), attempt: attempt + 1 }));
  } catch {
    return; // no storage: nothing would stop a loop
  }
  // Never preventDefault: Vite would resolve a failed import as undefined (then Rapier reads undefined.World).
  // A new document is necessary because browsers retain failed module evaluations in their module map.
  scheduled = true;
  setTimeout(() => location.reload(), RETRY_DELAYS[attempt]);
});
