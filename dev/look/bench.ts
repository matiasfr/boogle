// The performance benchmark: `npm run bench [-- --root <checkout>] [--out file.json] [--seconds N] [--poses a,b]
// [--no-load] [--query a=b] [--dpr 2] [--size 1280x800] [--commit label] [--cpu-prof prefix]`. The daily perf job (dev/daily) runs it on origin/main; bisecting runs it on old commits with --root
// (a `git archive` of the commit, its node_modules a symlink to this checkout's), serving that checkout's game and
// server with this harness. Results: docs/agents/test-details/performance.md; first report docs/research/performance.md.
//
// One visible Chromium on the Mac GPU (the bot queue holds it), the bare address (the current game), 1280x800 at the
// display's DPR with ?dpr=fixed. At each pose of POSES it waits for streaming to settle, then records
//   counts:  draw calls, triangles, shadow-pass calls (calls with minus without the sun's shadow), shader programs,
//            geometries, textures, GPU bytes three tracks (renderer.info.memory), a scene census (meshes, materials,
//            shadow casters, instanced meshes)
//   timing:  a real-frame sample (src/debug/prof-overlay.ts hardwareTiming): main-thread CPU and GPU span per frame,
//            presented interval; CPU per frame by subsystem from src/loop.ts sections (render, physics, room clock
//            and replication, view updates); JS heap and its growth over the sample
// and, unless --no-load, a production build of the same checkout: bundle bytes (raw and gzip; the first-load list
// from its service worker), cold first load from `vite preview` (bytes and time to "Jump in"), the bytes fetched by
// 20 s after it, and the asset budget (dev/assets/manifest.ts: 25 MB first load, 100 MB in all, 4 MB per asset).
// Times are this Mac's; compare on the same machine, quiet (no other agent rendering).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import type { Browser } from 'playwright';
import { Game, launch, root as harnessRoot, sleep, type Stack } from './lib.ts';
import { OPT_IN, POSES, type PoseName } from '../../src/debug/perf-poses.ts';

const argv = process.argv.slice(2);
const opt = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const root = path.resolve(opt('--root') ?? harnessRoot);
const out = opt('--out');
const seconds = Number(opt('--seconds') ?? 5);
const noLoad = argv.includes('--no-load');
// Extra page parameters, e.g. --query classic=1 on an old commit's classic home.
const extraQuery = opt('--query');
// --size 375x812 with --query 'q=mobile&dev=1&graphics=msaa:false' is the phone profile: a phone's viewport, its
// water quality and its MSAA default, on the Mac's GPU (no touch emulation, so the ladder's numbers, not a device's).
const size = opt('--size')?.split('x').map(Number) ?? [1280, 800];
if (size.length !== 2 || size.some((n) => !Number.isInteger(n) || n <= 0))
  throw new Error('--size is WxH, e.g. 375x812');
// The Mac's Retina DPR (the game caps it at 2): what the owner sees. --dpr 1 for a cheaper, CPU-bound sample.
const dpr = Number(opt('--dpr') ?? 2);

const poses = (opt('--poses')?.split(',') ??
  Object.keys(POSES).filter((p) => !OPT_IN.includes(p as PoseName))) as PoseName[];
// --rail-seed <stage>: the bench room starts from an accepted railway server save, as look's (dev/look/rail-seed.ts).
const railSeed = opt('--rail-seed');
// --cpu-prof <prefix>: after each pose's timing, 5 s of Chrome's sampling profiler on the page, saved as
// <prefix>-<pose>.cpuprofile with the frames it spanned (`frames`), for where main-thread time per frame goes
// (DevTools, Performance tab, Load profile). The timing sample above it is not profiled.
const cpuProf = opt('--cpu-prof');
// --scaler [load,after]: instead of the poses, watch the resolution scaler (adaptive, no ?dpr=fixed) through `load`
// seconds of a frame cost that scales with the pixels (K x ratio² ms of main-thread work a frame, --scaler-k, default
// 14: a frame misses a 120 Hz vsync above 0.8x) and `after` seconds without it. Reports when it first stepped down,
// where it settled and how long it took back to full resolution and full detail. Default 40,60.
const scaler = argv.includes('--scaler')
  ? (/^\d+,\d+$/.test(opt('--scaler') ?? '') ? opt('--scaler')! : '40,60').split(',').map(Number)
  : null;
