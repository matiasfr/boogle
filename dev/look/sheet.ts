// Human review evidence, not a visual verdict. Captures are deliberately serial on the shared GPU.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { buildAt, sameBuild } from '../codex/source.ts';
import type { Evidence } from '../codex/evidence.ts';
import type { Save } from './saves.ts';
import { composition, type Tile } from './sheet-render.ts';

// Exact names, not substring selectors. Aliases are deliberately not photographed twice.
const CURATED = [
  'woke',
  'chop',
  'deposit',
  'lay Station 1',
  'great beam shouldered',
  'path opened',
  'forge lit',
  'lay Line 2, station 2',
  'gate opened',
  'train unlocked',
  'train called',
  'ride',
  'run ended',
  'entered building house',
  'entered building shop',
  'entered building museum',
];
const args = process.argv.slice(2),
  values = new Map<string, string>(),
  flags = new Set<string>();
for (let i = 0; i < args.length; i++) {
  const flag = args[i]!;
  if (['--moments', '--coop'].includes(flag)) flags.add(flag);
  else if (['--run', '--name', '--beats', '--before'].includes(flag)) {
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(flag + ' needs a value');
    values.set(flag, value);
  } else if (flag === '--help') {
    console.log(
      'npm run sheet -- [--run name-or-directory] [--name output-name] [--beats "forge lit,path opened"] [--before ref] [--moments] [--coop]\nDefault: play the bot, curate stills and capture the real opening. Explicit --beats omits opening. Existing broker is used automatically. Serial captures; no visual pass.',
    );
    process.exit(0);
  } else throw new Error('Unknown sheet option: ' + flag);
}
const started = Date.now(),
  date = new Date().toISOString();
const name = values.get('--name') ?? date.replace(/[^0-9]/g, '').slice(0, 14);
if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Use a simple --name');
const out = path.resolve('.look/sheet', name);
if (fs.existsSync(out)) throw new Error('Sheet already exists; choose another --name: ' + out);
fs.mkdirSync(out, { recursive: true });
const broker = fs.existsSync('.look/see/ready.json');
const build = buildAt(process.cwd());
const manifests: string[] = [],
  notices: string[] = [],
  tiles: Tile[] = [],
  strips: Tile[] = [];
const timings: { label: string; seconds: number; status: number }[] = [];
let failed = false;
const failure = (output: string) =>
  (output.split('\n').find((line) => line.startsWith('Error:')) ?? 'Capture failed; read its output.txt').slice(0, 180);

function capture(operation: 'look' | 'playthrough' | 'before-after', options: string[], label: string) {
  const dir = path.join(out, label);
  fs.mkdirSync(dir, { recursive: true });
  const logPath = path.join(dir, 'output.txt'),
    log = fs.openSync(logPath, 'w');
  const command = broker
    ? ['.look/see-client.ts', operation, ...options]
    : [`dev/look/${operation}.ts`, ...options, '--out', dir];
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
  return { directory, output, status, evidence };
}

