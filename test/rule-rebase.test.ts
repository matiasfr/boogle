import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { allocate, checkPin, host, namespace, ruleConflicts, verifyPin } from '../dev/rule-pins.ts';

test('the entire conflict set must consist of known pins or the namespace', () => {
  assert.equal(ruleConflicts([host, namespace]), true);
  for (const files of [[], [host, 'src/world/rule.ts'], ['test/fixtures/something.json']])
    assert.equal(ruleConflicts(files), false);
});

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

test('guard the names, order, ticks, op results and one-sided hashes', () => {
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
  for (const row of [
    ['wrong', 1, 21],
    ['kit', 0, 21],
    ['kit', 1, 22],
  ])
    assert.throws(() => checkPin(name, base, main, job, { run: [merged.run[0]!, row] }), /unexplained/);
  assert.throws(() => checkPin(name, base, main, job, { run: merged.run.toReversed() }), /unexplained/);
  assert.throws(() => checkPin('railway-golden.json', { tick: 1 }, { tick: 2 }, { tick: 1 }, { tick: 3 }), /tick/);
  assert.throws(() => checkPin(name, { a: 1 }, {}, { a: 2 }, {}), /unexplained/);
});
