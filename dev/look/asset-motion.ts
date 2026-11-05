// One entry into the existing stage/look/broker/video path; no browser implementation here.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import type { MotionReport, MotionImage } from '../../character/motion.ts';
import { buildAt, sameBuild } from '../codex/source.ts';
import { descriptors, gearAttachments } from '../../character/descriptors.ts';

const args = process.argv.slice(2);
const options = new Map<string, string>();
let local = false,
  dry = false;
for (let i = 0; i < args.length; i++) {
  const flag = args[i]!;
  if (flag === '--local') local = true;
  else if (flag === '--broker') local = false;
  else if (flag === '--dry-run') dry = true;
  else if (flag === '--help') {
    console.log(
      'node dev/look/asset-motion.ts --asset buddy --clip Walk_Loop [--hat conductor] [--mode raw|played] [--pose carrying] [--gear all] [--attachment ring-left|ring-right|spool|glider|frame] [--cargo logs|rails|stone|beam|boiler --amount N] [--rings 0|1 --spool 0|1 --glider 0|1 --frame 0|1 --canopy 0|1] [--name label] [--cam x,y,z --target x,y,z] [--spin-rate rad/s] [--local|--broker] [--dry-run]\nUses the running broker by default when available; --local uses the same look harness. Static assets explicitly report none. --spin-rate is a labelled inspection probe, never a production rate.',
    );
    process.exit(0);
  } else if (
    [
      '--asset',
      '--clip',
      '--hat',
      '--mode',
      '--pose',
      '--name',
      '--cam',
      '--target',
      '--spin-rate',
      '--gear',
      '--attachment',
      '--cargo',
      '--amount',
      '--rings',
      '--spool',
      '--glider',
      '--frame',
      '--canopy',
    ].includes(flag)
  ) {
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(flag + ' needs a value');
    options.set(flag.slice(2), value);
  } else throw new Error('Unknown argument ' + flag);
}
const name = options.get('name') ?? 'asset-motion';
if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Use a simple name');
const requestedAsset = options.get('asset') ?? 'buddy';
if (options.has('attachment') && !gearAttachments[options.get('attachment')!])
  throw new Error('Unknown attachment; choose ' + Object.keys(gearAttachments).join(', '));
const attachment = descriptors[requestedAsset]?.motion;
const asset = attachment?.kind === 'attachment' ? attachment.asset : requestedAsset;
if (attachment?.kind === 'attachment') options.set('hat', attachment.node.replace(/^wear_head_/, ''));
const query = new URLSearchParams({
  asset,
  t: '0',
  play: '0',
  reference: '0',
  bounds: '0',
  grid: '0',
  spin: '0',
  light: 'studio',
  mode: options.get('mode') ?? 'raw',
});
// Let the stage frame arbitrary catalogue geometry; these two small subjects have repeatable close views.
if (asset === 'buddy' || asset === 'feeder-roller') {
  query.set('cam', asset === 'feeder-roller' ? '1,0.55,1.4' : '3,2,5');
  query.set('target', asset === 'feeder-roller' ? '0,0.075,0' : '0,0.9,0');
}
for (const key of [
  'clip',
  'hat',
  'mode',
  'pose',
  'cam',
  'target',
  'gear',
  'attachment',
  'cargo',
  'amount',
  'rings',
  'spool',
  'glider',
  'frame',
  'canopy',
])
  if (options.has(key)) query.set(key, options.get(key)!);
if (options.has('spin-rate')) {
  const rate = Number(options.get('spin-rate'));
  if (!Number.isFinite(rate) || rate === 0 || Math.abs(rate) > 20)
    throw new Error('Diagnostic spin rate must be nonzero and at most 20 rad/s');
  query.set('probeRate', String(rate));
}
const broker = !local && fs.existsSync('.look/see/ready.json');
if (args.includes('--broker') && !broker)
  throw new Error('Requested broker is unavailable; start through dev/codex/run.ts');
