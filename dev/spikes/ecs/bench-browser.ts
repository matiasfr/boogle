// node dev/spikes/ecs/bench-browser.ts [--json]: bundles ./bench.ts with esbuild and runs it in headless Chromium
// (Playwright, from the repo's own node_modules), on a blank page with no game loaded.
import { build } from 'esbuild';
import { chromium } from 'playwright';

const out = await build({
  entryPoints: [new URL('./bench.ts', import.meta.url).pathname],
  bundle: true,
  format: 'iife',
  globalName: 'spike',
  write: false,
  minify: true,
  target: 'es2022',
});
const code = out.outputFiles[0]!.text;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<!doctype html><title>ecs spike</title>');
await page.addScriptTag({ content: code });
const version = browser.version();
const r = (await page.evaluate('spike.runAll()')) as Awaited<ReturnType<typeof import('./bench.ts').runAll>>;
await browser.close();
if (process.argv.includes('--json'))
  console.log(JSON.stringify({ chromium: version, bundleBytes: code.length, ...r }, null, 2));
else {
  console.log('Chromium', version);
  console.table(
    r.timings.map((t) =>
      Object.fromEntries(Object.entries(t).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 10) / 10 : v])),
    ),
  );
  console.table(r.determinism);
  console.log('same hashes across options:', r.crossOption, '| bitECS:', r.bitecs);
}
