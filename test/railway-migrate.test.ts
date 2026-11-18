import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('the census does not count a skipped or todo test as a test', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-m3c-'));
  try {
    const file = path.join(dir, 'probe.test.ts');
    fs.writeFileSync(
      file,
      [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "test('runs', () => assert.ok(true));",
        "test.skip('skipped', () => assert.ok(true));",
        "test.todo('todo');",
        "test('off', { skip: true }, () => assert.ok(true));",
        "test('computed', { skip: process.env.NEVER_SET_X === '1' }, () => assert.ok(true));",
        '',
      ].join('\n'),
    );
    const r = spawnSync(process.execPath, ['dev/migrate/test-census.ts', file], { encoding: 'utf8', timeout: 5000 });
    assert.equal(r.status, 0, r.stderr);
    const row = r.stdout.split('\n').find((l) => l.includes('probe.test.ts'));
    assert.match(row ?? '', /\| 2 \| 2 \|$/, `two live tests, two asserts: ${row}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the kill table runs its tests without GOLDEN', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-m3c-'));
  try {
    const file = path.join(dir, 'probe.test.ts');
    fs.writeFileSync(
      file,
      [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "import { writeFileSync } from 'node:fs';",
        "test('no golden', () => {",
        "  writeFileSync(new URL('./probe-ran', import.meta.url), 'yes');",
        '  assert.equal(process.env.GOLDEN, undefined);',
        '});',
        '',
      ].join('\n'),
    );
    const env: NodeJS.ProcessEnv = { ...process.env, GOLDEN: '1' };
    delete env.NODE_TEST_CONTEXT;
    delete env.NODE_TEST_WORKER_ID;
    const r = spawnSync(process.execPath, ['dev/migrate/rail-mutants.ts', '--only=no mutation has this name', file], {
      encoding: 'utf8',
      env,
      timeout: 5000,
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.readFileSync(path.join(dir, 'probe-ran'), 'utf8'), 'yes');
    assert.doesNotMatch(r.stdout, /unmutated/, r.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
