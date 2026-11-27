// The build id skips docs-only merges (dev/client-build.ts), so they reload nobody's open tab.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newestCodeCommit } from '../dev/client-build.ts';

const history: Record<string, string[]> = {
  docs2: ['docs/backlog.md', 'docs/agents/orchestrator-state.md'],
  docs1: ['DESIGN.md', 'docs/reports/garage/still.png'],
  code: ['src/features/updates.ts', 'docs/game-design/hud.md'],
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
    newestCodeCommit(['atlas', 'code'], (sha) => (sha === 'atlas' ? ['docs/atlas/changes.md'] : filesOf(sha))),
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
