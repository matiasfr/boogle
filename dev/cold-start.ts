// Headed, real-time production startup measurements. Never run concurrently with source edits.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { installStartupRecorder } from '../src/debug/startup-record.ts';
import { hostAudit, profileInventory } from './cold-start/cache.ts';
import { summarize, spread } from './cold-start/report.ts';
import { buildAt, sameBuild } from './codex/source.ts';

const args = process.argv.slice(2);
const valueFlags = ['--url', '--out', '--runs', '--seconds', '--mode', '--query'];
const switches = ['--direct', '--audit', '--help', '--video-probe', '--safari-probe'];
for (let i = 0; i < args.length; i++) {
  const arg = args[i]!;
  if (switches.includes(arg)) continue;
  if (!valueFlags.includes(arg) || !args[i + 1] || args[i + 1]!.startsWith('--'))
    throw new Error(`Invalid argument: ${arg}`);
  i++;
}
if (args.includes('--safari-probe')) {
  console.log(JSON.stringify(await (await import('./cold-start/safari.ts')).safariProbe(), null, 2));
  process.exit(2); // availability is not proof of an isolated cold start
}
const value = (key: string, fallback: string) => {
  const i = args.indexOf(key);
  return i < 0 ? fallback : (args[i + 1] ?? '');
};
if (args.includes('--help')) {
  console.log(
    'npm run cold-start -- [--url URL] [--runs 3] [--mode cold|warm|paired] [--seconds 90] [--query proto=place&water=new] [--video-probe] [--audit] [--direct]\nDefault: broker, local production build. --direct: outside sandbox only. Each cold sample gets a new profile; warm samples restart the browser on that profile. Metal is NOT cleared. Exit 2 means true-cold proof failed.',
  );
  process.exit(0);
}
const audit = hostAudit();
if (args.includes('--audit')) {
  console.log(JSON.stringify({ ...audit, executable: chromium.executablePath() }, null, 2));
  process.exit(0);
}
if (!args.includes('--direct')) {
  if (args.includes('--url'))
    throw new Error(
      'Broker owns --url. For deployed-site measurements run --direct outside the sandbox with network authorization.',
    );
  const child = spawnSync(process.execPath, ['dev/codex/see.ts', 'cold-start', ...args], { stdio: 'inherit' });
  process.exit(child.status ?? 1);
}
const runs = Number(value('--runs', '3'));
const seconds = Number(value('--seconds', '90'));
const mode = value('--mode', 'paired');
if (
  !Number.isInteger(runs) ||
  runs < 1 ||
  runs > 10 ||
  !Number.isFinite(seconds) ||
  seconds < 10 ||
  seconds > 90 ||
  !['cold', 'warm', 'paired'].includes(mode)
)
  throw new Error('Use runs 1..10, seconds 10..90, mode cold|warm|paired');
