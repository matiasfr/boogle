// Owner-requested regression coverage for the deployed worker's response/write lifetime, without a browser/server.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['src/boot/sw-worker.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  define: { SW_CONFIG: JSON.stringify({ build: 'b', first: [], off: false }) },
});
const url = 'https://boogle.club/assets/model-hash.glb';
function response(body: string, type = 'model/gltf-binary'): Response {
  const res = new Response(body, { headers: { 'content-type': type } });
  Object.defineProperty(res, 'type', { value: 'basic' });
  return res;
}
function fixture() {
  const stores = new Map<string, Map<string, Response>>([
    ['boogle-a', new Map()],
    ['boogle-b', new Map()],
  ]);
  let fetches = 0,
    writes = 0;
  let writeGate = Promise.resolve();
  let failWrite = false;
  type Event = {
    request: { method: string; url: string; mode: string };
    respondWith(p: Promise<Response>): void;
    waitUntil(p: Promise<unknown>): void;
  };
  let onFetch: (e: Event) => void = () => {
    throw new Error('no fetch listener');
  };
  const caches = {
    async has(name: string) {
      return stores.has(name);
    },
    async match(req: { url: string }, options?: { cacheName?: string }) {
      const lists = options?.cacheName ? [stores.get(options.cacheName)] : [...stores.values()];
      for (const map of lists) {
        const hit = map?.get(req.url);
        if (hit) return hit;
      }
      return undefined;
    },
    async open(name: string) {
      assert.ok(stores.has(name), 'must not recreate a deleted cache');
      return {
        async put(req: { url: string }, res: Response) {
          writes++;
          await writeGate;
          if (failWrite) throw new Error('quota');
          stores.get(name)?.set(req.url, res);
        },
      };
    },
  };
  vm.runInNewContext(bundled.outputFiles[0]!.text, {
    caches,
    URL,
    setTimeout,
    fetch: () => {
      fetches++;
      return Promise.resolve(response('network'));
    },
    self: {
      registration: { scope: 'https://boogle.club/' },
      addEventListener(name: string, fn: typeof onFetch) {
        if (name === 'fetch') onFetch = fn;
      },
    },
  });
  function dispatch(path = url, mode = 'cors') {
    let reply: Promise<Response> | undefined;
    const pending: Promise<unknown>[] = [];
    onFetch({
      request: { method: 'GET', url: path, mode },
      respondWith(p) {
        reply = p;
      },
      waitUntil(p) {
        pending.push(p);
      },
    });
    return {
      get reply() {
        return reply;
      },
      pending,
    };
  }
  return {
    stores,
    dispatch,
    counts: () => ({ fetches, writes }),
    gate(p: Promise<void>) {
      writeGate = p;
    },
    fail() {
      failWrite = true;
    },
  };
}

test('worker bypasses HTML and all navigations, even with an old cached page', () => {
  const f = fixture();
  f.stores.get('boogle-a')!.set('https://boogle.club/assets/index.html', response('old page', 'text/html'));
  assert.equal(f.dispatch('https://boogle.club/assets/index.html').reply, undefined);
  assert.equal(f.dispatch(url, 'navigate').reply, undefined);
  assert.deepEqual(f.counts(), { fetches: 0, writes: 0 });
});

test('older hit returns before a waitUntil-owned copy; survives removal of the old cache', async () => {
  const f = fixture();
  f.stores.get('boogle-a')!.set(url, response('old bytes'));
  let release = () => {};
  f.gate(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const event = f.dispatch();
  assert.equal(await (await event.reply!).text(), 'old bytes');
  assert.equal(event.pending.length, 1, 'write belongs to fetch event');
  assert.equal(f.stores.get('boogle-b')!.has(url), false, 'response did not wait on storage');
  release();
  await Promise.all(event.pending);
  f.stores.delete('boogle-a');
  const again = f.dispatch();
  assert.equal(await (await again.reply!).text(), 'old bytes');
  assert.equal(again.pending.length, 0, 'current-cache hits are not rewritten');
  assert.deepEqual(f.counts(), { fetches: 0, writes: 1 });
});

test('network writes have event lifetime; quota failure and deleted cache do not break responses', async () => {
  const f = fixture();
  f.fail();
  const event = f.dispatch();
  assert.equal(await (await event.reply!).text(), 'network');
  assert.equal(event.pending.length, 1);
  await Promise.all(event.pending);
  f.stores.delete('boogle-b');
  const next = f.dispatch();
  assert.equal(await (await next.reply!).text(), 'network');
  await Promise.all(next.pending);
  assert.deepEqual(f.counts(), { fetches: 2, writes: 1 });
  assert.equal(f.stores.has('boogle-b'), false);
});

test('an HTML fallback previously cached under an asset URL is ignored', async () => {
  const f = fixture();
  f.stores.get('boogle-b')!.set(url, response('old fallback', 'text/html; charset=utf-8'));
  const event = f.dispatch();
  assert.equal(await (await event.reply!).text(), 'network');
  await Promise.all(event.pending);
  assert.equal(f.counts().fetches, 1);
});
