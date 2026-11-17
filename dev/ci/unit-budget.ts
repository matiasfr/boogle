// Preload supervisor: the test runs in its own process group, so a synchronous loop cannot block the deadline
// and killing the group also terminates helpers the file spawned. Each file still uses Node's isolated test IPC.
import { spawn, spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';

if (
  process.env.NODE_TEST_CONTEXT === 'child-v8' &&
  !process.execArgv.includes('--test') &&
  process.env.UNIT_BUDGET_OWNER !== String(process.ppid)
) {
  const milliseconds = Number(process.env.UNIT_FILE_TIMEOUT_MS ?? 480_000);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) throw new Error('invalid UNIT_FILE_TIMEOUT_MS');
  const file = process.argv[1]!;
  const child = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    detached: process.platform !== 'win32',
    stdio: 'inherit',
    env: { ...process.env, UNIT_BUDGET_OWNER: String(process.pid) },
  });
  function terminate() {
    if (!child.pid) return;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      }
    }
  }
  process.once('exit', terminate);
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      terminate();
      process.exit(1);
    });
  const timer = setTimeout(() => {
    writeSync(2, `\n::error file=${file}::Unit file ${file} exceeded its ${milliseconds / 1000}s whole-file budget\n`);
    terminate();
  }, milliseconds);
  try {
    const code = await new Promise<number>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) => resolve(code ?? 1));
    });
    process.exitCode = code;
  } finally {
    clearTimeout(timer);
    terminate();
  }
  // Do not evaluate the test again in this supervising process after its child has sent Node's test events.
  process.exit(process.exitCode ?? 1);
}
