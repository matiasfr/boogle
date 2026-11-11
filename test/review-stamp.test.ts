// The review trigger (dev/review-stamp.ts): source under the review paths needs a review, and so does a sim, net or
// server test whose assertions changed; imports, skip conditions and verbatim moves are the orchestrator's to read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { reviewVerdicts, type FileChange } from '../dev/review-stamp.ts';
import { scratchRepo } from './helpers/scratch-git.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

const patch = (file: string, minus: string[], plus: string[], opts: { added?: boolean; deleted?: boolean } = {}) =>
  [
    `--- ${opts.added ? '/dev/null' : `a/${file}`}`,
    `+++ ${opts.deleted ? '/dev/null' : `b/${file}`}`,
    '@@ -1 +1 @@',
    ...minus.map((l) => `-${l}`),
    ...plus.map((l) => `+${l}`),
  ].join('\n');
const SIM_TEST = "import { railway } from '../src/sim/railway.ts';\n";
const change = (file: string, minus: string[], plus: string[], text = SIM_TEST, opts = {}): FileChange => ({
  file,
  patch: patch(file, minus, plus, opts),
  text,
});
const verdict = (...changes: FileChange[]) =>
  reviewVerdicts(changes).map((v) => `${v.review ? 'review' : 'read'} ${v.file}: ${v.rule.split(' (')[0]}`);

test('source under every review path needs review; server/ outside src and client code do not', () => {
  const files = ['src/sim/a.ts', 'src/net/ws-wire.ts', 'src/world/b.ts', 'src/ecs/world.ts', 'server/src/server.ts'];
  for (const f of files)
    assert.deepEqual(verdict(change(f, ['a'], ['b'], '')), [`review ${f}: source or wire under a review path`]);
  assert.deepEqual(
    verdict(change('server/Dockerfile', ['a'], ['b'], ''), change('src/features/x.ts', ['a'], ['b'], '')),
    [],
  );
  assert.deepEqual(verdict(change('src/sim/README.md', ['a'], ['b'], '')), []);
});

test('a changed assertion in a sim test needs review, and the rule names the line', () => {
  const [v] = reviewVerdicts([change('test/railway.test.ts', ['  assert.equal(x, 3);'], ['  assert.equal(x, 4);'])]);
  assert.equal(v!.review, true);
  assert.match(v!.rule, /assertion change \(first: - assert\.equal\(x, 3\);\)/);
});

test('import bindings, comments and a removed skip alone are the orchestrator to read', () => {
  const c = change(
    'test/railway.test.ts',
    ["import { a } from './helpers/rail.ts';", "test('trains run', { skip: SLOW }, () => {", 't.skip();'],
    ["import { a, b } from './helpers/rail.ts';", '// slow on a loaded Mac', "test('trains run', () => {"],
  );
  assert.deepEqual(verdict(c), ['read test/railway.test.ts: tests only: comment, import, skip removed']);
});

// The review's cases (11 November).
test('a return with a todo comment is an assertion change, not a skip', () => {
  const [v] = reviewVerdicts([change('server/test/host.test.ts', [], ['  return; // todo: flaky on CI'], '')]);
  assert.equal(v!.review, true);
  assert.match(v!.rule, /assertion change \(first: \+ return; \/\/ todo: flaky on CI\)/);
});

test('adding a skip to a sim test needs review: it turns coverage off', () => {
  for (const [minus, plus] of [
    [["test('trains run', () => {"], ["test('trains run', { skip: process.env.CI }, () => {"]],
    [[], ['  t.skip();']],
    [["test('trains run', () => {"], ["test.skip('trains run', () => {"]],
  ]) {
    const [v] = reviewVerdicts([change('test/railway.test.ts', minus!, plus!)]);
    assert.equal(v!.review, true, plus!.join());
    assert.match(v!.rule, /adds a skip/, plus!.join());
  }
});

