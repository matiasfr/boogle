import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseSync, type Node } from 'oxc-parser';
import { changeClass, codeJobs, isDocs, JOBS, jobClosure, relativeLoads } from '../dev/ci/change-class.ts';
import { isMetaUrl, literal, runtimeSpecifiers, walk } from '../dev/scan/parse.ts';

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
    // These files' case tables name paths; they read none of them.
    .filter((f) => f !== 'test/change-class.test.ts' && f !== 'test/review-stamp.test.ts');
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

// Which code jobs run (server tests, the image build and boot, net), from each job's import closure.
const JOB_CASES: [string, string[], { server: boolean; image: boolean; net: boolean }][] = [
  ['client-only feature', ['src/features/fireworks/fireworks.ts'], { server: false, image: false, net: false }],
  ['lockstep code', ['src/sim/railway.ts'], { server: true, image: true, net: true }],
  ['server source', ['server/src/server.ts'], { server: true, image: true, net: true }],
  ['a server test', ['server/test/room-close.test.ts'], { server: true, image: true, net: false }],
  ['the net harness', ['dev/peer-test/harness.ts'], { server: false, image: false, net: true }],
  ['a net helper the harness imports', ['dev/look/lib.ts'], { server: false, image: false, net: true }],
  ['a shared wire module', ['src/net/ws-wire.ts'], { server: true, image: true, net: true }],
  ['the lockfile', ['package-lock.json'], { server: true, image: true, net: true }],
  ['the server lockfile', ['server/package-lock.json'], { server: true, image: true, net: true }],
  ['this classifier', ['dev/ci/change-class.ts'], { server: true, image: true, net: true }],
  ['the CI workflow', ['.github/workflows/ci.yml'], { server: true, image: true, net: true }],
  ['the boot script', ['scripts/server-boot-check.sh'], { server: false, image: true, net: false }],
  ['an unrelated dev tool', ['dev/heartbeat.sh', 'dev/models.ts'], { server: false, image: false, net: false }],
];
for (const [name, files, want] of JOB_CASES) {
  test(`code jobs: ${name}`, () => assert.deepEqual(codeJobs(files), want, files.join(', ')));
}

test('change class CLI --jobs prints CI outputs, and an empty diff runs every job', () => {
  const run = (input: string) =>
    execFileSync(process.execPath, ['dev/ci/change-class.ts', '--jobs'], { cwd: ROOT, input, encoding: 'utf8' });
  assert.equal(run('docs/a.md\n'), 'docs=true\nheavy=false\nserver=false\nimage=false\nnet=false\n');
  assert.equal(run('src/main.ts\n'), 'docs=false\nheavy=true\nserver=false\nimage=false\nnet=false\n');
  assert.equal(run(''), 'docs=false\nheavy=true\nserver=true\nimage=true\nnet=true\n');
});

// The regex walk must reach at least what the parser says each file loads: a server import the closure missed is how
// a job would skip the change that breaks it (the 10 November crash-loop came from a shared import nobody followed).
test('each job closure holds every parsed relative load of every file in it', () => {
  for (const job of Object.keys(JOBS) as (keyof typeof JOBS)[]) {
    const closure = jobClosure(job);
    assert.ok(closure.size > 50, `${job}: the walk reached only ${closure.size} files`);
    const missing: string[] = [];
    for (const file of closure) {
      if (!file.endsWith('.ts')) continue;
      for (const spec of runtimeSpecifiers(fs.readFileSync(path.join(ROOT, file), 'utf8'))) {
        if (!spec.startsWith('.') || spec.endsWith('/')) continue;
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec.replace(/\?.*$/, '')));
        if (!closure.has(target)) missing.push(`${job}: ${file} loads ${spec}`);
      }
    }
    assert.deepEqual(missing, [], 'dev/ci/change-class.ts relativeLoads() misses these');
  }
});

test('server jobs follow the real tuning panel and recorder behind per-tab import isolation', () => {
  const closure = jobClosure('server');
  for (const file of ['src/debug/dev/tunables.ts', 'src/tunables/events.ts', 'src/tunables/catalog.ts']) {
    assert.ok(closure.has(file), file);
    assert.equal(codeJobs([file]).server, true, `${file} must run the actual-panel recording regression`);
  }
});

