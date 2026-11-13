// Owner-requested step 5 enforcement fixtures, including the file-identity ratchet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import fixtures from './fixtures/prefab-lint.json' with { type: 'json' };
import debt from '../dev/lint/prefab-debt.json' with { type: 'json' };
import { lintSafety } from '../dev/lint/safety.ts';
import { comparePrefabDebt, checkPrefabDebt, PREFAB_DEBT_FILE } from '../dev/registry/prefab-debt.ts';

test('each prefab door has passing and failing fixtures with an actionable message', () => {
  for (const fixture of fixtures) {
    const found = lintSafety(fixture.code, fixture.file).filter((d) => d.rule === fixture.rule);
    assert.equal(found.length > 0, fixture.fail, JSON.stringify(fixture));
    for (const d of found) assert.match(d.message, /src\/prefab\/instantiate\.ts/);
  }
  for (const rule of new Set(fixtures.map((f) => f.rule)))
    assert.deepEqual(new Set(fixtures.filter((f) => f.rule === rule).map((f) => f.fail)), new Set([true, false]));
});

test('every initial file exemption has a dated reason; no list growth or equal-size substitution', () => {
  assert.deepEqual(comparePrefabDebt(debt, debt), []);
  const base = { colliders: { 'src/old.ts': '2026-11-13: Existing debt.' }, seats: {} };
  assert.deepEqual(comparePrefabDebt(base, { colliders: {}, seats: {} }), []);
  const added = { colliders: { 'src/new.ts': '' }, seats: {} };
  assert.match(comparePrefabDebt(base, added).join('\n'), /dated reason line/);
  added.colliders['src/new.ts'] = '2026-11-13: An agent wants a second door.';
  assert.match(comparePrefabDebt(base, added).join('\n'), /grew/);
  assert.match(
    comparePrefabDebt(base, { colliders: {}, seats: { 'src/new.ts': '2026-11-13: Reason.' } }).join('\n'),
    /seats grew/,
  );
  for (const [file] of Object.entries(debt.colliders))
    assert.ok(
      !lintSafety('addStatic(shape, pos);', file).some((d) => d.rule === 'boogle/colliders-from-records'),
      file,
    );
  for (const [file] of Object.entries(debt.seats))
    assert.ok(!lintSafety('registerSeat({});', file).some((d) => d.rule === 'boogle/seats-from-records'), file);
});

test('registry bootstraps only existing base calls, then rejects list growth and stale entries', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-prefab-debt-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const current = { colliders: { 'src/old.ts': '2026-11-13: Approved existing call.' }, seats: {} };
  const save = () => write(PREFAB_DEBT_FILE, JSON.stringify(current));
  try {
    git('init', '-q');
    write('src/old.ts', 'addStatic(shape, pos);');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Baseline');
    save();
    assert.deepEqual(checkPrefabDebt(root, 'HEAD'), []);
    write('src/new.ts', 'addStatic(shape, pos);');
    const grown = { ...current.colliders, 'src/new.ts': '2026-11-13: Added later.' };
    write(PREFAB_DEBT_FILE, JSON.stringify({ ...current, colliders: grown }));
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /colliders grew: src\/new.ts/);
    save();
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Seed list');
    write(PREFAB_DEBT_FILE, JSON.stringify({ ...current, colliders: grown }));
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /colliders grew: src\/new.ts/);
    save();
    write('src/old.ts', 'instantiate(key, pose, options);');
    assert.match(checkPrefabDebt(root, 'HEAD').join('\n'), /stale colliders\/src\/old.ts/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
