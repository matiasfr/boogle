// Builds docs/world/trade-economy.html's two generated blocks: #trade-data (the route's spine from the ring model) and
// #trade-code (trade-page.ts bundled with trade-model.ts and trade-data.ts). Edit those sources, never the blocks.
//   node dev/economy/build-trade-page.ts           write the page
//   node dev/economy/build-trade-page.ts --check   fail if the page is stale
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { routeSpine, type RouteSpine } from './trade-route.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const PAGE = join(ROOT, 'docs/world/trade-economy.html');
/** Everything the bundle and the data come from: a change to any of them makes the page stale. */
export const SOURCES = [
  'dev/economy/ring-data.ts',
  'dev/economy/ring-sim.ts',
  'dev/economy/trade-data.ts',
  'src/sim/railway-trade-layout.ts',
  'dev/economy/trade-model.ts',
  'dev/economy/trade-route.ts',
  'dev/economy/trade-page.ts',
  'dev/economy/build-trade-page.ts',
];
export const sourceHash = () => {
  const h = createHash('sha256');
  for (const f of SOURCES) h.update(readFileSync(join(ROOT, f)));
  return h.digest('hex').slice(0, 16);
};

const r3 = (x: number) => Math.round(x * 1000) / 1000;
export function pageSpine(): RouteSpine {
  const s = routeSpine();
  return { ...s, steps: s.steps.map((x) => ({ ...x, fixedMin: x.fixedMin.map(r3), labourMin: x.labourMin.map(r3) })) };
}

export async function buildPage(page = readFileSync(PAGE, 'utf8')) {
  const data = { generatedBy: 'dev/economy/build-trade-page.ts', sourceHash: sourceHash(), spine: pageSpine() };
  const esbuild = await import('esbuild');
  const bundle = await esbuild.build({
    entryPoints: [join(ROOT, 'dev/economy/trade-page.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
  });
  const code = bundle.outputFiles[0]!.text.trim().replace(/<\/script/gi, '<\\/script');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const dataBlock = /(<script type="application\/json" id="trade-data">)[\s\S]*?(<\/script>)/;
  const codeBlock = /(<script id="trade-code">)[\s\S]*?(<\/script>)/;
  if (!dataBlock.test(page) || !codeBlock.test(page)) throw new Error('trade-economy.html lacks its script blocks');
  return page
    .replace(dataBlock, () => `<script type="application/json" id="trade-data">${json}</script>`)
    .replace(codeBlock, () => `<script id="trade-code">${code}</script>`);
}

/** The generated data block of the committed page, parsed. */
export function pageData(page = readFileSync(PAGE, 'utf8')) {
  const m = /<script type="application\/json" id="trade-data">([\s\S]*?)<\/script>/.exec(page);
  if (!m) throw new Error('trade-economy.html has no trade-data block');
  return JSON.parse(m[1]!) as { sourceHash: string; spine: RouteSpine };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const page = readFileSync(PAGE, 'utf8');
  const next = await buildPage(page);
  if (process.argv.includes('--check')) {
    if (next !== page)
      throw new Error('stale, run node dev/economy/build-trade-page.ts: docs/world/trade-economy.html');
    console.log('trade economy page is current');
  } else {
    writeFileSync(PAGE, next);
    console.log(`trade economy page written (${pageData(next).sourceHash})`);
  }
}