// Loads no walk can follow: a computed import or URL, a worker or child process started from a path that is not a
// literal URL, a bundle built by entry name. Each one known is listed with what covers it; a new one fails here.
const UNFOLLOWED: Record<string, string> = {
  'dev/peer-test/harness.ts: esbuild.build': "bundles dev/peer-test/<entry>: every file there is one of net's roots",
  'dev/peer-test/worker-source.ts: registerHooks': 'redirects src/ to a worker tree; the same src files',
  'dev/peer-test/node-player.ts: import': 'imports the bundle node-player itself builds from dev/peer-test',
  'server/test/helpers/tune-panel.ts: registerHooks':
    'isolates the two literal panel/event URLs and stubs browser entry points; their complete source imports remain in the server closure',
  'server/test/helpers/tune-panel.ts: import':
    'imports the two literal new URL targets above with per-tab query parameters; both targets and their imports are walked',
};
test('every load the walk cannot follow is known', () => {
  const found = new Set<string>();
  for (const job of Object.keys(JOBS) as (keyof typeof JOBS)[]) {
    for (const file of jobClosure(job)) {
      if (!file.endsWith('.ts')) continue;
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      walk(parseSync(file, src, { lang: 'ts' }).program, (n: Node) => {
        let arg = (n.type === 'NewExpression' || n.type === 'CallExpression' ? n.arguments[0] : undefined) as
          Node | undefined;
        // fileURLToPath(new URL('./x.ts', import.meta.url)) is as literal as the URL inside it.
        const url = (a: Node | undefined) =>
          a?.type === 'NewExpression' && a.callee.type === 'Identifier' && a.callee.name === 'URL' ? a : undefined;
        if (arg?.type === 'CallExpression' && url(arg.arguments[0] as Node | undefined)) arg = arg.arguments[0] as Node;
        const literalUrl = literal(url(arg)?.arguments[0] as Node | undefined) !== undefined;
        if (n.type === 'ImportExpression' && literal(n.source) === undefined) found.add(`${file}: import`);
        else if (n.type === 'NewExpression' && n.callee.type === 'Identifier') {
          if (n.callee.name === 'URL' && isMetaUrl(n.arguments[1] as Node | undefined) && literal(arg) === undefined)
            found.add(`${file}: new URL`);
          if (n.callee.name === 'Worker' && !literalUrl) found.add(`${file}: new Worker`);
        } else if (n.type === 'CallExpression') {
          const callee =
            n.callee.type === 'Identifier'
              ? n.callee.name
              : n.callee.type === 'MemberExpression' && n.callee.property.type === 'Identifier'
                ? `${n.callee.object.type === 'Identifier' ? n.callee.object.name + '.' : ''}${n.callee.property.name}`
                : '';
          if (callee === 'fork' && !literalUrl) found.add(`${file}: fork`);
          if (callee === 'esbuild.build' || callee === 'registerHooks') found.add(`${file}: ${callee}`);
        }
      });
    }
  }
  const unknown = [...found].filter((k) => !(k in UNFOLLOWED));
  const stale = Object.keys(UNFOLLOWED).filter((k) => !found.has(k));
  assert.deepEqual(unknown, [], 'cover these in JOBS (roots or fallback) in dev/ci/change-class.ts, then list them');
  assert.deepEqual(stale, [], 'these listed loads are gone: drop them from UNFOLLOWED');
});

test('relativeLoads reads every load form and keeps out directories and packages', () => {
  const src = [
    "import a from './a.ts';",
    "export * from '../b.ts';",
    "import './c.ts';",
    "const d = await import('./d.ts');",
    'const e = await import(`./e.ts`);',
    "new Worker(new URL('./f.ts', import.meta.url));",
    "import raw from './g.html?raw';",
    "const dir = new URL('../seeds/', import.meta.url);",
    "import three from 'three';",
    'const h = await import(`./${name}.ts`);',
  ].join('\n');
  assert.deepEqual(relativeLoads(src), ['./a.ts', '../b.ts', './c.ts', './d.ts', './e.ts', './f.ts', './g.html']);
});
