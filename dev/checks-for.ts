// Offline diff -> inspectable check plan. --run executes exactly the printed commands, stopping on the first failure.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const value = (flag: string) => {
  const i = args.indexOf(flag);
  if (i < 0) return undefined;
  if (!args[i + 1] || args[i + 1]!.startsWith('--')) throw new Error(`${flag} needs a value`);
  return args[i + 1]!;
};
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const sample = value('--files');
const files = [
  ...new Set(
    sample
      ? sample.split(',')
      : [
          ...git('diff', '--name-only', `${value('--base') ?? 'origin/main'}...HEAD`),
          ...git('diff', '--name-only', 'HEAD'),
          ...git('ls-files', '--others', '--exclude-standard'),
        ],
  ),
];
type Check = { reason: string; command: string[] };
const checks: Check[] = [];
const add = (reason: string, ...command: string[]) => {
  if (!checks.some((c) => JSON.stringify(c.command) === JSON.stringify(command))) checks.push({ reason, command });
};
const broker = fs.existsSync('.look/see-client.ts');
const browser = (reason: string, operation: string, ...options: string[]) => {
  const entry =
    operation === 'look'
      ? 'dev/look/look.ts'
      : operation === 'playthrough'
        ? 'dev/look/playthrough.ts'
        : 'dev/scenarios/run.ts';
  add(reason, 'node', ...(broker ? ['.look/see-client.ts', operation] : [entry]), ...options);
};
const matches = (re: RegExp) => files.some((f) => re.test(f));
const shared = matches(/^(src\/(sim|world|net[^/]*)\/|server\/)/);
const terrain = matches(/(terrain|heightfield|heightmap|landscape|island|place\/layout|place\/tech-layout)/);
const audio = matches(/(audio|sound|music|sfx)/i);
const render = matches(/^(src\/(render|materials|shaders|lighting)\/|assets\/)|\.(glsl|wgsl)$/);
const harness = matches(/^dev\/(look|scenarios|codex)\//);
const gameplay = matches(/^src\//);
if (files.length) add('Static validation', 'npm', 'run', 'check');
if (matches(/^(src\/net[^/]*\/|src\/world\/(sync|game-world)\.ts$|server\/)/)) {
  add('Room/network changes', 'npm', '--prefix', 'server', 'test');
  add('Room/network changes', 'npm', 'run', 'test:net');
}
if (shared) {
  browser(
    'Shared simulation or server: two peers through T2',
    'playthrough',
    '--players',
    '2',
    '--from',
    'at-cove',
    '--to',
    'T2',
  );
  browser('Shared world inputs', 'scenario', 'world-inputs');
}
if (render) {
  browser('Render: inspect a restored still', 'look', '--at', 'at-cove', '--saves', '.look/checkpoints/solo', '--hud');
  browser('Render: short played segment', 'playthrough', '--from', 'at-cove', '--to', 'wake');
}
if (terrain)
  browser('Terrain: cove approach, harvest and first track', 'playthrough', '--from', 'at-cove', '--to', 't1-done');
if (audio)
  browser(
    'Audio: walk, jump and dry landing repeated three times',
    'playthrough',
    '--from',
    'at-cove',
    '--to',
    'audio-loop',
  );
if (harness || (gameplay && !shared && !terrain && !audio && !render))
  browser('Gameplay/tool harness: short route', 'playthrough', '--from', 'at-cove', '--to', 't1-done');
const plan = { base: value('--base') ?? 'origin/main (local ref; no fetch)', files, checks };
const quote = (s: string) => (/^[\w./:@=-]+$/.test(s) ? s : `'${s.replaceAll("'", "'\\''")}'`);
if (args.includes('--json')) console.log(JSON.stringify(plan, null, 2));
else {
  console.log(`Checks for ${files.length} changed files (including working edits):`);
  for (const c of checks) console.log(`  ${c.command.map(quote).join(' ')}\n    ${c.reason}`);
  if (checks.some((c) => c.command.includes('--from') || c.command.includes('--saves')))
    console.log('Fixtures missing or world changed? Regenerate: npm run checkpoints (add -- --players 2 for co-op).');
  if (sample) console.log('Sample file list; no claim about the actual checkout diff.');
}
if (args.includes('--run')) {
  if (sample) throw new Error('--files is for planning examples only; omit it to run the real diff plan');
  for (const { command } of checks) {
    console.log(`RUN ${command.map(quote).join(' ')}`);
    const child = spawnSync(command[0]!, command.slice(1), { cwd: path.resolve('.'), stdio: 'inherit' });
    if (child.error) throw child.error;
    if (child.status !== 0) process.exit(child.status ?? 1);
  }
}
