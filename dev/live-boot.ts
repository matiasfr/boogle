// Live boot probe (smoke.yml, after dev/live-smoke.ts): opens the deployed game once in headless Chromium, in a smoke
// room, never presses Jump in, and reads the page's own boot marks (src/boot/timeline.ts). Exit 1 when the game did
// not boot for a reason other than missing WebGPU. Added 11 November 2026: v27's startup throw in a railway mount showed
// "Can't draw the island", the same lobby as a device without WebGPU, and every gate passed.
//   boot:interactive                         PASS: the game booted.
//   boot:gpu, then graphics-failed/failed    FAIL: WebGPU started and something threw during startup.
//   boot:failed without graphics-failed      FAIL: a file or chunk did not download (src/boot/failure.ts).
//   graphics-failed without boot:gpu         WARN (a GitHub annotation in Actions), exit 0: this browser has no WebGPU,
//                                            so a throw in a view mount is unproven; FAIL if the page threw anyway.
//   none of these in time                    FAIL (a module that throws on import never marks anything).
// Usage: node dev/live-boot.ts [--url https://boogle.club/] [--wait <seconds>]
// deploy.yml runs it on the built dist (vite preview) before Pages deploys; smoke.yml on the live site after.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
};
const url = new URL(option('--url') || 'https://boogle.club/');
// Its own seven rooms, as live-smoke.ts's: never boogle or a friend's room.
url.searchParams.set('room', `smoke-boot-${new Date().getUTCDay()}`);
const waitMs = Number(option('--wait') || 150) * 1000;

// dev/look/lib.ts's launch flags: Linux (the runner) gets WebGPU on SwiftShader; a Mac uses its GPU through Metal.
const flags = ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'];
if (process.platform === 'darwin' || process.platform === 'win32')
  flags.push(process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=metal');
else
  flags.push(
    ...['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...['--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader'],
  );

const browser = await chromium.launch({ args: flags, headless: true });
const failures: string[] = [];
const pageErrors: string[] = [];
let exitCode = 1;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('[boot] startup failed')) failures.push(m.text());
  });
  page.on('pageerror', (e) =>
    pageErrors.push(
      String(e.stack || e)
        .split('\n')
        .slice(0, 4)
        .join(' | '),
    ),
  );
  const start = performance.now();
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const marks = () =>
    page.evaluate(() => performance.getEntriesByType('mark').map((m) => m.name.replace(/^boot:/, '')));
  let seen: string[] = [];
  const done = (m: string[]) => m.includes('interactive') || m.includes('graphics-failed') || m.includes('failed');
  while (performance.now() - start < waitMs) {
    seen = await marks();
    if (done(seen)) break;
    await page.waitForTimeout(500);
  }
  if (!seen.includes('interactive') && done(seen)) await page.waitForTimeout(500); // let the console line arrive
  const adapter = await page.evaluate(async () => {
    const a = await (navigator as Navigator & { gpu?: GPU }).gpu?.requestAdapter().catch(() => null);
    return a ? `${a.info.vendor} ${a.info.architecture} ${a.info.description}`.trim() || 'unnamed adapter' : 'none';
  });
  const secs = ((performance.now() - start) / 1000).toFixed(1);
  const why = [...failures, ...pageErrors.map((e) => `page error: ${e}`)].join('\n  ') || 'no error logged';
  if (seen.includes('interactive')) {
    console.log(`PASS live boot: ${url.href} interactive in ${secs}s (WebGPU adapter: ${adapter})`);
    exitCode = 0;
  } else if (seen.includes('gpu') && (seen.includes('graphics-failed') || seen.includes('failed')))
    console.error(`FAIL live boot: WebGPU started, then startup threw (lobby: "Can't draw the island")\n  ${why}`);
  else if (seen.includes('failed') && !seen.includes('graphics-failed'))
    console.error(`FAIL live boot: a file or chunk did not load\n  ${why}`);
  else if (seen.includes('graphics-failed') && pageErrors.length)
    console.error(`FAIL live boot: no WebGPU here, and the page threw before it got that far\n  ${why}`);
  else if (seen.includes('graphics-failed')) {
    const line = `WebGPU did not start in this browser (adapter: ${adapter}), so a throw after boot:gpu (a view mount) cannot be seen`;
    // A GitHub annotation on the run, not only a log line.
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Live boot unproven::${line}`);
    console.warn(`WARN live boot unproven: ${line}\n  ${why}`);
    exitCode = 0;
  } else console.error(`FAIL live boot: neither booted nor failed in ${secs}s; marks: ${seen.join(' ')}\n  ${why}`);
  if (exitCode === 0 && pageErrors.length) console.warn(`WARN page errors:\n  ${pageErrors.join('\n  ')}`);
} catch (error) {
  console.error('FAIL live boot threw:', error);
} finally {
  await browser.close();
}
process.exit(exitCode);
