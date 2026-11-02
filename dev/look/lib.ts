// Shared harness for `npm run look` and `npm run scenario`: a Vite dev server plus a local PeerJS signaling
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

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const run = (cmd: string, args: string[]) =>
  new Promise<void>((res, rej) =>
    spawn(cmd, args, { stdio: 'inherit' }).on('close', (c) => (c ? rej(new Error(`${cmd} exit ${c}`)) : res())),
  );

/** A camera pose: position and look-at target (world metres, y up). */
export type Pose = { cam: number[]; look: number[] };

// One table of named viewpoints: camera position, look-at target (world metres, y up).
export const VIEWS: Record<string, Pose> = {
  hill: { cam: [-10, 12, -14], look: [-22, 3.5, -21] },
  shore: { cam: [-22, 7.5, -17], look: [-30, 0.5, -27] },
  court: { cam: [12, 4, 30], look: [12, 0.5, 21] },
  garden: { cam: [30, 7, 15], look: [30, 1, 2.5] },
  overview: { cam: [-40, 40, 40], look: [-5, 0, 0] },
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
export type Stack = { base: string; close: () => Promise<void> };
export async function startStack({
  url = null,
  root: dir = root,
}: { url?: string | null; root?: string } = {}): Promise<Stack> {
  if (url) return { base: url, close: async () => {} };
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-look-'));
  const server = createService(loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: '*' }, { log: () => {} }));
  const sigPort = await server.listen(0);
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
  const base = `http://127.0.0.1:${port}/`;
  let up = false;
  for (let t = 0; t < 150 && !up; t++) {
    try {
      up = (await fetch(base)).ok;
    } catch {
      await sleep(200);
    }
  }
  if (!up) {
    vite.kill('SIGTERM');
    throw new Error('vite did not start');
  }
  return {
    base,
    async close() {
      if (!vite.killed) vite.kill('SIGTERM');
      await server.close({ save: false });
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

// The game is WebGPU only. On Linux (CI) WebGPU runs on SwiftShader over Vulkan, so runners without a GPU still get it;
// on a Mac it runs on the real GPU (Metal), about 60 fps.
export const launch = (): Promise<Browser> => {
  // precise-memory-info: performance.memory in exact bytes, for the allocation counts in hitches.
  const args = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-precise-memory-info'];
  if (process.platform === 'darwin') args.push('--use-angle=metal');
  // The ANGLE SwiftShader flags stay: without them CI's WebGPU throws "Instance dropped in popErrorScope" page errors.
  else
    args.push(
      ...['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      ...['--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader'],
    );
  return chromium.launch({ args });
};

// Prints the THREE.* console errors a game collected (once each), if any.
export function reportGfxErrors(games: Game[]) {
  const seen = new Set(games.flatMap((g) => g.gfxErrors));
  if (!seen.size) return console.log('gfx errors: none');
  console.log(`gfx errors (${seen.size} distinct):`);
  for (const e of seen) console.log('  ' + e.split('\n')[0].slice(0, 240));
}

// BOOGLE_QUERY=physics=rapier (any URL params) is added to every page the harness opens: scenarios on another backend.
const EXTRA_QUERY = process.env.BOOGLE_QUERY ? '&' + process.env.BOOGLE_QUERY : '';

/** Options for `Game.open` (described above it). */
export type GameOpts = {
  room?: string;
  name?: string;
  size?: number[];
  hud?: boolean | string;
  out?: string;
  prefix?: string;
  query?: string;
  clock?: boolean;
  init?: string | (() => void);
  isolated?: boolean;
  touch?: boolean;
  trace?: boolean;
};
/** A function `page.evaluate` runs in the page (serialised, so it sees only its argument). */
type PageFn<A, R> = (arg: A) => R | Promise<R>;

export class Game {
  name = 'player';
  out = '';
  prefix = '';
  size = [960, 600];
  ctx!: BrowserContext;
  page!: Page;
  tracing = false;
  paused = false;
  errors: string[] = [];
  gfxErrors: string[] = [];
  gfx: string | undefined;

  // opts: room, name, size [w,h], hud (true keeps the HUD in pictures, 'play' a clean subset), out (directory for images), label prefix,
  // query (extra URL params, e.g. 'tidefast=1'), clock (fake the page clock so `record` can step time),
  // init (a function or script run before the page's own code, e.g. to seed localStorage),
  // isolated (serve the page cross-origin isolated, so performance.now() ticks in 5 us instead of 100 us steps),
  // Every page gets `?dpr=fixed`, which keeps adaptive resolution off so images stay comparable,
  // touch (a phone: touch events and `(pointer: coarse)`, so the page starts in touch mode with body.touch and the
  // touch buttons; pair it with size [390, 844] for portrait or [844, 390] for landscape. No isMobile: it changes the
  // layout viewport, and the game only needs the coarse pointer),
  // trace (record a Playwright trace: the action timeline, console, network and page errors; `close({ trace: file })`
  // keeps it. No screencast or DOM snapshots: on a CI runner's software GL they starve the frame loop, since waitFor
  // evaluates every 100 ms and each call snapshots the DOM, and the stills already show the canvas)
  static async open(browser: Browser, stack: Stack, opts: GameOpts = {}) {
    const g = new Game();
    g.name = opts.name || 'player';
    g.out = path.resolve(opts.out || '.look');
    g.prefix = opts.prefix || '';
    g.size = opts.size || [960, 600];
    g.ctx = await browser.newContext({ viewport: { width: g.size[0], height: g.size[1] }, hasTouch: !!opts.touch });
    if (opts.clock) await g.ctx.clock.install();
    g.tracing = !!opts.trace;
    if (g.tracing) await g.ctx.tracing.start({ title: g.name });
    // src/constants.ts reads isTouch once at load, so this must run before the page's code.
    if (opts.touch)
      await g.ctx.addInitScript(() => {
        const mm = window.matchMedia.bind(window);
        window.matchMedia = (q: string) =>
          q === '(pointer: coarse)' ? ({ ...mm(q), matches: true, media: q } as MediaQueryList) : mm(q);
      });
    if (opts.init) await g.ctx.addInitScript(opts.init);
    const doc = new URL(stack.base);
    if (opts.isolated)
      await g.ctx.route(
        (u) => u.origin === doc.origin && u.pathname === doc.pathname,
        async (route) => {
          const res = await route.fetch();
          const coi = { 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'credentialless' };
          await route.fulfill({ response: res, headers: { ...res.headers(), ...coi } });
        },
      );
    g.page = await g.ctx.newPage();
    g.errors = [];
    g.gfxErrors = []; // console errors from three (THREE.*): unported materials show up here
    g.page.on('console', (m) => {
      if (m.type() === 'error' && m.text().startsWith('THREE.')) g.gfxErrors.push(m.text());
    });
    g.page.on('pageerror', (e) => {
      g.errors.push(e.message);
      // The top few stack frames say where it came from; the message alone rarely does.
      const where = (e.stack || '').split('\n').slice(1, 5).join('\n');
      console.error(`[${g.name} page error]`, e.message + (where ? '\n' + where : ''));
    });
    const room = opts.room || 'look' + Math.random().toString(36).slice(2, 7);
    const sep = stack.base.includes('?') ? '&' : '?';
    await g.page.goto(
      `${stack.base}${sep}dpr=fixed&debugcam=1&room=${room}${opts.query ? '&' + opts.query : ''}${EXTRA_QUERY}`,
      {
        timeout: 90000,
      },
    );
    // A deployed site (`--url`) over a slow link can take a while to load, and software GL (two tabs at once) builds
    // every shader before the lobby opens.
    await g.page.waitForSelector('#enter:not([disabled])', { timeout: 180000 });
    // A returning visit (a name saved by `init`, src/player/arrival.ts) goes straight in: no card to fill.
    if (!(await g.page.evaluate(() => document.body.classList.contains('playing')))) {
      await g.page.fill('#name-input', g.name).catch(() => {});
      // A phone taps in: a mouse click would switch the page to keyboard-and-mouse mode (src/player/input.ts).
      await (opts.touch ? g.page.tap('#enter') : g.page.click('#enter'));
    }
    await g.page.waitForFunction(() => window.__debugCam && window.boogle?.sync, null, { timeout: 20000 });
    // hud: false hides it all; 'play' keeps what a player reacts to (hints, dialogue, pocket) but not the first-run
    // card, roster, net pill or reticle (cleaner footage); true keeps everything.
    const hide = !opts.hud ? '.hud' : opts.hud === 'play' ? '.first-run, .hud-tl, .hud-tr, .reticle' : null;
    // The overlay is .touch; body.touch (touch mode) must not match, or the whole page goes blank.
    if (hide) await g.page.addStyleTag({ content: `${hide}, .touch:not(body), .lobby { display: none !important }` });
    await g.page.addStyleTag({ content: '.splash { display: none !important }' }); // still fading out
    g.gfx = await g.page.evaluate(() => window.boogle?.gfx).catch(() => undefined);
    console.log(`[${g.name}] renderer backend: ${g.gfx ?? 'unknown'}`);
    await sleep(300);
    fs.mkdirSync(g.out, { recursive: true });
    return g;
  }

  // Run code in the page. A function (with optional JSON arg) or a string body (may `await`, may
  // `await import('/src/...')` game modules; `return` a JSON-able value).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- page results are whatever the caller asked for
  eval<R = any, A = any>(code: string | PageFn<A, R>, arg?: A): Promise<R> {
    if (typeof code === 'function') return this.page.evaluate(code as PageFn<unknown, R>, arg);
    return this.page.evaluate(`(async () => { ${code}\n})()`) as Promise<R>;
  }

  // Poll an in-page predicate (function or expression string) until truthy. Returns elapsed ms or -1.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the predicate's argument is the caller's
  async waitFor<A = any>(
    pred: string | PageFn<A, unknown>,
    { timeout = 15000, step = 100, arg }: { timeout?: number; step?: number; arg?: A } = {},
  ) {
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

  // Freeze the camera at a named view or {cam, look}. Pass fov to change the field of view.
  async view(v: string | Pose, fov?: number) {
    const pose = typeof v === 'string' ? VIEWS[v] : v;
    if (!pose) throw new Error('unknown view ' + v);
    await this.page.evaluate(([c, l, f]) => window.__debugCam!.set(c, l, f ?? undefined), [
      pose.cam,
      pose.look,
      fov || null,
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

  async fps(ms = 1000) {
    return this.page.evaluate(
      (ms) =>
        new Promise<number>((res) => {
          let n = 0;
          const t0 = performance.now();
          const f = () => {
            n++;
            if (performance.now() - t0 < ms) requestAnimationFrame(f);
            else res((n * 1000) / (performance.now() - t0));
          };
          requestAnimationFrame(f);
        }),
      ms,
    );
  }

  path(label: string, kind: string) {
    return path.join(this.out, `${this.prefix}${label}-${kind}.png`);
  }

  async still(label = 'still') {
    const p = this.path(label, 'still');
    await this.page.screenshot({ path: p });
    return p;
  }

  // N screenshots spread over `seconds`, tiled into a contact sheet with timestamps, plus a per-pixel temporal
  // stddev heatmap. score = mean stddev (0..255) over `region` ([x,y,w,h] as fractions of the frame).
  async motion(
    label = 'motion',
    { frames = 8, seconds = 2, region = null }: { frames?: number; seconds?: number; region?: number[] | null } = {},
  ) {
    const [W, H] = this.size;
    const shots: Shot[] = [];
    const t0 = Date.now();
    for (let k = 0; k < frames; k++) {
      const due = t0 + (k * seconds * 1000) / Math.max(1, frames - 1);
      if (Date.now() < due) await sleep(due - Date.now());
      const t = (Date.now() - t0) / 1000;
      shots.push({ t, b64: (await this.page.screenshot()).toString('base64') });
    }
    const calc = await this.ctx.newPage();
    const res = await calc.evaluate(analyse, { shots, region, W, H });
    await calc.close();
    const save = (p: string, url: string) => fs.writeFileSync(p, Buffer.from(url.split(',')[1], 'base64'));
    const sheet = this.path(label, 'motion'),
      heat = this.path(label, 'heat');
    save(sheet, res.sheetUrl);
    save(heat, res.heatUrl);
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
  }
}

// Runs inside a scratch page (canvas), so the harness needs no image library.
type Shot = { t: number; b64: string };
async function analyse({ shots, region, W, H }: { shots: Shot[]; region: number[] | null; W: number; H: number }) {
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
  const heat = cx.createImageData(W, H);
  const rx0 = region ? Math.floor(region[0] * W) : 0,
    ry0 = region ? Math.floor(region[1] * H) : 0,
    rx1 = region ? Math.ceil((region[0] + region[2]) * W) : W,
    ry1 = region ? Math.ceil((region[1] + region[3]) * H) : H;
  let sum = 0,
    cnt = 0,
    hot = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      let sd = 0;
      for (let ch = 0; ch < 3; ch++) {
        let m = 0;
        for (let f = 0; f < n; f++) m += data[f][o + ch];
        m /= n;
        let v = 0;
        for (let f = 0; f < n; f++) v += (data[f][o + ch] - m) ** 2;
        sd += v / n;
      }
      sd = Math.sqrt(sd / 3);
      if (x >= rx0 && x < rx1 && y >= ry0 && y < ry1) {
        sum += sd;
        cnt++;
        if (sd > 8) hot++;
      }
      const h = Math.min(1, sd / 40); // black -> red -> yellow -> white over 0..40
      heat.data[o] = Math.min(255, h * 3 * 255);
      heat.data[o + 1] = Math.max(0, Math.min(255, (h * 3 - 1) * 255));
      heat.data[o + 2] = Math.max(0, Math.min(255, (h * 3 - 2) * 255));
      heat.data[o + 3] = 255;
    }
  cx.putImageData(heat, 0, 0);
  const heatUrl = cv.toDataURL('image/png');
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
    sx.fillRect(x, y, 70, 20);
    sx.fillStyle = '#fff';
    sx.fillText(shots[f].t.toFixed(2) + 's', x + 4, y + 15);
    if (region) {
      sx.strokeStyle = '#f0f';
      sx.strokeRect(x + rx0 / 2, y + ry0 / 2, (rx1 - rx0) / 2, (ry1 - ry0) / 2);
    }
  });
  return { score: sum / cnt, hotFrac: hot / cnt, heatUrl, sheetUrl: sheet.toDataURL('image/png') };
}
