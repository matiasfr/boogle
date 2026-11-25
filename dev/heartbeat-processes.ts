// Windows half of `npm run heartbeat`'s bottleneck section: Git Bash has no `ps -A`, `pgrep` or `lsof`, so this reads
// processes through PowerShell, samples each matching process tree's CPU over two seconds and prints the same lines
// dev/heartbeat.sh prints on macOS. `node dev/heartbeat-processes.ts load` prints the load line instead.
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { maxLoad } from './look/bot-queue.ts';
import { loadLimit, machineLoad } from './look/machine-load.ts';
import { PERF_POLICY } from './daily/perf.ts';

interface Proc {
  ProcessId: number;
  ParentProcessId: number;
  Start: string | null;
  CommandLine: string | null;
  KernelModeTime: number;
  UserModeTime: number;
}

const powershell = (script: string) =>
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

if (process.argv[2] === 'load') {
  // The tooling's own reading (dev/look/machine-load.ts) and the limits the bot gate and the bench's quiet check use.
  const gate = maxLoad();
  console.log(
    `load: ${machineLoad().toFixed(1)} of ${os.cpus().length} logical CPUs busy (Windows has no load average); bot gate ${gate ? `holds above ${gate.toFixed(1)}` : 'off'}, bench quiet at most ${loadLimit(PERF_POLICY.quiet.maxLoad).toFixed(1)}`,
  );
  process.exit(0);
}

function snapshot(): Proc[] {
  const json = powershell(
    "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,@{n='Start';e={if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') }}},CommandLine,KernelModeTime,UserModeTime | ConvertTo-Json -Compress",
  );
  // Windows PowerShell's ConvertTo-Json can leave control characters raw inside a command line, which JSON.parse
  // refuses (25 November: the whole bottleneck section failed). A space is harmless between tokens and inside a string.
  // eslint-disable-next-line no-control-regex
  return JSON.parse(json.replace(/[\u0000-\u001f]/g, ' ')) as Proc[];
}

// The same jobs dev/heartbeat.sh greps for, allowing node.exe, quoted paths and backslashes.
const wanted =
  /node(?:\.exe)?"? (?:.* )?--test |dev[\\/](?:migrate[\\/]rail-mutants|level[\\/]check|loop[\\/]cli|look[\\/])|playwright|npm(?:-cli\.js"?)? run (?:check|test)/;
const ignored = /--test-concurre|shell-snapshots|heartbeat-processes/;
const stallSecs = Number(process.env.HEARTBEAT_STALL_SECS ?? 900);

const first = snapshot();
const now = Date.now();
const long = first.filter((p) => {
  const cmd = p.CommandLine ?? '';
  if (!wanted.test(cmd) || ignored.test(cmd) || !p.Start) return false;
  return (now - Date.parse(p.Start)) / 1000 >= stallSecs;
});
// A job's own runner (npm, then node) also matches; report only the outermost matching process of each tree.
const longIds = new Set(long.map((p) => p.ProcessId));
const roots = long.filter((p) => !longIds.has(p.ParentProcessId));
if (!roots.length) {
  console.log('none over 15 minutes');
  process.exit(0);
}

const start = performance.now();
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
const second = snapshot();
const wall = (performance.now() - start) / 1000;

const children = new Map<number, number[]>();
for (const proc of second) {
  const siblings = children.get(proc.ParentProcessId);
  if (siblings) siblings.push(proc.ProcessId);
  else children.set(proc.ParentProcessId, [proc.ProcessId]);
}
const cpuTime = (list: Proc[]) => new Map(list.map((p) => [p.ProcessId, (p.KernelModeTime + p.UserModeTime) / 1e7]));
const before = cpuTime(first);
const after = cpuTime(second);

for (const root of roots) {
  const tree = [root.ProcessId];
  for (let i = 0; i < tree.length; i++) for (const kid of children.get(tree[i]!) ?? []) tree.push(kid);
  let used = 0;
  // A process that started between the samples counts all its CPU time.
  for (const pid of tree) used += Math.max(0, (after.get(pid) ?? 0) - (before.get(pid) ?? 0));
  const cpu = (used / wall) * 100;
  const minutes = Math.round((now - Date.parse(root.Start!)) / 60000);
  const cmd = (root.CommandLine ?? '').replace(/^.*?node(?:\.exe)?"? /, 'node ').slice(0, 90);
  console.log(
    `${cpu < 1 ? 'STALLED' : 'running'}: pid ${root.ProcessId}, ${minutes} min, ${cpu.toFixed(1)}% CPU with its children: ${cmd}`,
  );
}
