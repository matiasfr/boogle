// Runs browser.html in the browser engines installed here and collects what each posts back.
//   RAPIER_PKGS=$PKGS OUT=<dir> node run-browsers.mjs [chromium] [chromium-4x] [chrome-x86] [safari] [--only cost]
// chromium:    Playwright's Chromium, headless (arm64)
// chromium-4x: the same with CDP CPU throttling ×4, a rough phone-class proxy (not a phone)
// chrome-x86:  installed Google Chrome forced to x86_64 under Rosetta 2, headless: V8's x64 WASM back end
// safari:      installed Safari opened on the page (JavaScriptCore); opens a visible window
// The server sends COOP/COEP so timers run at the isolated resolution.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const HERE = import.meta.dirname;
const PKGS = path.resolve(process.env.RAPIER_PKGS ?? '');
const OUT = path.resolve(process.env.OUT ?? path.join(os.tmpdir(), 'rapier-spike'));
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args.splice(onlyAt, 2)[1] : '';
const targets = args.length ? args : ['chromium', 'chrome-x86', 'safari'];

const glue = `
import * as bg from './rapier_wasm3d_bg.js';
export * from './rapier_wasm3d_bg.js';
const { instance } = await WebAssembly.instantiateStreaming(fetch(new URL('./rapier_wasm3d_bg.wasm', import.meta.url)), { './rapier_wasm3d_bg.js': bg });
bg.__wbg_set_wasm(instance.exports);
instance.exports.__wbindgen_start?.();
`;
const TYPES = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
};
const waiting = new Map();
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const head = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
  if (req.method === 'POST' && url.pathname === '/result') {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const tag = url.searchParams.get('tag');
      fs.writeFileSync(path.join(OUT, `${tag}.json`), body);
      res.end('ok');
      waiting.get(tag)?.(body);
    });
    return;
  }
  let file;
  if (url.pathname.startsWith('/pkg/')) {
    const [, , flavour, ...rest] = url.pathname.split('/');
    const rel = rest.join('/');
    if (rel === 'rapier_wasm3d.js' || rel === 'rapier_wasm3d') {
      res.writeHead(200, { ...head, 'Content-Type': 'text/javascript' });
      return res.end(glue);
    }
    file = path.join(PKGS, flavour, 'package', rel);
    if (!path.extname(file)) {
      if (fs.existsSync(`${file}.js`)) file = `${file}.js`;
      // A folder import: redirect, so the folder becomes the base for index.js's own relative imports.
      else return res.writeHead(302, { ...head, Location: `${url.pathname}/index.js` }).end();
    }
  } else file = path.join(HERE, url.pathname.slice(1) || 'browser.html');
  if (!file.startsWith(PKGS) && !file.startsWith(HERE)) return res.writeHead(403).end();
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { ...head, 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/browser.html`;
const page = (tag) => `${base}?tag=${tag}${only ? `&only=${only}` : ''}`;
const result = (tag, ms = 15 * 60_000) =>
  new Promise((resolve, reject) => {
    waiting.set(tag, resolve);
    setTimeout(() => reject(new Error(`${tag}: no result in ${ms / 1000} s`)), ms);
  });

for (const target of targets) {
  const tag = `${target}${only ? `-${only}` : ''}`;
  const t0 = Date.now();
  try {
    if (target.startsWith('chromium')) {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      const p = await browser.newPage();
      p.on('console', (m) => m.type() === 'error' && console.log(`${tag} console: ${m.text()}`));
      p.on('requestfailed', (r) => console.log(`${tag} failed: ${r.url()}`));
      p.on('response', (r) => r.status() >= 400 && console.log(`${tag} ${r.status()}: ${r.url()}`));
      if (target === 'chromium-4x') {
        const cdp = await p.context().newCDPSession(p);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      }
      const got = result(tag);
      await p.goto(page(tag));
      await got;
      await browser.close();
    } else if (target === 'chrome-x86') {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-x86-'));
      const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      const got = result(tag);
      const proc = spawn(
        'arch',
        ['-x86_64', chrome, '--headless=new', `--user-data-dir=${dir}`, '--no-first-run', page(tag)],
        {
          stdio: 'ignore',
        },
      );
      await got;
      proc.kill();
    } else if (target === 'safari') {
      const got = result(tag);
      spawn('open', ['-a', 'Safari', page(tag)], { stdio: 'ignore' });
      await got;
    }
    console.log(`${tag}: ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${path.join(OUT, `${tag}.json`)}`);
  } catch (e) {
    console.log(`${tag}: ${e.message}`);
  }
}
server.close();
process.exit(0);