const scalerK = Number(opt('--scaler-k') ?? 14);
for (const p of poses) if (!(p in POSES)) throw new Error(`Unknown pose ${p}; use ${Object.keys(POSES).join(', ')}`);

// Section names from src/loop.ts (hook module paths or names) grouped into subsystems. Order matters: first match.
const SUBSYSTEMS: [string, RegExp][] = [
  ['render', /render \(CPU\)|^main: render/],
  ['physics', /physics|onPreStep|onPostStep/],
  ['room clock + replication', /railway|world\.ts|sync|replic|room|net\.ts|presence|lockstep|remote-player/],
];
const subsystem = (name: string) => SUBSYSTEMS.find(([, re]) => re.test(name))?.[0] ?? 'view updates';

const freePort = () =>
  new Promise<number>((res) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => res(p));
    });
  });

async function waitUp(url: string, proc: ChildProcess, what: string) {
  for (let t = 0; t < 300; t++) {
    if (proc.exitCode !== null) break;
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      await sleep(200);
    }
  }
  proc.kill('SIGTERM');
  throw new Error(`${what} did not start`);
}

// The checkout's own server (an old commit's client needs its own protocol), hosting every room.
type Service = { listen(port: number): Promise<number>; close(o: { save: boolean }): Promise<void> };
async function targetServer() {
  const mod = await import(pathToFileURL(path.join(root, 'server/src/server.ts')).href);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-bench-'));
  const env = { DATA_DIR: dataDir, SERVER_ROOMS: '*', UPGRADES_PER_MIN: '1000000', MAX_HOSTED_ROOMS: '1000' };
  const service = mod.createService(mod.loadConfig(env, { log: () => {} })) as Service;
  const port = await service.listen(0);
  return {
    url: `http://127.0.0.1:${port}`,
    dataDir,
    async close() {
      await service.close({ save: false });
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

function vite(args: string[], env: Record<string, string>) {
  return spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), ...args], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, ...env },
  });
}

async function devStack(server: string): Promise<Stack> {
  const port = await freePort();
  const proc = vite(['--port', String(port), '--strictPort', '--host', '127.0.0.1'], { VITE_BOOGLE_SERVER: server });
  const base = `http://127.0.0.1:${port}/`;
  await waitUp(base, proc, 'vite');
  return { base, close: async () => void proc.kill('SIGTERM') };
}

// Counts at the current camera: two frames with the shadow pass, two without (perf.ts's method), then the census.
const COUNTS = `
  const { renderer, scene, sun } = await import('/src/render/scene.ts');
  const frame = () => new Promise((res, reject) => {
    const at = window.boogle.prof.last.frames;
    const deadline = performance.now() + 30000;
    const t = setInterval(() => {
      if (window.boogle.prof.last.frames > at) { clearInterval(t); res({ ...renderer.info.render }); }
      else if (performance.now() > deadline) { clearInterval(t); reject(new Error('No game frame in 30 s')); }
    }, 10);
  });
  const casting = sun.castShadow;
  let a, b;
  try {
    await frame();
    a = await frame();
    sun.castShadow = false;
    await frame();
    b = await frame();
  } finally {
    sun.castShadow = casting;
  }
  let objects = 0, meshes = 0, instanced = 0, instances = 0, casters = 0, lights = 0, skinned = 0;
  const materials = new Set(), geometries = new Set();
  scene.traverseVisible((o) => {
    objects++;
    if (o.isLight) lights++;
    if (!o.isMesh && !o.isSprite && !o.isLine && !o.isPoints) return;
    meshes++;
    if (o.isSkinnedMesh) skinned++;
    if (o.isInstancedMesh || o.isBatchedMesh) { instanced++; instances += o.count ?? 0; }
    if (o.castShadow) casters++;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) materials.add(m);
    if (o.geometry) geometries.add(o.geometry);
  });
  const mem = renderer.info.memory;
  return {
    calls: a.drawCalls, tris: a.triangles, shadowCalls: a.drawCalls - b.drawCalls, shadowTris: a.triangles - b.triangles,
    programs: mem.programs, geometries: mem.geometries, textures: mem.textures,
    gpuMB: mem.total ? +(mem.total / 2 ** 20).toFixed(1) : null,
    gpuTexturesMB: mem.texturesSize ? +(mem.texturesSize / 2 ** 20).toFixed(1) : null,
    gpuBuffersMB: mem.attributesSize !== undefined
      ? +(((mem.attributesSize ?? 0) + (mem.indexAttributesSize ?? 0) + (mem.storageAttributesSize ?? 0)) / 2 ** 20).toFixed(1) : null,
    scene: { objects, meshes, instanced, instances, casters, lights, skinned, materials: materials.size, sceneGeometries: geometries.size },
    camera: (await import('/src/render/scene.ts')).camera.position.toArray().map((v) => Math.round(v)),
  };`;

