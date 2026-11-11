// Review of CI diet Batch 2: which unit tests a ship's CI runs (dev/ci/unit-select.ts). Lockstep and review-path ships
// keep the full suite (owner, 11 November: "lockstep ships can keep the unit suite for now"); a ship that touches
// neither runs the tests that import a changed file plus the core, and nothing may leave it with an empty selection.
// Reads the repository's files only; spawns nothing but the classifier's own CLI.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CORE_TESTS, FULL_ON, unitPlan } from '../dev/ci/unit-select.ts';
import { REVIEW_PATHS } from '../dev/review-stamp.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const plan = (...files: string[]) => unitPlan(files, ROOT);

test('every review path, and what every test shares, takes the full suite', () => {
  for (const p of REVIEW_PATHS) assert.ok(FULL_ON.includes(`${p}/`), p);
  for (const f of [
    'src/sim/railway.ts',
    'src/net/ws-wire.ts',
    'src/world/sync.ts',
    'src/ecs/world.ts',
    'server/src/server.ts',
  ])
    assert.equal(plan(f).full, true, f);
  for (const f of [
    'test/helpers/rail.ts',
    'dev/test-env.ts',
    'package-lock.json',
    'tsconfig.json',
    '.github/workflows/ci.yml',
  ])
    assert.equal(plan(f).full, true, f);
});

test('an empty diff, a deleted file and a test that asserts lockstep code are full too', () => {
  assert.equal(plan().full, true);
  assert.equal(plan('src/features/gone-for-good.ts').full, true);
  assert.equal(plan('test/railway-ops.test.ts').full, true, 'it reaches src/sim');
});

test('a client-only change runs the tests that import it plus the core, not the suite', () => {
  const p = plan('src/features/ambience.ts');
  assert.equal(p.full, false);
  if (p.full) return;
  for (const t of CORE_TESTS) assert.ok(p.tests.includes(t), `core ${t}`);
  assert.ok(p.tests.length < 40, `${p.tests.length} tests`);
  const importers = fs
    .globSync('test/**/*.test.ts', { cwd: ROOT })
    .filter((t) => /features\/ambience/.test(fs.readFileSync(`${ROOT}/${t}`, 'utf8')));
  for (const t of importers) assert.ok(p.tests.includes(t.split(path.sep).join('/')), `importer ${t}`);
});

test('the core is real, unique and always selected, even for a tool nothing imports', () => {
  assert.equal(new Set(CORE_TESTS).size, CORE_TESTS.length);
  for (const t of CORE_TESTS) assert.ok(fs.existsSync(`${ROOT}/${t}`), t);
  const p = plan('dev/heartbeat.sh');
  assert.deepEqual(p.full ? [] : p.tests, [...CORE_TESTS].sort());
});

test('CLI prints the CI outputs; main and an empty diff are full', () => {
  const run = (input: string) =>
    execFileSync(process.execPath, ['dev/ci/unit-select.ts'], {
      cwd: ROOT,
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  assert.equal(run(''), 'unit_full=true\nunit_shards=[1,2,3,4]\nunit_only=\n');
  assert.equal(run('src/sim/railway.ts\n'), 'unit_full=true\nunit_shards=[1,2,3,4]\nunit_only=\n');
  const lines = run('dev/heartbeat.sh\n').trimEnd().split('\n');
  assert.deepEqual(lines.slice(0, 2), ['unit_full=false', 'unit_shards=[1]']);
  assert.match(lines[2]!, /^unit_only=test\/\S+\.test\.ts( test\/\S+\.test\.ts)*$/);
});

test('--ship refuses to run with no selection', () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, ['dev/test-unit.ts', '--ship'], {
        cwd: ROOT,
        env: { ...process.env, UNIT_ONLY: '' },
        stdio: 'pipe',
      }),
    /status 1|Command failed/,
  );
});
