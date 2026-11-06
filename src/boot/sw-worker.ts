// The service worker (docs/plans/loading.md, "Service worker"), built to dist/sw.js by vite.config.ts
// ('boogle-sw'), which bundles this file and fills in SW_CONFIG: the build id and the files the first frame needs.
// Registered by ./sw.ts once the game is interactive. Not in development (the dev server has no sw.ts).
//
//   install    one cache per build, `boogle-<build>`: the first-load files, copied from an older build's cache when
//              the file is unchanged (same hashed name) or fetched; a file that fails is fetched on use instead
//   activate   delete every other build's cache (sw-policy.ts), then take over open tabs
//   fetch      hashed files under assets/ (sw-policy.ts, cacheable): any of our caches, else the network, kept in this
//              build's cache. Everything else (the page, version.json, the server, fonts) is not touched, so the page
//              and the update check in src/features/updates.ts always see the network.
//
// Kill switch: a build with BOOGLE_SW=off ships a sw.ts that deletes every boogle- cache and unregisters itself, and
// ./sw.ts unregisters instead of registering; `?sw=0` does the same for one browser and one load.
import { cacheable, cacheName, stale, CACHE_PREFIX } from './sw-policy.ts';
import { fetchAsset } from './asset-fetch.ts';

type Config = { build: string; first: string[]; off: boolean };
declare const SW_CONFIG: Config; // replaced at build time

// The worker's globals, typed here: the project compiles against the DOM library, not WebWorker.
type ExtendableEvent = Event & { waitUntil(p: Promise<unknown>): void };
type FetchEvent = ExtendableEvent & { request: Request; respondWith(r: Promise<Response>): void };
type Scope = {
  registration: { scope: string; unregister(): Promise<boolean> };
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', fn: (e: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', fn: (e: FetchEvent) => void): void;
};
const sw = self as unknown as Scope;
const { build, first, off } = SW_CONFIG;
const CACHE = cacheName(build);
const scope = () => sw.registration.scope;
// Only immutable same-scope asset URLs reach these lookups. Their bytes cannot vary by request headers;
// Vite preview's Vary: Origin otherwise makes a module request miss an entry installed by fetch(url).
const MATCH = { ignoreVary: true };

async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(
    first.map(async (path) => {
      const url = new URL(path, scope()).href;
      if (!cacheable('GET', url, scope())) return;
      if (await cache.match(url, MATCH)) return;
      const res = (await caches.match(url, MATCH)) ?? (await fetchAsset(url));
      if (res.ok && !documentResponse(res)) await cache.put(url, res);
    }),
  );
}

async function purge(all: boolean) {
  const names = await caches.keys();
  const doomed = all ? names.filter((n) => n.startsWith(CACHE_PREFIX)) : stale(names, build);
  await Promise.all(doomed.map((n) => caches.delete(n)));
}

// CacheStorage is optional. Do not recreate a cache removed by the page's kill switch.
async function keep(req: Request, res: Response) {
  if (await caches.has(CACHE)) await (await caches.open(CACHE)).put(req, res);
}
const documentResponse = (res: Response) =>
  /^(text\/html|application\/xhtml\+xml)\b/i.test(res.headers.get('content-type') ?? '');

async function respond(e: FetchEvent) {
  const req = e.request;
  const current = await caches.match(req, { ...MATCH, cacheName: CACHE }).catch(() => undefined);
  if (current && !documentResponse(current)) return current;
  const hit = await caches.match(req, MATCH).catch(() => undefined);
  // WASM retries belong to its loader, including first visits without a controlling worker.
  const res =
    hit && !documentResponse(hit)
      ? hit
      : await (new URL(req.url).pathname.endsWith('.wasm') ? fetch(req) : fetchAsset(req));
  if (res.ok && res.status === 200 && res.type === 'basic' && !documentResponse(res)) {
    // respondWith keeps this event alive until here; waitUntil owns the cloned write beyond response delivery.
    // This also promotes an older build's hit, without downloading or rewriting a current-cache hit.
    e.waitUntil(keep(req, res.clone()).catch(() => {}));
  }
  return res;
}

sw.addEventListener('install', (e) => {
  // CacheStorage itself can fail (quota/private mode), not just an individual download. Caching is optional.
  e.waitUntil((off ? Promise.resolve() : precache()).catch(() => {}).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(
    purge(off)
      .catch(() => {})
      .then(async () => {
        if (off) await sw.registration.unregister();
        else await sw.clients.claim();
      }),
  );
});

sw.addEventListener('fetch', (e) => {
  if (off || !cacheable(e.request.method, e.request.url, scope(), e.request.mode)) return;
  e.respondWith(respond(e));
});
