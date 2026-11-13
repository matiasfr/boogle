import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSIC_OPS, recordTrace, pinTrace, type TraceFixture, type TraceStep } from './helpers/classic-trace.ts';

const fixture = (name: string): TraceFixture =>
  JSON.parse(readFileSync(new URL(`./fixtures/classic-trace-${name}.json`, import.meta.url), 'utf8')) as TraceFixture;

function assertPinned(steps: TraceStep[], expected: TraceFixture['expected']) {
  assert.deepEqual(pinTrace(steps), expected, 'per-key tune histories and every intermediate state/result/hash');
  const keys = Object.keys(expected.tune);
  const values = new Map<string, number>();
  steps.forEach((step, i) => {
    const tune = step.state.tune as { revision: number; values: Record<string, number> };
    // Object equality ignores insertion order; the lockstep catalog's append-only order is also a contract.
    assert.deepEqual(Object.keys(tune.values), keys, `tune key order at step ${i}`);
    // Frozen FNV contract, evaluated from the fixture's values. Do not import the live hash implementation:
    // changing hashTune must still fail. Revision is pinned in this step's SHA above. An append needs only a
    // new keyed history; raw tune hashes are checked at every step without regenerating unrelated pins.
    const fold = (h: number, v: number) => Math.imul(h ^ v, 16777619) >>> 0;
    let hash = fold(2166136261, tune.revision);
    keys.forEach((key, k) => {
      const change = expected.tune[key]!.find(([start]) => start === i);
      if (change) values.set(key, change[1]);
      assert.ok(values.has(key), `initial tune value for ${key}`);
      hash = fold(fold(hash, k), values.get(key)!);
    });
    assert.equal(step.hashes.tune, hash, `tune hash at step ${i}`);
  });
}

test('pin tune and roster admission, results and every intermediate state/hash', () => {
  const recorded = fixture('tune-roster');
  const trace = recordTrace(recorded.seed, recorded.inputs);
  const applied = trace.steps.filter((s) => s.phase === 'apply');
  assert.deepEqual(
    trace.steps.filter((s) => s.phase === 'admit').map((s) => s.accepted),
    [true, false, false, false, true, true, true, true, true, false, false, false, true, false, true, true, true],
  );
  assert.deepEqual(
    applied.slice(0, 4).map((s) => s.result),
    [{ idx: 0 }, { idx: 0 }, { idx: 1 }, { idx: 0 }],
  );
  assert.deepEqual(applied.at(-1)?.result, { requestId: 'race', status: 'rejected', revision: 5 });
  assert.deepEqual(trace.steps.at(-1)?.state.roster, [
    ['alice', 'abcdefghijklmnop', 3],
    ['bob', 'Bob', 1],
  ]);
  assertPinned(trace.steps, recorded.expected);
  assert.deepEqual(recordTrace(recorded.seed, trace.inputs), trace);
});

test('the original recorded inputs cover all 16 classic ops and replay exactly', () => {
  const recorded = fixture('all-ops');
  const trace = recordTrace(recorded.seed, recorded.inputs);
  assert.equal(CLASSIC_OPS.length, 16);
  assert.deepEqual(
    [...new Set(trace.steps.filter((s) => s.phase === 'apply').map((s) => s.op))].sort(),
    [...CLASSIC_OPS].sort(),
  );
  assertPinned(trace.steps, recorded.expected);
  assert.deepEqual(recordTrace(recorded.seed, trace.inputs), trace);
});