// A real-frame sample, the loop's sections over the same window and the heap. Allocation is the sum of positive heap
// steps between frames (a lower bound: a GC inside a frame hides what it collected).
const TIMING = (s: number) => `
  const { hardwareTiming } = await import('/src/debug/prof-overlay.ts');
  const heap = () => performance.memory?.usedJSHeapSize ?? 0;
  const h0 = heap();
  let last = h0, allocated = 0, gcs = 0, run = true;
  const tick = () => { const h = heap(); if (h > last) allocated += h - last; else if (h < last) gcs++; last = h; if (run) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const t = await hardwareTiming(${s});
  run = false;
  const sections = window.boogle.prof.table(400);
  const stat = (x) => x ? { avg: +x.avgMs.toFixed(3), p95: +x.p95Ms.toFixed(3), max: +x.maxMs.toFixed(3), n: x.samples } : null;
  return {
    status: t.status,
    adapter: t.end.adapter?.description || t.end.adapter?.architecture || null,
    pixels: t.end.internalPixels, dpr: t.end.rendererPixelRatio, msaa: t.end.msaaSamples,
    frames: t.completedFrames,
    cpu: stat(t.cpu.stats), gpu: stat(t.gpu.span.stats), interval: stat(t.presentedFrameIntervals.stats),
    gpuStatus: t.gpu.span.status,
    passes: t.passes,
    renderPasses: t.end.renderPasses, computeDispatches: t.end.computeDispatches,
    heapMB: +(heap() / 2 ** 20).toFixed(1), heapGrowthMB: +((heap() - h0) / 2 ** 20).toFixed(2),
    heapDrops: gcs,
    allocKBPerFrame: t.completedFrames ? +(allocated / 1024 / t.completedFrames).toFixed(1) : null,
    sections,
  };`;

type Sections = { name: string; avg: number; p95: number; max: number }[];
function bySubsystem(sections: Sections) {
  const sums: Record<string, number> = { render: 0, physics: 0, 'room clock + replication': 0, 'view updates': 0 };
  let frame = 0;
  for (const s of sections) {
    if (s.name === 'frame') frame = s.avg;
    else sums[subsystem(s.name)]! += s.avg;
  }
  const r = (x: number) => Math.round(x * 1000) / 1000;
  return { frame: r(frame), ...Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, r(v)])) };
}

// Mid-play: Bob joins the same room in a small window, stands 4 m in front of Alice and walks; Alice walks forward
// with dust puffs at her feet; the player camera follows.
const NEAR_ME = `
  const { me } = await import('/src/player/player.ts');
  const p = me.body.translation ? me.body.translation() : me.body.position;
  return [p.x, p.y, p.z, me.yaw];`;
const PUT = (x: number, y: number, z: number, yaw?: number) => `
  const { putPlayer } = await import('/src/debug/perf-poses.ts');
  return await putPlayer(${x}, ${y}, ${z}${yaw === undefined ? '' : `, ${yaw}`});`;
