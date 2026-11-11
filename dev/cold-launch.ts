// Cold launch, attributed (docs/research/cold-start.md). A production build served like the live site (HTTP/2, gzip,
// max-age=600, from a local TLS server), a fresh headless Chromium per run (empty HTTP cache, no service worker), on a
// fast profile and on Slow 4G + 4x CPU. Each run records every boot mark, the network waterfall, a performance trace
// (main-thread time by kind, long tasks), a CPU profile mapped through source maps to source files, and the GPU
// pipeline calls. Not a device: headless Chromium on the Mac's Metal GPU.
//
//   npm run cold-launch                              build, 3 runs on each profile, print the tables
//   npm run cold-launch -- --runs 5 --profiles slow  only the throttled profile
//   npm run cold-launch -- --dist <dir> --label after   reuse a build made by an earlier run (its port is in dist/.port)
//   npm run cold-launch -- --coverage                one more run per profile with JS coverage up to "interactive"
//   npm run cold-launch -- --detail                  one more fast run with ?startup=1 (each pipeline's object)
//   npm run cold-launch -- --metal-cold              every run with an empty Metal shader cache (a device's first visit)
//   npm run cold-launch -- --compare a.json b.json   medians side by side
//   npm run cold-launch -- --play                    per profile: Jump in the moment it is enabled, walk, jump, coast stills
//   npm run cold-launch -- --fail                    Rapier's WASM answered 404, then aborted: what the player is left with
//   npm run cold-launch -- --stills                  per profile: the loading screen before and after its title font lands
//   npm run cold-launch -- --no-modulepreload        every run as a browser without rel=modulepreload
//   npm run cold-launch -- --late-stills             per profile: Jump in the moment it is enabled, stills at 0, 2, 5, 10 s
//                                                    (what a lobby-first build draws late)
//   npm run cold-launch -- --jump                    clean and traced runs click Jump in the moment it is enabled, then
//                                                    hold --jump-hold ms (12000): frames over 100 ms after it, pipelines
//                                                    built after it (sync / async) and when the last one finished
// (--detail also clicks Jump in, then puts the player on Far Head, the device suite's `head` scene.)
//
// Results: .look/cold-launch/<label>/summary.json (and runs/*.json). Takes the machine-wide bot slot for its browsers.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http2 from 'node:http2';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { SourceMapConsumer } from 'source-map-js';
import { createService, loadConfig } from '../server/src/server.ts';
import { installStartupRecorder } from '../src/debug/startup-record.ts';
import { acquireBotSlot } from './look/bot-queue.ts';
import { prepareIdentity, clearExclusiveMetal } from './cold-start/identity.ts';
import { browserChannel, freePort, gpuAngle, root } from './look/lib.ts';

const argv = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('--') ? argv[i + 1]! : def;
};
const flag = (name: string) => argv.includes(`--${name}`);
type Summary = { label: string; profiles: Record<string, Record<string, Stat>> };
type Stat = { median: number; min: number; max: number; n: number };

if (flag('compare')) {
  const [a, b] = argv
    .slice(argv.indexOf('--compare') + 1)
    .map((f) => JSON.parse(fs.readFileSync(f, 'utf8')) as Summary);
  for (const profile of Object.keys(a!.profiles)) {
    console.log(`\n${profile}: ${a!.label} -> ${b!.label} (median [min-max])`);
    for (const key of Object.keys(a!.profiles[profile]!)) {
      const x = a!.profiles[profile]![key]!,
        y = b!.profiles[profile]?.[key];
      if (!y) continue;
      const d = y.median - x.median;
      console.log(
        `  ${key.padEnd(34)} ${fmt(x)}  ->  ${fmt(y)}   ${d > 0 ? '+' : ''}${Math.round(d)} (${Math.round((d / (x.median || 1)) * 100)} %)`,
      );
    }
  }
  process.exit(0);
}

const RUNS = Number(opt('runs', '3'));
const TRACED = Number(opt('traced', '1')); // runs with a trace and a CPU profile (slower; attribution only)
const PROFILES = opt('profiles', 'fast,slow').split(',');
const LABEL = opt('label', `run-${Date.now().toString(36)}`);
const OUT = path.join(root, '.look/cold-launch', LABEL);
const HOLD_MS = Number(opt('hold', '4000')); // after "interactive": the room, the service worker, idle prefetch
const JUMP = flag('jump');
const JUMP_HOLD_MS = Number(opt('jump-hold', '12000'));
const KEEP_FONTS = !flag('no-fonts');
fs.mkdirSync(path.join(OUT, 'runs'), { recursive: true });
const metal = flag('metal-cold') ? prepareIdentity(chromium.executablePath(), OUT) : null;

// The DevTools presets: Slow 4G is 150 ms RTT x 3.75, 1.6 Mbit/s x 0.9 down, 750 kbit/s x 0.9 up; CPU 4x slower.
const PROFILE: Record<string, { latency: number; down: number; up: number; cpu: number }> = {
  fast: { latency: 0, down: -1, up: -1, cpu: 1 },
  slow: { latency: 562.5, down: (1.6e6 * 0.9) / 8, up: (750e3 * 0.9) / 8, cpu: 4 },
};

// ---- the build and the servers ----------------------------------------------------------------------------------
const gameServer = createService(
  loadConfig(
    { DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'cold-launch-rooms-')), SERVER_ROOMS: '*' },
    { log: () => {} },
  ),
);
let dist = opt('dist', '');
let port: number;
if (dist) {
  port = Number(fs.readFileSync(path.join(dist, '.port'), 'utf8'));
  await gameServer.listen(port + 1);
} else {
  port = await freePort();
  await gameServer.listen(port + 1);
  dist = path.join(OUT, 'dist');
  const r = spawnSync(
    process.execPath,
    [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--sourcemap', '--outDir', dist],
    {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, VITE_BOOGLE_SERVER: `http://127.0.0.1:${port + 1}`, VITE_BUILD: `cold-launch-${LABEL}` },
    },
  );
  if (r.status) throw new Error('vite build failed');
  fs.writeFileSync(path.join(dist, '.port'), String(port));
}
if (!KEEP_FONTS) {
  const html = path.join(dist, 'index.html');
  fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace(/<link\b[^>]*href="https:\/\/fonts\.[^"]*"[^>]*>/g, ''));
}

