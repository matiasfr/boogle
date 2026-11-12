// npm run sheet: the owner's contact sheet of the production route. One still per curated railway stage, each started
// from its accepted `--rail-seed` server save (dev/look/rail-seed.ts), so the railway shown is the stage's, not a client
// save's. Human review evidence, not a visual verdict. Captures are deliberately serial on the shared GPU.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildAt, sameBuild } from '../codex/source.ts';
import type { Evidence } from '../codex/evidence.ts';
import { composition, type Tile } from './sheet-render.ts';
import { isSeedStage } from '../../src/sim/railway-seeds.ts';

// Route order, one per beat a person would want to see (src/sim/railway-seeds.ts names every stage).
const CURATED = [
  'awake',
  'q1-done',
  'hook-taken',
  'q3-done',
  'q4-done',
  'q5-done',
  'glide-earned',
  'trains-on',
  'q6-done',
  'works-lit',
  'crossing-done',
  'deck-laid',
  'ring-joined',
];
const args = process.argv.slice(2),
  values = new Map<string, string>();
for (let i = 0; i < args.length; i++) {
  const flag = args[i]!;
  if (['--name', '--stages'].includes(flag)) {
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(flag + ' needs a value');
    values.set(flag, value);
  } else if (flag === '--help') {
    console.log(
      'npm run sheet -- [--name output-name] [--stages "awake,trains-on"]\nOne still per railway stage from its --rail-seed. Existing broker is used automatically. Serial captures; no visual pass.',
    );
    process.exit(0);
  } else throw new Error('Unknown sheet option: ' + flag);
}
const started = Date.now(),
  date = new Date().toISOString();
const name = values.get('--name') ?? date.replace(/[^0-9]/g, '').slice(0, 14);
if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Use a simple --name');
const stages = values.has('--stages')
  ? values
      .get('--stages')!
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : CURATED;
if (!stages.length) throw new Error('--stages needs at least one stage');
for (const stage of stages)
  if (!isSeedStage(stage)) throw new Error(`Unknown stage ${stage} (src/sim/railway-seeds.ts)`);
const out = path.resolve('.look/sheet', name);
if (fs.existsSync(out)) throw new Error('Sheet already exists; choose another --name: ' + out);
fs.mkdirSync(out, { recursive: true });
const broker = fs.existsSync('.look/see/ready.json');
const build = buildAt(process.cwd());
const manifests: string[] = [],
  tiles: Tile[] = [];
const timings: { label: string; seconds: number; status: number }[] = [];
let failed = false;

function capture(options: string[], label: string) {
  const dir = path.join(out, label);
  fs.mkdirSync(dir, { recursive: true });
  const logPath = path.join(dir, 'output.txt'),
    log = fs.openSync(logPath, 'w');
  const command = broker ? ['.look/see-client.ts', 'look', ...options] : ['dev/look/look.ts', ...options, '--out', dir];
  console.log(`sheet: ${label} (${broker ? 'broker' : 'local harness'})`);
  const start = Date.now();
  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync(process.execPath, command, { stdio: ['ignore', log, log] });
  } finally {
    fs.closeSync(log);
  }
  let output = fs.readFileSync(logPath, 'utf8'),
    directory = dir,
    evidence: Evidence | undefined;
  if (broker) {
    const replies = fs
      .readdirSync('.look/see')
      .filter((file) => file.endsWith(`-${result.pid}.done.json`) && Number(file.split('-')[0]) >= start);
    if (replies.length === 1) {
      const reply = JSON.parse(fs.readFileSync(path.join('.look/see', replies[0]!), 'utf8')) as {
        output: string;
        evidence?: string;
      };
      output = reply.output;
      if (reply.evidence) {
        manifests.push(reply.evidence);
        directory = path.dirname(reply.evidence);
        evidence = JSON.parse(fs.readFileSync(reply.evidence, 'utf8')) as Evidence;
      }
    }
  }
  const status = evidence?.status ?? result.status ?? 1;
  const seconds = (Date.now() - start) / 1000;
  timings.push({ label, seconds, status });
  console.log(`sheet: ${label}: ${seconds.toFixed(1)} s, capture exit ${status}${status ? ' — see ' + logPath : ''}`);
  return { directory, output, status };
}

for (const [i, stage] of stages.entries()) {
  const label = 'stage-' + String(i + 1).padStart(2, '0');
  const result = capture(
    [
      '--rail-seed',
      stage,
      '--eval',
      'dev/look/evals/sheet-stage.ts',
      '--until',
      'window.__sheetReady',
      '--hud',
      '--warm',
      '2',
      '--frames',
      '2',
      '--seconds',
      '0.1',
      '--name',
      'capture',
      '--question',
      `What is actually visible at the railway stage ${stage}?`,
    ],
    label,
  );
  const tile: Tile = { label: `${i + 1}. ${stage}` };
  const image = path.join(result.directory, 'capture-still.png');
  if (!result.status && fs.existsSync(image)) tile.image = image;
  else {
    tile.note = 'CAPTURE FAILED — see ' + label + '/output.txt';
    failed = true;
  }
  tiles.push(tile);
}

const notices = [`Stages started from their --rail-seed server saves; ${build.commit.slice(0, 8)}.`];
const script = path.join(out, 'compose.ts');
fs.writeFileSync(
  script,
  composition({
    title: 'BOOGLE · ' + name,
    subtitle: `${build.commit.slice(0, 8)}${build.dirty ? ' + working tree' : ''} · ${date} · no visual verdict`,
    notices,
    columns: stages.length <= 2 ? 1 : 3,
    tiles,
    strips: [],
  }),
);
const composed = capture(
  ['--eval', script, '--warm', '0', '--frames', '2', '--seconds', '0.1', '--name', 'composition'],
  'compose',
);
const png = [...composed.output.matchAll(/^SHEET PNG (.+)$/gm)].map((m) => m[1]).join('');
const expected = Number(/^SHEET LENGTH (\d+)$/m.exec(composed.output)?.[1]);
if (composed.status || !png || png.length !== expected)
  throw new Error('Incomplete sheet composition; see compose/output.txt');
const image = path.join(out, 'contact-sheet.png');
if (!sameBuild(build, buildAt(process.cwd()))) {
  throw new Error('Source changed during sheet; no contact sheet published. Repeat the capture.');
}
fs.writeFileSync(image, Buffer.from(png, 'base64'));
const seconds = (Date.now() - started) / 1000;
fs.writeFileSync(
  path.join(out, 'sheet.json'),
  JSON.stringify(
    {
      build,
      date,
      stages,
      seconds,
      timings,
      manifests,
      notices,
      tiles,
      captureFailures: failed,
      visualVerdict: 'not assessed',
    },
    null,
    2,
  ),
);
// Supplemental artifacts beside broker evidence are carried into the launcher's handoff.
if (broker) {
  fs.copyFileSync(image, path.join(composed.directory, 'contact-sheet.png'));
  fs.copyFileSync(path.join(out, 'sheet.json'), path.join(composed.directory, 'sheet.json'));
}
console.log(
  `Sheet: ${image}\nManifest: ${path.join(out, 'sheet.json')}\nMeasured total: ${seconds.toFixed(1)} s. Human evidence only; no visual pass.`,
);
process.exitCode = failed ? 1 : 0;