const localOut = path.resolve('.look/asset-motion', `${Date.now()}-${name}`);
const command = [
  broker ? '.look/see-client.ts' : 'dev/look/look.ts',
  ...(broker ? ['look'] : []),
  '--real',
  '--eval',
  'dev/look/evals/asset-stage.ts',
  '--action',
  'dev/look/evals/asset-motion.ts',
  '--query',
  new URLSearchParams({ stage: query.toString() }).toString(),
  '--video',
  '--warm',
  '0',
  '--frames',
  '2',
  '--seconds',
  '0.2',
  '--size',
  '960x720',
  '--name',
  name,
  '--question',
  'Does the declared asset motion keep its attachment, surface clearance, clip continuity and axle stable?',
  ...(!broker ? ['--out', localOut] : []),
];
if (dry) {
  console.log(
    JSON.stringify({ route: broker ? 'broker' : 'local look', command: [process.execPath, ...command] }, null, 2),
  );
  process.exit(0);
}
const before = buildAt(process.cwd());
console.log(
  `Reviewing ${asset}: ${broker ? 'existing broker' : 'local look harness'}; stage-owned curves and completed-frame images.`,
);
// Both older harnesses exit explicitly. A file descriptor avoids losing queued pipe writes on process.exit.
fs.mkdirSync(localOut, { recursive: true });
const logPath = path.join(localOut, 'output.txt'),
  log = fs.openSync(logPath, 'w'),
  launched = Date.now();
let childResult: { status: number; pid: number | undefined };
try {
  childResult = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, command, { stdio: ['ignore', log, log] });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status: status ?? 1, pid: child.pid }));
  });
} finally {
  fs.closeSync(log);
}
const result = { status: childResult.status, output: fs.readFileSync(logPath, 'utf8') };
if (broker) {
  const replies = fs
    .readdirSync('.look/see')
    .filter((file) => file.endsWith(`-${childResult.pid}.done.json`) && Number(file.split('-')[0]) >= launched);
  if (replies.length !== 1) throw new Error('Missing or ambiguous broker reply for this client process');
  const answer = JSON.parse(fs.readFileSync(path.join('.look/see', replies[0]!), 'utf8')) as {
    status: number;
    output: string;
    evidence?: string;
  };
  result.status = answer.status;
  result.output = answer.output + (answer.evidence ? `\nEvidence: ${answer.evidence}\n` : '');
}
const manifest = result.output.match(/Evidence: (.+)/)?.[1]?.trim();
const out = manifest ? path.dirname(manifest) : localOut;
fs.mkdirSync(out, { recursive: true });
if (!broker) fs.writeFileSync(path.join(out, 'output.txt'), result.output);
if (result.status !== 0) {
  console.error(result.output.replace(/^STAGE (?:MOTION|CHUNK) .*$/gm, 'STAGE DATA [retained in output.txt]'));
  throw new Error(`Look failed (${result.status}); evidence ${manifest ?? out}`);
}
const none = result.output.match(/^STAGE NONE (.+)$/m)?.[1];
if (none) {
  fs.writeFileSync(path.join(out, `${name}-none.json`), none + '\n');
  console.log(`Declared motion: none. ${none}\nEvidence: ${manifest ?? out}`);
  process.exit(0);
}
const header = result.output.match(/^STAGE DATA (.+)$/m)?.[1];
if (!header) throw new Error('No stage-owned measurements in look output');
const { length, count } = JSON.parse(header) as { length: number; count: number };
const chunks = [...result.output.matchAll(/^STAGE CHUNK (\d+) (.*)$/gm)];
if (
  chunks.length !== count ||
  chunks.some((chunk, i) => Number(chunk[1]) !== i) ||
  !result.output.includes(`STAGE END ${count}\n`)
)
  throw new Error('Incomplete stage data chunks');
const payload = chunks.map((chunk) => chunk[2]!).join('');
if (payload.length !== length) throw new Error('Stage data was truncated in console transport');
let report: MotionReport;
try {
  report = JSON.parse(payload) as MotionReport;
} catch {
  throw new Error('Invalid stage JSON; full chunks retained in output.txt');
}
if (
  report.source !== 'assetStage' ||
  !report.complete ||
  report.rows.length < 12 ||
  report.consecutive.length !== 12 ||
  report.cycle.length < 10
)
  throw new Error('Incomplete stage motion evidence');