// Like GitHub Pages (boogle.club, checked with curl on 10 November 2026): HTTP/2, gzip for everything but images and
// audio, `cache-control: max-age=600`, application/wasm (so Rapier compiles while it streams).
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ktx2': 'image/ktx2',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.map': 'application/json',
};
const gzipped = new Map<string, Buffer>();
const keyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cold-launch-tls-'));
spawnSync('openssl', [
  ...['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=127.0.0.1'],
  ...['-keyout', path.join(keyDir, 'k.pem'), '-out', path.join(keyDir, 'c.pem')],
]);
const site = http2.createSecureServer(
  {
    key: fs.readFileSync(path.join(keyDir, 'k.pem')),
    cert: fs.readFileSync(path.join(keyDir, 'c.pem')),
    allowHTTP1: true,
  },
  (req, res) => {
    const url = new URL(req.url ?? '/', 'https://x');
    let file = path.join(dist, decodeURIComponent(url.pathname));
    if (!file.startsWith(dist)) return void res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return void res.writeHead(404).end();
    const ext = path.extname(file);
    const headers: Record<string, string> = {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      'cache-control': 'max-age=600',
      'access-control-allow-origin': '*',
    };
    let body: Buffer = fs.readFileSync(file);
    if (!/\.(png|jpe?g|webp|mp3|m4a|ogg|opus)$/.test(ext) && /gzip/.test(String(req.headers['accept-encoding']))) {
      if (!gzipped.has(file)) gzipped.set(file, zlib.gzipSync(body, { level: 6 }));
      body = gzipped.get(file)!;
      headers['content-encoding'] = 'gzip';
    }
    res.writeHead(200, { ...headers, 'content-length': String(body.length) }).end(body);
  },
);
await new Promise<void>((r) => site.listen(port, '127.0.0.1', r));
const base = `https://127.0.0.1:${port}/`;

