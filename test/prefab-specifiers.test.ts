// Only import bindings and distinct namespace member names consume the new guard, never data/value taint.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSync } from 'oxc-parser';
import { capabilitySpecifiers } from '../dev/lint/prefab-specifiers.ts';
import { createModuleResolver } from '../dev/lint/prefab-boundaries.ts';
import { lintSafety } from '../dev/lint/safety.ts';
import fixture from './fixtures/prefab-specifier-review.json' with { type: 'json' };

const resolve = createModuleResolver(process.cwd());
const count = (code: string) =>
  capabilitySpecifiers(parseSync(fixture.file, code, { range: true }).program, fixture.file, resolve, 'colliders')
    .length;
test('round six is rejected at the import-only step and with the original hiddenMaker reproduction', () => {
  assert.deepEqual(lintSafety(fs.readFileSync(fixture.file, 'utf8'), fixture.file), []);
  for (const code of [fixture.firstStep, fixture.full])
    assert.ok(
      lintSafety(code, fixture.file).some(
        (d) => d.rule === 'boogle/colliders-from-records' && d.message.includes('src/prefab/instantiate.ts'),
      ),
    );
});
test('an additional import alias grows the binding set without needing a call', () => {
  assert.equal(count("import{sweepSphere}from '../physics/engine.ts';"), 1);
  assert.equal(count("import{sweepSphere,createBody as allocate}from '../physics/engine.ts';"), 2);
});
test('namespace names count once; repeated queries and shadowing locals do not grow the set', () => {
  const prefix = "import*as physics from '../physics/engine.ts';";
  assert.equal(count(prefix + 'physics.sweepSphere();physics.sweepSphere();'), 2);
  assert.equal(count(prefix + "physics.sweepSphere();physics['createBody']();"), 3);
  assert.equal(count(prefix + 'physics.sweepSphere();(physics as typeof physics)[`createBody`];'), 3);
  assert.equal(count(prefix + 'function read(physics){return physics.createBody;}'), 1);
});
test('using an existing query again is ordinary work', () => {
  const original = fs.readFileSync(fixture.file, 'utf8');
  assert.deepEqual(lintSafety(original + '\nvoid sweepSphere;\n', fixture.file), []);
});
test('named doors retain a passing baseline and reject a new capability import binding', () => {
  const file = 'src/place/land.ts',
    original = fs.readFileSync(file, 'utf8');
  assert.deepEqual(lintSafety(original, file), []);
  assert.ok(
    lintSafety(original + "\nimport{createBody as reviewAllocate}from '../physics/engine.ts';\n", file).some(
      (d) => d.rule === 'boogle/colliders-from-records',
    ),
  );
});
