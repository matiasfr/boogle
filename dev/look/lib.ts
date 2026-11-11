// Shared harness for `npm run look` and `npm run scenario`: a Vite dev server plus a local game
// server, headless Chromium, and a small `Game` wrapper (one page = one player) with stills and motion capture.
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import type { Browser, BrowserContext, Page } from 'playwright';
import { createService, loadConfig } from '../../server/src/server.ts';
import { installWarp, SKIP_DRAWS } from './warp.ts';
import type { WarpHandle } from './warp.ts';
import { startWarpServer } from './server-process.ts';
import { checkInstall } from './install-check.ts';
import { acquireBotSlot } from './bot-queue.ts';
import { wgslPortabilityScript } from './wgsl-portability.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export async function enterGame(page: Page, timeout: number, name?: string, touch = false) {
  const lobby = page.locator('body.playing').or(page.locator('#enter:not([disabled])')).first();
  await lobby.waitFor({ timeout }).catch((e: Error) => {
    throw new Error(`the lobby never offered "Jump in" within ${timeout / 1000} s (${e.message.split('\n')[0]})`);
  });
  if (await page.evaluate(() => document.body.classList.contains('playing'))) return 'already playing';
  if (name) await page.fill('#name-input', name).catch(() => {});
  // A phone taps in: a mouse click would switch the page to keyboard-and-mouse mode. Playwright's own 30 s click
  // timeout is too short for a software-rendered tab (each actionability check waits on a frame), so the click gets
  // the same budget as the wait for the lobby.
  await (touch ? page.tap('#enter', { timeout }) : page.click('#enter', { timeout })).catch((e: Error) => {
    throw new Error(`clicking "Jump in" failed within ${timeout / 1000} s (${e.message.split('\n')[0]})`);
  });
  return 'clicked Jump in';
}
export const run = (cmd: string, args: string[]) =>
  new Promise<void>((res, rej) =>
    spawn(cmd, args, { stdio: 'inherit' }).on('close', (c) => (c ? rej(new Error(`${cmd} exit ${c}`)) : res())),
  );

/** A camera pose: position and look-at target (world metres, y up). */
export type Pose = { cam: number[]; look: number[]; fov?: number };

// One table of named viewpoints: camera position, look-at target (world metres, y up).
// The water comparison's places (docs/plans/water-sunshine.md, Verification) are the last five.
export const VIEWS: Record<string, Pose> = {
  hill: { cam: [-10, 12, -14], look: [-22, 3.5, -21] },
  shore: { cam: [-22, 7.5, -17], look: [-30, 0.5, -27] },
  court: { cam: [12, 4, 30], look: [12, 0.5, 21] },
  meadow: { cam: [30, 7, 15], look: [30, 1, 2.5] },
  overview: { cam: [-40, 40, 40], look: [-5, 0, 0] },
  cove: { cam: [809, 3, 49], look: [760, 0, 15] },
  'pier-head': { cam: [1410, 28, -360], look: [1396, 2, -470] },
  'far-head': { cam: [1452, 14, -170], look: [1650, 0, -190] },
  summit: { cam: [1015, 110, -6], look: [850, 0, 60] },
  telescope: { cam: [870, 72, 65], look: [1080, 0, -500], fov: 24 },
};

export const freePort = () =>
  new Promise<number>((res) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => res(p));
    });
  });

