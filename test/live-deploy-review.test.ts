import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { build } from 'esbuild';
import { WORLD_NS } from '../src/world/namespace.ts';

const script = await build({
  stdin: {
    contents: `export * from './src/boot/release.ts'; export * from './src/player/account.ts'; export * from './src/boot/jump-in.ts';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'client',
  define: { 'import.meta.env.BASE_URL': "'/'", 'import.meta.env.VITE_BOOGLE_SERVER': "'https://host.example'" },
  plugins: [
    {
      name: 'splash',
      setup(builder) {
        builder.onResolve({ filter: /^\.\/splash\.ts$/ }, () => ({ path: 'splash', namespace: 'test' }));
        builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export function splashNote() {}' }));
      },
    },
  ],
});

function page(read: (path: string) => Response) {
  let now = 100000;
  let navigations = 0;
  let scheduled: (() => void) | undefined;
  const html = (client: string, server?: string) => ({
    querySelector(selector: string) {
      if (!selector.startsWith('meta')) return null;
      const content = selector.includes('server-build') ? server : client;
      return content ? { content } : null;
    },
  });
  const state = new Map<string, string>();
  const storage = {
    getItem: (k: string) => state.get(k) ?? null,
    setItem: (k: string, v: string) => state.set(k, v),
  };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortSignal,
    crypto,
    console,
    fetch: async (url: URL | string) => read(new URL(url).pathname),
    location: { href: 'https://site.example/?from=start', search: '?from=start', reload: () => navigations++ },
    localStorage: storage,
    sessionStorage: storage,
    Date: { now: () => now },
    setTimeout: (callback: () => void) => {
      scheduled = callback;
      return 1;
    },
    clearTimeout() {
      scheduled = undefined;
    },
    document: {
      ...html('current', 'host-current'),
      body: { append() {} },
      createElement: () => ({ showModal() {}, addEventListener() {}, append() {} }),
    },
    DOMParser: class {
      parseFromString(body: string) {
        return html(...(JSON.parse(body) as [string, string?]));
      }
    },
  });
  vm.runInContext(script.outputFiles[0]!.text, context);
  const client = context.client as typeof import('../src/boot/release.ts') &
    typeof import('../src/player/account.ts') &
    typeof import('../src/boot/jump-in.ts');
  return {
    client,
    navigations: () => navigations,
    async tick() {
      now += 30000;
      const next = scheduled;
      scheduled = undefined;
      next?.();
      await new Promise<void>((done) => setImmediate(done));
    },
    async poll() {
      now += 30000;
      await client.checkRelease();
    },
  };
}

for (const legacy of [false, true]) {
  test(`automatically navigate to a matching ${legacy ? 'pre-handshake' : 'supported'} rollback`, async () => {
    const metadata = legacy ? {} : { world: WORLD_NS };
    const tab = page((path) => {
      if (path === '/version') return Response.json({ build: 'old-host', ...metadata });
      if (path === '/version.json') return Response.json({ build: 'old-page', serverBuild: 'old-host', ...metadata });
      return Response.json(legacy ? ['old-page'] : ['old-page', 'old-host']);
    });
    await tab.poll();
    await tab.poll();
    assert.equal(tab.navigations(), 1);
  });
}

test('a first-time guest recovers when registration overlaps host replacement', async () => {
  let offline = true;
  const tab = page((path) => {
    if (path === '/version.json')
      return Response.json({ build: 'current', serverBuild: 'host-current', world: WORLD_NS });
    if (path === '/version') return Response.json({ build: 'host-current', world: WORLD_NS });
    assert.equal(path, '/account/guest');
    if (offline) throw new Error('no listener');
    return Response.json({ pid: 'newguest', expiresAt: 123456789 });
  });
  await tab.client.prepareAccount();
  offline = false;
  await tab.poll();
  await tab.poll();
  assert.ok(tab.navigations() || tab.client.accountStatus().pid, 'recover the guest or reload the matching page');
});

test('a jump-in still follows a deploy when the old host disappears after preflight', async () => {
  let replaced = false;
  let posts = 0;
  const tab = page((path) => {
    if (path === '/version') return Response.json({ build: replaced ? 'next-host' : 'host-current', world: WORLD_NS });
    if (path === '/jump') {
      posts++;
      return new Response('no available machine', { status: 503 });
    }
    if (path === '/version.json')
      return Response.json({ build: 'next-page', serverBuild: 'next-host', world: WORLD_NS });
    return Response.json(['next-page', 'next-host']);
  });
  void tab.client.jumpIn('start');
  await new Promise<void>((done) => setImmediate(done));
  assert.equal(posts, 1, 'the old host passed the preflight');
  replaced = true;
  await tab.tick();
  await tab.tick();
  assert.equal(tab.navigations(), 1, 'the waiting splash recovers after both deployments finish');
});
