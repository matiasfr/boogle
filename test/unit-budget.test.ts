// Owner-requested regression: a file deadline must stop a hung file without preventing the next file from running.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const outside = { ...process.env };
delete outside.NODE_TEST_CONTEXT;
delete outside.NODE_TEST_WORKER_ID;

// The descendant proof needs a POSIX process group. A normal Windows helper already dies with its parent's job
// object, and detaching it makes the proof depend on taskkill discovering a separate process. Exercise the same
// supervisor and deadline on Windows with a single hung process and verify that the next file still runs.
const checkDescendant = process.platform !== 'win32';
const probe = checkDescendant ? 'tree.ts' : 'interval.ts';
const budgetSeconds = checkDescendant ? 2 : 4;

for (const mode of ['--ci', '--ship']) {
  test(
    `whole-file budget stops ${checkDescendant ? 'a blocked process tree' : 'an armed interval'} and continues (${mode})`,
    { timeout: checkDescendant ? 20_000 : 30_000 },
    async () => {
      let descendant: number | undefined;
      try {
        const result = spawnSync(
          process.execPath,
          [fileURLToPath(new URL('../dev/test-unit.ts', import.meta.url)), mode, '--test-concurrency=1'],
          {
            env: {
              ...outside,
              UNIT_ONLY: `test/fixtures/unit-budget/${probe} test/fixtures/unit-budget/z-healthy.ts`,
              UNIT_FILE_TIMEOUT_MS: String(budgetSeconds * 1000),
            },
            encoding: 'utf8',
            timeout: checkDescendant ? 10_000 : 20_000,
            maxBuffer: 1024 * 1024,
          },
        );
        if (checkDescendant) {
          const pid = /budget probe child ([1-9]\d*)/.exec(result.stdout)?.[1];
          assert.ok(pid, 'probe must start a descendant before its deadline');
          descendant = Number(pid);
        } else {
          assert.match(result.stdout, /budget probe interval armed/);
        }
        assert.ifError(result.error);
        assert.equal(result.status, 1, result.stderr);
        const output = result.stdout + result.stderr;
        assert.ok(output.includes(`${probe} exceeded its ${budgetSeconds}s whole-file budget`), output);
        assert.match(result.stdout, /healthy after killed file/);
        assert.match(result.stdout, /unit timing .*"file":"test\/fixtures\/unit-budget\/z-healthy\.ts".*"passed":true/);
        const finished = result.stdout.indexOf(`unit file test/fixtures/unit-budget/${probe}:`);
        assert.ok(
          finished >= 0 && finished < result.stdout.indexOf('unit file start test/fixtures/unit-budget/z-healthy.ts'),
          'the healthy file executes after the killed file',
        );
        if (descendant === undefined) return;
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

test(
  'whole-file budget interrupts an armed interval',
  { timeout: 20_000, skip: !checkDescendant && 'covered in both modes above' },
  () => {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('../dev/test-unit.ts', import.meta.url)), '--ci'],
      {
        env: { ...outside, UNIT_ONLY: 'test/fixtures/unit-budget/interval.ts', UNIT_FILE_TIMEOUT_MS: '1000' },
        encoding: 'utf8',
        timeout: 10_000,
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /budget probe interval armed/);
    assert.match(result.stdout + result.stderr, /interval\.ts.*exceeded its 1s whole-file budget/);
  },
);