if (process.platform !== 'darwin') throw new Error('This experiment requires headed macOS Metal');
const out = path.resolve(value('--out', `.look/cold-start/${Date.now()}`));
fs.mkdirSync(out, { recursive: true });
const write = (name: string, data: unknown) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
const before = buildAt(process.cwd());
write('host.json', { ...audit, executable: chromium.executablePath() });
let stack: Awaited<ReturnType<(typeof import('./cold-start/production.ts'))['startProduction']>> | undefined;
const results: { run: number; kind: string; summary: ReturnType<typeof summarize>; health: string[] }[] = [];
try {
  let base = value('--url', '');
  if (!base) {
    stack = await (await import('./cold-start/production.ts')).startProduction(out);
    base = stack.base;
  }
  const url = new URL(base);
  const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
  for (const [k, v] of new URLSearchParams(value('--query', url.search || 'proto=place&water=new')))
    url.searchParams.set(k, v);
  url.searchParams.set('startup', '1');
  url.searchParams.set('notrack', '1'); // no automatic playtest telemetry from a benchmark
  if (args.includes('--video-probe')) url.searchParams.set('startupVideo', '1');
  for (let run = 1; run <= runs; run++) {
    // Entire profile belongs to this invocation. Never accept a user-supplied profile.
    const profile = fs.mkdtempSync(path.join(out, 'profile-'));
    write(`clear-${run}.json`, {
      profile,
      emptyBeforeLaunch: fs.readdirSync(profile).length === 0,
      layers: [
        'HTTP Cache',
        'Service Worker / CacheStorage',
        'GPUCache',
        'DawnGraphiteCache',
        'DawnWebGPUCache',
        'ShaderCache',
        'GrShaderCache',
      ].map((layer) => ({ layer, method: 'fresh empty profile; complete owned profile deleted after pair' })),
      metal: audit.metal,
    });
    for (const kind of mode === 'cold' ? ['cold'] : ['cold', 'warm']) {
      const label = `${run}-${kind}`;
      // Relaunch for warm too: removes process memory as a cold/warm confound.
      const context = await chromium.launchPersistentContext(profile, {
        headless: false,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        args: [
          '--enable-unsafe-webgpu',
          '--use-angle=metal',
          '--no-first-run',
          `--disk-cache-dir=${path.join(profile, 'http-cache')}`,
          ...(local ? ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'] : []),
        ],
      });
      try {
        // Routing disables HTTP caching in Playwright, so use no request interception.
        // Local builds omit fonts; local runs restrict DNS to loopback at launch.
        const page = context.pages()[0] ?? (await context.newPage());
        const health: string[] = [];
        page.on('pageerror', (error) => health.push(error.message));
        page.on('console', (msg) => {
          if (msg.type() === 'error') health.push(msg.text());
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        if (kind === 'cold') {
          await cdp.send('Network.clearBrowserCache');
          await cdp.send('Storage.clearDataForOrigin', { origin: url.origin, storageTypes: 'all' });
        }
        await page.addInitScript(installStartupRecorder);
        // Match arrival/audio work: every sample gets the same fresh identity, keeping shader/HTTP/SW caches warm.
        await page.addInitScript(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        const browserCDP = await context.browser()!.newBrowserCDPSession();
        const gpu = await browserCDP.send('SystemInfo.getInfo');
        write(`${label}-gpu.json`, gpu);
        if (!/metal/i.test(JSON.stringify(gpu.gpu))) health.push('Metal backend not confirmed by CDP');
        await page.bringToFront();
        const start = Date.now();
        await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.locator('#enter:not([disabled])').waitFor({ timeout: 90000 });
        await page.locator('#name-input').fill('Cold start');
        await page.locator('#enter').click();
        await page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - start)));
        const timeline = await page.evaluate(() => {
          window.__startup!.stop();
          return window.__startup!.snapshot();
        });
        write(`${label}-timeline.json`, timeline);
        health.push(...timeline.errors);
        if (args.includes('--video-probe') && !timeline.videoFrames.length)
          health.push('Canvas video presentation callbacks unavailable or no captured frames');
        if (timeline.pipelines.some((p) => p.pending || !p.ok)) health.push('Failed or unfinished pipeline work');
        const runtime = await page.evaluate(() => ({
          gfx: window.boogle?.gfx,
          frames: window.boogle?.prof?.last?.frames,
        }));
        await page.waitForTimeout(1000);
        const finalFrames = await page.evaluate(() => window.boogle?.prof?.last?.frames);
        write(`${label}-runtime.json`, { runtime, finalFrames });
        if (runtime.gfx !== 'webgpu') health.push(`Unexpected backend: ${runtime.gfx}`);
        if (finalFrames === undefined || runtime.frames === undefined || finalFrames <= runtime.frames)
          health.push('Completed game frames did not advance');
        if (timeline.visibility.some((v) => v.hidden)) health.push('Page was hidden during sample');
        if (!timeline.firstVisibleWaterProxy || !timeline.pipelines.length)
          health.push('Missing visible-water proxy or pipeline hooks');
        await page.screenshot({ path: path.join(out, `${label}.png`) });
        write(
          `${label}-cache-storage.json`,
          await page.evaluate(async () => ({
            caches: await caches.keys(),
            workers: (await navigator.serviceWorker.getRegistrations()).map((w) => w.scope),
          })),
        );
        const summary = summarize(timeline);
        write(`${label}-summary.json`, { summary, health });
        results.push({ run, kind, summary, health });
        console.log(
          `${label}: ${summary.stalls.filter((s) => s.afterVisible).length} intervals >50ms after visibility proxy; ${health.length} health errors`,
        );
      } finally {
        await context.close();
      }
      write(`${label}-disk-caches.json`, profileInventory(profile));
    }
    // Only the exact mkdtemp directory created above; never bundle or system caches.
    fs.rmSync(profile, { recursive: true });
  }
} catch (error) {
  write('failure.json', { error: String(error) });
  console.error(error);
  process.exitCode = 1;
} finally {
  await stack?.close();
  const cold = results.filter((r) => r.kind === 'cold');
  const warm = results.filter((r) => r.kind === 'warm');
  const paired = cold.map((c) => ({ cold: c, warm: warm.find((w) => w.run === c.run) })).filter((p) => p.warm);
  const deltas = paired.map((p) => p.cold.summary.syncPipelineMs - p.warm!.summary.syncPipelineMs);
  const measurable =
    paired.length >= 3 &&
    paired.every(
      (p) =>
        p.cold.summary.pipelineSignature === p.warm!.summary.pipelineSignature &&
        !p.cold.health.length &&
        !p.warm!.health.length,
    ) &&
    deltas.every((d) => d > 5) &&
    spread(deltas).median! > spread(cold.map((r) => r.summary.syncPipelineMs)).median! * 0.1;
  const after = buildAt(process.cwd());
  write('report.json', {
    before,
    after,
    changedDuringRun: !sameBuild(before, after),
    results,
    spread: {
      coldSyncMs: spread(cold.map((r) => r.summary.syncPipelineMs)),
      warmSyncMs: spread(warm.map((r) => r.summary.syncPipelineMs)),
      pairedDeltaMs: spread(deltas),
    },
    cacheProof: {
      measurable,
      threshold:
        '3+ matched healthy pairs, every sync pipeline delta >5ms, median >10% of cold median; async latency is not compiler time',
      trueCold: false,
      status: 'FAILED: Metal cache isolation/clearing unverified',
      mode,
    },
  });
  console.log(
    `Report: ${path.join(out, 'report.json')}\nTrue-cold proof FAILED: shared Metal caches were not cleared.`,
  );
  process.exitCode ||= 2;
}
