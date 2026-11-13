// Owner-requested ordinary-work fixtures: lint/graph inputs, never installed game features or server rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import fixtures from './fixtures/prefab-ordinary.json' with { type: 'json' };
import debt from '../dev/lint/prefab-debt.json' with { type: 'json' };
import {
  loadLegacyGraph,
  computeLegacyGraph,
  constructionCounts,
  constructionForwards,
} from '../dev/lint/prefab-constructors.ts';
import { createModuleResolver } from '../dev/lint/prefab-boundaries.ts';
import { lintSafety } from '../dev/lint/safety.ts';

test('all eight ordinary additions pass together without changing debt', { timeout: 30000 }, () => {
  const before = fs.readFileSync('dev/lint/prefab-debt.json', 'utf8');
  const base = loadLegacyGraph(process.cwd(), debt);
  const sources: Record<string, string> = Object.fromEntries(base.files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
  const additions = Object.assign({}, ...fixtures.map((f) => f.files)) as Record<string, string>;
  Object.assign(sources, additions);
  const real = createModuleResolver(process.cwd());
  const resolve = (file: string, specifier: string) => {
    const target = specifier.startsWith('/src/')
      ? specifier.slice(1)
      : path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
    return (
      [target, target + '.ts', target + '/index.ts'].find((f) => Object.hasOwn(additions, f)) ?? real(file, specifier)
    );
  };
  const graph = computeLegacyGraph(sources, debt, resolve);
  for (const fixture of fixtures)
    for (const [file, code] of Object.entries(fixture.files))
      assert.deepEqual(lintSafety(code, file, debt, resolve, graph), [], `${fixture.kind}: ${file}`);
  assert.deepEqual(
    constructionCounts(graph),
    debt.legacy,
    'Ordinary additions must not change any constructor/importer budget',
  );
  assert.deepEqual(constructionForwards(graph), debt.forwards);
  assert.equal(fs.readFileSync('dev/lint/prefab-debt.json', 'utf8'), before);
});
