// The service worker across deploys (src/boot/sw-worker.ts, docs/plans/loading.md): four production builds of this
// checkout (a, b, c, and a kill-switch build with BOOGLE_SW=off) served one after another from the same origin, as
// GitHub Pages would, and one Chromium tab reloading through them. Checks that
//   1. the second load of a build gets every hashed file from the service worker (no request reaches the server);
//   2. a new deploy installs the new worker, fetches only the files that changed, and serves the rest from cache;
//   3. a third deploy deletes the first build's cache and keeps the one before it;
//   4. the kill-switch build unregisters the worker and deletes every boogle- cache.
//
//   node dev/look/sw-check.ts            (about a minute: four builds)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createService, loadConfig } from '../../server/src/server.js';
import { launch, root, sleep } from './lib.mjs';

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-sw-'));
const server = createService(loadConfig({ DATA_DIR: data, SERVER_ROOMS: '*' }, { log: () => {} }));
const sigPort = await server.listen(0);
const builds = ['a', 'b', 'c', 'off'];
const dirs: Record<string, string> = {};
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
  let file = path.join(dirs[serving], url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(dirs[serving]) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(dirs[serving], 'index.html');
  if (url.pathname.startsWith('/assets/')) assetHits.push(url.pathname);
  const hashed = url.pathname.startsWith('/assets/');
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
const page = await (await browser.newContext()).newPage();
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
    return { regs: regs.length, controlled: !!navigator.serviceWorker.controller, caches: names };
  });
async function load(build: string, settle: (s: Awaited<ReturnType<typeof state>>) => boolean) {
  serving = build;
  assetHits = [];
  fromSw = fromNet = 0;
  await page.goto(base);
  await page.waitForFunction(() => window.boogle?.boot, null, { timeout: 30000 });
  await page.evaluate(() => (window.boogle.boot as { done: Promise<unknown> }).done);
  const hits = assetHits.length,
    sw = fromSw,
    net = fromNet;
  let s = await state();
  for (let i = 0; i < 100 && !settle(s); i++) {
    await sleep(200);
    s = await state();
  }
  const shown = await page.evaluate(() => (window.boogle.boot.timeline() as { build: string }).build);
  return { hits, sw, net, shown, ...s };
}

const checks: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, info: unknown) => checks.push([name, ok, JSON.stringify(info)]);
const has = (s: { caches: string[] }, b: string) => s.caches.includes(`boogle-swcheck-${b}`);

const a1 = await load('a', (s) => s.regs > 0 && has(s, 'a'));
check('first visit: registers and precaches', a1.regs === 1 && has(a1, 'a'), a1);
const a2 = await load('a', () => true);
check('second visit: every hashed file from the worker', a2.hits === 0 && a2.sw > 30, a2);
const b1 = await load('b', (s) => has(s, 'b'));
check('deploy b: page is b, only changed files fetched', b1.shown === 'swcheck-b' && b1.hits < a1.hits / 2, b1);
const b2 = await load('b', () => true);
check('deploy b, reload: nothing from the server', b2.hits === 0 && b2.sw > 30, b2);
const c1 = await load('c', (s) => has(s, 'c') && !has(s, 'a'));
check('deploy c: keeps b and c, drops a', has(c1, 'b') && has(c1, 'c') && !has(c1, 'a'), c1);
const k = await load('off', (s) => s.regs === 0 && s.caches.length === 0);
check('kill switch: unregistered, caches gone', k.regs === 0 && k.caches.length === 0, k);

await browser.close();
site.close();
await server.close();
for (const [name, ok, info] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${info}`);
process.exit(checks.every((c) => c[1]) ? 0 : 1);
