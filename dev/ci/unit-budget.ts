// A separate thread can enforce a whole-file deadline even during synchronous module-scope seed construction.
// Node's --test-timeout covers tests, not FileTest wrappers (which explicitly set their timeout to null).
import { writeSync } from 'node:fs';
import { Worker, isMainThread, workerData } from 'node:worker_threads';

if (isMainThread) {
  // --import also runs in Node's supervising process. Only arm a watchdog in an isolated test-file process.
  if (process.env.NODE_TEST_CONTEXT === 'child-v8') {
    const milliseconds = Number(process.env.UNIT_FILE_TIMEOUT_MS ?? 480_000);
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) throw new Error('invalid UNIT_FILE_TIMEOUT_MS');
    const watchdog = new Worker(new URL('./unit-budget.ts', import.meta.url), {
      execArgv: [],
      workerData: { file: process.argv[1], milliseconds },
    });
    // A completed file must still exit normally, including reporting leaked handles rather than hiding them.
    watchdog.unref();
  }
} else {
  const { file, milliseconds } = workerData as { file: string; milliseconds: number };
  setTimeout(() => {
    writeSync(2, `\n::error file=${file}::Unit file ${file} exceeded its ${milliseconds / 1000}s whole-file budget\n`);
    process.kill(process.pid, 'SIGKILL');
  }, milliseconds);
}
