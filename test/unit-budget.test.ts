// Owner-requested regression: a file deadline must reap its helpers, even when the file blocks synchronously.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const outside = { ...process.env };
delete outside.NODE_TEST_CONTEXT;
delete outside.NODE_TEST_WORKER_ID;

for (const mode of ['--ci', '--ship']) {
  test(
    `whole-file budget kills descendants and continues to a healthy file (${mode})`,
    { timeout: 20_000 },
    async () => {
      const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-budget-'));
      const pidFile = path.join(scratch, 'child.pid');
      let descendant: number | undefined;
      try {
        const result = spawnSync(
          process.execPath,
          [fileURLToPath(new URL('../dev/test-unit.ts', import.meta.url)), mode, '--test-concurrency=1'],
          {
            env: {
              ...outside,
              UNIT_ONLY: 'test/fixtures/unit-budget/tree.ts test/fixtures/unit-budget/z-healthy.ts',
              UNIT_FILE_TIMEOUT_MS: '700',
              UNIT_PROBE_PID: pidFile,
            },
            encoding: 'utf8',
            timeout: 10_000,
            maxBuffer: 1024 * 1024,
          },
        );
        descendant = Number(fs.readFileSync(pidFile, 'utf8'));
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stdout + result.stderr, /tree\.ts.*exceeded its 0\.7s whole-file budget/);
        assert.match(result.stdout, /healthy after killed file/);
        assert.match(result.stdout, /unit timing .*"file":"test\/fixtures\/unit-budget\/z-healthy\.ts".*"passed":true/);
        assert.ok(
          result.stdout.indexOf('unit file test/fixtures/unit-budget/tree.ts:') <
            result.stdout.indexOf('unit file start test/fixtures/unit-budget/z-healthy.ts'),
          'the healthy file executes after the killed file',
        );
        for (let i = 0; i < 100; i++) {
          try {
            process.kill(descendant, 0);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
            throw error;
          }
          await delay(20);
        }
        assert.fail(`descendant ${descendant} survived the file deadline`);
      } finally {
        if (descendant) {
          try {
            process.kill(descendant, 'SIGKILL');
          } catch {
            /* already gone */
          }
        }
        fs.rmSync(scratch, { recursive: true, force: true });
      }
    },
  );
}

test('whole-file budget interrupts a synchronous loop and an open interval', { timeout: 20_000 }, () => {
  for (const file of ['loop', 'interval']) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('../dev/test-unit.ts', import.meta.url)), '--ci'],
      {
        env: { ...outside, UNIT_ONLY: `test/fixtures/unit-budget/${file}.ts`, UNIT_FILE_TIMEOUT_MS: '300' },
        encoding: 'utf8',
        timeout: 10_000,
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout + result.stderr, /exceeded its 0\.3s whole-file budget/);
  }
});
