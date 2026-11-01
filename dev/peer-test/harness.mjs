// Shared setup for the headless room test (ws-run.ts): a test page bundled and served, and
// headless Chromium pages that each run one room.
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { freePort, sleep } from '../look/lib.mjs';

export { sleep };
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

// Polls fn until truthy; returns elapsed ms, or -1 on timeout.
export async function waitFor(fn, timeout = 8000, step = 50) {
  const t0 = Date.now();
  for (;;) {
    try {
      if (await fn()) return Date.now() - t0;
    } catch {
      /* page may be mid-navigation */
    }
    if (Date.now() - t0 > timeout) return -1;
    await sleep(step);
  }
}
export const ev = (page, fn, arg) => page.evaluate(fn, arg);
export const snap = (p) => ev(p.page, () => window.T.snap());

// True when every page in `group` lists exactly the other members (plus itself, first, sameTab).
export async function seesAll(group) {
  for (const p of group) {
    const s = await snap(p);
    const want = group
      .filter((o) => o !== p)
      .map((o) => o.selfId)
      .sort();
    const got = s.peers
      .filter((x) => !x.sameTab)
      .map((x) => x.peer)
      .sort();
    if (JSON.stringify(want) !== JSON.stringify(got)) return false;
    if (s.peers.filter((x) => x.sameTab).length !== 1 || s.peers[0].peer !== p.selfId || !s.peers[0].sameTab)
      return false;
  }
  return true;
}

// page.js-style bundle `entry` served on a free port, plus headless Chromium. open(name, query) loads a page and runs
// its T.start(); selfId is the page's id, or { error } when the room turned it away.
export async function startWeb(entry) {
  const webPort = await freePort();
  const built = await esbuild.build({
    entryPoints: [path.join(here, entry)],
    bundle: true,
    format: 'iife',
    write: false,
    platform: 'browser',
    logLevel: 'warning',
  });
  const js = built.outputFiles[0].text;
  const web = http
    .createServer((req, res) => {
      if (req.url.startsWith('/bundle.js')) {
        res.writeHead(200, { 'content-type': 'text/javascript' });
        res.end(js);
      } else {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<!doctype html><script src="/bundle.js"></script>');
      }
    })
    .listen(webPort, '127.0.0.1');
  const browser = await chromium.launch();
  async function open(name, query) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`  [${name}] pageerror: ${e.message}`));
    if (process.env.VERBOSE) page.on('console', (m) => console.log(`  [${name}] ${m.text()}`));
    await page.goto(
      `http://127.0.0.1:${webPort}/?${query}${process.env.VERBOSE ? '&debug=' + process.env.VERBOSE : ''}`,
    );
    const selfId = await ev(page, () => window.T.start());
    return { name, page, ctx, selfId };
  }
  async function close() {
    await browser.close().catch(() => {});
    web.close();
  }
  return { open, close };
}
