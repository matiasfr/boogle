// The service worker's decisions, tested in test/loading.test.ts (sw-worker.ts owns I/O).
// Cache-first is only for emitted assets. The asset-stage HTML also lives under assets/, but documents and
// navigations must use the network/HTTP cache. Pages, version.json, sw.js, icons and the web manifest keep
// their names across deploys; they must not inherit an old build's CacheStorage entry.

export const CACHE_PREFIX = 'boogle-';
export const cacheName = (build: string) => CACHE_PREFIX + build;

/** Whether the worker answers this request from its cache: a same-scope GET of a hashed build file. */
export function cacheable(method: string, url: string, scope: string, mode?: string) {
  if (mode === 'navigate' || method !== 'GET' || !url.startsWith(scope)) return false;
  const path = url.slice(scope.length).split(/[?#]/)[0]!;
  return path.startsWith('assets/') && !path.endsWith('/') && !/\.html?$/i.test(path);
}

/** Once current is active, keep only its cache. Other applications' caches are untouched. */
export function stale(names: string[], current: string) {
  return names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== cacheName(current));
}
