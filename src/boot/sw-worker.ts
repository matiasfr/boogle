// The service worker (docs/plans/loading.md, "Service worker"), built to dist/sw.js by vite.config.js
// ('boogle-sw'), which bundles this file and fills in SW_CONFIG: the build id and the files the first frame needs.
// Registered by ./sw.ts once the game is interactive. Not in development (the dev server has no sw.ts).
//
//   install    one cache per build, `boogle-<build>`: the first-load files, copied from an older build's cache when
//              the file is unchanged (same hashed name) or fetched; a file that fails is fetched on use instead
//   activate   delete builds older than the one before this one (sw-policy.ts, KEEP_BUILDS), then take over open tabs
//   fetch      hashed files under assets/ (sw-policy.ts, cacheable): any of our caches, else the network, kept in this
//              build's cache. Everything else (the page, version.json, the server, fonts) is not touched, so the page
//              and the update check in src/features/updates.ts always see the network.
//
// Kill switch: a build with BOOGLE_SW=off ships a sw.ts that deletes every boogle- cache and unregisters itself, and
// ./sw.ts unregisters instead of registering; `?sw=0` does the same for one browser and one load.
import { cacheable, cacheName, stale, CACHE_PREFIX } from './sw-policy.ts';

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

async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.allSettled(
    first.map(async (path) => {
      const url = new URL(path, scope()).href;
      if (await cache.match(url)) return;
      const res = (await caches.match(url)) ?? (await fetch(url));
      if (res.ok) await cache.put(url, res);
    }),
  );
}

async function purge(all: boolean) {
  const names = await caches.keys();
  const doomed = all ? names.filter((n) => n.startsWith(CACHE_PREFIX)) : stale(names, build);
  await Promise.all(doomed.map((n) => caches.delete(n)));
}

async function respond(req: Request) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200 && res.type === 'basic') {
    const copy = res.clone();
    // Only into a cache that exists: one the page deleted (its kill switch, ./sw.ts) stays deleted.
    caches.has(CACHE).then(
      async (ok) => {
        if (ok) await (await caches.open(CACHE)).put(req, copy);
      },
      () => {},
    );
  }
  return res;
}

sw.addEventListener('install', (e) => {
  e.waitUntil((off ? Promise.resolve() : precache()).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(off ? purge(true).then(() => sw.registration.unregister()) : purge(false).then(() => sw.clients.claim()));
});

sw.addEventListener('fetch', (e) => {
  if (off || !cacheable(e.request.method, e.request.url, scope())) return;
  e.respondWith(respond(e.request));
});