test('an import whose module changed needs review (a fake swapped in for the real server)', () => {
  const [v] = reviewVerdicts([
    change(
      'server/test/host.test.ts',
      ["import { createService } from '../src/server.ts';"],
      ["import { createService } from './fixtures/fake-server.ts';"],
      '',
    ),
  ]);
  assert.equal(v!.review, true);
  assert.match(v!.rule, /an import's module changed/);
});

test('lines moved out of a test into a non-test file are not a move', () => {
  const line = '  assert.equal(railCounts(w).logs, 4);';
  const [v] = reviewVerdicts([change('test/railway.test.ts', [line], []), change('dev/sim/notes.ts', [], [line], '')]);
  assert.equal(v!.review, true);
});

test('test helpers and fixtures count, and so does a test reaching the sim through a helper', () => {
  assert.equal(
    reviewVerdicts([change('test/helpers/fuzz.ts', ['const STRIDE = 1;'], ['const STRIDE = 16;'], '')])[0]!.review,
    true,
  );
  assert.equal(reviewVerdicts([change('test/fixtures/railway-m12-trace.json', ['1'], ['2'], '')])[0]!.review, true);
  // test/railway-set-down.test.ts imports only ./helpers/rail.ts, which reaches src/sim.
  const viaHelper = change(
    'test/railway-set-down.test.ts',
    ['  assert.ok(a);'],
    ['  assert.ok(b);'],
    "import { x } from './helpers/rail.ts';\n",
  );
  assert.deepEqual(reviewVerdicts([viaHelper]), [], 'without a checkout to walk, only its own imports count');
  assert.equal(reviewVerdicts([viaHelper], ROOT)[0]!.review, true);
});

// One stamp covers every classed file once anything needs review: a test line added after the review changes it.
test('the stamp covers read files beside reviewed ones', () => {
  const repo = scratchRepo('review-stamp-');
  const cli = (...a: string[]) =>
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'dev/review-stamp.ts'), repo.dir, '--no-fetch', '--base', 'base', ...a],
      {
        encoding: 'utf8',
        env: repo.env,
      },
    ).trim();
  try {
    repo.write('src/sim/railway.ts', 'export const a = 1;\n');
    repo.write(
      'server/test/host.test.ts',
      "import { a } from '../../src/sim/railway.ts';\ntest('a', () => {\n  assert.ok(a);\n});\n",
    );
    repo.git('add', '-A');
    repo.git('commit', '-qm', 'base');
    repo.git('branch', 'base');
    repo.write('src/sim/railway.ts', 'export const a = 2;\n');
    repo.write(
      'server/test/host.test.ts',
      "import { a, b } from '../../src/sim/railway.ts';\ntest('a', () => {\n  assert.ok(a);\n});\n",
    );
    repo.git('commit', '-qam', 'reviewed');
    const reviewed = cli('--id');
    assert.match(reviewed, /^[0-9a-f]{12}$/);
    // Still only a `read` change to the test (an import binding and a comment), yet the stamp moves.
    repo.write(
      'server/test/host.test.ts',
      "import { a, b, c } from '../../src/sim/railway.ts';\n// flaky\ntest('a', () => {\n  assert.ok(a);\n});\n",
    );
    repo.git('commit', '-qam', 'after the review');
    assert.match(cli('--files'), /^read server\/test\/host\.test\.ts: tests only/m);
    assert.notEqual(cli('--id'), reviewed);
  } finally {
    repo.remove();
  }
});

test('a helper moved verbatim from a test into a helper file is read, not reviewed', () => {
  const body = ['function seed() {', '  return railwayAtQ4();', '}'];
  const helper = "import { railwayAtQ4 } from '../../src/sim/railway-seed-route.ts';\n";
  const moved = verdict(change('test/railway.test.ts', body, []), change('test/helpers/rail.ts', [], body, helper));
  assert.deepEqual(moved, [
    'read test/railway.test.ts: tests only: moved lines',
    'read test/helpers/rail.ts: tests only: moved lines',
  ]);
});

test('a new or deleted sim test needs review; a test that loads no review path gets no verdict', () => {
  assert.deepEqual(verdict(change('test/railway-new.test.ts', [], ['x'], SIM_TEST, { added: true })), [
    'review test/railway-new.test.ts: a new test file',
  ]);
  assert.deepEqual(verdict(change('test/railway-old.test.ts', ['x'], [], SIM_TEST, { deleted: true })), [
    'review test/railway-old.test.ts: a deleted test file',
  ]);
  assert.deepEqual(verdict(change('test/models.test.ts', ['a'], ['b'], "import x from '../dev/models.ts';\n")), []);
});

test('server and net tests count whatever they import', () => {
  for (const f of ['server/test/room-close.test.ts', 'dev/peer-test/ws-railway.ts'])
    assert.equal(reviewVerdicts([change(f, ['  assert.ok(a);'], ['  assert.ok(b);'], '')])[0]!.review, true, f);
});
