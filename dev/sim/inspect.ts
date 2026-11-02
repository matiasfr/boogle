// `npm run inspect`: what entities are in the game, what they hold and what they cost (src/entity/inspect.ts).
//   npm run inspect                    headless, through ./world.ts: seconds, no GPU, only entities with a headless.ts
//   npm run inspect -- --browser       the real game through the look harness: every entity, real costs
//   --json                             the report as JSON, with every entity of every kind
//   --frames 240                       frames to run first (prof's window is 240; fewer read low)
//   --url http://...                   with --browser, a running game instead of a local stack
// Kinds are found in the source too, so a run says what it doesn't have rather than leaving it to be guessed.
import fs from 'node:fs';
import path from 'node:path';
import type { InspectReport, KindReport } from '../../src/entity/inspect.ts';

const root = path.join(import.meta.dirname, '../..');
const argv = process.argv.slice(2);
const val = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const browser = argv.includes('--browser');
const json = argv.includes('--json');
const frames = Number(val('--frames') ?? 240);
const MAX_ROWS = 8; // entities shown per kind in the table; --json has them all

async function runHeadless(): Promise<InspectReport> {
  const { headless, frame } = await import('./world.ts');
  await headless();
  const { enterIsland } = await import('../../src/entities/player/state.ts');
  enterIsland('inspect'); // a player is in the world only once it enters
  for (let k = 0; k < frames; k++) frame();
  const { inspect } = await import('../../src/entity/inspect.ts');
  return inspect();
}

async function runBrowser(): Promise<InspectReport> {
  const { startStack, launch, Game } = await import('../look/lib.ts');
  const stack = await startStack({ url: val('--url') ?? null });
  const page = await launch();
  try {
    const g = await Game.open(page, stack);
    const ran = await g.waitFor((n: number) => window.boogle.prof.last.frames >= n, { arg: frames, timeout: 60000 });
    if (ran < 0) console.error(`[inspect] fewer than ${frames} frames in a minute; costs below read low`);
    for (const e of g.healthErrors()) console.error(`[inspect] ${e}`);
    return await g.eval(() => window.boogle.inspect());
  } finally {
    await page.close();
    await stack.close();
  }
}

/** Every kind the source defines, and where. Orders and kind names are literals (src/entity/entity.ts). */
function kindsInSource() {
  const found = new Map<string, string>();
  for (const file of fs.globSync('src/**/*.ts', { cwd: root })) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const m of source.matchAll(/^\s*defineKind\(\s*'([^']+)'/gm)) found.set(m[1]!, file);
  }
  return found;
}

const xyz = (p: unknown[] | null) => (p ? p.join(', ') : '-');
const pad = (s: string | number, n: number) => String(s).padEnd(n);

function printKind(k: KindReport) {
  const phases = k.phases.map((p) => `${p.phase} ${p.order}${p.cost ? ` (${p.cost.avg} ms)` : ''}`).join(', ');
  console.log(`${pad(k.kind, 24)} ${pad(k.count, 5)} ${pad(k.ms ?? '-', 8)} ${phases}`);
  for (const e of k.entities.slice(0, MAX_ROWS)) {
    const parts = [e.alive ? 'alive' : 'DEAD', `mesh ${xyz(e.mesh)}`, `bodies ${e.bodies}`];
    if (e.body) parts.push(`body ${xyz(e.body)}`);
    console.log(`  ${pad(e.id, 22)} ${parts.join('  ')}`);
    if (e.state) console.log(`    ${JSON.stringify(e.state)}`);
  }
  if (k.entities.length > MAX_ROWS) console.log(`  ... ${k.entities.length - MAX_ROWS} more (--json has them all)`);
}

const report = browser ? await runBrowser() : await runHeadless();
const here = new Set(report.kinds.map((k) => k.kind));
const missing = [...kindsInSource()]
  .filter(([kind]) => !here.has(kind))
  .map(([kind, file]) => ({ kind, file }))
  .sort((a, b) => a.file.localeCompare(b.file));
const mode = browser ? 'browser' : 'headless';

if (json) {
  console.log(JSON.stringify({ mode, ...report, missing }, null, 2));
} else {
  const entities = report.kinds.reduce((sum, k) => sum + k.entities.length, 0);
  console.log(
    `${mode}: ${report.kinds.length} kinds, ${entities} entities, after ${report.frames} frames (${report.frame?.avg ?? '-'} ms a frame)`,
  );
  if (!browser) console.log("Costs are Node's, with no render: use --browser for what something costs in the game.");
  console.log(`\n${pad('KIND', 24)} ${pad('COUNT', 5)} ${pad('MS/FRAME', 8)} PHASES (order)`);
  for (const k of [...report.kinds].sort((a, b) => a.kind.localeCompare(b.kind))) printKind(k);
  if (missing.length) {
    console.log(
      browser
        ? `\nNot loaded in this page (${missing.length} kinds: behind a ?proto= or other flag, or a lazy part that hasn't arrived):`
        : `\nNOT IN A HEADLESS RUN (${missing.length} kinds: no src/entities/*/headless.ts loads them; --browser has them):`,
    );
    for (const { kind, file } of missing) console.log(`  ${pad(kind, 22)} ${file}`);
  }
}
process.exit(0); // a headless run's world and a stack's sockets would keep Node up
