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
import { freePort, root } from './look/lib.ts';

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
function sourceOf(url: string, line: number, column: number): string {
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
  return (pos.source ?? m[0]).replace(/^(\.\.\/)+/, '').replace(/^.*node_modules\//, '');
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
async function run(profileName: string, n: number, mode: 'clean' | 'traced' | 'coverage' | 'detail') {
  const profile = PROFILE[profileName]!;
  // --metal-cold: a copy of Chrome with its own bundle id (dev/cold-start/identity.ts), its Metal shader cache cleared
  // before every run, so the GPU compiles every pipeline as on a first visit; otherwise the Mac's cache is warm after
  // the first run and pipelines cost a fraction of a device's first launch.
  if (metal) clearExclusiveMetal(metal.cacheRoot, metal.id);
  const browser = await chromium.launch({
    headless: true,
    ...(metal ? { executablePath: metal.executable } : {}),
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--ignore-certificate-errors'],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  await page.addInitScript(installStartupRecorder);
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
  const query = `?room=cold-${profileName}-${n}-${Date.now().toString(36)}&notrack=1${mode === 'detail' ? '&startup=1' : ''}`;
  const wall = Date.now();
  await page.goto(base + query, { waitUntil: 'commit', timeout: 180000 });
  await page.waitForFunction(() => performance.getEntriesByName('boot:interactive').length > 0, null, {
    timeout: 180000,
    polling: 100,
  });
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
  }
  await page.waitForTimeout(HOLD_MS);
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
    return {
      marks,
      shaders,
      pipelines: snap.pipelines,
      longtasks: snap.entries
        .filter((e) => e.entryType === 'longtask')
        .map((e) => [Math.round(e.startTime as number), Math.round(e.duration as number)]),
      detail,
      used: (window as unknown as { __used?: () => { label: string; t: number; shown: number }[] }).__used?.(),
      sw: !!navigator.serviceWorker?.controller,
    };
  });
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
    trace,
    cpu: profileOut,
    coverage,
  };
  fs.writeFileSync(path.join(OUT, 'runs', `${profileName}-${n}-${mode}.json`), JSON.stringify(result));
  return result;
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
  const until = (marks.interactive ?? Infinity) * 1000;
  const order = Object.entries(marks)
    .filter(([k]) => k !== 'ttfb' && k !== 'html')
    .sort((a, b) => a[1] - b[1]);
  const byPhase: Record<string, Record<string, number>> = {};
  const inLong = long.map(() => ({}) as Record<string, number>);
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
      if (at >= start! * 1000 && at <= (start! + dur!) * 1000) add(inLong[j]!, owner, dt);
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
    longTasks: long.map(([start, dur], j) => ({ start, dur, top: round(inLong[j]!, 4) })),
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
  const until = origin + marks.interactive! * 1000;
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
  }
  if (flag('detail')) all.push(await run('fast', 0, 'detail'));
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