if (
  report.declaration.kind === 'attachment' &&
  report.rows.some(
    (row) =>
      row.attachmentOffset === null ||
      row.attachmentRotation === null ||
      row.clearance === null ||
      row.signedClearance === null,
  )
)
  throw new Error('Declared attachment or posed body surface was missing from stage measurements');
if (report.consecutive.some((im, i, list) => i > 0 && im.frame !== list[i - 1]!.frame + 1))
  throw new Error('Canvas frames are not consecutive completed stage renders');
if (report.rows.some((row) => Object.values(row).some((value) => typeof value === 'number' && !Number.isFinite(value))))
  throw new Error('Nonfinite stage measurement');
function ffmpeg(argv: string[]) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8' });
  if (run.error || run.status !== 0) throw new Error(run.error?.message ?? run.stderr);
}
function sheet(kind: string, images: MotionImage[]) {
  const dir = path.join(out, `${name}-${kind}-frames`);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < images.length; i++)
    fs.writeFileSync(
      path.join(dir, `${String(i).padStart(3, '0')}.png`),
      Buffer.from(images[i]!.png.split(',')[1]!, 'base64'),
    );
  ffmpeg([
    '-framerate',
    '1',
    '-i',
    path.join(dir, '%03d.png'),
    '-vf',
    `tile=4x${Math.ceil(images.length / 4)}`,
    '-frames:v',
    '1',
    path.join(out, `${name}-${kind}.png`),
  ]);
  return images.map(({ frame, wall, time }) => ({ frame, wall, time }));
}
const consecutive = sheet('consecutive', report.consecutive),
  cycle = sheet('cycle', report.cycle);
const video = path.join(out, `${name}-realtime.webm`);
ffmpeg([
  '-i',
  video,
  '-vf',
  "select='between(n,2,13)',scale=480:-1,tile=4x3",
  '-frames:v',
  '1',
  path.join(out, `${name}-video-consecutive.png`),
]);
const curves = path.join(out, `${name}-curves.json`);
fs.writeFileSync(curves, JSON.stringify({ ...report, consecutive, cycle }, null, 2) + '\n');
const columns = [
  'frame',
  'wall',
  'time',
  'dt',
  'cycle',
  'boneJump',
  'rootJump',
  'attachmentDrift',
  'attachmentAngle',
  'clearance',
  'signedClearance',
  'angularRate',
  'expectedRate',
  'pivotDrift',
  'centroidOrbit',
  'axisDrift',
  'sampleMs',
  'imageMs',
] as const;
fs.writeFileSync(
  path.join(out, `${name}-curves.csv`),
  [columns.join(','), ...report.rows.map((row) => columns.map((key) => row[key] ?? '').join(','))].join('\n') + '\n',
);
fs.writeFileSync(
  path.join(out, `${name}-outliers.json`),
  JSON.stringify({ endpointSeam: report.endpointSeam, outliers: report.outliers, limits: report.limits }, null, 2) +
    '\n',
);
const after = buildAt(process.cwd());
if (!sameBuild(before, after)) throw new Error('Source changed during capture; repeat it');
fs.writeFileSync(
  path.join(out, `${name}-motion-manifest.json`),
  JSON.stringify(
    {
      before,
      after,
      brokerManifest: manifest ?? null,
      query: query.toString(),
      requestedAsset,
      curves,
      frameContinuity: '12 successive completed stage renders',
      videoFrames: 'Encoded frames 2–13; encoder duplicates/drops possible, not asserted as consecutive stage renders',
      artifacts: fs.readdirSync(out),
      verdict: 'requires agent inspection; never automatically approved',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Stage frames: ${report.rows.length}; outliers: ${report.outliers.length}\nConsecutive: ${path.join(out, name + '-consecutive.png')}\nFull cycle: ${path.join(out, name + '-cycle.png')}\nCurves: ${curves}\nVideo: ${video}\nEvidence: ${manifest ?? path.join(out, name + '-motion-manifest.json')}`,
);
