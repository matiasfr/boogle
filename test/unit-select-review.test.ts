// Review of CI diet Batch 2 (dev/ci/unit-select.ts), the cases the selector failed. P1: a test that loads a file without
// importing it (a source evaluated by name, a folder URL, an esbuild entry, a spawned script) must still be selected
// when that file changes. P2: the selector's own imports decide the run, so a change to them is the full suite.
// P3(a): what review-path code loads from outside REVIEW_PATHS is the full suite too. Reads files only; spawns nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { importClosure } from '../dev/ci/change-class.ts';
import { FULL_ON, unitPlan } from '../dev/ci/unit-select.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

// Changed file, the test that must run, and how the test reaches it.
const P1: [string, string, string][] = [
  ['src/entities/railway/leaf-view.ts', 'test/railway-r4c-leaf.test.ts', 'sourceFunction by rooted path'],
  ['src/entities/railway/leaf-view.ts', 'test/railway-m10a-views.test.ts', 'a folder URL over the views'],
  ['src/entities/railway/view.ts', 'test/railway-m10a-views.test.ts', 'a folder URL over the views'],
  ['src/boot/sw-worker.ts', 'test/sw-worker.test.ts', 'an esbuild entry'],
  ['src/proto/greybox/ground.ts', 'test/rail-map.test.ts', 'imported by the script it runs with --check'],
  ['dev/level/rail-map.ts', 'test/rail-map.test.ts', 'the script it runs with --check'],
  ['dev/level/world-blockout.ts', 'test/world-lines.test.ts', 'the script it runs with --check'],
  ['dev/migrate/rail-mutants.ts', 'test/railway-lint-review.test.ts', 'a script it spawns'],
];
for (const [changed, want, how] of P1) {
  test(`P1: ${changed} selects ${want} (${how})`, () => {
    const p = unitPlan([changed], ROOT);
    assert.equal(p.full, false, p.full ? p.why : '');
    if (!p.full) assert.ok(p.tests.includes(want), `${want} not in ${p.tests.join(' ')}`);
  });
}

test("P2: the selector's import closure is computed into FULL_ON and takes the full suite", () => {
  const closure = [...importClosure(['dev/ci/unit-select.ts'], ROOT)];
  assert.ok(closure.includes('dev/review-stamp.ts') && closure.includes('dev/server-build.ts'), closure.join(' '));
  for (const f of closure) assert.ok(FULL_ON.includes(f) || FULL_ON.some((e) => e.endsWith('/') && f.startsWith(e)), f);
  // A diff that trims REVIEW_PATHS and changes a client file must not pick its own run.
  for (const files of [['dev/review-stamp.ts', 'src/features/ambience.ts'], ['dev/server-build.ts']]) {
    const p = unitPlan(files, ROOT);
    assert.equal(p.full, true, files.join(', '));
  }
});

test('P3(a): a file review-path code loads from outside REVIEW_PATHS takes the full suite', () => {
  for (const f of ['src/proto/flags.ts', 'protos/review-types.ts', 'src/constants.ts']) {
    const p = unitPlan([f], ROOT);
    assert.equal(p.full, true, f);
    if (p.full) assert.match(p.why, /loaded by review-path code/, f);
  }
  // A client file nothing on a review path loads keeps the selection.
  assert.equal(unitPlan(['src/features/ambience.ts'], ROOT).full, false);
});