const DUST = `
  const fx = await import('/src/render/particle-effects.ts').catch(() => null);
  const { me } = await import('/src/player/player.ts');
  if (!fx?.dustRing) return false;
  window.__benchDust = setInterval(() => {
    const p = me.body.translation ? me.body.translation() : me.body.position;
    fx.dustRing(p.x, p.y - 0.5, p.z, 12);
  }, 120);
  return true;`;

// The measured checkout's own seed writer: its server reads its own save format.
async function seed(dataDir: string, room: string) {
  if (railSeed)
    await (
      await import(pathToFileURL(path.join(root, 'dev/look/rail-seed.ts')).href)
    ).writeRailSeed(dataDir, room, railSeed);
}

// In the page: every 250 ms the scaler's ratio (of the maximum) and the detail rung it shed, while a rAF of our own
// burns K x ratio² ms for `load` seconds, then nothing for `after` seconds.
const SCALER = (load: number, after: number, k: number) => `
  const { renderer } = await import('/src/render/scene.ts');
  const rung = await import('/src/graphics-settings.ts').then((m) => m.autoRung ?? (() => 0), () => () => 0);
  const max = Math.min(devicePixelRatio, 2);
  const ratio = () => +(renderer.getPixelRatio() / max).toFixed(2);
  let burning = true;
  const burn = () => {
    if (!burning) return;
    const until = performance.now() + ${k} * ratio() ** 2;
    while (performance.now() < until);
    requestAnimationFrame(burn);
  };
  requestAnimationFrame(burn);
  // The last 120 frame intervals as the governor sees them: the share over 1.5 x their 10th percentile (late) and the
  // median over that percentile.
  const ring = [];
  let prev = 0, watching = true;
  const watch = (now) => {
    if (prev) ring.push(now - prev);
    if (ring.length > 120) ring.shift();
    prev = now;
    if (watching) requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  const frames = () => {
    const s = ring.slice().sort((a, b) => a - b);
    if (!s.length) return [0, 0];
    const p10 = s[Math.floor(s.length * 0.1)];
    return [+(s.filter((v) => v > p10 * 1.5).length / s.length).toFixed(2), +(s[Math.floor(s.length / 2)] / p10).toFixed(2)];
  };
  const t0 = performance.now(), samples = [];
  setTimeout(() => (burning = false), ${load * 1000});
  while (performance.now() - t0 < ${(load + after) * 1000}) {
    samples.push([+((performance.now() - t0) / 1000).toFixed(2), ratio(), rung(), ...frames()]);
    await new Promise((r) => setTimeout(r, 250));
  }
  watching = false;
  return samples;`;

async function watchScaler(browser: Browser, stack: Stack, dataDir: string, [load, after]: number[]) {
  const room = 'bench' + Math.random().toString(36).slice(2, 7);
  await seed(dataDir, room);
  const g = await Game.open(browser, stack, { name: 'Alice', room, size, scale: dpr, adaptive: true, isolated: true });
  try {
    await sleep(8000);
    const pose = poses.length === 1 ? POSES[poses[0]!] : null;
    if (pose && 'put' in pose) {
      const [x, y, z, yaw] = pose.put;
      await g.eval(PUT(x, y + 1, z, yaw));
      await sleep(3000);
    }
    const samples = (await g.eval(SCALER(load!, after!, scalerK))) as [number, number, number][];
    const at = (pred: (s: [number, number, number]) => boolean, from = 0) =>
      samples.find((s) => s[0] >= from && pred(s))?.[0] ?? null;
    const firstDown = at((s) => s[1] < 1);
    const loaded = samples.filter((s) => s[0] > load! - 10 && s[0] <= load!).map((s) => s[1]);
    const back = at((s) => s[1] === 1 && s[2] === 0, load!);
    const changes = samples.filter((s, i) => i === 0 || s[1] !== samples[i - 1]![1] || s[2] !== samples[i - 1]![2]);
    const row = {
      loadS: load,
      afterS: after,
      k: scalerK,
      firstDownS: firstDown,
      lowest: Math.min(...samples.map((s) => s[1])),
      lastTenSecondsOfLoad: loaded.length ? [Math.min(...loaded), Math.max(...loaded)] : null,
      maxRung: Math.max(...samples.map((s) => s[2])),
      backToFullS: back === null ? null : +(back - load!).toFixed(2),
      changes,
      samples, // [s, ratio, rung, late share, median / p10] every 250 ms
    };
    console.log(
      `scaler: first step down ${firstDown ?? '-'} s into the load, lowest ${row.lowest}, rung ${row.maxRung}; full resolution and detail ${row.backToFullS ?? 'not'} s after it ended`,
    );
    return row;
  } finally {
    await g.close().catch(() => {});
  }
}

