// The guards M3c's review asked for (branch review/m3c, b5cfb6c68, where these failed; fixed in M8b):
//
// 1. No view or src/world file value-imports the seeds and drivers (src/sim/railway-drive.ts, railway-seeds.ts),
//    which run the rules and the load check; a type-only import stays allowed
//    (src/world/railway-jump.ts takes SeedStage).
// 2. The view import() ban catches a path cast twice, a template literal cast once and a parenthesized path cast.
// 3. dev/migrate/test-census.ts does not count test.skip, test.todo or a literal `{ skip: true }` as a test.
// 4. dev/migrate/rail-mutants.ts runs its tests without GOLDEN, so a mutated rule can never rewrite a golden fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lintSafety } from '../dev/lint/safety.ts';

const restricted = (code: string, file: string) =>
  lintSafety(code, file).some((d) => d.rule === 'no-restricted-imports' || d.rule === 'no-restricted-syntax');

test('a view or src/world may not import the seed and test drivers (they run the rules and the load check)', () => {
  const missed = [
    ['src/entities/railway/zz-probe.ts', "import { check } from '../../sim/railway-drive.ts';\nvoid check;\n"],
    ['src/entities/railway/zz-probe.ts', "import { apply } from '../../sim/railway-drive.ts';\nvoid apply;\n"],
    [
      'src/entities/railway/zz-probe.ts',
      "import { buildSeedWorld } from '../../sim/railway-seeds.ts';\nvoid buildSeedWorld;\n",
    ],
    ['src/entities/railway/zz-probe.ts', "export const load = () => import('../../sim/railway-drive.ts');\n"],
    ['src/world/zz-probe.ts', "import { check } from '../sim/railway-drive.ts';\nvoid check;\n"],
    ['src/world/zz-probe.ts', "import { buildSeedWorld } from '../sim/railway-seeds.ts';\nvoid buildSeedWorld;\n"],
    ['src/world/railway-zz.ts', "import { apply } from '../sim/railway-drive.ts';\nvoid apply;\n"],
    ['src/adapters/zz-probe.ts', "import { apply } from '../sim/railway-drive.ts';\nvoid apply;\n"],
  ].filter(([file, code]) => !restricted(code!, file!));
  assert.deepEqual(missed, []);
  // Types stay allowed: src/world/railway-jump.ts names SeedStage.
  const typed = [
    [
      'src/world/zz-probe.ts',
      "import type { SeedStage } from '../sim/railway-seeds.ts';\nexport type S = SeedStage;\n",
    ],
    [
      'src/entities/railway/zz-probe.ts',
      "import { type Seed } from '../../sim/railway-drive.ts';\nexport type S = Seed;\n",
    ],
  ].filter(([file, code]) => restricted(code!, file!));
  assert.deepEqual(typed, []);
});

test("a view's import() of the check, drivers or systems is banned however the path is cast", () => {
  const file = 'src/entities/railway/zz-probe.ts';
  const missed = [
    "export const load = () => import('/src/sim/railway-check.ts' as unknown as string);",
    'export const load = () => import(`/src/sim/railway-check.ts` as string);',
    "export const load = () => import(('/src/sim/railway-systems.ts') as string);",
    'export const load = () => import(`/src/sim/railway-drive.ts` as unknown as string);',
    "export const load = () => import((('/src/sim/railway-seeds.ts')) as string);",
  ].filter((code) => !restricted(code, file));
  assert.deepEqual(missed, []);
});

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
    const r = spawnSync(process.execPath, ['dev/migrate/test-census.ts', file], { encoding: 'utf8' });
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
        "test('no golden', () => assert.equal(process.env.GOLDEN, undefined));",
        '',
      ].join('\n'),
    );
    // No mutation matches, so only the unmutated baseline runs: it lists a failing test if GOLDEN reached it.
    const r = spawnSync(process.execPath, ['dev/migrate/rail-mutants.ts', '--only=no mutation has this name', file], {
      encoding: 'utf8',
      env: { ...process.env, GOLDEN: '1' },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /unmutated/, r.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
