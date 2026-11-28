import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { type TestContext } from 'node:test';
import { gzipSync } from 'node:zlib';
import { allocate, checkPin, host, namespace, pins, ruleConflicts, verifyPin } from '../dev/rule-pins.ts';

function scratch(t: TestContext) {
  const cwd = mkdtempSync(join(tmpdir(), 'rule-rebase-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  delete env.NODE_TEST_CONTEXT; // The CLI starts its own node:test recorder.
  const git = (...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: 'pipe' }).trim();
  const write = (name: string, value: string) => writeFileSync(join(cwd, name), value);
  const commit = (subject: string) => {
    git('add', '.');
    git('commit', '-qm', subject);
  };
  git('init', '-q', '-b', 'target');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Rebase test');
  write('code', 'base');
  commit('base');
  const run = () =>
    spawnSync(process.execPath, [resolve('dev/rule-rebase.ts'), cwd, 'target'], {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    });
  return { cwd, git, write, commit, run, env };
}

for (const mode of ['detached docs', 'untracked file', 'detached code conflict']) {
  test('rebasing a worktree with ' + mode, (t) => {
    const { cwd, git, write, commit, run } = scratch(t);
    write('code', 'incoming');
    commit('incoming');
    if (mode === 'untracked file') git('switch', '-qc', 'job', 'HEAD^');
    else git('switch', '-q', '--detach', 'HEAD^');
    const conflict = mode === 'detached code conflict';
    mkdirSync(join(cwd, 'docs'));
    const note = join('docs', 'job');
    write(conflict ? 'code' : note, 'from job');
    commit('job');
    const original = git('rev-parse', 'HEAD');
    if (mode === 'untracked file') write('scratch', 'keep me');
    const result = run();
    assert.equal(result.status, conflict ? 2 : 0, result.stderr);
    assert.equal(git('branch', '--show-current'), mode === 'untracked file' ? 'job' : '');
    if (conflict) {
      assert.match(result.stderr, /CODE CONFLICT: code/);
      assert.equal(git('rev-parse', 'HEAD'), original);
      assert.equal(git('status', '--porcelain'), '');
    } else {
      assert.equal(git('rev-parse', 'HEAD^'), git('rev-parse', 'target'));
      assert.equal(readFileSync(join(cwd, note), 'utf8'), 'from job');
      if (mode === 'untracked file') assert.equal(readFileSync(join(cwd, 'scratch'), 'utf8'), 'keep me');
    }
  });
}

test('the entire conflict set must consist of known pins or the namespace', () => {
  assert.equal(ruleConflicts([host, namespace]), true);
  for (const files of [[], [host, 'src/world/rule.ts'], ['test/fixtures/something.json']])
    assert.equal(ruleConflicts(files), false);
});

for (const repeated of [false, true]) {
  test(
    'direct build matches a branch with ' + (repeated ? 'two host recordings' : 'a late host recording'),
    { timeout: 120_000 },
    (t) => {
      const { cwd, git, write, commit, run, env } = scratch(t);
      for (const f of [namespace, ...pins.keys(), 'test/helpers/rail-no-audit.ts'])
        mkdirSync(join(cwd, dirname(f)), { recursive: true });
      for (const f of pins.keys()) write(f, '{}\n');
      write('test/helpers/rail-no-audit.ts', '');
      write(
        'server/test/world-host-trace.test.ts',
        `import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const ns = readFileSync('${namespace}', 'utf8').match(/WORLD_NS = '(v\\d+)'/)[1];
const job = readFileSync('code', 'utf8');
const data = { namespace: 'rail-' + ns, main: job === 'disputed' ? 'temporary' : readFileSync('main-rule','utf8'), job };
let checksum = 2166136261;
for (const ch of JSON.stringify(data)) checksum = Math.imul(checksum ^ ch.charCodeAt(0), 16777619) >>> 0;
writeFileSync('${host}', gzipSync(JSON.stringify(['checkpoint', { data: {...data, checksum} }]) + '\\n'));
`,
      );
      const record = () => execFileSync(process.execPath, ['server/test/world-host-trace.test.ts'], { cwd });
      const ns = (notes: string, n: number) => write(namespace, notes + "export const WORLD_NS = 'v" + n + "';\n");
      ns('', 8);
      write('main-rule', 'base');
      record();
      commit('base pins');
      git('branch', 'job');
      const incoming = '// v9 main\n';
      ns(incoming, 9);
      write('main-rule', 'target');
      record();
      commit('main rules');
      git('switch', '-qc', 'oracle');
      ns(incoming + '// v10 job\n', 10);
      write('code', 'final');
      record();
      commit('direct build');
      git('switch', '-q', 'job');
      ns('// v9 job\n', 9);
      write('code', repeated ? 'disputed' : 'intermediate');
      if (repeated) record();
      commit('first rule');
      write('code', 'final');
      record();
      commit('final rule and pins');
      const stamp = () =>
        execFileSync(
          process.execPath,
          [resolve('dev/review-stamp.ts'), cwd, '--base', 'target', '--no-fetch', '--id'],
          {
            encoding: 'utf8',
            env,
          },
        ).trim();
      const reviewed = stamp();
      assert.match(reviewed, /^[0-9a-f]{12}$/);
      const result = run();
      assert.equal(result.status, 0, result.stderr);
      assert.equal(git('rev-parse', 'HEAD^{tree}'), git('rev-parse', 'oracle^{tree}'));
      assert.equal(git('rev-list', '--count', 'target..HEAD'), '2');
      assert.equal(stamp(), reviewed);
    },
  );
}

test('host envelopes, ordered records, frame counts and component order remain assertions', () => {
  const trace = (value: unknown) => gzipSync(JSON.stringify(value) + '\n');
  const event = trace(['message', { t: 'r:session', epoch: 1 }]);
  assert.throws(() => verifyPin(host, [event, event, event, trace(['input', {}])], [8, 9, 9, 10]), /unexplained/);
  const checkpoint = trace(['checkpoint', { data: { namespace: 'rail-v8', checksum: 42 } }]);
  assert.throws(() => verifyPin(host, Array(4).fill(checkpoint), [8, 8, 8, 8]), /checksum/);
  for (const [name, field] of [
    ['rail-schema.json', 'components'],
    ['railway-m12-trace.json', 'frames'],
    ['railway-tick-order-heads.json', 'perTick'],
  ] as const) {
    const row = { [field]: [1, 2] };
    assert.throws(() => checkPin(name, row, row, row, { [field]: [2, 1] }), /unexplained/);
  }
});

for (const mode of ['hashes', 'tick', 'missing'])
  test('target-only stack-rails ' + mode, () => {
    const target = { tick: 13164, stage: 1619678958, after: 3898472269 };
    const recorded = { tick: 13164, stage: 174967943, after: 3458877112 };
    const stages = (row?: typeof target): { stages: Record<string, typeof target> } => ({
      stages: row ? { 'stack-rails': row } : {},
    });
    const verify = () =>
      checkPin(
        'railway-golden.json',
        stages(),
        stages(target),
        stages(),
        mode === 'missing' ? stages() : stages({ ...recorded, tick: mode === 'tick' ? 13165 : 13164 }),
      );
    if (mode === 'hashes') verify();
    else if (mode === 'tick')
      assert.throws(verify, /\/stack-rails\/tick \(base <absent>, target 13164, branch <absent>, recorded 13165\)/);
    else assert.throws(verify, /stack-rails.*base <absent>.*target .*13164.*branch <absent>.*recorded <absent>/);
  });

test('allocate one reviewed increment after incoming history, preserving both entries', () => {
  const base = "const x = 1;\nexport const WORLD_NS = 'v8';\n";
  const branch = base.replace('export', '// v9 (today): the branch\nexport').replace("'v8'", "'v9'");
  const main = base.replace('export', '// v10 (today): main\nexport').replace("'v8'", "'v10'");
  assert.equal(
    allocate(base, main, branch),
    main.replace('export', '// v11 (today): the branch\nexport').replace("'v10'", "'v11'"),
  );
  assert.equal(allocate(base, main, base), main);
  assert.throws(() => allocate(base, main, branch.replace('x = 1', 'x = 2')), /outside/);
  assert.throws(() => allocate(base, main, branch.replace("'v9'", "'v12'")), /increment/);
});

test('guard names, order, ticks and op results while regenerating hash slots', () => {
  const name = 'railway-ops-golden.json';
  const base = {
    run: [
      ['jump', 0, 10],
      ['pack', 1, 20],
    ],
  };
  const main = {
    run: [
      ['jump', 1, 11],
      ['pack', 1, 20],
    ],
  };
  const job = {
    run: [
      ['jump', 0, 12],
      ['kit', 1, 21],
    ],
  };
  const merged = {
    run: [
      ['jump', 1, 13],
      ['kit', 1, 21],
    ],
  };
  checkPin(name, base, main, job, merged);
  checkPin(name, base, main, job, { run: [merged.run[0]!, ['kit', 1, 22]] });
  for (const row of [
    ['wrong', 1, 21],
    ['kit', 0, 21],
    ['kit', 1, -1],
  ])
    assert.throws(() => checkPin(name, base, main, job, { run: [merged.run[0]!, row] }), /unexplained/);
  assert.throws(() => checkPin(name, base, main, job, { run: merged.run.toReversed() }), /unexplained/);
  assert.throws(() => checkPin('railway-golden.json', { tick: 1 }, { tick: 2 }, { tick: 1 }, { tick: 3 }), /tick/);
  assert.throws(() => checkPin(name, { a: 1 }, {}, { a: 2 }, {}), /unexplained/);
});
