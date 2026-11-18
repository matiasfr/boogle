// Owner-requested regression: a file deadline must reap its helpers, even when the file blocks synchronously.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
      let descendant: number | undefined;
      try {
        const result = spawnSync(
          process.execPath,
          [fileURLToPath(new URL('../dev/test-unit.ts', import.meta.url)), mode, '--test-concurrency=1'],
          {
            env: {
              ...outside,
              UNIT_ONLY: 'test/fixtures/unit-budget/tree.ts test/fixtures/unit-budget/z-healthy.ts',
              UNIT_FILE_TIMEOUT_MS: '2000',
            },
            encoding: 'utf8',
            timeout: 10_000,
            maxBuffer: 1024 * 1024,
          },
        );
        const pid = /budget probe child ([1-9]\d*)/.exec(result.stdout)?.[1];
        assert.ok(pid, 'probe must start a descendant before its deadline');
        descendant = Number(pid);
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stdout + result.stderr, /tree\.ts.*exceeded its 2s whole-file budget/);
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
      }
    },
  );
}

test('whole-file budget interrupts an armed interval', { timeout: 20_000 }, () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../dev/test-unit.ts', import.meta.url)), '--ci'], {
    env: { ...outside, UNIT_ONLY: 'test/fixtures/unit-budget/interval.ts', UNIT_FILE_TIMEOUT_MS: '1000' },
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /budget probe interval armed/);
  assert.match(result.stdout + result.stderr, /interval\.ts.*exceeded its 1s whole-file budget/);
});