// ---- source maps: a profile's minified positions to source files ------------------------------------------------
const maps = new Map<string, SourceMapConsumer | null>();
function sourceOf(url: string, line: number, column: number, withLine = false): string {
  const m = url.match(/\/assets\/[^?#]+\.js/);
  if (!m) return url ? url.replace(base, '/').slice(0, 60) : '(native)';
  const file = path.join(dist, m[0]);
  if (!maps.has(file)) {
    const map = file + '.map';
    maps.set(file, fs.existsSync(map) ? new SourceMapConsumer(JSON.parse(fs.readFileSync(map, 'utf8'))) : null);
  }
  const consumer = maps.get(file);
  if (!consumer) return m[0];
  const pos = consumer.originalPositionFor({ line: line + 1, column });
  return (
    (pos.source ?? m[0]).replace(/^(\.\.\/)+/, '').replace(/^.*node_modules\//, '') + (withLine ? `:${pos.line}` : '')
  );
}
// The leaf's library; the owner is the nearest game file up the stack.
const LIB: [RegExp, string][] = [
  [/^three\/build\/three\.tsl/, 'three TSL'],
  [/^three\/build\/three\.webgpu/, 'three WebGPU renderer and nodes'],
  [/^three\/build\/three\.core/, 'three core'],
  [/^three\/examples\//, 'three add-ons (loaders, decoders)'],
  [/^@dimforge\/|rapier.*\.wasm/, 'Rapier'],
  [/^src\//, 'game code'],
  [/^\(program\)/, 'native (program)'],
  [/^\(garbage collector\)/, 'native (GC)'],
];
const libOf = (src: string) => LIB.find(([re]) => re.test(src))?.[1] ?? 'other';

// ---- one run ----------------------------------------------------------------------------------------------------
type Request = {
  url: string;
  start: number;
  end: number;
  bytes: number;
  type: string;
  protocol: string;
  priority: string;
  fromSw: boolean;
  status: number;
};
type Mode = 'clean' | 'traced' | 'coverage' | 'detail' | 'play' | 'fail-404' | 'fail-abort' | 'stills' | 'late';
async function run(profileName: string, n: number, mode: Mode) {
  const profile = PROFILE[profileName]!;
  // --metal-cold: a copy of Chrome with its own bundle id (dev/cold-start/identity.ts), its Metal shader cache cleared
  // before every run, so the GPU compiles every pipeline as on a first visit; otherwise the Mac's cache is warm after
  // the first run and pipelines cost a fraction of a device's first launch.
  if (metal) clearExclusiveMetal(metal.cacheRoot, metal.id);
  const browser = await chromium.launch({
    headless: true,
    ...(metal ? { executablePath: metal.executable } : browserChannel()),
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', gpuAngle(), '--ignore-certificate-errors'],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  await page.addInitScript(installStartupRecorder);
  if (flag('no-modulepreload'))
    // A browser that does not know rel=modulepreload (Safari before 17): Vite's polyfill then fetches the links itself.
    await page.addInitScript(() => {
      const supports = DOMTokenList.prototype.supports;
      DOMTokenList.prototype.supports = function (token: string) {
        return token === 'modulepreload' ? false : supports.call(this, token);
      };
    });
  // The service worker's own fetches (its precache) are not on the page's Network domain: Playwright reports them on
  // the context, timed here in the page's clock (Date.now() - timeOrigin) next to a mark for the register() call.
  const swRequests: { url: string; t: number; end: number; status: number }[] = [];
  context.on('request', (q) => {
    if (q.serviceWorker()) swRequests.push({ url: q.url(), t: Date.now(), end: -1, status: 0 });
  });
  context.on('requestfinished', async (q) => {
    const r = q.serviceWorker() && swRequests.find((s) => s.url === q.url() && s.end < 0);
    if (!r) return;
    r.end = Date.now();
    r.status = (await q.response().catch(() => null))?.status() ?? 0; // the worker can close with the browser first
  });
  await page.addInitScript(() => {
    const register = ServiceWorkerContainer.prototype.register;
    ServiceWorkerContainer.prototype.register = function (...args: Parameters<typeof register>) {
      performance.mark('cold:sw-register');
      return register.apply(this, args);
    };
  });
  await page.addInitScript(() => {
    // When "Jump in" stops being disabled (the owner's measure), beside the boot marks.
    new MutationObserver((_, obs) => {
      const b = document.querySelector<HTMLButtonElement>('#enter');
      if (b && !b.disabled) {
        performance.mark('cold:enter-enabled');
        obs.disconnect();
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
  });
  if (mode === 'detail')
    await page.addInitScript(() => {
      // Which pipelines are ever bound in a pass, and when first: against those created, the ones built for nothing on
      // screen yet. Render pipelines only (compute passes are few).
      // first: its first bind; shown: its first bind after the loading screen lifted (boot:first).
      const used = new Map<unknown, { label: string; t: number; shown: number }>();
      const enc = (globalThis as unknown as { GPURenderPassEncoder?: { prototype: Record<string, unknown> } })
        .GPURenderPassEncoder;
      const set = enc?.prototype.setPipeline as ((p: { label?: string }) => void) | undefined;
      let lifted = false;
      if (enc && set)
        enc.prototype.setPipeline = function (this: unknown, p: { label?: string }) {
          let u = used.get(p);
          if (!u) used.set(p, (u = { label: p.label ?? '', t: performance.now(), shown: -1 }));
          lifted ||= performance.getEntriesByName('boot:first').length > 0;
          if (lifted && u.shown < 0) u.shown = performance.now();
          return set.call(this, p);
        };
      (window as unknown as { __used: () => unknown[] }).__used = () => [...used.values()];
    });
  const requests = new Map<string, Request>();
  let t0 = 0; // the navigation's request, in CDP's monotonic seconds
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', (e) => {
    if (!t0 && e.type === 'Document') t0 = e.timestamp;
    requests.set(e.requestId, {
      url: e.request.url,
      start: e.timestamp,
      end: 0,
      bytes: 0,
      type: e.type ?? '',
      protocol: '',
      priority: e.request.initialPriority,
      fromSw: false,
      status: 0,
    });
  });
  cdp.on('Network.responseReceived', (e) => {
    const r = requests.get(e.requestId);
    if (r)
      Object.assign(r, {
        protocol: e.response.protocol ?? '',
        fromSw: !!e.response.fromServiceWorker,
        status: e.response.status,
      });
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId);
    if (r) Object.assign(r, { end: e.timestamp, bytes: e.encodedDataLength });
  });
  if (profile.latency || profile.down > 0)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latency,
      downloadThroughput: profile.down,
      uploadThroughput: profile.up,
    });
  if (profile.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  const tracePath = path.join(OUT, 'runs', `${profileName}-${n}-${mode}.trace.json`);
  if (mode === 'traced') {
    await browser.startTracing(page, {
      path: tracePath,
      categories: [
        'devtools.timeline',
        'disabled-by-default-devtools.timeline',
        'v8',
        'v8.execute',
        'v8.wasm',
        'blink.user_timing',
        'loading',
      ],
    });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
    await cdp.send('Profiler.start');
  }
  if (mode === 'coverage') {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true });
  }
  if (mode === 'fail-404' || mode === 'fail-abort')
    // Rapier's WASM (both builds) refused: what does the player see?
    await page.route(/\.wasm$/, (route) =>
      mode === 'fail-404' ? route.fulfill({ status: 404, body: 'blocked' }) : route.abort('blockedbyclient'),
    );
  const extra = mode === 'detail' || mode === 'late' ? '&startup=1' : mode === 'play' ? '&debugcam=1' : '';
  const query = `?room=cold-${profileName}-${n}-${Date.now().toString(36)}&notrack=1${extra}`;
  const wall = Date.now();
  await page.goto(base + query, { waitUntil: 'commit', timeout: 180000 });
  if (mode === 'stills') {
    const seen = await fontSwap(page, path.join(OUT, `${profileName}-font`));
    await browser.close();
    fs.writeFileSync(path.join(OUT, 'runs', `${profileName}-${n}-stills.json`), JSON.stringify(seen, null, 1));
    return seen as never;
  }
  if (mode === 'fail-404' || mode === 'fail-abort') {
    const seen = await failure(page, path.join(OUT, `${profileName}-${mode}`));
    await browser.close();
    const result = { profile: profileName, n, mode, errors, ...seen };
    fs.writeFileSync(path.join(OUT, 'runs', `${profileName}-${n}-${mode}.json`), JSON.stringify(result, null, 1));
    return result as never;
  }
  // --play clicks Jump in the moment it is enabled, which can be before "interactive" (the room, the last frames).
  const jump = (JUMP && (mode === 'clean' || mode === 'traced')) || mode === 'late';
  const ready = mode === 'play' || jump ? 'cold:enter-enabled' : 'boot:interactive';
  await page.waitForFunction((m) => performance.getEntriesByName(m).length > 0, ready, {
    timeout: 180000,
    polling: 16,
  });
  const played = mode === 'play' ? await play(page, path.join(OUT, `${profileName}-play`)) : undefined;
  let coverage: { url: string; used: number; total: number }[] | undefined;
  if (mode === 'coverage') {
    const { result } = await cdp.send('Profiler.takePreciseCoverage');
    coverage = [];
    for (const script of result) {
      if (!script.url.includes('/assets/')) continue;
      const total = script.functions[0]?.ranges[0]?.endOffset ?? 0;
      // Block coverage: a byte is unused if the innermost range covering it has count 0.
      const unused = new Uint8Array(total);
      const ranges = script.functions
        .flatMap((f) => f.ranges)
        .sort((a, b) => b.endOffset - b.startOffset - (a.endOffset - a.startOffset));
      for (const r of ranges) unused.fill(r.count === 0 ? 1 : 0, r.startOffset, r.endOffset);
      coverage.push({ url: script.url.replace(base, '/'), used: total - unused.reduce((s, x) => s + x, 0), total });
    }
  }
  if (mode === 'detail') {
    // Through the lobby into the game, so the hold also covers the arrival (what the first seconds draw and build).
    await page.waitForTimeout(2000);
    await page.evaluate(() => performance.mark('cold:jump-in'));
    await page.locator('#enter').click();
    await page.waitForTimeout(HOLD_MS);
    // Then Far Head, as the device suite's `head` scene puts the player (src/debug/perf-poses.ts; teleport's fields,
    // since a build has no /src imports): which pipelines does the warm-up leave for there?
    await page.evaluate(() => {
      performance.mark('cold:head');
      const { me } = window.boogle;
      const [x, y, z, yaw] = [1392, 24, -170, 2.356];
      me.body!.position.set(x, y, z);
      me.body!.interpolatedPosition.set(x, y, z);
      me.yaw = yaw;
    });
  }
  if (jump) {
    // A player who clicks the moment it is enabled: whatever is still compiling compiles under them.
    await page.evaluate(() => performance.mark('cold:jump-in'));
    await page.locator('#enter').click();
  }
  if (mode === 'late') {
    // The click lands when the page is free (the first frame drawn); the stills count from there, in the page's clock.
    const clicked = await page.evaluate(() => performance.now());
    for (const s of [0, 2, 5, 10]) {
      const now = await page.evaluate(() => performance.now());
      await page.waitForTimeout(Math.max(0, clicked + s * 1000 - now));
      await page.screenshot({ path: path.join(OUT, `${profileName}-late-${String(s).padStart(2, '0')}s.png`) });
    }
  }
  await page.waitForTimeout(mode === 'late' ? HOLD_MS : jump ? JUMP_HOLD_MS : HOLD_MS);
  if (mode === 'detail') await page.screenshot({ path: path.join(OUT, `${profileName}-detail-head.png`) });
  const page_ = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const marks = Object.fromEntries(
      performance
        .getEntriesByType('mark')
        .filter((m) => /^(boot|cold):/.test(m.name))
        .map((m) => [m.name.replace(/^(boot|cold):/, ''), Math.round(m.startTime)]),
    );
    marks.html = Math.round(n.domInteractive);
    marks.ttfb = Math.round(n.responseStart);
    const shaders = (performance.getEntriesByName('boot:shaders')[0] as PerformanceMark | undefined)?.detail as
      Record<string, number> | undefined;
    const snap = window.__startup!.snapshot();
    const detail = performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith('startup:render-pipeline:'))
      .map((m) => ({ t: Math.round(m.startTime), ...JSON.parse(m.name.slice('startup:render-pipeline:'.length)) }));
    // After Jump in (--jump): the frames a player sees and the pipelines built under them.
    // From the click or the loading screen lifting, whichever is later: frames behind the loading screen are not seen.
    const clicked = performance.getEntriesByName('cold:jump-in')[0]?.startTime;
    const lifted = performance.getEntriesByName('boot:interactive')[0]?.startTime ?? 0;
    const jumped = clicked === undefined ? undefined : Math.max(clicked, lifted);
    const render = snap.pipelines.filter((p) => p.kind.startsWith('createRenderPipeline'));
    const afterJump =
      jumped === undefined
        ? undefined
        : {
            stalls: snap.frames
              .filter((f) => f.t > jumped && f.dt > 100)
              .map((f) => [Math.round(f.t), Math.round(f.dt)]),
            longest: Math.round(Math.max(0, ...snap.frames.filter((f) => f.t > jumped).map((f) => f.dt))),
            sync: render.filter((p) => p.t > jumped && p.kind === 'createRenderPipeline').map((p) => p.label),
            async: render.filter((p) => p.t > jumped && p.kind === 'createRenderPipelineAsync').length,
          };
    // When the last render pipeline the page asked for was ready (both builds alike: the warm-up's and any after).
    const allBuilt = Math.round(Math.max(0, ...render.map((p) => p.t + p.ms)));
    // Pass 2's end on a lobby-first build: how many pipelines and objects were built late (each a miss of the warm-up).
    const all = (performance.getEntriesByName('boot:shaders-all')[0] as PerformanceMark | undefined)?.detail as
      Record<string, number> | undefined;
    // Shaders generated synchronously inside a frame after the warm-up (src/render/precompile.ts marks them).
    const frameWgsl = performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith('startup:frame-wgsl:'))
      .map((m) => ({ t: Math.round(m.startTime), ...JSON.parse(m.name.slice('startup:frame-wgsl:'.length)) }));
    const held = performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith('startup:held:'))
      .map((m) => ({ t: Math.round(m.startTime), ...JSON.parse(m.name.slice('startup:held:'.length)) }));
    return {
      marks,
      all,
      frameWgsl,
      held,
      afterJump,
      allBuilt,
      shaders,
      pipelines: snap.pipelines,
      longtasks: snap.entries
        .filter((e) => e.entryType === 'longtask')
        .map((e) => [Math.round(e.startTime as number), Math.round(e.duration as number)]),
      detail,
      used: (window as unknown as { __used?: () => { label: string; t: number; shown: number }[] }).__used?.(),
      sw: !!navigator.serviceWorker?.controller,
      origin: performance.timeOrigin,
    };
  });
  const pageOrigin = page_.origin;
  let profileOut: ReturnType<typeof attributeProfile> | undefined;
  let trace: ReturnType<typeof attributeTrace>;
  if (mode === 'traced') {
    const { profile: cpu } = await cdp.send('Profiler.stop');
    await browser.stopTracing();
    trace = attributeTrace(tracePath, page_.marks);
    if (!flag('keep-traces')) fs.rmSync(tracePath, { force: true }); // large; the attribution is kept
    profileOut = attributeProfile(cpu, t0, page_.marks, trace?.long ?? []);
  }
  await browser.close();
  const reqs = [...requests.values()].map((r) => ({
    ...r,
    start: Math.round((r.start - t0) * 1000),
    end: r.end ? Math.round((r.end - t0) * 1000) : -1,
  }));
  const result = {
    profile: profileName,
    n,
    mode,
    wallMs: Date.now() - wall,
    load: os.loadavg(),
    errors,
    ...page_,
    requests: reqs,
    swRequests: swRequests.map((s) => ({
      ...s,
      t: Math.round(s.t - pageOrigin),
      end: s.end < 0 ? -1 : Math.round(s.end - pageOrigin),
    })),
    trace,
    cpu: profileOut,
    coverage,
    played,
  };
  fs.writeFileSync(path.join(OUT, 'runs', `${profileName}-${n}-${mode}.json`), JSON.stringify(result));
  return result;
}

