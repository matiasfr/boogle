// Shared setup for the headless room test (ws-run.ts): a test page bundled and served, and
// headless Chromium pages that each run one room.
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import type { BrowserContext, Page } from 'playwright';
import { freePort, sleep } from '../look/lib.ts';

export { sleep };
const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as typeof import('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

// Polls fn until truthy; returns elapsed ms, or -1 on timeout.
export async function waitFor(fn: () => unknown, timeout = 8000, step = 50): Promise<number> {
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
// What open() returns: one headless page in a room.
export type RoomPage = { name: string; page: Page; ctx: BrowserContext; selfId: SelfId };
// The page's peer id, or { error } when the room turned it away.
type SelfId = string | { error: string; max?: number };
// The page's T.snap(): the room as that page sees it (dev/peer-test/ws-page.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the test API, driven by page.evaluate
type Snap = any;

export const ev = <R, A = undefined>(page: Page, fn: (arg: A) => R | Promise<R>, arg?: A): Promise<R> =>
  page.evaluate(fn as (arg: unknown) => R | Promise<R>, arg as unknown);
export const snap = (p: { page: Page }): Promise<Snap> => ev(p.page, () => window.T.snap());

// True when every page in `group` lists exactly the other members (plus itself, first, sameTab).
export async function seesAll(group: { page: Page; selfId: SelfId }[]): Promise<boolean> {
  for (const p of group) {
    const s = await snap(p);
    const want = group
      .filter((o) => o !== p)
      .map((o) => o.selfId)
      .sort();
    const got = s.peers
      .filter((x: { sameTab: boolean }) => !x.sameTab)
      .map((x: { peer: string }) => x.peer)
      .sort();
    if (JSON.stringify(want) !== JSON.stringify(got)) return false;
    if (
      s.peers.filter((x: { sameTab: boolean }) => x.sameTab).length !== 1 ||
      s.peers[0].peer !== p.selfId ||
      !s.peers[0].sameTab
    )
      return false;
  }
  return true;
}

// page.js-style bundle `entry` served on a free port, plus headless Chromium. open(name, query) loads a page and runs
// its T.start(); selfId is the page's id, or { error } when the room turned it away.
export async function startWeb(entry: string) {
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
      if (req.url!.startsWith('/bundle.js')) {
        res.writeHead(200, { 'content-type': 'text/javascript' });
        res.end(js);
      } else {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<!doctype html><script src="/bundle.js"></script>');
      }
    })
    .listen(webPort, '127.0.0.1');
  const browser = await chromium.launch();
  async function open(name: string, query: string): Promise<RoomPage> {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`  [${name}] pageerror: ${e.message}`));
    if (process.env.VERBOSE) page.on('console', (m) => console.log(`  [${name}] ${m.text()}`));
    await page.goto(
      `http://127.0.0.1:${webPort}/?${query}${process.env.VERBOSE ? '&debug=' + process.env.VERBOSE : ''}`,
    );
    const selfId: SelfId = await ev(page, () => window.T.start());
    return { name, page, ctx, selfId };
  }
  async function close() {
    await browser.close().catch(() => {});
    web.close();
  }
  return { open, close };
}
