import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { changeClass, isDocs } from '../dev/ci/change-class.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

// Each case is one diff as `git diff --no-renames --name-only` lists it: a rename shows as both of its paths and a
// deletion as the deleted path.
const CASES: [string, string[], 'docs' | 'code'][] = [
  ['docs prose', ['docs/agents/shipping.md', 'docs/plans/x.md'], 'docs'],
  ['root and nested prose', ['AGENTS.md', 'DESIGN.md', 'src/world/AGENTS.md', 'server/README.md'], 'docs'],
  [
    'skills, agents and rules',
    ['.claude/skills/look/SKILL.md', '.claude/agents/implementer.md', '.claude/rules/net.md'],
    'docs',
  ],
  ['an image in docs', ['docs/reviews/shot.png', 'docs/research/a.svg'], 'docs'],
  ['renamed doc', ['docs/plans/old.md', 'docs/plans/done/old.md'], 'docs'],
  ['deleted doc', ['docs/ideas-old.md'], 'docs'],
  ['code', ['src/main.ts'], 'code'],
  ['mixed docs and code', ['docs/agents/tests.md', 'src/world/sync.ts'], 'code'],
  ['code renamed to prose', ['dev/old.ts', 'docs/old.md'], 'code'],
  ['deleted code', ['src/features/gone.ts'], 'code'],
  ['workflow file', ['.github/workflows/ci.yml'], 'code'],
  ['markdown under .github', ['.github/pull_request_template.md'], 'code'],
  ['atlas data bundled by the atlas page', ['docs/atlas/changes.md'], 'code'],
  ['world page imported with ?raw', ['docs/world/map-prototypes.html'], 'code'],
  ['test fixture prose', ['test/fixtures/notes.md'], 'code'],
  ['public file copied into the site', ['public/notes.md'], 'code'],
  ['Claude settings and hooks', ['.claude/settings.json', '.claude/hooks/format-lint.ts'], 'code'],
  ['script beside docs', ['docs/research/notes/entity-architecture/dispatch-bench.ts'], 'code'],
  ['image outside docs', ['src/boot/splash-art.jpg'], 'code'],
  ['data in docs', ['docs/economy/table.csv', 'docs/plans/x.json'], 'code'],
  ['unknown paths', ['LICENSE', 'Makefile', 'docs/notes.txt'], 'code'],
  ['package files', ['package.json', 'package-lock.json'], 'code'],
  ['path tricks', ['./docs/a.md', 'docs/../src/a.md', '/docs/a.md'], 'code'],
  ['empty diff', [], 'code'],
];

for (const [name, files, want] of CASES) {
  test(`change class: ${name}`, () => assert.equal(changeClass(files), want, files.join(', ')));
}

test('change class CLI reads NUL- or newline-separated paths', () => {
  const run = (input: string, ...args: string[]) =>
    execFileSync(process.execPath, ['dev/ci/change-class.ts', ...args], { cwd: ROOT, input, encoding: 'utf8' });
  assert.equal(run('docs/a.md\0AGENTS.md\0'), 'docs\n');
  assert.equal(run('docs/a.md\nsrc/a.ts\n'), 'code\n');
  assert.equal(run(''), 'code\n');
  assert.equal(
    run('docs/a.md\nsrc/a.ts\n.github/workflows/ci.yml\n', '--code'),
    'src/a.ts\n.github/workflows/ci.yml\n',
  );
});

// What the code gates bundle, build or test must never be docs, or a docs-only diff could break them unseen. Two
// readers are known and covered: the docs CI job runs models.test.ts, and the development page renders its Markdown
// with a renderer that cannot fail on any text (the deploy build after the merge still runs it).
const COVERED: Record<string, string> = {
  'test/models.test.ts': '.claude/agents/',
  'dev/development/vite-plugin.ts': 'docs/agents/orchestrator-state.md',
};

test('nothing the code gates read is classed as docs', () => {
  const files = execFileSync(
    'git',
    ['ls-files', 'src', 'atlas', 'protos', 'menu', 'character', 'development', 'test', 'server/src', 'dev', '*.ts'],
    { cwd: ROOT, encoding: 'utf8' },
  )
    .split('\n')
    // dev/ only where the build loads it (Vite plugins) or tests import it; the rest runs on the Mac, not in CI.
    .filter((f) => /\.(?:[mc]?[jt]s|html)$/.test(f) && (!f.startsWith('dev/') || f.endsWith('vite-plugin.ts')))
    // This file's case table names paths; it reads none of them.
    .filter((f) => f !== 'test/change-class.test.ts');
  const bad: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const m of text.matchAll(
      /['"`]((?:\.{1,2}\/)*(?:docs\/|\.claude\/)[^'"`\s]*|[^'"`\s:]+\.md(?:\?\w+)?)['"`]/g,
    )) {
      let ref = m[1]!.replace(/\$\{[^}]*\}/g, 'x').replace(/\?\w+$/, '');
      if (ref.startsWith('.'))
        ref = path
          .relative(ROOT, path.resolve(ROOT, path.dirname(file), ref))
          .split(path.sep)
          .join('/');
      const covered = COVERED[file];
      if (isDocs(ref) && !(covered && ref.startsWith(covered))) bad.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(bad, [], 'class these paths as code in dev/ci/change-class.ts, or cover them in the docs job');
});
