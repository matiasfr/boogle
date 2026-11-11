// The review trigger (dev/review-stamp.ts): source under the review paths needs a review, and so does a sim, net or
// server test whose assertions changed; imports, skip conditions and verbatim moves are the orchestrator's to read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewVerdicts, type FileChange } from '../dev/review-stamp.ts';

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

test('imports, comments and a skip condition alone are the orchestrator to read', () => {
  const c = change(
    'test/railway.test.ts',
    ["import { a } from './helpers/old.ts';", "test('trains run', () => {"],
    ["import { a } from './helpers/rail.ts';", '// slow on a loaded Mac', "test('trains run', { skip: SLOW }, () => {"],
  );
  assert.deepEqual(verdict(c), ['read test/railway.test.ts: tests only: comment, import, moved lines']);
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