async function measure(browser: Browser, stack: Stack, dataDir: string) {
  const room = 'bench' + Math.random().toString(36).slice(2, 7);
  await seed(dataDir, room);
  const g = await Game.open(browser, stack, {
    name: 'Alice',
    room,
    size,
    scale: dpr,
    query: ['prof=1', extraQuery].filter(Boolean).join('&'),
    isolated: true,
  });
  const rows: Record<string, unknown> = {};
  let bob: Game | undefined;
  try {
    await sleep(8000); // lazy props, streaming and the first shader builds near spawn
    for (const pose of poses) {
      const p = POSES[pose];
      if (p && 'cam' in p) await g.eval(`window.__debugCam.set(${JSON.stringify(p.cam)}, ${JSON.stringify(p.look)});`);
      else await g.eval(`window.__debugCam.clear();`);
      if (p && 'put' in p) {
        const [x, y, z, yaw] = p.put;
        await g.eval(PUT(x, y + 1, z, yaw));
      }
      if (pose === 'play') {
        bob = await Game.open(browser, stack, { name: 'Bob', room, size: [480, 300] });
        const [x, y, z, yaw] = (await g.eval(NEAR_ME)) as number[];
        await bob.eval(PUT(x! + 4 * Math.sin(yaw!), y! + 0.5, z! + 4 * Math.cos(yaw!)));
        await g.page.bringToFront();
        rows.playDust = await g.eval(DUST);
        await g.page.keyboard.down('KeyW');
        await bob.page.keyboard.down('KeyW');
      }
      await sleep(p ? 6000 : 3000);
      const counts = await g.eval(COUNTS);
      // COUNTS turns the sun's shadow off and on, which builds pipelines for whatever this pose shows that no pose
      // showed before: on a seeded world's first pose that took seconds (4 frames in a 5 s sample, 9 November).
      await sleep(3000);
      const timing = await g.eval(TIMING(seconds));
      if (cpuProf) {
        const cdp = await g.page.context().newCDPSession(g.page);
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
        await cdp.send('Profiler.start');
        const f0 = (await g.eval('return window.boogle.prof.last.frames')) as number;
        await sleep(5000);
        const f1 = (await g.eval('return window.boogle.prof.last.frames')) as number;
        const { profile } = await cdp.send('Profiler.stop');
        fs.writeFileSync(
          `${cpuProf}-${pose}.cpuprofile`,
          JSON.stringify({ ...profile, frames: f1 - f0 }),
        );
        await cdp.detach();
      }
      const { sections, ...rest } = timing as { sections: Sections };
      rows[pose] = {
        ...counts,
        ...rest,
        subsystems: bySubsystem(sections),
        top: sections.filter((s) => s.name !== 'frame').slice(0, 12),
      };
      if (pose === 'play') {
        await g.page.keyboard.up('KeyW');
        await bob?.page.keyboard.up('KeyW');
        await g.eval(`clearInterval(window.__benchDust); return true;`);
      }
      const r = rows[pose] as {
        calls: number;
        tris: number;
        cpu: { avg: number } | null;
        gpu: { avg: number; p95: number } | null;
        passes?: { name: string; msPerFrame: number }[];
      };
      const passes = (r.passes ?? [])
        .slice(0, 4)
        .map((s) => `${s.name} ${s.msPerFrame}`)
        .join(', ');
      console.log(
        `${pose.padEnd(7)} calls ${r.calls} tris ${r.tris} cpu ${r.cpu?.avg ?? '-'} ms gpu ${r.gpu?.avg ?? '-'} ms (p95 ${r.gpu?.p95 ?? '-'}) passes: ${passes}`,
      );
    }
    const errors = [...g.healthErrors(), ...(bob?.healthErrors() ?? [])];
    if (errors.length) rows.errors = errors.slice(0, 20);
  } finally {
    await bob?.close().catch(() => {});
    await g.close().catch(() => {});
  }
  return rows;
}

