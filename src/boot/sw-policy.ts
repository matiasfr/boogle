// The service worker's decisions, pure so test/sw-policy.test.ts can check them (./sw-worker.ts does the I/O;
// docs/plans/loading.md, "Service worker"). Every file Vite writes under assets/ has a content hash in its name, so a URL
// there never changes meaning: cache-first is safe for them and for nothing else (the page, version.json, sw.ts, the
// icons and the web manifest keep their names across deploys and always go to the network).

export const CACHE_PREFIX = 'boogle-';
/** How many builds' caches stay: this one, and the one before it for tabs still open on it (lazy chunks). */
export const KEEP_BUILDS = 2;

export const cacheName = (build: string) => CACHE_PREFIX + build;

/** Whether the worker answers this request from its cache: a same-scope GET of a hashed build file. */
export function cacheable(method: string, url: string, scope: string) {
  if (method !== 'GET' || !url.startsWith(scope)) return false;
  const path = url.slice(scope.length).split(/[?#]/)[0];
  return path.startsWith('assets/') && !path.endsWith('/');
}

/**
 * Which caches to delete once `current` is active: other builds' caches beyond the newest KEEP_BUILDS - 1 of them.
 * `names` is caches.keys(), which lists caches in the order they were created (oldest first); other prefixes are left
 * alone.
 */
export function stale(names: string[], current: string) {
  const ours = names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== cacheName(current));
  return ours.slice(0, Math.max(0, ours.length - (KEEP_BUILDS - 1)));
}
