// The service worker across deploys (src/boot/sw-worker.ts, docs/plans/loading.md): four production builds of this
// checkout (a, b, c, and a kill-switch build with BOOGLE_SW=off) served one after another from the same origin, as
// GitHub Pages would, and one Chromium tab reloading through them. Checks that
//   1. the second load of a build gets every hashed file from the service worker (no request reaches the server);
//   2. the next page executes a changed hashed fixture while unchanged game assets stay cached;
//   3. each activation deletes every other build's cache;
//   4. documents/navigations bypass caching, current lazy assets work offline, and SW is optional.
// Evidence: .look/sw-check/report.json and build-b.png; no production server is used.
//
//   node dev/look/sw-check.ts            (about a minute: four builds)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createService, loadConfig } from '../../server/src/server.ts';
import { launch, root, sleep } from './lib.ts';

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-sw-'));
const server = createService(loadConfig({ DATA_DIR: data, SERVER_ROOMS: '*' }, { log: () => {} }));
const sigPort = await server.listen(0);
const builds = ['a', 'b', 'c', 'off'];
const dirs: Record<string, string> = {};
const fixtures: Record<string, string> = {};
const evidence = path.join(root, '.look/sw-check');
fs.mkdirSync(evidence, { recursive: true });
for (const b of builds) {
  dirs[b] = path.join(data, `dist-${b}`);
  const r = spawnSync(
    process.execPath,
    [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', dirs[b]],
    {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: {
        ...process.env,
        VITE_BOOGLE_SERVER: `http://127.0.0.1:${sigPort}`,
        VITE_BUILD: `swcheck-${b}`,
        BOOGLE_SW: b === 'off' ? 'off' : '',
      },
    },
  );
  if (r.status) throw new Error(`build ${b} failed`);
  // A changed hashed script proves the next HTML executes its own build's assets, not just a new meta tag.
  const code = `window.__swBuild = ${JSON.stringify(b)};`;
  fixtures[b] = `assets/swcheck-${createHash('sha256').update(code).digest('hex').slice(0, 8)}.js`;
  fs.writeFileSync(path.join(dirs[b]!, fixtures[b]!), code);
  for (const html of ['index.html', 'assets/index.html']) {
    const file = path.join(dirs[b]!, html);
    fs.writeFileSync(
      file,
      fs.readFileSync(file, 'utf8').replace('</head>', `<script src="/${fixtures[b]}"></script></head>`),
    );
  }
  console.log(`built ${b}`);
}

// A static server like GitHub Pages: hashed files may be cached for 10 minutes, the page is revalidated (on Pages it
// is cached for 10 minutes too; src/features/updates.ts covers that). It counts the asset requests that reach it.
let serving = 'a';
let assetHits: string[] = [];
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
};
const site = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  let file = path.join(dirs[serving]!, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(dirs[serving]!) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(dirs[serving]!, 'index.html');
  if (url.pathname.startsWith('/assets/')) assetHits.push(url.pathname);
  const hashed = url.pathname.startsWith('/assets/') && !url.pathname.endsWith('.html');
  res.writeHead(200, {
    'content-type': types[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': hashed ? 'max-age=600' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
});
const port: number = await new Promise((r) =>
  site.listen(0, '127.0.0.1', () => r((site.address() as { port: number }).port)),
);
const base = `http://127.0.0.1:${port}/?room=swcheck`;

const browser = await launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
let fromSw = 0,
  fromNet = 0;
page.on('response', (r) => {
  if (!new URL(r.url()).pathname.startsWith('/assets/')) return;
  if (r.fromServiceWorker()) fromSw++;
  else fromNet++;
});
const state = () =>
  page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    const names = (await caches.keys()).filter((n) => n.startsWith('boogle-'));
    return {
      regs: regs.length,
      controlled: !!navigator.serviceWorker.controller,
      caches: names,
      updating: regs.some((r) => r.installing || r.waiting),
    };
  });
async function load(build: string, settle: (s: Awaited<ReturnType<typeof state>>) => boolean) {
  serving = build;
  assetHits = [];
  fromSw = fromNet = 0;
  await page.goto(base);
  await page.waitForFunction(() => window.boogle?.boot, null, { timeout: 30000 });
  await page.evaluate(() => (window.boogle.boot as { done: Promise<unknown> }).done);
  await page.waitForFunction(
    () => (window.boogle.boot.timeline() as { marks: { name: string }[] }).marks.some((m) => m.name === 'interactive'),
    null,
    { timeout: 60000 },
  );
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 10000 });
  const hits = assetHits.filter((p) => !p.includes('/swcheck-')).length,
    sw = fromSw,
    net = fromNet;
  let s = await state();
  for (let i = 0; i < 200 && (!settle(s) || s.updating); i++) {
    await sleep(200);
    s = await state();
  }
  const shown = await page.evaluate(() => (window.boogle.boot.timeline() as { build: string }).build);
  const fixture = await page.evaluate(() => (window as unknown as { __swBuild: string }).__swBuild);
  return { hits, sw, net, shown, fixture, ...s };
}