const gz = (buf: Buffer) => gzipSync(buf, { level: 9 }).length;
const mb = (n: number) => Math.round((n / 2 ** 20) * 100) / 100;
function bundle(dist: string) {
  const kinds: Record<string, { raw: number; gzip: number }> = {};
  let raw = 0,
    gzip = 0,
    largest = { file: '', mb: 0 };
  const walk = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(dist)) {
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).slice(1) || 'other';
    const kind = ['js', 'wasm', 'css', 'html'].includes(ext)
      ? ext
      : ['glb', 'ktx2', 'png', 'webp', 'jpg'].includes(ext)
        ? 'assets'
        : 'other';
    const z = ['js', 'wasm', 'css', 'html', 'json', 'svg'].includes(ext) ? gz(buf) : buf.length;
    kinds[kind] ??= { raw: 0, gzip: 0 };
    kinds[kind].raw += buf.length;
    kinds[kind].gzip += z;
    raw += buf.length;
    gzip += z;
    if (buf.length / 2 ** 20 > largest.mb) largest = { file: path.relative(dist, file), mb: mb(buf.length) };
  }
  const list = /\bfirst:(\[[^\]]*\])/.exec(fs.readFileSync(path.join(dist, 'sw.js'), 'utf8'))?.[1];
  const first = list ? (JSON.parse(list) as string[]) : [];
  const firstRaw = first.reduce((a, f) => a + fs.statSync(path.join(dist, f)).size, 0);
  const firstGzip = first.reduce((a, f) => a + gz(fs.readFileSync(path.join(dist, f))), 0);
  return {
    totalMB: mb(raw),
    totalGzipMB: mb(gzip),
    byKindMB: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, { raw: mb(v.raw), gzip: mb(v.gzip) }])),
    largest,
    firstLoadFiles: first.length,
    firstLoadMB: mb(firstRaw),
    firstLoadGzipMB: mb(firstGzip),
  };
}

async function assetBudget() {
  const file = path.join(root, 'dev/assets/manifest.ts');
  if (!fs.existsSync(file)) return null;
  try {
    const m = await import(pathToFileURL(file).href);
    const manifest = m.readManifest() as Record<string, { bytes: number; triangles?: number }>;
    const sizes = Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, v.bytes]));
    const r = m.budgetReport(sizes);
    const assetBytes = m.BUDGET.assetKB * 1024;
    return {
      firstMB: mb(r.firstBytes),
      totalMB: mb(r.totalBytes),
      assets: Object.keys(manifest).length,
      triangles: Object.values(manifest).reduce((a, v) => a + (v.triangles ?? 0), 0),
      overAssetBudget: Object.entries(manifest)
        .filter(([, v]) => v.bytes > assetBytes)
        .map(([k, v]) => `${k} ${mb(v.bytes)} MB`),
      budgetMB: { first: m.BUDGET.firstLoadKB / 1024, total: m.BUDGET.totalKB / 1024, asset: m.BUDGET.assetKB / 1024 },
      flags: r.flags ?? [],
    };
  } catch (e) {
    return { error: String(e) };
  }
}

