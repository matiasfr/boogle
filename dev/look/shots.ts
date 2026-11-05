// A queue frontend over the existing trusted look action transport. Never launches a second browser implementation.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildAt, sameBuild } from '../codex/source.ts';
import { installWarp } from './warp.ts';
import { captureShots } from './shot-page.ts';
import { paintNative } from './sheet-render.ts';
import { SHOT_LIMIT, type ShotList, type ShotGroup } from './shot-types.ts';

const args = process.argv.slice(2);
const file = args.shift();
if (!file || file === '--help') {
  console.log(
    'node dev/look/shots.ts <list.json|list.ts> [--name name] [--baseline]\nUses .look/see-client.ts when a broker exists; otherwise the local look harness. JSON or TS default export. --baseline repeats the same list with one old look lifecycle per cell.',
  );
  process.exit(0);
}
let name = new Date().toISOString().replace(/[^0-9]/g, ''),
  baseline = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name') name = args[++i]!;
  else if (args[i] === '--baseline') baseline = true;
  else throw new Error('Unknown argument: ' + args[i]);
}
if (!name || !/^[\w-]+$/.test(name)) throw new Error('Use a simple --name');
const list = (
  file.endsWith('.json')
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : (await import(pathToFileURL(path.resolve(file)).href)).default
) as ShotList;
if (!list.question || !list.beats?.length) throw new Error('List needs question and beats');
const out = path.resolve('.look/shots', name);
fs.mkdirSync(out, { recursive: true });
if (fs.existsSync(path.join(out, 'manifest.json'))) throw new Error('Choose a new output name');
const broker = fs.existsSync('.look/see/ready.json');
const build = buildAt(process.cwd());
const started = Date.now();
const groups = new Map<string, ShotGroup>();
for (const [bi, beat] of list.beats.entries()) {
  if (!beat.name || !beat.cameras.length || !beat.variants.length)
    throw new Error('Beat needs name, cameras and variants');
  for (const pose of beat.cameras) {
    if (
      !pose.name ||
      pose.cam.length !== 3 ||
      pose.look.length !== 3 ||
      [...pose.cam, ...pose.look, pose.fov ?? 62].some((n) => !Number.isFinite(n))
    )
      throw new Error('Invalid camera');
  }
  for (const variant of beat.variants) {
    if (!variant.name) throw new Error('Variant needs a name');
    for (const value of Object.values(variant.values ?? {})) {
      if (!(Array.isArray(value) ? value : [value]).every((n) => typeof n === 'number' && Number.isFinite(n)))
        throw new Error('Live values must be finite numbers');
    }
    const query = new URLSearchParams(beat.query ?? 'proto=place&water=new&dev=1');
    for (const [key, value] of new URLSearchParams(variant.query)) query.set(key, value);
    if (variant.graphics?.msaa !== undefined) query.set('graphicsMsaa', variant.graphics.msaa ? '1' : '0');
    query.sort();
    const size = variant.size ?? list.size ?? [640, 400];
    if (size.length !== 2 || size.some((n) => !Number.isInteger(n) || n < 64 || n > 4096))
      throw new Error('Invalid size');
    // Resolution is live in this build, but gets its own native-pixel board and resource warm-up group.
    const key = JSON.stringify([bi, query.toString(), size, variant.graphics?.resolution ?? 'auto']);
    const group = groups.get(key) ?? { ...beat, query: query.toString(), size, variants: [] };
    group.variants.push(variant);
    groups.set(key, group);
  }
}
const runs: { label: string; seconds: number; status: number; evidence?: string; directory: string }[] = [];
function run(options: string[], label: string) {
  const directory = path.join(out, label);
  fs.mkdirSync(directory, { recursive: true });
  const logFile = path.join(directory, 'output.txt');
  const fd = fs.openSync(logFile, 'w');
  const begin = Date.now();
  let result: ReturnType<typeof spawnSync>;
  try {
    if (broker || label.startsWith('baseline-')) {
      result = spawnSync(
        process.execPath,
        broker ? ['.look/see-client.ts', 'look', ...options] : ['dev/look/look.ts', ...options, '--out', directory],
        { stdio: ['ignore', fd, fd] },
      );
    } else {
      // Session owns the local persistent browser and warp. No duplicate browser lifecycle here.
      const startArgs = options.filter((value, i) =>
        i % 2 === 0
          ? ['--query', '--size', '--warm', '--eval', '--at', '--saves'].includes(value)
          : ['--query', '--size', '--warm', '--eval', '--at', '--saves'].includes(options[i - 1]!),
      );
      const started = spawnSync(process.execPath, ['dev/look/session.ts', 'start', ...startArgs], {
        stdio: ['ignore', fd, fd],
      });
      if (started.status) result = started;
      else
        try {
          result = spawnSync(
            process.execPath,
            ['dev/look/session.ts', 'capture', options[options.indexOf('--action') + 1]!],
            { stdio: ['ignore', fd, fd] },
          );
        } finally {
          spawnSync(process.execPath, ['dev/look/session.ts', 'stop'], { stdio: ['ignore', fd, fd] });
        }
    }
  } finally {
    fs.closeSync(fd);
  }
  const output = fs.readFileSync(logFile, 'utf8');
  const evidence = output.match(/^Evidence: (.+)$/m)?.[1];
  const record = { label, seconds: (Date.now() - begin) / 1000, status: result.status ?? 1, evidence, directory };
  runs.push(record);
  console.log(`${label}: ${record.seconds.toFixed(2)} s, status ${record.status}`);
  // Same chunked lossless transport as sheet.ts. Reject truncation and unsafe filenames.
  for (const block of output.matchAll(/^SHOTS BEGIN ([\w.-]+) (\d+)\n([\s\S]*?)^SHOTS END/gm)) {
    const data = [...block[3]!.matchAll(/^SHOTS DATA (.*)$/gm)].map((m) => m[1]).join('');
    if (data.length !== Number(block[2])) throw new Error('Truncated capture: ' + block[1]);
    fs.writeFileSync(path.join(directory, block[1]!), block[1]!.endsWith('.png') ? Buffer.from(data, 'base64') : data);
    if (evidence) {
      const supplemental = path.join(path.dirname(evidence), 'shots');
      fs.mkdirSync(supplemental, { recursive: true });
      fs.copyFileSync(path.join(directory, block[1]!), path.join(supplemental, block[1]!));
    }
  }
  if (record.status) throw new Error(`Capture failed: ${logFile}`);
  return record;
}
function options(group: ShotGroup, action: string) {
  return [
    '--query',
    group.query,
    '--size',
    group.size.join('x'),
    '--warm',
    String(group.warm ?? 2),
    '--frames',
    '2',
    '--seconds',
    '0.1',
    '--question',
    list.question,
    '--action',
    action,
    ...(group.setup ? ['--eval', group.setup] : []),
    ...(group.at ? ['--at', group.at] : []),
    ...(group.saves ? ['--saves', group.saves] : []),
  ];
}
function action(group: ShotGroup, label: string) {
  const file = path.join(out, label + '.ts');
  fs.writeFileSync(
    file,
    `if (!window.__warp) (${installWarp.toString()})();\nawait (${captureShots.toString()})(${JSON.stringify(group)}, ${paintNative.toString()});\nexport {};\n`,
  );
  return file;
}
let failure: string | undefined;
try {
  for (const [index, group] of [...groups.values()].entries()) {
    const label = `group-${index}`;
    console.log(
      `${label}: one load, ${group.cameras.length * group.variants.length} cells; route/MSAA/size/resolution grouped: ${group.query} ${group.size}`,
    );
    run(options(group, action(group, label)), label);
    if (baseline)
      for (const [ci, pose] of group.cameras.entries())
        for (const [vi, variant] of group.variants.entries()) {
          const single = { ...group, cameras: [pose], variants: [variant] };
          const id = `baseline-${index}-${ci}-${vi}`;
          run(options(single, action(single, id)), id);
        }
  }
} catch (error) {
  failure = String(error);
  process.exitCode = 1;
}
const after = buildAt(process.cwd());
if (!sameBuild(build, after)) {
  failure = 'Source changed during capture';
  process.exitCode = 1;
}
const manifest = {
  version: 1,
  question: list.question,
  limit: SHOT_LIMIT,
  build,
  after,
  status: failure ? 'failed' : 'captured; inspect boards',
  failure,
  list,
  groups: [...groups.values()],
  runs,
  totalSeconds: (Date.now() - started) / 1000,
  gpuContext: 'Shared Mac GPU; concurrent Codex graphics jobs may be active. Capture throughput, not GPU performance.',
  machine: {
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
    memoryGiB: os.totalmem() / 2 ** 30,
    frontendNode: process.version,
  },
  baselineMeaning:
    'One original look lifecycle per cell with the same frozen capture/readback probes and board composition; includes browser, loading and warm-up. Per-shot timings in group manifests exclude warm-up, probes and boards.',
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
for (const run of runs)
  if (run.evidence)
    fs.writeFileSync(path.join(path.dirname(run.evidence), 'shot-list.json'), JSON.stringify(manifest, null, 2));
console.log(`Manifest: ${path.join(out, 'manifest.json')}`);
if (failure) console.error(failure);