function runDirectory(value: string) {
  for (const dir of [path.resolve(value), path.resolve('.look/playthrough', value)])
    if (fs.existsSync(path.join(dir, 'saves'))) return dir;
  throw new Error('No run with saves: ' + value);
}
let run: string, runEvidence: Pick<Evidence, 'before' | 'status'> | undefined;
if (values.has('--run')) {
  run = runDirectory(values.get('--run')!);
  const meta = [path.join(run, 'sheet-run.json'), path.join(path.dirname(run), 'evidence.json')].find((f) =>
    fs.existsSync(f),
  );
  if (meta) runEvidence = JSON.parse(fs.readFileSync(meta, 'utf8')) as Evidence;
} else {
  const result = capture('playthrough', broker ? [] : ['--name', 'run'], 'playthrough');
  failed ||= !!result.status;
  run = path.resolve('.look/playthrough', name);
  if (fs.existsSync(run)) throw new Error('Run name already exists: ' + run);
  const source = path.join(result.directory, 'run');
  if (!fs.existsSync(path.join(source, 'saves')))
    throw new Error('Bot produced no checkpoints; see ' + result.directory);
  fs.cpSync(source, run, { recursive: true });
  runEvidence = result.evidence ?? { before: build, status: result.status };
  fs.writeFileSync(path.join(run, 'sheet-run.json'), JSON.stringify(runEvidence, null, 2));
}
if (runEvidence?.status) {
  notices.push('BOT CAPTURE FAILED; checkpoints are incomplete. Read report.txt.');
  failed = true;
}
const report = fs.readFileSync(path.join(run, 'report.txt'), 'utf8');
const bot = fs.readFileSync(path.join(run, 'bot.txt'), 'utf8');
notices.push(
  ...report.split('\n').filter((line) => /^(The bot (?:finished|reached)|THE BOT|Never happened)/.test(line)),
);
const missed = bot.split('\n').filter((line) => line.includes('NEVER:'));
notices.push(...missed);
if (missed.length || report.includes('THE BOT DID NOT FINISH')) failed = true;
const saves = fs
  .readdirSync(path.join(run, 'saves'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((file) => ({
    file: path.join(run, 'saves', file),
    save: JSON.parse(fs.readFileSync(path.join(run, 'saves', file), 'utf8')) as Save,
  }));
const uncovered = saves.filter(({ save }) => !CURATED.includes(save.beat)).map(({ save }) => save.beat);
console.log('Outside curated list (including aliases/objectives):\n' + uncovered.join('\n'));
const waits = report
  .split('\n')
  .flatMap((line) => {
    const hit = /^\s+(\d+:\d+)\s+\+((?:\d+ (?:h|min|s)\s*)+)\s+(.+)$/.exec(line);
    if (!hit) return [];
    let seconds = 0;
    for (const match of hit[2]!.matchAll(/(\d+) (h|min|s)/g))
      seconds += Number(match[1]) * (match[2] === 'h' ? 3600 : match[2] === 'min' ? 60 : 1);
    return [{ seconds, text: `${hit[1]} +${hit[2]!.trim()} ${hit[3]}` }];
  })
  .sort((a, b) => b.seconds - a.seconds)
  .slice(0, 5);
notices.push('Longest bot waits: ' + (waits.map((w) => w.text).join('; ') || 'not available in this report'));
notices.push(
  `Run: ${path.basename(run)} · ${runEvidence?.before?.commit?.slice(0, 8) ?? 'source commit unknown'}; restored stills are not moments mid-show.`,
);
console.log(notices.join('\n'));
const requested = values.has('--beats')
  ? values
      .get('--beats')!
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : CURATED;
if (!requested.length) throw new Error('--beats needs at least one exact beat name');
const before = values.get('--before');
let comparisonProblem = '';
if (before) {
  const ref = execFileSync('git', ['rev-parse', '--verify', `${before}^{commit}`], { encoding: 'utf8' }).trim();
  notices.push('Before: ' + ref.slice(0, 8) + ' · after: ' + build.commit.slice(0, 8));
  if (broker)
    comparisonProblem =
      'Before unavailable: this broker owns --root and has no comparison operation. No different moment substituted.';
  else {
    const runRef = runEvidence?.before?.tree ?? runEvidence?.before?.commit;
    if (!runRef)
      comparisonProblem = 'Run source is unknown; cross-build restore cannot be substantiated. Comparison omitted.';
    // Conservative compatibility gate: a changed save owner needs an explicit restore audit, not a new bot run.
    const owners = fs
      .readdirSync('src/proto/place')
      .filter(
        (f) =>
          f.endsWith('.ts') &&
          /(?:sharedSlice|personalSlice)\(/.test(fs.readFileSync(path.join('src/proto/place', f), 'utf8')),
      );
    for (const file of owners) {
      const relative = 'src/proto/place/' + file;
      try {
        if (
          runRef &&
          execFileSync('git', ['show', `${runRef}:${relative}`], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }) !== fs.readFileSync(relative, 'utf8')
        )
          comparisonProblem =
            'Reused run has different save-owner code; cross-build restore is unverified. Comparison omitted.';
        if (
          execFileSync('git', ['show', `${ref}:${relative}`], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          }) !== fs.readFileSync(relative, 'utf8')
        )
          comparisonProblem = 'Save-owner code differs; cross-build restore is unverified. Comparison omitted.';
      } catch {
        comparisonProblem = 'Earlier build has no matching save owner. Comparison omitted.';
      }
    }
  }
  if (comparisonProblem) {
    notices.push(comparisonProblem);
    failed = true;
  }
}

function checkpoint(beat: string, label: string) {
  const hit = saves.find(({ save }) => save.beat.toLowerCase() === beat.toLowerCase());
  if (!hit) return null;
  const dir = path.join(out, 'checkpoints', label);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(hit.file, path.join(dir, 'save.json')); // findSave's substring search now has exactly one candidate.
  return { ...hit, args: ['--at', hit.save.beat, '--saves', dir] };
}
for (const [i, beat] of requested.entries()) {
  const label = 'beat-' + String(i + 1).padStart(2, '0'),
    at = checkpoint(beat, label);
  const tile: Tile = { label: `${i + 1}. ${beat}${at ? ' · ' + Math.round(at.save.t) + 's' : ''}` };
  if (!at) {
    if (before) tiles.push({ label: tile.label + ' · BEFORE', note: 'ABSENT from this run' });
    tile.note = 'ABSENT from this run';
    failed = true;
  } else {
    const options = [
      ...at.args,
      '--hud',
      '--warm',
      '1',
      '--frames',
      '2',
      '--seconds',
      '0.1',
      '--name',
      'capture',
      '--question',
      `What is actually visible at the saved beat ${beat}?`,
    ];
    if (before && comparisonProblem) {
      tiles.push({ label: tile.label + ' · BEFORE', note: 'NOT COMPARED: ' + comparisonProblem });
      tile.label += ' · AFTER ONLY';
    }
    const result = capture(
      before && !comparisonProblem ? 'before-after' : 'look',
      before && !comparisonProblem ? [before, ...options] : options,
      label,
    );
    if (before && !comparisonProblem) {
      tiles.push({
        label: tile.label + ' · BEFORE',
        ...(result.status
          ? { note: 'CAPTURE FAILED' }
          : { image: path.join(result.directory, 'capture-before-still.png') }),
      });
      tile.label += ' · AFTER';
    }
    const image = path.join(
      result.directory,
      before && !comparisonProblem ? 'capture-after-still.png' : 'capture-still.png',
    );
    if (!result.status && fs.existsSync(image)) tile.image = image;
    else {
      tile.note = 'CAPTURE FAILED — see ' + label + '/output.txt';
      failed = true;
    }
  }
  tiles.push(tile);
}

if (!values.has('--beats')) {
  const result = capture(
    'look',
    [
      '--query',
      'proto=place',
      '--eval',
      'dev/look/evals/sheet-opening.ts',
      '--action',
      'dev/look/evals/sheet-enter.ts',
      '--hud',
      '--real',
      '--warm',
      '0',
      '--frames',
      '16',
      '--seconds',
      '15',
      '--video',
      '--name',
      'opening',
      '--question',
      'Does the real first visit show trolley, title fall, landing and stand-up on round 4?',
    ],
    'opening',
  );
  strips.push({
    label: 'Opening · real first visit · 16 wall-time samples, left to right',
    ...(result.status
      ? { note: 'Opening capture failed; see opening/output.txt' }
      : { image: path.join(result.directory, 'opening-motion.png') }),
  });
  failed ||= !!result.status;
}
if (flags.has('--moments')) {
  const hookIndex = saves.findIndex(({ save }) => save.beat === 'hook pulled');
  // Skip the same-moment counter alias, never restore a pull already in flight.
  const prior =
    hookIndex < 0
      ? undefined
      : saves
          .slice(0, hookIndex)
          .reverse()
          .find(({ save }) => !['hooks', 'hook pulled'].includes(save.beat));
  const at = prior && checkpoint(prior.save.beat, 'hook-prior');
  if (at) {
    const result = capture(
      'look',
      [
        ...at.args,
        '--action',
        'dev/look/evals/sheet-hook.ts',
        '--hud',
        '--warm',
        '2',
        '--frames',
        '8',
        '--seconds',
        '3',
        '--video',
        '--curves',
        '--name',
        'hook',
        '--question',
        'Does a real hook input from the prior checkpoint visibly pull the player to a ring?',
      ],
      'hook',
    );
    failed ||= !!result.status;
    strips.push({
      label: `Hook · real input from ${prior.save.beat}`,
      ...(result.status
        ? { note: 'OMITTED: ' + failure(result.output) }
        : { image: path.join(result.directory, 'hook-motion.png') }),
    });
  } else strips.push({ label: 'Hook', note: 'OMITTED: no checkpoint before the first hook pull.' });
  for (const [moment, beat, action, seconds] of [
    ['Glide', 'sheet: before glide', 'sheet-glide', 8],
    ['Train departure', 'ride', 'sheet-ride', 14],
  ] as const) {
    const at = checkpoint(beat, action);
    if (!at) {
      strips.push({ label: moment, note: `OMITTED: no ${beat} checkpoint. Run a fresh playthrough.` });
      continue;
    }
    const result = capture(
      'look',
      [
        ...at.args,
        '--action',
        `dev/look/evals/${action}.ts`,
        '--hud',
        '--warm',
        '1',
        '--frames',
        '12',
        '--seconds',
        String(seconds),
        '--video',
        '--curves',
        '--name',
        action,
        '--question',
        `${moment}: does the real input from the prior checkpoint produce the visible action?`,
      ],
      action,
    );
    failed ||= !!result.status;
    strips.push({
      label: `${moment} · real input from ${beat}`,
      ...(result.status
        ? { note: `OMITTED: real input capture failed; see ${action}/output.txt` }
        : { image: path.join(result.directory, action + '-motion.png') }),
    });
  }
  for (const [moment, reason] of [
    ['Path opened reveal', 'Checkpoints snap construction to its settled state; no saved final-input checkpoint.'],
    ['Run end', 'Saves omit the show; no verified final-input checkpoint before the run-end sequence.'],
  ])
    strips.push({ label: moment!, note: 'OMITTED: ' + reason });
}
if (flags.has('--coop')) {
  const result = capture(
    'look',
    [
      '--query',
      'proto=place&coop=1',
      '--players',
      '2',
      '--eval',
      'dev/look/evals/place-coop.ts',
      '--until',
      'window.__placeExplore?.done',
      '--warm',
      '90',
      '--hud',
      '--frames',
      '4',
      '--seconds',
      '2',
      '--name',
      'coop',
      '--question',
      'Can both peers be seen in the existing co-op eval? This is a staged diagnostic, not a natural playthrough.',
    ],
    'coop',
  );
  failed ||= !!result.status;
  strips.push({
    label: 'Co-op · existing staged diagnostic · player 1 samples',
    ...(result.status
      ? { note: 'OMITTED: ' + failure(result.output) }
      : { image: path.join(result.directory, 'coop-motion.png') }),
  });
}
for (const strip of strips) if (strip.note) console.log(strip.label + ': ' + strip.note);
const script = path.join(out, 'compose.ts');
fs.writeFileSync(
  script,
  composition({
    title: 'BOOGLE · ' + name,
    subtitle: `${build.commit.slice(0, 8)}${build.dirty ? ' + working tree' : ''} · ${date} · no visual verdict`,
    notices,
    columns: before ? 2 : requested.length <= 2 ? 1 : 3,
    tiles,
    strips,
  }),
);
const composed = capture(
  'look',
  [
    '--query',
    'proto=place',
    '--eval',
    script,
    '--warm',
    '0',
    '--frames',
    '2',
    '--seconds',
    '0.1',
    '--name',
    'composition',
  ],
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
      run,
      runBuild: runEvidence?.before ?? null,
      seconds,
      timings,
      manifests,
      uncovered,
      notices,
      tiles,
      strips,
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