// A cold load of the production build: a new browser context (no HTTP cache, no service worker).
async function firstLoad(browser: Browser, base: string) {
  const ctx = await browser.newContext({ viewport: { width: size[0]!, height: size[1]! } });
  const page = await ctx.newPage();
  try {
    const t0 = Date.now();
    await page.goto(`${base}?sw=0&room=benchload${Date.now().toString(36)}`, { timeout: 90000 });
    await page.locator('#enter:not([disabled])').waitFor({ timeout: 180000 });
    const wall = Date.now() - t0;
    const read = () =>
      page.evaluate(() => {
        const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const marks = Object.fromEntries(
          performance
            .getEntriesByType('mark')
            .filter((m) => m.name.startsWith('boot:'))
            .map((m) => [m.name.slice(5), Math.round(m.startTime)]),
        );
        const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        let wire = (n?.transferSize ?? 0) as number,
          decoded = (n?.decodedBodySize ?? 0) as number,
          biggest = 0;
        for (const r of res) {
          wire += r.transferSize || 0;
          decoded += r.decodedBodySize || 0;
          biggest = Math.max(biggest, r.decodedBodySize || 0);
        }
        return { requests: res.length + 1, wire, decoded, biggest, marks };
      });
    const atEnter = await read();
    await sleep(20000);
    const after = await read();
    return {
      interactiveMs: atEnter.marks.interactive ?? wall,
      firstFrameMs: atEnter.marks.first ?? null,
      marks: atEnter.marks,
      requests: atEnter.requests,
      firstLoadMB: mb(atEnter.wire),
      firstLoadDecodedMB: mb(atEnter.decoded),
      after20sMB: mb(after.wire),
      after20sRequests: after.requests,
      largestFetchMB: mb(after.biggest),
      scope:
        'vite preview on 127.0.0.1, no compression or latency: bytes are what the page fetched, time is CPU/GPU bound',
    };
  } finally {
    await ctx.close();
  }
}

let server: Awaited<ReturnType<typeof targetServer>> | undefined;
let stack: Stack | undefined;
let preview: ChildProcess | undefined;
let browser: Browser | undefined;
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-bench-dist-'));
try {
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 30) throw new Error('--seconds must be 1–30');
  const commit =
    opt('--commit') ?? (spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim() || null);
  server = await targetServer();
  const result: Record<string, unknown> = {
    commit,
    root,
    date: new Date().toISOString(),
    machine: `${os.cpus()[0]?.model ?? '?'} ${Math.round(os.totalmem() / 2 ** 30)} GB`,
    size,
    dpr,
    seconds,
    railSeed: railSeed ?? null,
  };
  if (!noLoad) {
    const t = Date.now();
    const b = spawnSync(
      process.execPath,
      [
        path.join(root, 'node_modules/vite/bin/vite.js'),
        'build',
        '--logLevel',
        'error',
        '--outDir',
        dist,
        '--emptyOutDir',
      ],
      {
        cwd: root,
        stdio: ['ignore', 'ignore', 'inherit'],
        env: { ...process.env, VITE_BOOGLE_SERVER: server.url, VITE_BUILD: 'bench' },
      },
    );
    if (b.status) throw new Error('vite build failed');
    result.buildS = Math.round((Date.now() - t) / 1000);
    result.bundle = bundle(dist);
    result.assets = await assetBudget();
  }
  stack = await devStack(server.url);
  browser = await launch({ hardware: true });
  result.loadBefore = os.loadavg().map((l) => +l.toFixed(2)); // 1, 5 and 15 min: above ~6 the times aren't evidence
  if (scaler) result.scaler = await watchScaler(browser, stack, server.dataDir, scaler);
  else result.poses = await measure(browser, stack, server.dataDir);
  result.loadAfter = os.loadavg().map((l) => +l.toFixed(2));
  if (!noLoad) {
    const port = await freePort();
    preview = vite(['preview', '--outDir', dist, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {});
    await waitUp(`http://127.0.0.1:${port}/`, preview, 'vite preview');
    result.load = await firstLoad(browser, `http://127.0.0.1:${port}/`);
  }
  const json = JSON.stringify(result, null, 2) + '\n';
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, json);
    console.log('wrote', out);
  } else console.log(json);
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  preview?.kill('SIGTERM');
  await stack?.close();
  await server?.close().catch(() => {});
  fs.rmSync(dist, { recursive: true, force: true });
  process.exit(process.exitCode || 0);
}
