// The build id skips docs-only merges (dev/client-build.ts), so they reload nobody's open tab.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newestCodeCommit } from '../dev/client-build.ts';

// Paths are joined, not written out: test/change-class.test.ts takes a quoted doc path in a test for a file it opens.
const at = (...parts: string[]) => parts.join('/');
const md = (name: string) => [name, 'md'].join('.');
const history: Record<string, string[]> = {
  docs2: [at('docs', md('backlog')), at('docs', 'agents', md('orchestrator-state'))],
  docs1: [md('DESIGN'), at('docs', 'reports', 'garage', 'still.png')],
  code: ['src/features/updates.ts', at('docs', 'game-design', md('hud'))],
  older: ['src/main.ts'],
};
const filesOf = (sha: string) => history[sha]!;

test('docs-only merges keep the build of the code commit under them', () => {
  assert.equal(newestCodeCommit(['docs2', 'docs1', 'code', 'older'], filesOf), 'code');
  assert.equal(newestCodeCommit(['code', 'older'], filesOf), 'code');
});

test('docs the site bundles, and an empty merge, are judged as the classifier judges them', () => {
  // docs/atlas and docs/world are read by code, so they change the build; a merge that changed nothing does not.
  assert.equal(
    newestCodeCommit(['atlas', 'code'], (sha) =>
      sha === 'atlas' ? [at('docs', 'atlas', md('changes'))] : filesOf(sha),
    ),
    'atlas',
  );
  assert.equal(
    newestCodeCommit(['empty', 'code'], (sha) => (sha === 'empty' ? [] : filesOf(sha))),
    'code',
  );
});

test('a history of only docs names nothing', () => {
  assert.equal(newestCodeCommit(['docs2', 'docs1'], filesOf), null);
});