// ---- --play: through the lobby the moment Jump in opens, a short input run, and fixed views of the coast ----------
type Page = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>;
type V3 = [number, number, number];
const VIEWS: [string, V3, V3][] = [
  ['spawn-shore', [770, 10, 110], [850, 0, 90]], // the landing's shore (dev/cold-start/page.ts's view)
  ['across-the-bay', [780, 9, 0], [-700, 40, -500]], // src/debug/perf-poses.ts `bay`
  ['pier', [1406, 30, -330], [1406, 18, -430]], // over the pier's water, facing north (src/debug/perf-poses.ts `pier`)
  ['shallows', [790, 3.5, 104], [812, 0, 96]], // low over the shallows by the landing
];
async function play(page: Page, prefix: string) {
  const now = () => page.evaluate(() => Math.round(performance.now()));
  const mark = (name: string) =>
    page.evaluate((n) => {
      const m = performance.getEntriesByName('boot:' + n)[0] ?? performance.getEntriesByName('cold:' + n)[0];
      return m ? Math.round(m.startTime) : -1;
    }, name);
  const pos = () =>
    page.evaluate(() => {
      const b = window.boogle.me.body;
      return b ? ([b.position.x, b.position.y, b.position.z] as V3) : null;
    });
  const hint = () =>
    page.evaluate(() => {
      const h = document.querySelector<HTMLElement>('#hint');
      return h && !h.hidden ? h.textContent : null;
    });
  const out: Record<string, unknown> = {};
  out.click = await now();
  await page.locator('#enter').click();
  await page.screenshot({ path: `${prefix}-0-loading-lifted.png` });
  await page.waitForFunction(() => window.boogle.me.entered && !!window.boogle.me.body, null, { timeout: 30000 });
  out.entered = await now();
  Object.assign(out, {
    rapier: await mark('rapier'),
    enterEnabled: await mark('enter-enabled'),
    interactive: await mark('interactive'),
  });
  // The arrival: sample the body until it has settled (physics stepping under gravity), at most 15 s.
  const track: [number, V3 | null][] = [];
  for (let i = 0, still = 0; i < 150 && still < 4; i++) {
    const p = await pos();
    const last = track.at(-1)?.[1];
    still =
      p && last && Math.abs(p[1] - last[1]) < 0.02 && Math.hypot(p[0] - last[0], p[2] - last[2]) < 0.02 ? still + 1 : 0;
    track.push([await now(), p]);
    await page.waitForTimeout(100);
  }
  out.arrival = track;
  await page.screenshot({ path: `${prefix}-1-landed.png` });
  const p0 = await pos();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyW');
  const p1 = await pos();
  await page.keyboard.press('Space');
  let top = -Infinity;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(50);
    top = Math.max(top, (await pos())?.[1] ?? -Infinity);
  }
  await page.screenshot({ path: `${prefix}-2-walked-jumped.png` });
  out.walk = { from: p0, to: p1, metres: p0 && p1 ? Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) : null };
  out.jump = { from: p1?.[1], top, rise: p1 ? top - p1[1] : null };
  // No pick-up here: the beach ball lives on the classic island, out of reach of the default spawn (the smoke scenario
  // covers it). What E offers where the player stands is recorded.
  out.hint = await hint();
  for (const [name, cam, look] of VIEWS) {
    await page.evaluate(([c, l]) => window.__debugCam?.set(c, l), [cam, look] as [V3, V3]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${prefix}-view-${name}.png` });
  }
  return out;
}

// ---- --stills: the loading screen as its title font arrives ------------------------------------------------------
// Screenshots as fast as they come from the first paint: the last with the title not yet in Lilita One and the first
// with it (font-display: swap shows a fallback until the file lands), each with its time since navigation.
async function fontSwap(page: Page, prefix: string) {
  const start = Date.now();
  let before: { t: number; shot: Buffer } | null = null;
  let after: { t: number; shot: Buffer } | null = null;
  const state = () =>
    page
      .evaluate(() => ({
        t: Math.round(performance.now()),
        title: !!document.querySelector('.splash-title'),
        // The title's face itself (Figtree's faces load on their own time).
        lilita: [...document.fonts].some(
          (f) => f.family.replace(/["']/g, '') === 'Lilita One' && f.status === 'loaded',
        ),
      }))
      .catch(() => null);
  while (!after && Date.now() - start < 60000) {
    const s = await state();
    if (!s?.title) {
      await page.waitForTimeout(16);
      continue;
    }
    const shot = await page.screenshot();
    // A screenshot waits for a frame, seconds at 4x CPU: a frame is before the swap only if the face was still
    // unloaded after it was taken.
    const e = await state();
    if (s.lilita) after = { t: s.t, shot };
    else if (e && !e.lilita) before = { t: e.t, shot };
  }
  if (before) fs.writeFileSync(`${prefix}-0-before-swap.png`, before.shot);
  if (after) fs.writeFileSync(`${prefix}-1-after-swap.png`, after.shot);
  return { beforeSwapMs: before?.t ?? null, afterSwapMs: after?.t ?? null };
}

// ---- fail-*: Rapier blocked; what the loading screen ends on ------------------------------------------------------
async function failure(page: Page, prefix: string) {
  const start = Date.now();
  let ended = 'timeout 90 s';
  while (Date.now() - start < 90000) {
    const m = await page
      .evaluate(() =>
        ['failed', 'world-failed', 'interactive'].find((n) => performance.getEntriesByName('boot:' + n).length),
      )
      .catch(() => undefined);
    if (m) {
      ended = m;
      break;
    }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${prefix}.png` });
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 400)).catch(() => '');
  return { ended, afterMs: Date.now() - start, text };
}

