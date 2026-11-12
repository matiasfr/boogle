// Builds docs/world/economy-prototype.html's two generated blocks: #play-data (the Sickle Isles map from
// map-prototypes.html, plus whole bot runs and the closed-form model's pace for reference) and #play-code (play-page.ts
// and play-sim.ts bundled with ring-data.ts, ring-sim.ts and the passenger trade: play-trade.ts, trade-model.ts and
// trade-data.ts). Edit those sources, never the blocks.
//   node dev/economy/build-prototype.ts           write the page
//   node dev/economy/build-prototype.ts --check   fail if the page is stale
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { simulate } from './ring-sim.ts';
import { playMap, type PlayMap } from './play-map.ts';
import { runWhole, type RunSummary } from './play-sim.ts';
import { BRANCHES } from './ring-data.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const PAGE = join(ROOT, 'docs/world/economy-prototype.html');
/** Everything the bundle and the data come from: a change to any of them makes the page stale. */
export const SOURCES = [
  'dev/economy/ring-data.ts',
  'dev/economy/ring-sim.ts',
  'dev/economy/play-sim.ts',
  'dev/economy/play-trade.ts',
  'dev/economy/trade-model.ts',
  'dev/economy/trade-data.ts',
  'src/sim/railway-trade-layout.ts',
  'dev/economy/play-map.ts',
  'dev/economy/play-page.ts',
  'dev/economy/build-prototype.ts',
  'src/proto/greybox/map-data.ts',
  'src/sickle/map-data.ts',
  'docs/world/map-prototypes.html',
];
export const sourceHash = () => {
  const h = createHash('sha256');
  for (const f of SOURCES) h.update(readFileSync(join(ROOT, f)));
  return h.digest('hex').slice(0, 16);
};

/** Whole runs for the reference table: one to three players, both branch orders, the model's hauling rule. */
export function referenceRuns(map: PlayMap): RunSummary[] {
  const out: RunSummary[] = [];
  for (const first of BRANCHES.slice().reverse())
    for (const players of [1, 2, 3])
      out.push(runWhole(map, { players, branchFirst: first, policy: 'model', endgame: true }).summary);
  for (const players of [1, 2, 3])
    out.push(runWhole(map, { players, branchFirst: 'gorge', policy: 'eager', endgame: true }).summary);
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return out.map((s) => ({
    ...s,
    mainH: r3(s.mainH),
    endH: s.endH === null ? null : r3(s.endH),
    wallet: Math.round(s.wallet),
    use: s.use.map((u) => ({ haul: r3(u.haul), explore: r3(u.explore), wait: r3(u.wait) })),
    crossovers: s.crossovers.map((c) => ({ ...c, h: r3(c.h) })),
    steps: s.steps.map((x) => ({ ...x, startH: r3(x.startH), endH: r3(x.endH) })),
  }));
}

export async function buildPage(page = readFileSync(PAGE, 'utf8')) {
  const map = playMap();
  const model = Object.fromEntries(
    BRANCHES.map((b) => [
      b,
      simulate({ branchFirst: b })
        .steps.at(-1)!
        .pace.map((p) => Math.round(p.end * 1000) / 1000),
    ]),
  );
  const data = {
    generatedBy: 'dev/economy/build-prototype.ts',
    sourceHash: sourceHash(),
    map,
    reference: { runs: referenceRuns(map), model },
  };
  const esbuild = await import('esbuild');
  const bundle = await esbuild.build({
    entryPoints: [join(ROOT, 'dev/economy/play-page.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
  });
  const code = bundle.outputFiles[0]!.text.trim().replace(/<\/script/gi, '<\\/script');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const dataBlock = /(<script type="application\/json" id="play-data">)[\s\S]*?(<\/script>)/;
  const codeBlock = /(<script id="play-code">)[\s\S]*?(<\/script>)/;
  if (!dataBlock.test(page) || !codeBlock.test(page)) throw new Error('economy-prototype.html lacks its script blocks');
  return page
    .replace(dataBlock, () => `<script type="application/json" id="play-data">${json}</script>`)
    .replace(codeBlock, () => `<script id="play-code">${code}</script>`);
}

/** The generated data block of the committed page, parsed. */
export function pageData(page = readFileSync(PAGE, 'utf8')) {
  const m = /<script type="application\/json" id="play-data">([\s\S]*?)<\/script>/.exec(page);
  if (!m) throw new Error('economy-prototype.html has no play-data block');
  return JSON.parse(m[1]!) as { sourceHash: string; reference: { runs: RunSummary[] } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const page = readFileSync(PAGE, 'utf8');
  const next = await buildPage(page);
  if (process.argv.includes('--check')) {
    if (next !== page)
      throw new Error('stale, run node dev/economy/build-prototype.ts: docs/world/economy-prototype.html');
    console.log('economy prototype page is current');
  } else {
    writeFileSync(PAGE, next);
    const runs = pageData(next).reference.runs.filter((r) => r.policy === 'model' && r.branchFirst === 'gorge');
    console.log(
      `economy prototype: ${runs.map((r) => `${r.players}p ${r.mainH.toFixed(2)} h`).join(', ')} (gorge first)`,
    );
  }
}
