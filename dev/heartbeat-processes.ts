// Windows half of `npm run heartbeat`'s bottleneck section: Git Bash has no `ps -A`, `pgrep` or `lsof`, so this reads
// processes through PowerShell, samples each matching process tree's CPU over two seconds and prints the same lines
// dev/heartbeat.sh prints on macOS. `node dev/heartbeat-processes.ts load` prints the load line instead.
import { execFileSync } from 'node:child_process';

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
  const cpu = powershell('(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average').trim();
  console.log(`load: CPU ${cpu}% busy (Windows has no load average)`);
  process.exit(0);
}

function snapshot(): Proc[] {
  const json = powershell(
    "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,@{n='Start';e={if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') }}},CommandLine,KernelModeTime,UserModeTime | ConvertTo-Json -Compress",
  );
  return JSON.parse(json) as Proc[];
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
for (const p of second) children.set(p.ParentProcessId, [...(children.get(p.ParentProcessId) ?? []), p.ProcessId]);
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
