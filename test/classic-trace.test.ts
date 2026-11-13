import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CLASSIC_OPS, recordTrace, type TraceInput } from './helpers/classic-trace.ts';

const SEED = 0xf091;
const input = (op: string, fields: Record<string, unknown>, opts: Partial<TraceInput> = {}): TraceInput => ({
  from: 'alice',
  edit: { op, i: 0, j: 0, ...fields },
  ...opts,
});
// Frozen admitted-input cases for the first two states to move: normalization, colour, a second player,
// bounds, equal values, admission refusal and a commit losing its revision between admission and application.
const TUNE_ROSTER = [
  input('who.set', { n: '  A\u0000na  Smith  ', c: 2, u: 'forged', p: 'forged' }),
  input('who.set', { n: 'Ana Smith', c: 2 }),
  input('who.set', { n: '', c: 2 }),
  input('who.set', { n: 'Ana Smith', c: 8 }),
  input('who.set', { n: 'Ana Smith', c: 3 }),
  input('who.set', { n: 'Bob', c: 1 }, { from: 'bob' }),
  input('who.set', { n: 'abcdefghijklmnopqrst', c: 3 }),
  input('tune.set', { key: 'railFeedMs', v: 10 }),
  input('tune.set', { key: 'railFeedMs', v: 10 }),
  input('tune.set', { key: 'railFeedMs', v: 9 }),
  input('tune.set', { key: 'railFeedMs', v: 1001 }),
  input('tune.set', { key: 'railFeedMs', v: 20 }, { controlled: false }),
  input('tune.commit', { key: 'railFeedMs', v: 1000, expectedRevision: 2, requestId: 'max' }),
  input('tune.commit', { key: 'railFeedMs', v: 10, expectedRevision: 2, requestId: 'stale' }),
  input('tune.commit', { key: 'railFeedMs', v: 1000, expectedRevision: 3, requestId: 'equal' }),
  input('tune.commit', { key: 'railFeedMs', v: 20, expectedRevision: 4, requestId: 'first' }, { wait: 0 }),
  input('tune.commit', { key: 'railFeedMs', v: 30, expectedRevision: 4, requestId: 'race' }),
];
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('pin tune and roster admission, results and every intermediate state/hash', () => {
  const trace = recordTrace(SEED, TUNE_ROSTER);
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
  assert.equal(digest(trace.steps), '5f791550735e7619ea00ffd21cc8a4adf7d024c57632837ec8916adb0e8450d4');
  assert.deepEqual(recordTrace(SEED, trace.inputs), trace);
});

test('a seeded trace covers all 16 classic ops and replays recorded inputs exactly', () => {
  const mixed = CLASSIC_OPS.filter((op) => !op.startsWith('open.') && op !== 'tune.fill');
  const ops = [
    ...Array.from({ length: 20 }, () => mixed).flat(),
    input('tune.reset', {}, { from: 'host' }),
    input('tune.fill', {}, { from: 'host' }),
    input('site.run', { s: 0 }, { from: 'host' }),
    input('open.lay', {}),
    input('open.start', {}),
    input('open.here', {}),
  ];
  const trace = recordTrace(SEED, ops);
  assert.equal(CLASSIC_OPS.length, 16);
  assert.deepEqual(
    [...new Set(trace.steps.filter((s) => s.phase === 'apply').map((s) => s.op))].sort(),
    [...CLASSIC_OPS].sort(),
  );
  assert.deepEqual(recordTrace(SEED, ops), trace);
  assert.deepEqual(recordTrace(SEED, trace.inputs), trace);
  assert.equal(digest(trace.steps), '172e61e5931f947c4e0b119fa0c556a36001aac0ae68e5fb41350a6971500672');
});