// Starts Vite on a free port and our server in-process, hosting every room (so rooms work offline), with its saves in
// a temporary directory. With `url`, only uses that already-running game (the game's own server applies).
// `root` serves another checkout (e.g. a git worktree of a prototype branch) with this harness.
export type Stack = { base: string; close: () => Promise<void>; dataDir?: string; clockUrl?: string };
export async function startStack({
  url = null,
  root: dir = root,
  dataRoot = os.tmpdir(),
  warp = false,
}: { url?: string | null; root?: string; dataRoot?: string; warp?: boolean } = {}): Promise<Stack> {
  if (url) return { base: url, close: async () => {} };
  checkInstall(dir);
  const dataDir = fs.mkdtempSync(path.join(dataRoot, 'boogle-look-'));
  // `npm run scenarios` opens every player of every scenario from one address on one stack: no limit meant for strangers.
  const env = {
    DATA_DIR: dataDir,
    SERVER_ROOMS: '*',
    UPGRADES_PER_MIN: '1000000',
    MAX_HOSTED_ROOMS: '1000',
    PLAY_RATE_PER_MIN: '1000000', // a warped page's five-second batches arrive many times a second
    TUNE_CONTROLLER_KEY: process.env.TUNE_CONTROLLER_KEY ?? '',
  };
  const child = warp ? await startWarpServer(env) : null;
  const server = child ? null : createService(loadConfig(env, { log: () => {} }));
  const sigPort = child ? child.port : await server!.listen(0);
  const port = await freePort();
  const vite = spawn(
    process.execPath,
    [path.join(dir, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, VITE_BOOGLE_SERVER: `http://127.0.0.1:${sigPort}` },
    },
  );
  let viteError = '';
  vite.stderr.on('data', (data) => (viteError = (viteError + String(data)).slice(-4000)));
  vite.on('error', (error) => (viteError = error.message));
  const base = `http://127.0.0.1:${port}/`;
  let up = false;
  for (let t = 0; t < 150 && !up; t++) {
    if (vite.exitCode !== null || vite.signalCode !== null) break;
    try {
      up = (await fetch(base)).ok;
    } catch {
      await sleep(200);
    }
  }
  if (!up) {
    vite.kill('SIGTERM');
    await child?.close();
    await server?.close({ save: false });
    fs.rmSync(dataDir, { recursive: true, force: true });
    throw new Error(`vite did not start${viteError ? ': ' + viteError.trim() : ''}`);
  }
  return {
    base,
    dataDir,
    clockUrl: child?.clockUrl,
    async close() {
      if (!vite.killed) vite.kill('SIGTERM');
      await child?.close();
      await server?.close({ save: false });
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

// The real-GPU ANGLE backend for this OS: Metal on a Mac, D3D11 on Windows (where --use-angle=metal leaves WebGPU with
// no adapter at all). Linux and the Mac keep exactly the flag they had.
export const gpuAngle = () => (process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=metal');

// LOOK_CHANNEL=msedge runs the installed Microsoft Edge instead of Playwright's own Chromium. Off by default. For a
// Windows machine whose Smart App Control blocks Playwright's unsigned chrome.exe (headed launches fail with "spawn
// UNKNOWN"); Edge is signed. Any Playwright channel name works (chrome, msedge, ...).
export const browserChannel = () => (process.env.LOOK_CHANNEL ? { channel: process.env.LOOK_CHANNEL } : {});

// The game is WebGPU only. On Linux (CI) WebGPU runs on SwiftShader over Vulkan, so runners without a GPU still get it;
// on a Mac it runs on the real GPU (Metal), about 60 fps.
// LOOK_SOFTWARE_GL=1 forces the CI path (SwiftShader) on a Mac too, to reproduce a GPU-less runner's speed locally.
// `sharedLease`: another browser of this same process already holds the bot slot (a scenario that gives each player a
// browser process of their own), so this one must not queue behind it.
export const launch = async ({
  hardware = false,
  sharedLease = false,
}: { hardware?: boolean; sharedLease?: boolean } = {}): Promise<Browser> => {
  // precise-memory-info: performance.memory in exact bytes, for the allocation counts in hitches.
  const args = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'];
  const software = !!process.env.LOOK_SOFTWARE_GL && !hardware;
  if ((process.platform === 'darwin' || process.platform === 'win32') && !software) args.push(gpuAngle());
  // The ANGLE SwiftShader flags stay: without them CI's WebGPU throws "Instance dropped in popErrorScope" page errors.
  else if (!hardware)
    args.push(
      ...['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      ...['--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader'],
    );
  // Hardware timing is explicitly headed and never forces SwiftShader. The normal harness stays unchanged.
  const lease = sharedLease ? { release() {} } : await acquireBotSlot();
  try {
    const browser: Browser = await chromium.launch({ args, headless: !hardware, ...browserChannel() });
    browser.once('disconnected', lease.release);
    return browser;
  } catch (error) {
    lease.release();
    throw error;
  }
};

// Prints the THREE.* console errors a game collected (once each), if any.
export function reportGfxErrors(games: Game[]) {
  const seen = new Set(games.flatMap((g) => g.gfxErrors));
  if (!seen.size) return console.log('gfx errors: none');
  console.log(`gfx errors (${seen.size} distinct):`);
  for (const e of seen) console.log('  ' + e.split('\n')[0]!.slice(0, 240));
}

// The classic island fixture: once the current game's arrival has placed the player (it moves a new body to the
// landing), stand them at the island's spawn by the court, facing it as the island always did.
const ON_ISLAND = `
  const { productionRailway } = await import('/src/proto/flags.ts');
  if (productionRailway) {
    const { railReady } = await import('/dev/look/rail-read.ts');
    if (!(await railReady(90000))) throw new Error('island fixture: the current game never became ready');
  }
  const { me, cam } = await import('/src/player/player.ts');
  const { teleport } = await import('/src/physics/engine.ts');
  const { SPAWN, BALL_SPAWN, PLAYER_R } = await import('/src/constants.ts');
  const { groundHeight } = await import('/src/island/heights.ts');
  teleport(me.body, SPAWN.x, groundHeight(SPAWN.x, SPAWN.z) + PLAYER_R + 0.6, SPAWN.z);
  me.body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(SPAWN.x - BALL_SPAWN.x, SPAWN.z - BALL_SPAWN.z); // towards the ball and the court
  return true;`;

// BOOGLE_QUERY=physics=rapier (any URL params) is added to every page the harness opens: scenarios on another backend.
const EXTRA_QUERY = process.env.BOOGLE_QUERY ? '&' + process.env.BOOGLE_QUERY : '';

const HARNESS_REQUIRED =
  '--url targets a plain production build: --curves, --at, --eval/--action, warp and source-import tools need ' +
  'node .look/see-client.ts <look|playthrough|scenario> --production, or a Vite dev server. ' +
  'For a manually served build use BOOGLE_HARNESS=1 npm run build. Ordinary captures and window-handle scenarios remain supported.';

/** A page advertises module access without adding any code or module entries to ordinary builds. */
async function harnessModules(url: string): Promise<boolean> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Harness page returned HTTP ${response.status}: ${url}`);
  const html = await response.text();
  return (
    /<meta\b[^>]*name=["']boogle-harness["'][^>]*content=["'](?:dev|production)["']/.test(html) ||
    /<script\b[^>]*src=["'][^"']*\/@vite\/client["']/.test(html)
  );
}

/** Options for `Game.open` (described above it). */
export type GameOpts = {
  /** False only for window-handle-only tools that also work on ordinary deployed builds. */
  sourceImports?: boolean;
  room?: string;
  name?: string;
  size?: number[];
  /** The page's devicePixelRatio (Playwright's deviceScaleFactor); default 1. */
  scale?: number;
  hud?: boolean | string;
  out?: string;
  prefix?: string;
  query?: string;
  clock?: boolean;
  init?: string | (() => void);
  isolated?: boolean;
  /** Leave adaptive resolution on (no `?dpr=fixed`). */
  adaptive?: boolean;
  touch?: boolean;
  /** Emulate `prefers-reduced-motion: reduce` (src/constants.ts reads it once at load; CSS follows it too). */
  reducedMotion?: boolean;
  trace?: boolean;
  warp?: boolean;
  /** Start on the classic island (the original island at the world's origin) instead of the current game's landing:
   * the fixture for The Boogler, the ball, the caves, the lighthouse and the rest of its content. */
  island?: boolean;
  /** A browser process this player owns: closed with the player. (The scenario runner makes one for `ownBrowser`.) */
  ownedBrowser?: Browser;
};
/** A function `page.evaluate` runs in the page (serialised, so it sees only its argument). */
type PageFn<A, R> = (arg: A) => R | Promise<R>;

export class Game {
  sourceImports = false;
  name = 'player';
  out = '';
  prefix = '';
  size = [960, 600];
  ctx!: BrowserContext;
  ownedBrowser?: Browser;
  page!: Page;
  tracing = false;
  paused = false;
  errors: string[] = [];
  consoleErrors: string[] = [];
  gfxErrors: string[] = [];
  gfx: string | null | undefined;

  // opts: room, name, size [w,h], hud (true keeps the HUD in pictures, 'play' a clean subset), out (directory for images), label prefix,
  // query (extra URL params, e.g. 'tidefast=1'), clock (fake the page clock so `record` can step time),
  // init (a function or script run before the page's own code, e.g. to seed localStorage),
  // isolated (serve the page cross-origin isolated, so performance.now() ticks in 5 us instead of 100 us steps; a
  // checkout whose dev server predates `coi=1` serves it unisolated),
  // Every page gets `?dpr=fixed`, which keeps adaptive resolution off so images stay comparable, unless adaptive
  // (bench's --scaler, which watches the resolution scaler itself),
  // touch (a phone: touch events and `(pointer: coarse)`, so the page starts in touch mode with body.touch and the
  // touch buttons; pair it with size [390, 844] for portrait or [844, 390] for landscape. No isMobile: it changes the
  // layout viewport, and the game only needs the coarse pointer),
  // trace (record a Playwright trace: the action timeline, console, network and page errors; `close({ trace: file })`
  // keeps it. No screencast or DOM snapshots: on a CI runner's software GL they starve the frame loop, since waitFor
  // evaluates every 100 ms and each call snapshots the DOM, and the stills already show the canvas),
  // warp (the page's clock can run ahead of the wall, for `g.warp`: ./warp.ts)
  static async open(browser: Browser, stack: Stack, opts: GameOpts = {}) {
    const g = new Game();
    g.sourceImports = await harnessModules(stack.base);
    if ((opts.sourceImports !== false || opts.warp) && !g.sourceImports) throw new Error(HARNESS_REQUIRED);
    g.name = opts.name || 'player';
    g.ownedBrowser = opts.ownedBrowser;
    g.out = path.resolve(opts.out || '.look');
    g.prefix = opts.prefix || '';
    g.size = opts.size || [960, 600];
    g.ctx = await browser.newContext({
      viewport: { width: g.size[0]!, height: g.size[1]! },
      hasTouch: !!opts.touch,
      ...(opts.reducedMotion ? { reducedMotion: 'reduce' as const } : {}),
      ...(opts.scale ? { deviceScaleFactor: opts.scale } : {}),
    });
    if (opts.clock) await g.ctx.clock.install();
    // Edge (LOOK_CHANNEL=msedge) asks for /favicon.ico, which the game does not serve; Playwright's own Chromium never
    // does. Answer it empty so that 404 is not a console error. Only with a channel: the default path is unchanged.
    if (process.env.LOOK_CHANNEL) await g.ctx.route('**/favicon.ico', (route) => route.fulfill({ status: 204 }));
    g.tracing = !!opts.trace;
    if (g.tracing) await g.ctx.tracing.start({ title: g.name });
    // src/constants.ts reads isTouch once at load, so this must run before the page's code.
    if (opts.touch)
      await g.ctx.addInitScript(() => {
        const mm = window.matchMedia.bind(window);
        window.matchMedia = (q: string) =>
          q === '(pointer: coarse)' ? ({ ...mm(q), matches: true, media: q } as MediaQueryList) : mm(q);
      });
    // Chromium compiles WGSL that Firefox refuses (./wgsl-portability.ts): report it as a gfx error here.
    await g.ctx.addInitScript({ content: wgslPortabilityScript });
    if (opts.warp) await g.ctx.addInitScript(installWarp);
    if (opts.init) await g.ctx.addInitScript(opts.init);
    g.page = await g.ctx.newPage();
    g.errors = [];
    g.gfxErrors = []; // console errors from three (THREE.*): unported materials show up here
    g.page.on('console', (m) => {
      if (m.type() !== 'error') return;
      g.consoleErrors.push(m.text());
      if (m.text().startsWith('THREE.')) g.gfxErrors.push(m.text());
    });
    g.page.on('pageerror', (e) => {
      g.errors.push(e.message);
      // The top few stack frames say where it came from; the message alone rarely does.
      const where = (e.stack || '').split('\n').slice(1, 5).join('\n');
      console.error(`[${g.name} page error]`, e.message + (where ? '\n' + where : ''));
    });
    // A built file that fails says how: a 404 from which CDN node, or the network. A page reloads past this by itself
    // (src/boot/chunk-reload.ts), so this line can be all there is to go on.
    g.page.on('response', (r) => {
      if (r.status() < 400 || !r.url().includes('/assets/')) return;
      const h = r.headers();
      console.error(`[${g.name}] ${r.status()} ${r.url()} (${h['x-cache']}, age ${h['age']}, ${h['x-served-by']})`);
    });
    g.page.on('requestfailed', (r) => {
      if (r.url().includes('/assets/')) console.error(`[${g.name}] ${r.failure()?.errorText} ${r.url()}`);
    });
    const room = opts.room || 'look' + Math.random().toString(36).slice(2, 7);
    const sep = stack.base.includes('?') ? '&' : '?';
    // The dev server sends the isolation headers for `coi=1` (vite.config.ts): a document Playwright fulfils itself
    // (a route adding them) cannot open WebSockets, so the railway never connected on isolated pages.
    const query = new URLSearchParams(
      [opts.query, EXTRA_QUERY, opts.isolated ? 'coi=1' : ''].filter(Boolean).join('&'),
    );
    // No selector opens the current game, as the bare address does; ?proto= (including BOOGLE_QUERY) selects a prototype.
    const dpr = opts.adaptive ? '' : 'dpr=fixed&';
    await g.page.goto(`${stack.base}${sep}${dpr}debugcam=1&room=${room}&${query}`, {
      timeout: 90000,
    });
    // A deployed site (`--url`) over a slow link can take a while to load, and software GL (two tabs at once) builds
    // every shader before the lobby opens.
    console.log(`[${g.name}] entry: ${await enterGame(g.page, 180000, g.name, opts.touch)}`);
    // After the click the world still has to load: a software-rendered tab takes tens of seconds for it.
    await g.page
      .waitForFunction(() => window.__debugCam && window.boogle?.sync, null, { timeout: 120000 })
      .catch((e: Error) => {
        throw new Error(
          `${g.name} clicked "Jump in" but the game never came up within 120 s (${e.message.split('\n')[0]})`,
        );
      });
    if (opts.island) await g.eval(ON_ISLAND);
    // hud: false hides it all; 'play' keeps what a player reacts to (hints, dialogue, pocket) but not the
    // roster, net pill or reticle (cleaner footage); true keeps everything.
    const hide = !opts.hud ? '.hud' : opts.hud === 'play' ? '.hud-tl, .hud-tr, .reticle' : null;
    // The overlay is .touch; body.touch (touch mode) must not match, or the whole page goes blank.
    if (hide) await g.page.addStyleTag({ content: `${hide}, .touch:not(body), .lobby { display: none !important }` });
    await g.page.addStyleTag({ content: '.splash { display: none !important }' }); // still fading out
    g.gfx = await g.page.evaluate(() => window.boogle?.gfx).catch(() => undefined);
    console.log(`[${g.name}] renderer backend: ${g.gfx ?? 'unknown'}`);
    await sleep(300);
    fs.mkdirSync(g.out, { recursive: true });
    if (opts.warp) await g.eval(SKIP_DRAWS);
    return g;
  }

  // Run code in the page. A function (with optional JSON arg) or a string body (may `await`, may
  // `await import('/src/...')` game modules; `return` a JSON-able value).
  private checkImports(code: unknown) {
    if (!this.sourceImports && /\bimport\s*\(/.test(String(code))) throw new Error(HARNESS_REQUIRED);
  }

  // oxlint-disable-next-line typescript/no-explicit-any -- page results are whatever the caller asked for
  eval<R = any, A = any>(code: string | PageFn<A, R>, arg?: A): Promise<R> {
    this.checkImports(code);
    if (typeof code === 'function') return this.page.evaluate(code as PageFn<unknown, R>, arg);
    return this.page.evaluate(`(async () => { ${code}\n})()`) as Promise<R>;
  }

  // Poll an in-page predicate (function or expression string) until truthy. Returns elapsed ms or -1.
  // oxlint-disable-next-line typescript/no-explicit-any -- the predicate's argument is the caller's
  async waitFor<A = any>(
    pred: string | PageFn<A, unknown>,
    { timeout = 15000, step = 100, arg }: { timeout?: number; step?: number; arg?: A } = {},
  ) {
    this.checkImports(pred);
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try {
        const ok =
          typeof pred === 'function'
            ? await this.page.evaluate(pred as PageFn<unknown, unknown>, arg)
            : await this.eval(`return (${pred});`);
        if (ok) return Date.now() - t0;
      } catch {
        /* page busy */
      }
      await sleep(step);
    }
    return -1;
  }

  // Runs the page ahead of the wall (needs `warp` at open) for `seconds` of game time, or until `until` is true, then back to
  // real frames for whatever comes next. Stops at once on a page error. Returns game seconds passed, wall seconds and frames.
  async warp({
    seconds = Infinity,
    until,
    speed = Infinity,
    wallLimit = 540,
    stalled,
  }: {
    seconds?: number;
    until?: string;
    speed?: number;
    wallLimit?: number;
    stalled?: (gameSeconds: number) => Promise<boolean>;
  } = {}) {
    const v = () => this.page.evaluate(() => (window as unknown as { __warp: WarpHandle }).__warp.now());
    const start = await v();
    const t0 = Date.now();
    await this.page.evaluate(
      ([n, stop]) => (window as unknown as { __warp: WarpHandle }).__warp.go(n ?? Infinity, stop ?? undefined),
      [speed, Number.isFinite(seconds) ? start + seconds : null] as const,
    );
    let done = false;
    let wasStalled = false;
    let at = start;
    while (!done && !this.errors.length && Date.now() - t0 < wallLimit * 1000) {
      await sleep(Number.isFinite(seconds) && seconds < 30 ? 20 : 100);
      at = await v();
      done = at - start >= seconds || (until ? !!(await this.page.evaluate(`!!(${until})`)) : false);
      if (!done && (await stalled?.(at))) {
        wasStalled = true;
        break;
      }
    }
    await this.page.evaluate(() => (window as unknown as { __warp: WarpHandle }).__warp.go(1));
    const timedOut = !done && !wasStalled && !this.errors.length && Date.now() - t0 >= wallLimit * 1000;
    // A final read closes the poll/deadline race. A missing beat is never turned into a pass.
    if (timedOut && until) done = !!(await this.page.evaluate(`!!(${until})`));
    if (timedOut && done) console.log('PASS note: final expected beat was present at the wall limit');
    // Real time again. Fetches and shader builds ran on the wall clock, so give what the warp outran the time to land.
    await this.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await sleep(500);
    return {
      game: at - start,
      wall: (Date.now() - t0) / 1000,
      done,
      reason: done ? 'complete' : this.errors.length ? 'page-error' : wasStalled ? 'stall' : 'timeout',
      timeoutAfterBeat: timedOut && done,
    };
  }

  // Freeze the camera at a named view or {cam, look}. Pass fov to change the field of view.
  async view(v: string | Pose, fov?: number) {
    const pose = typeof v === 'string' ? VIEWS[v] : v;
    if (!pose) throw new Error('unknown view ' + v);
    await this.page.evaluate(([c, l, f]) => window.__debugCam!.set(c, l, f ?? undefined), [
      pose.cam,
      pose.look,
      fov || pose.fov || null,
    ] as const);
  }

  // Keyboard / mouse (real input events, so the game's own handlers run). code: 'KeyQ', 'Space', ...
  async key(code: string, holdMs = 0) {
    await this.page.keyboard.down(code);
    if (holdMs) await sleep(holdMs);
    await this.page.keyboard.up(code);
  }
  down = (code: string) => this.page.keyboard.down(code);
  up = (code: string) => this.page.keyboard.up(code);
  click = (x: number, y: number, opts?: Parameters<Page['mouse']['click']>[2]) => this.page.mouse.click(x, y, opts);

  healthErrors() {
    return [
      ...this.errors.map((e) => `page error: ${e}`),
      ...this.consoleErrors.map((e) => `console error: ${e}`),
      ...(this.gfx === 'webgpu' ? [] : [`renderer is ${this.gfx ?? 'unknown'}, expected webgpu`]),
    ];
  }

  // Completed game frames over wall time. A separate rAF counter can tick while rendering is stopped.
  async fps(ms = 1000) {
    const sample = () =>
      this.page.evaluate(() => {
        const frames: unknown = window.boogle.prof?.last.frames;
        if (typeof frames !== 'number' || !Number.isSafeInteger(frames) || frames < 0)
          throw new Error('Completed-frame counter unavailable; use a build with prof.last.frames');
        return { frames, time: performance.now() };
      });
    const before = await sample();
    await sleep(ms);
    const after = await sample();
    if (after.frames < before.frames || after.time <= before.time) throw new Error('Page reset during frame sampling');
    return ((after.frames - before.frames) * 1000) / (after.time - before.time);
  }

  path(label: string, kind: string) {
    return path.join(this.out, `${this.prefix}${label}-${kind}.png`);
  }

  async still(label = 'still') {
    const p = this.path(label, 'still');
    await this.page.screenshot({ path: p, timeout: 120000 }); // a software-rendered tab can take a minute for one frame
    return p;
  }

  // N screenshots spread over `seconds`, tiled into a contact sheet. Heatmaps are opt-in diagnostics, not quality
  // scores: variance ignores frame order and cannot distinguish intended motion from jitter or a frozen renderer.
  async motion(
    label = 'motion',
    {
      frames = 8,
      seconds = 2,
      region = null,
      heatmap = false,
      every = 0,
    }: { frames?: number; seconds?: number; region?: number[] | null; heatmap?: boolean; every?: number } = {},
  ) {
    const [W, H] = this.size;
    const shots: Shot[] = [];
    const t0 = Date.now();
    const start = every
      ? await this.page.evaluate(() => (window as unknown as { __warp: WarpHandle }).__warp.now())
      : 0;
    for (let k = 0; k < frames; k++) {
      if (every) {
        const t = await this.page.evaluate(async (n) => {
          const warp = (window as unknown as { __warp: WarpHandle }).__warp;
          const before = window.boogle.prof?.last.frames;
          await warp.step(n);
          const after = window.boogle.prof?.last.frames;
          if (typeof before !== 'number' || typeof after !== 'number' || after - before !== n)
            throw new Error(`filmstrip expected ${n} completed frames, got ${Number(after) - Number(before)}`);
          return warp.now();
        }, every);
        shots.push({ t: t - start, frame: (k + 1) * every, b64: (await this.page.screenshot()).toString('base64') });
        continue;
      }
      const due = t0 + (k * seconds * 1000) / Math.max(1, frames - 1);
      if (Date.now() < due) await sleep(due - Date.now());
      const t = (Date.now() - t0) / 1000;
      shots.push({ t, b64: (await this.page.screenshot()).toString('base64') });
    }
    const calc = await this.ctx.newPage();
    const res = await calc.evaluate(analyse, { shots, region, heatmap, W: W!, H: H! });
    await calc.close();
    const save = (p: string, url: string) => fs.writeFileSync(p, Buffer.from(url.split(',')[1]!, 'base64'));
    const sheet = this.path(label, every ? 'filmstrip' : 'motion'),
      heat = heatmap ? this.path(label, 'heat') : null;
    save(sheet, res.sheetUrl);
    if (heat && res.heatUrl) save(heat, res.heatUrl);
    return { score: res.score, hotFrac: res.hotFrac, sheet, heat };
  }

  // Video in virtual time: pauses the page clock (needs `clock` at open), then per frame advances it 1/fps s and
  // screenshots, so the clip plays smoothly however slowly the page renders. `each(t, k)` runs before each frame
  // (t = seconds into the clip): move the debug camera, send input, poke state. Writes <out>/clips/<label>.mp4
  // (H.264 via ffmpeg) and, with `gif`, a palette GIF next to it. Returns the paths.
  async record(
    label: string,
    {
      seconds = 4,
      fps = 30,
      each = null,
      gif = false,
      gifWidth = 480,
    }: {
      seconds?: number;
      fps?: number;
      each?: ((t: number, k: number) => unknown) | null;
      gif?: boolean;
      gifWidth?: number;
    } = {},
  ) {
    const dir = path.join(this.out, 'clips');
    fs.mkdirSync(dir, { recursive: true });
    const mp4 = path.join(dir, `${this.prefix}${label}.mp4`);
    const ff = spawn('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '16',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      mp4,
    ]);
    const done = new Promise<void>((res, rej) =>
      ff.on('close', (c) => (c ? rej(new Error('ffmpeg exit ' + c)) : res())),
    );
    if (!this.paused) {
      // Pause a little ahead of page time: on a loaded machine the round trip can outlast a short margin, and Playwright
      // refuses to fast-forward to the past.
      await this.page.clock.pauseAt((await this.page.evaluate(() => Date.now())) + 2000);
      this.paused = true;
    }
    const n = Math.round(seconds * fps);
    for (let k = 0; k < n; k++) {
      if (each) await each(k / fps, k);
      await this.page.clock.runFor(1000 / fps);
      ff.stdin.write(await this.page.screenshot({ type: 'jpeg', quality: 95 }));
    }
    ff.stdin.end();
    await done;
    const out: { mp4: string; gif?: string } = { mp4 };
    if (gif) {
      out.gif = mp4.replace(/\.mp4$/, '.gif');
      const vf = `fps=15,scale=${gifWidth}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', vf, out.gif]);
    }
    return out;
  }

  // Let page time pass (virtual when the clock is paused, real otherwise) without recording.
  async wait(seconds: number) {
    if (this.paused) await this.page.clock.runFor(seconds * 1000);
    else await sleep(seconds * 1000);
  }

  // trace: a .zip path to save the trace to (`npx playwright show-trace <zip>`); without it the trace is dropped.
  async close({ trace }: { trace?: string } = {}) {
    if (this.tracing) await this.ctx.tracing.stop(trace ? { path: trace } : {}).catch(() => {});
    await this.ctx.close();
    await this.ownedBrowser?.close().catch(() => {});
  }
}

// Runs inside a scratch page (canvas), so the harness needs no image library.
type Shot = { t: number; b64: string; frame?: number };
async function analyse({
  shots,
  region,
  heatmap,
  W,
  H,
}: {
  shots: Shot[];
  region: number[] | null;
  heatmap: boolean;
  W: number;
  H: number;
}) {
  const imgs = await Promise.all(
    shots.map(
      (s) =>
        new Promise<HTMLImageElement>((r) => {
          const im = new Image();
          im.onload = () => r(im);
          im.src = 'data:image/png;base64,' + s.b64;
        }),
    ),
  );
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true })!;
  const data = imgs.map((im) => {
    cx.drawImage(im, 0, 0);
    return cx.getImageData(0, 0, W, H).data;
  });
  const n = data.length;
  const heat = heatmap ? cx.createImageData(W, H) : null;
  const rx0 = region ? Math.floor(region[0]! * W) : 0,
    ry0 = region ? Math.floor(region[1]! * H) : 0,
    rx1 = region ? Math.ceil((region[0]! + region[2]!) * W) : W,
    ry1 = region ? Math.ceil((region[1]! + region[3]!) * H) : H;
  let sum = 0,
    cnt = 0,
    hot = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (heat) heat.data[o + 3] = 255;
      if (x < rx0 || x >= rx1 || y < ry0 || y >= ry1) continue;
      let sd = 0;
      for (let ch = 0; ch < 3; ch++) {
        let m = 0;
        for (let f = 0; f < n; f++) m += data[f]![o + ch]!;
        m /= n;
        let v = 0;
        for (let f = 0; f < n; f++) v += (data[f]![o + ch]! - m) ** 2;
        sd += v / n;
      }
      sd = Math.sqrt(sd / 3);
      sum += sd;
      cnt++;
      if (sd > 8) hot++;
      if (heat) {
        const h = Math.min(1, sd / 40); // black -> red -> yellow -> white over 0..40
        heat.data[o] = Math.min(255, h * 3 * 255);
        heat.data[o + 1] = Math.max(0, Math.min(255, (h * 3 - 1) * 255));
        heat.data[o + 2] = Math.max(0, Math.min(255, (h * 3 - 2) * 255));
      }
    }
  if (heat) {
    cx.putImageData(heat, 0, 0);
    if (region) {
      cx.strokeStyle = '#f0f';
      cx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }
  }
  const heatUrl = heat ? cv.toDataURL('image/png') : null;
  const cols = Math.min(4, n),
    rows = Math.ceil(n / cols),
    tw = Math.floor(W / 2),
    th = Math.floor(H / 2);
  const sheet = document.createElement('canvas');
  sheet.width = cols * tw;
  sheet.height = rows * th;
  const sx = sheet.getContext('2d')!;
  sx.font = '14px monospace';
  imgs.forEach((im, f) => {
    const x = (f % cols) * tw,
      y = Math.floor(f / cols) * th;
    sx.drawImage(im, x, y, tw, th);
    sx.fillStyle = 'rgba(0,0,0,0.6)';
    sx.fillRect(x, y, shots[f]!.frame === undefined ? 70 : 180, 20);
    sx.fillStyle = '#fff';
    sx.fillText(
      (shots[f]!.frame === undefined ? '' : `#${shots[f]!.frame}  `) + shots[f]!.t.toFixed(3) + 's',
      x + 4,
      y + 15,
    );
    if (region) {
      sx.strokeStyle = '#f0f';
      sx.strokeRect(x + rx0 / 2, y + ry0 / 2, (rx1 - rx0) / 2, (ry1 - ry0) / 2);
    }
  });
  return { score: sum / cnt, hotFrac: hot / cnt, heatUrl, sheetUrl: sheet.toDataURL('image/png') };
}
