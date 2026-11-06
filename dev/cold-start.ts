// Headed, real-time production startup measurements. Never run concurrently with source edits.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { installStartupRecorder } from '../src/debug/startup-record.ts';
import { hostAudit, profileInventory } from './cold-start/cache.ts';
import { summarize, spread, comparePairs, comparisonThreshold } from './cold-start/report.ts';
import { prepareIdentity, metalInventory, clearExclusiveMetal } from './cold-start/identity.ts';
import { installSampleView } from './cold-start/page.ts';
import { buildAt, sameBuild } from './codex/source.ts';

const args = process.argv.slice(2);
const valueFlags = ['--url', '--out', '--runs', '--seconds', '--mode', '--query'];
const switches = ['--direct', '--audit', '--help', '--video-probe', '--safari-probe', '--prepare-only'];
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
    'npm run cold-start -- [--url URL] [--runs 3] [--mode cold|warm|paired] [--seconds 90] [--query proto=place] [--video-probe] [--audit] [--direct] [--prepare-only]\nDefault: broker. --direct: outside sandbox only. --prepare-only: copy, identify and sign browser without launching. One priming sample precedes measured pairs. Only exclusive Metal namespaces are cleared. Exit 2 means true-cold proof failed.',
  );
  process.exit(0);
}
const audit = hostAudit();
if (args.includes('--audit')) {
  console.log(JSON.stringify({ ...audit, executable: chromium.executablePath() }, null, 2));
  process.exit(0);
}
if (!args.includes('--direct') && !args.includes('--prepare-only')) {
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
const identity = prepareIdentity(chromium.executablePath(), out);
write('identity.json', identity);
console.log(`Exclusive browser: ${identity.executable}\nMetal namespace: ${identity.cacheRoot}/${identity.id}*`);
if (args.includes('--prepare-only')) process.exit(0);
let stack: Awaited<ReturnType<(typeof import('./cold-start/production.ts'))['startProduction']>> | undefined;
const results: { run: number; kind: string; summary: ReturnType<typeof summarize>; health: string[] }[] = [];
const metalSamples: { run: number; kind: string; writes: ReturnType<typeof metalInventory> }[] = [];
const clears: ReturnType<typeof clearExclusiveMetal>[] = [];
try {
  let base = value('--url', '');
  if (!base) {
    stack = await (await import('./cold-start/production.ts')).startProduction(out);
    base = stack.base;
  }
  const url = new URL(base);
  const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
  for (const [k, v] of new URLSearchParams(value('--query', url.search || 'proto=place'))) url.searchParams.set(k, v);
  url.searchParams.set('startup', '1');
  if (url.searchParams.get('proto') !== 'place') throw new Error('Fixed shore view requires proto=place');
  url.searchParams.set('debugcam', '1');
  url.searchParams.set('dpr', 'fixed');
  url.searchParams.set('notrack', '1'); // no automatic playtest telemetry from a benchmark
  if (args.includes('--video-probe')) url.searchParams.set('startupVideo', '1');
  // Prime the new namespace first, so the first measured clear has actual owned cache files to remove.
  for (let run = 0; run <= runs; run++) {
    // Entire profile belongs to this invocation. Never accept a user-supplied profile.
    const profile = fs.mkdtempSync(path.join(out, 'profile-'));
    const metalClear = run > 0 ? clearExclusiveMetal(identity.cacheRoot, identity.id) : null;
    if (metalClear) clears.push(metalClear);
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
      metal: metalClear,
    });
    for (const kind of run === 0 ? ['prime'] : mode === 'cold' ? ['cold'] : ['cold', 'warm']) {
      const label = `${run}-${kind}`;
      const metalBefore = metalInventory(identity.cacheRoot, identity.id);
      // Relaunch for warm too: removes process memory as a cold/warm confound.
      let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
      try {
        context = await chromium.launchPersistentContext(profile, {
          executablePath: identity.executable,
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
        // Routing disables HTTP caching in Playwright, so use no request interception.
        // Local builds omit fonts; local runs restrict DNS to loopback at launch.
        const page = context.pages()[0] ?? (await context.newPage());
        const health: string[] = [];
        const network: { url: string; status?: number; failure?: string; classification: string }[] = [];
        const consoleErrors: { text: string; url: string }[] = [];
        const favicon = new URL('/favicon.ico', url).href;
        page.on('response', (response) => {
          if (response.status() < 400) return;
          const ancillary = response.url() === favicon && response.status() === 404;
          network.push({
            url: response.url(),
            status: response.status(),
            classification: ancillary ? 'Known missing site favicon; ancillary, not a sea failure' : 'unhealthy',
          });
          if (!ancillary) health.push(`HTTP ${response.status()}: ${response.url()}`);
        });
        page.on('requestfailed', (request) => {
          network.push({ url: request.url(), failure: request.failure()?.errorText, classification: 'unhealthy' });
          health.push(`Request failed: ${request.url()}: ${request.failure()?.errorText}`);
        });
        page.on('pageerror', (error) => health.push(error.message));
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), url: msg.location().url });
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        if (kind === 'cold') {
          await cdp.send('Network.clearBrowserCache');
          await cdp.send('Storage.clearDataForOrigin', { origin: url.origin, storageTypes: 'all' });
        }
        await page.addInitScript(installStartupRecorder);
        await page.addInitScript(installSampleView);
        // Match arrival/audio work: every sample gets the same fresh identity, keeping shader/HTTP/SW caches warm.
        await page.addInitScript(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        const browserCDP = await context.browser()!.newBrowserCDPSession();
        const gpu = await browserCDP.send('SystemInfo.getInfo');
        write(`${label}-gpu.json`, gpu);
        // Only returned with --enable-automation, which this headed run leaves off.
        write(
          `${label}-browser-arguments.json`,
          await browserCDP
            .send('Browser.getBrowserCommandLine')
            .catch((error: unknown) => ({ unavailable: String(error) })),
        );
        if (!/metal/i.test(JSON.stringify(gpu.gpu))) health.push('Metal backend not confirmed by CDP');
        await page.bringToFront();
        const windowBefore = await cdp
          .send('Browser.getWindowForTarget')
          .catch((error: unknown) => ({ unavailable: String(error) }));
        const start = Date.now();
        await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.locator('#enter:not([disabled])').waitFor({ timeout: 90000 });
        await page.locator('#name-input').fill('Cold start');
        await page.screenshot({ path: path.join(out, `${label}-ready.png`) });
        await page.locator('#enter').click();
        for (const checkpoint of [30, 60].filter((s) => s < seconds)) {
          await page.waitForTimeout(Math.max(0, checkpoint * 1000 - (Date.now() - start)));
          await page.screenshot({ path: path.join(out, `${label}-${checkpoint}s.png`) });
        }
        await page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - start)));
        const timeline = await page.evaluate(() => {
          window.__startup!.stop();
          return window.__startup!.snapshot();
        });
        write(`${label}-timeline.json`, timeline);
        const view = await page.evaluate(() => window.__coldView!.stop());
        const windowAfter = await cdp
          .send('Browser.getWindowForTarget')
          .catch((error: unknown) => ({ unavailable: String(error) }));
        write(`${label}-view.json`, {
          ...view,
          windowBefore,
          windowAfter,
          screenshotOverhead: 'ready, 30s, 60s and end; identical for both seas',
        });
        const firstFrame = timeline.entries.find((entry) => entry.name === 'boot:first');
        if (
          view.appliedAt === null ||
          timeline.firstVisibleWaterProxy === null ||
          view.appliedAt >= timeline.firstVisibleWaterProxy ||
          !firstFrame ||
          view.appliedAt >= Number(firstFrame.startTime)
        )
          health.push('Fixed shore camera missing or applied after first completed frame');
        if (view.signals.some((signal) => signal.hidden)) health.push('Hidden page during window sampling');
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
        for (const error of consoleErrors) {
          if (
            error.url === favicon &&
            /404/.test(error.text) &&
            network.some((n) => n.url === favicon && n.status === 404)
          )
            continue;
          health.push(`${error.text} (${error.url || 'unknown URL'})`);
        }
        write(`${label}-network.json`, { network, consoleErrors });
        write(`${label}-summary.json`, { summary, health });
        results.push({ run, kind, summary, health });
        console.log(
          `${label}: ${summary.stalls.filter((s) => s.afterVisible).length} intervals >50ms after visibility proxy; ${health.length} health errors`,
        );
      } finally {
        try {
          await context?.close();
        } finally {
          const after = metalInventory(identity.cacheRoot, identity.id);
          const writes = after.filter(
            (file) =>
              !metalBefore.some(
                (old) => old.path === file.path && old.bytes === file.bytes && old.mtimeMs === file.mtimeMs,
              ),
          );
          metalSamples.push({ run, kind, writes });
          write(`${label}-metal.json`, { before: metalBefore, after, writes });
          console.log(`${label} Metal writes: ${JSON.stringify(writes)}`);
        }
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
  try {
    await stack?.close();
  } catch (error) {
    write('cleanup-failure.json', { error: String(error) });
    process.exitCode = 1;
  }
  const cold = results.filter((r) => r.kind === 'cold');
  const warm = results.filter((r) => r.kind === 'warm');
  const paired = cold.map((c) => ({ cold: c, warm: warm.find((w) => w.run === c.run) })).filter((p) => p.warm);
  const deltas = paired.map((p) => p.cold.summary.asyncPipelineElapsedMs - p.warm!.summary.asyncPipelineElapsedMs);
  const { measurable, comparison } = comparePairs(results);
  const after = buildAt(process.cwd());
  const exclusiveCleared = clears.length === runs && clears.every((clear) => clear.cleared && clear.before.length > 0);
  const exclusiveWrites =
    metalSamples.some((sample) => sample.kind === 'prime' && sample.writes.length > 0) &&
    cold.length === runs &&
    cold.every((sample) =>
      metalSamples.some((metal) => metal.run === sample.run && metal.kind === 'cold' && metal.writes.length > 0),
    );
  const trueCold = measurable && exclusiveCleared && exclusiveWrites && sameBuild(before, after) && !process.exitCode;
  write('report.json', {
    before,
    after,
    changedDuringRun: !sameBuild(before, after),
    results,
    identity,
    clears,
    metalSamples,
    comparison,
    spread: {
      coldSyncMs: spread(cold.map((r) => r.summary.syncPipelineMs)),
      warmSyncMs: spread(warm.map((r) => r.summary.syncPipelineMs)),
      coldAsyncElapsedMs: spread(cold.map((r) => r.summary.asyncPipelineElapsedMs)),
      warmAsyncElapsedMs: spread(warm.map((r) => r.summary.asyncPipelineElapsedMs)),
      pairedDeltaMs: spread(deltas),
    },
    cacheProof: {
      measurable,
      threshold: comparisonThreshold,
      exclusiveCleared,
      exclusiveWrites,
      trueCold,
      status: trueCold
        ? 'Exclusive Metal clear and measurable paired cache effect verified'
        : 'FAILED: exclusive writes, clears, health or measurable paired cache effect not proven',
      mode,
    },
  });
  console.log(
    `Report: ${path.join(out, 'report.json')}\ntrueCold: ${trueCold}; exclusive writes: ${exclusiveWrites}; exclusive clears: ${exclusiveCleared}; measurable: ${measurable}`,
  );
  if (!trueCold) process.exitCode ||= 2;
}
