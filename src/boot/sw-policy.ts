// The service worker's decisions, tested in test/loading.test.ts (sw-worker.ts owns I/O).
// Cache-first is only for emitted assets. The asset-stage HTML also lives under assets/, but documents and
// navigations must use the network/HTTP cache. Pages, version.json, sw.js, icons and the web manifest keep
// their names across deploys; they must not inherit an old build's CacheStorage entry.

export const CACHE_PREFIX = 'boogle-';
/** How many builds' caches stay: this one, and the one before it for tabs still open on it (lazy chunks). */
export const KEEP_BUILDS = 2;

export const cacheName = (build: string) => CACHE_PREFIX + build;

/** Whether the worker answers this request from its cache: a same-scope GET of a hashed build file. */
export function cacheable(method: string, url: string, scope: string, mode?: string) {
  if (mode === 'navigate' || method !== 'GET' || !url.startsWith(scope)) return false;
  const path = url.slice(scope.length).split(/[?#]/)[0]!;
  return path.startsWith('assets/') && !path.endsWith('/') && !/\.html?$/i.test(path);
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
