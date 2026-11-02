// A deploy replaces every hashed file at once, so a page loading across one can ask for files that are gone: it would
// sit on the loading screen forever, or run without its caves or The Boogler's talk. Early in a page's life this reloads
// once, and the new page names the new files. Later a reload would throw a player out of the game, so the update
// notice (src/features/updates.ts) covers it. In a build, Vite fires vite:preloadError for any import() that fails.
const EARLY_MS = 60_000;
const KEY = 'boogle-chunk-reload-at'; // sessionStorage: when this tab last did this, so a file that stays gone can't loop

addEventListener('vite:preloadError', (e) => {
  if (performance.now() > EARLY_MS) return;
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < EARLY_MS) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return; // no storage: nothing would stop a loop
  }
  e.preventDefault(); // the reload answers it, so it isn't an error
  location.reload();
});