// ---- CPU profile: self time by source kind, overall and per boot phase -----------------------------------------
type CpuProfile = {
  nodes: {
    id: number;
    children?: number[];
    callFrame: { url: string; functionName: string; lineNumber: number; columnNumber: number };
  }[];
  startTime: number;
  samples?: number[];
  timeDeltas?: number[];
};
// Self time by the leaf's library and by owner (the nearest game file up the stack), overall, per boot phase (the time
// up to each mark since the one before) and inside each long task.
function attributeProfile(cpu: CpuProfile, t0: number, marks: Record<string, number>, long: number[][]) {
  const parent = new Map<number, number>();
  for (const n of cpu.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const leaf = new Map<number, string>();
  for (const node of cpu.nodes) {
    const f = node.callFrame;
    leaf.set(node.id, f.url ? sourceOf(f.url, f.lineNumber, f.columnNumber) : f.functionName || '(native)');
  }
  const owners = new Map<number, string>();
  const ownerOf = (id: number): string => {
    let o = owners.get(id);
    if (o) return o;
    o = '(no game frame)';
    for (let at: number | undefined = id; at !== undefined; at = parent.get(at))
      if (leaf.get(at)!.startsWith('src/')) {
        o = leaf.get(at)!;
        break;
      }
    owners.set(id, o);
    return o;
  };
  // Profile times are microseconds on the same monotonic clock as CDP's network timestamps.
  const navUs = t0 * 1e6;
  let t = cpu.startTime;
  const byLib: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  // --jump: the hold after Jump in too (what the player plays through)
  const until = (JUMP ? Infinity : (marks.interactive ?? Infinity)) * 1000;
  const order = Object.entries(marks)
    .filter(([k]) => k !== 'ttfb' && k !== 'html')
    .sort((a, b) => a[1] - b[1]);
  const byPhase: Record<string, Record<string, number>> = {};
  const inLong = long.map(() => ({}) as Record<string, number>);
  // Inclusive time per named function on the stack inside each long task: what the owner was doing.
  const inLongFn = long.map(() => ({}) as Record<string, number>);
  const names = new Map(
    cpu.nodes.map((n) => {
      const f = n.callFrame;
      return [n.id, f.url ? sourceOf(f.url, f.lineNumber, f.columnNumber, true) : f.functionName];
    }),
  );
  const add = (o: Record<string, number>, k: string, v: number) => (o[k] = (o[k] ?? 0) + v);
  for (let i = 0; i < (cpu.samples?.length ?? 0); i++) {
    t += cpu.timeDeltas![i]!;
    const at = t - navUs; // µs since navigation
    if (at < 0 || at > until) continue;
    const dt = (cpu.timeDeltas![i + 1] ?? 0) / 1000;
    const id = cpu.samples![i]!;
    const s = leaf.get(id)!;
    if (s === '(idle)') continue;
    const owner = ownerOf(id);
    add(byLib, libOf(s), dt);
    add(byOwner, owner, dt);
    add((byPhase[order.find(([, m]) => m * 1000 >= at)?.[0] ?? 'after'] ??= {}), owner, dt);
    long.forEach(([start, dur], j) => {
      if (at < start! * 1000 || at > (start! + dur!) * 1000) return;
      add(inLong[j]!, owner, dt);
      const seen = new Set<string>();
      for (let n: number | undefined = id; n !== undefined; n = parent.get(n)) {
        const name = names.get(n);
        if (name && !seen.has(name)) {
          seen.add(name);
          add(inLongFn[j]!, name, dt);
        }
      }
    });
  }
  const round = (o: Record<string, number>, n = 40) =>
    Object.fromEntries(
      Object.entries(o)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .filter(([, v]) => v >= 1)
        .map(([k, v]) => [k, Math.round(v)]),
    );
  return {
    byLib: round(byLib),
    byOwner: round(byOwner),
    byPhase: Object.fromEntries(Object.entries(byPhase).map(([p, o]) => [p, round(o, 6)])),
    longTasks: long.map(([start, dur], j) => ({ start, dur, top: round(inLong[j]!, 4), fns: round(inLongFn[j]!, 60) })),
  };
}

// ---- trace: main-thread self time by event kind, long tasks, wasm --------------------------------------------
type TraceEvent = {
  name: string;
  ph: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
  cat?: string;
};
const EVENT_KIND: [RegExp, string][] = [
  [
    /^(v8\.compile|v8\.compileModule|V8\.CompileCode|CompileScript|v8\.parseOnBackground|V8\.ParseFunction|v8\.produceModuleCache|CacheScript)/,
    'script parse/compile',
  ],
  [/^v8\.evaluateModule$/, 'module evaluation'],
  [/wasm/i, 'wasm'],
  [/^(MinorGC|MajorGC|V8\.GC|BlinkGC|ThreadState|V8\.DeoptimizeAllOptimizedCodeWithFunction)/, 'GC'],
  [
    /^(FunctionCall|EvaluateScript|v8\.callFunction|v8\.run|TimerFire|FireAnimationFrame|EventDispatch|RunMicrotasks|v8\.runMicrotasks|XHRReadyStateChange|FireIdleCallback)/,
    'JS (callbacks, promises)',
  ],
  [/^(ParseHTML|ParseAuthorStyleSheet)/, 'HTML/CSS parse'],
  [
    /^(UpdateLayoutTree|Layout|PrePaint|Paint|Layerize|UpdateLayer|CompositeLayers|Commit|ScheduleStyleRecalculation|HitTest)/,
    'style/layout/paint',
  ],
  [/Decode|Image/, 'image decode'],
  [/^(ResourceSendRequest|ResourceReceiveResponse|ResourceFinish|ResourceReceivedData)/, 'network bookkeeping'],
];
function attributeTrace(file: string, marks: Record<string, number>) {
  const events = (JSON.parse(fs.readFileSync(file, 'utf8')) as { traceEvents: TraceEvent[] }).traceEvents;
  const nav = events.find((e) => e.name === 'navigationStart' && e.cat?.includes('blink.user_timing'));
  const entry = events.find((e) => e.name === 'boot:entry');
  if (!entry) return undefined;
  const { pid, tid } = entry;
  const origin = nav && nav.pid === pid ? nav.ts : entry.ts - marks.entry! * 1000;
  const until = origin + (JUMP ? Math.max(...Object.values(marks)) + JUMP_HOLD_MS : marks.interactive!) * 1000;
  const main = events
    .filter(
      (e) => e.pid === pid && e.tid === tid && e.ph === 'X' && e.dur !== undefined && e.ts >= origin && e.ts <= until,
    )
    .sort((a, b) => a.ts - b.ts || b.dur! - a.dur!);
  // Self time per event: its duration less its direct children's.
  const self: Record<string, number> = {};
  const stack: TraceEvent[] = [];
  const childSum = new Map<TraceEvent, number>();
  for (const e of main) {
    while (stack.length && stack.at(-1)!.ts + stack.at(-1)!.dur! <= e.ts) stack.pop();
    const parent = stack.at(-1);
    if (parent) childSum.set(parent, (childSum.get(parent) ?? 0) + e.dur!);
    stack.push(e);
  }
  for (const e of main) {
    const kind =
      EVENT_KIND.find(([re]) => re.test(e.name))?.[1] ?? (e.name === 'RunTask' ? 'task overhead' : `other: ${e.name}`);
    self[kind] = (self[kind] ?? 0) + (e.dur! - (childSum.get(e) ?? 0)) / 1000;
  }
  const busy = main.filter((e) => e.name === 'RunTask').reduce((s, e) => s + e.dur! / 1000, 0);
  const long = main
    .filter((e) => e.name === 'RunTask' && e.dur! > 50e3)
    .map((e) => [Math.round((e.ts - origin) / 1000), Math.round(e.dur! / 1000)]);
  // Off the main thread: wasm compilation and module/script streaming compiles.
  const off: Record<string, number> = {};
  for (const e of events)
    if (
      e.pid === pid &&
      e.tid !== tid &&
      e.ph === 'X' &&
      e.ts >= origin &&
      e.ts <= until &&
      /wasm|Compile|parseOnBackground|Stream/i.test(e.name)
    )
      off[e.name] = (off[e.name] ?? 0) + e.dur! / 1000;
  const wasm = events
    .filter(
      (e) =>
        e.pid === pid &&
        /wasm/i.test(e.name) &&
        e.ts >= origin &&
        e.ts <= until &&
        (e.ph === 'X' || e.ph === 'I' || e.ph === 'B'),
    )
    .map((e) => [
      e.name,
      Math.round((e.ts - origin) / 1000),
      Math.round((e.dur ?? 0) / 1000),
      e.tid === tid ? 'main' : 'bg',
    ]);
  const round = (o: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(o)
        .sort((a, b) => b[1] - a[1])
        .filter(([, v]) => v >= 1)
        .map(([k, v]) => [k, Math.round(v)]),
    );
  return {
    busy: Math.round(busy),
    self: round(self),
    long,
    off: round(off),
    wasm: wasm.slice(0, 40),
  };
}

// ---- the whole measurement ---------------------------------------------------------------------------------------
const lease = await acquireBotSlot(`cold-launch ${LABEL}`, (m) => console.log(m));
const all: Awaited<ReturnType<typeof run>>[] = [];
try {
  for (const p of PROFILES) {
    const modes = [...Array<'clean'>(RUNS).fill('clean'), ...Array<'traced'>(TRACED).fill('traced')];
    for (const [i, mode] of modes.entries()) {
      const r = await run(p, i, mode);
      all.push(r);
      console.log(
        `${p} #${i} ${mode}: interactive ${r.marks.interactive} ms, ${r.requests.length} req, load ${r.load[0]!.toFixed(1)}${r.errors.length ? `, ${r.errors.length} errors: ${r.errors[0]}` : ''}`,
      );
    }
    if (flag('coverage')) all.push(await run(p, 0, 'coverage'));
    if (flag('play')) all.push(await run(p, 0, 'play'));
    if (flag('stills')) await run(p, 0, 'stills');
    if (flag('late-stills')) all.push(await run(p, 0, 'late'));
  }
  if (flag('detail')) all.push(await run('fast', 0, 'detail'));
  if (flag('fail')) for (const m of ['fail-404', 'fail-abort'] as const) all.push(await run('fast', 0, m));
} finally {
  lease.release();
  site.close();
  await gameServer.close({ save: false });
}

// ---- summary -----------------------------------------------------------------------------------------------------
const stat = (xs: number[]): Stat => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return { median: s[Math.floor((s.length - 1) / 2)] ?? NaN, min: s[0] ?? NaN, max: s.at(-1) ?? NaN, n: s.length };
};
function fmt(s: Stat) {
  return `${String(Math.round(s.median)).padStart(6)} [${Math.round(s.min)}-${Math.round(s.max)}]`;
}
const summary: Summary = { label: LABEL, profiles: {} };
for (const p of PROFILES) {
  const rs = all.filter((r) => r.profile === p && r.mode === 'clean');
  const ts = all.filter((r) => r.profile === p && r.mode === 'traced');
  const rows: Record<string, Stat> = {};
  const names = [...new Set(rs.flatMap((r) => Object.keys(r.marks)))].sort(
    (a, b) => stat(rs.map((r) => r.marks[a]!)).median - stat(rs.map((r) => r.marks[b]!)).median,
  );
  for (const m of names) rows[`mark ${m}`] = stat(rs.map((r) => r.marks[m] ?? NaN));
  const until = (r: (typeof rs)[number]) => r.requests.filter((q) => q.end >= 0 && q.end <= r.marks.interactive!);
  rows['requests to interactive'] = stat(rs.map((r) => until(r).length));
  rows['KB on the wire to interactive'] = stat(rs.map((r) => until(r).reduce((s, q) => s + q.bytes, 0) / 1024));
  rows['requests in all'] = stat(rs.map((r) => r.requests.length));
  rows['h2 share %'] = stat(
    rs.map((r) => (100 * r.requests.filter((q) => q.protocol === 'h2').length) / r.requests.length),
  );
  rows['all render pipelines built'] = stat(rs.map((r) => r.allBuilt ?? NaN));
  rows['shaders-all: built late (pipelines)'] = stat(rs.map((r) => r.all?.late ?? NaN));
  rows['shaders-all: held a frame or more (objects)'] = stat(rs.map((r) => r.all?.held ?? NaN));
  rows['shaders-all: pipelines'] = stat(rs.map((r) => r.all?.pipelines ?? NaN));
  if (JUMP) {
    rows['after Jump in: frames over 100 ms n'] = stat(rs.map((r) => r.afterJump?.stalls.length ?? NaN));
    rows['after Jump in: longest frame ms'] = stat(rs.map((r) => r.afterJump?.longest ?? NaN));
    rows['after Jump in: sync render pipelines n'] = stat(rs.map((r) => r.afterJump?.sync.length ?? NaN));
    rows['after Jump in: async render pipelines n'] = stat(rs.map((r) => r.afterJump?.async ?? NaN));
  }
  rows['shader warm-up ms'] = stat(rs.map((r) => r.shaders?.ms ?? NaN));
  rows['programs'] = stat(rs.map((r) => r.shaders?.programs ?? NaN));
  rows['pipelines'] = stat(rs.map((r) => r.shaders?.pipelines ?? NaN));
  rows['WGSL generation ms'] = stat(rs.map((r) => r.shaders?.wgsl ?? NaN));
  rows['shader modules ms'] = stat(rs.map((r) => r.shaders?.shaderModule ?? NaN));
  rows['createRenderPipelineAsync n'] = stat(
    rs.map((r) => r.pipelines.filter((x) => x.kind === 'createRenderPipelineAsync').length),
  );
  rows['createRenderPipeline (sync) n'] = stat(
    rs.map((r) => r.pipelines.filter((x) => x.kind === 'createRenderPipeline').length),
  );
  rows['createComputePipeline* n'] = stat(
    rs.map((r) => r.pipelines.filter((x) => x.kind.startsWith('createCompute')).length),
  );
  rows['sync pipeline call ms (main thread)'] = stat(
    rs.map((r) => r.pipelines.filter((x) => !x.kind.endsWith('Async')).reduce((s, x) => s + x.ms, 0)),
  );
  // Long tasks from the page's own observer (clean runs); the rest from the traced runs, which run slower.
  rows['long tasks n'] = stat(rs.map((r) => r.longtasks.filter((x) => x[0]! <= r.marks.interactive!).length));
  rows['long tasks ms'] = stat(
    rs.map((r) => r.longtasks.filter((x) => x[0]! <= r.marks.interactive!).reduce((s, x) => s + x[1]!, 0)),
  );
  rows['traced: interactive'] = stat(ts.map((r) => r.marks.interactive!));
  rows['traced: main thread busy ms'] = stat(ts.map((r) => r.trace?.busy ?? NaN));
  for (const k of [...new Set(ts.flatMap((r) => Object.keys(r.trace?.self ?? {})))])
    rows[`trace: ${k}`] = stat(ts.map((r) => r.trace?.self[k] ?? 0));
  for (const k of [...new Set(ts.flatMap((r) => Object.keys(r.cpu?.byLib ?? {})))])
    rows[`js lib: ${k}`] = stat(ts.map((r) => r.cpu?.byLib[k] ?? 0));
  for (const k of [...new Set(ts.flatMap((r) => Object.keys(r.cpu?.byOwner ?? {})))].slice(0, 25))
    rows[`js owner: ${k}`] = stat(ts.map((r) => r.cpu?.byOwner[k] ?? 0));
  summary.profiles[p] = rows;
  console.log(
    `\n${p} (${rs.length} runs; median [min-max] ms since navigation; load ${rs.map((r) => r.load[0]!.toFixed(1)).join(', ')})`,
  );
  for (const [k, v] of Object.entries(rows)) console.log(`  ${k.padEnd(40)} ${fmt(v)}`);
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`\n${OUT}/summary.json`);
process.exit(0);