const checks: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, info: unknown) => checks.push([name, ok, JSON.stringify(info)]);
const has = (s: { caches: string[] }, b: string) => s.caches.includes(`boogle-swcheck-${b}`);

const a1 = await load('a', (s) => s.regs > 0 && has(s, 'a'));
check('first visit: registers and precaches', a1.regs === 1 && has(a1, 'a'), a1);
const model = 'assets/' + fs.readdirSync(path.join(dirs.a!, 'assets')).find((f) => f.endsWith('.glb'))!;
const modelBytes = fs.readFileSync(path.join(dirs.a!, model));
const fetchModel = () =>
  page.evaluate(
    async (url) => [...new Uint8Array(await (await fetch(url, { cache: 'no-store' })).arrayBuffer())],
    '/' + model,
  );
await fetchModel();
await page.waitForFunction(async (url) => !!(await (await caches.open('boogle-swcheck-a')).match(url)), '/' + model);
// Seed an already-buggy old HTML entry: the new worker must bypass it, even before its old cache is purged.
await page.evaluate(async () => {
  await (
    await caches.open('boogle-swcheck-a')
  ).put('/assets/index.html', new Response('STALE PAGE', { headers: { 'content-type': 'text/html' } }));
});
const a2 = await load('a', () => true);
check('second visit: every hashed file from the worker', a2.hits === 0 && a2.sw > 30, a2);
const b1 = await load('b', (s) => has(s, 'b') && !has(s, 'a'));
check(
  'deploy b: B fixture executes, unchanged game assets not fetched',
  b1.shown === 'swcheck-b' && b1.fixture === 'b' && b1.hits === 0,
  b1,
);
const html = await page.evaluate(async () => (await fetch('/assets/index.html', { cache: 'no-store' })).text());
check(
  'explicit HTML bypasses stale cache and names B assets',
  html.includes('swcheck-b') && html.includes(fixtures.b!),
  { buildB: html.includes('swcheck-b') },
);
// Fetch a current uncached lazy asset after activation, independently of the game's model selection.
await page.evaluate(async (url) => {
  await (await caches.open('boogle-swcheck-b')).delete(url);
}, '/' + model);
assetHits = [];
await fetchModel();
await page.waitForFunction(async (url) => !!(await (await caches.open('boogle-swcheck-b')).match(url)), '/' + model);
check('current model fetched into B after A is purged', assetHits.includes('/' + model) && !has(b1, 'a'), {
  hits: assetHits,
  caches: b1.caches,
});
const nav = await context.newPage();
assetHits = [];
const navResponse = await nav.goto(new URL(fixtures.b!, base).href);
check('navigation to a cached asset bypasses worker', !navResponse?.fromServiceWorker(), {
  status: navResponse?.status(),
});
await nav.close();
const b2 = await load('b', () => true);
await page.screenshot({ path: path.join(evidence, 'build-b.png') });
check('deploy b, reload: nothing from the server', b2.hits === 0 && b2.sw > 30, b2);
const c1 = await load('c', (s) => has(s, 'c') && s.caches.length === 1);
check('deploy c: keeps only c', c1.caches.length === 1 && has(c1, 'c'), c1);
await fetchModel();
await page.waitForFunction(async (url) => !!(await (await caches.open('boogle-swcheck-c')).match(url)), '/' + model);
await context.setOffline(true);
const offline = await fetchModel();
check('current cached model works offline', Buffer.from(offline).equals(modelBytes), {
  bytes: offline.length,
});
await context.setOffline(false);
const k = await load('off', (s) => s.regs === 0 && s.caches.length === 0);
check('kill switch: unregistered, caches gone', k.regs === 0 && k.caches.length === 0, k);

const unsupported = await browser.newContext();
await unsupported.addInitScript(() => {
  Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');
});
const plain = await unsupported.newPage();
const plainErrors: string[] = [];
plain.on('pageerror', (e) => plainErrors.push(String(e)));
serving = 'b';
await plain.goto(base);
await plain.waitForFunction(() => window.boogle?.boot, null, { timeout: 30000 });
await plain.evaluate(() => (window.boogle.boot as { done: Promise<unknown> }).done);
await plain.waitForFunction(() => !(document.querySelector('#enter') as HTMLButtonElement).disabled, null, {
  timeout: 60000,
});
const without = await plain.evaluate(() => ({
  supported: 'serviceWorker' in navigator,
  build: document.querySelector('meta[name="boogle-build"]')?.getAttribute('content'),
}));
check(
  'SW unsupported: B loads and enables entry',
  !without.supported && without.build === 'swcheck-b' && plainErrors.length === 0,
  { ...without, errors: plainErrors },
);
check('no page errors', errors.length === 0, errors);
fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify({ source: root, builds: dirs, checks }, null, 2));
await browser.close();
site.close();
await server.close();
for (const [name, ok, info] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${info}`);
process.exit(checks.every((c) => c[1]) ? 0 : 1);
