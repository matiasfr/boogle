// Refresh from any number of complete shard logs. Example:
// node dev/ci/unit-weights.ts --scale=1.5 .look/evidence/my-run/shard*.log
import '../node-version.ts';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const scaleArg = args.find((a) => a.startsWith('--scale='));
const scale = scaleArg ? Number(scaleArg.split('=')[1]) : 1;
const logs = args.filter((a) => !a.startsWith('--scale='));
if (!logs.length || !Number.isFinite(scale) || scale <= 0)
  throw new Error('usage: node dev/ci/unit-weights.ts [--scale=1.5] <shard.log>...');
const target = new URL('./unit-weights.json', import.meta.url);
const weights = JSON.parse(fs.readFileSync(target, 'utf8')) as Record<string, number>;
const discovered = new Set(fs.globSync('test/**/*.test.ts'));
const measured = new Map<string, number>();
for (const log of logs) {
  const text = fs.readFileSync(log, 'utf8');
  const records = [...text.matchAll(/unit timing (\{[^\n]+\})/g)].map(
    (m) => JSON.parse(m[1]!) as { file: string; seconds: number; passed: boolean },
  );
  if (records.some((r) => !r.passed)) throw new Error(`${log}: refusing timings from a failed file`);
  if (!records.length && /ℹ fail [1-9]/.test(text)) throw new Error(`${log}: refusing a failed legacy run`);
  const times = records.length
    ? records.map((r) => [r.file, r.seconds] as const)
    : [...text.matchAll(/unit file (test\/[^ :]+): ([\d.]+)s/g)].map((m) => [m[1]!, Number(m[2])] as const);
  for (const [file, seconds] of times) {
    if (!discovered.has(file)) continue;
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error(`${log}: invalid duration for ${file}`);
    const key = file.slice(5, -8);
    measured.set(key, Math.max(measured.get(key) ?? 0, seconds));
  }
}
if (!measured.size) throw new Error('no completed discovered test files found in logs');
for (const key of Object.keys(weights)) if (!discovered.has(`test/${key}.test.ts`)) delete weights[key];
for (const [key, seconds] of measured) weights[key] = Math.max(1, Math.ceil(seconds * scale));
fs.writeFileSync(target, JSON.stringify(Object.fromEntries(Object.entries(weights).sort()), null, 2) + '\n');
console.log(`refreshed ${measured.size} measured weights (${scale}x) in ${fileURLToPath(target)}; re-run all shards`);
