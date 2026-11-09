// The harness verdict stamp (dev/look/verdict.ts): when a run counts as under load, and when it was killed from outside.
import test from 'node:test';
import assert from 'node:assert/strict';
import { killReason, stampLine, stampOf } from '../dev/look/verdict.ts';

const base = { git: { commit: 'abc123456789', tree: 'def', dirty: 0 }, startedAt: 0, endedAt: 1000, command: 'node x' };
const slot = (loadAtStart: number, loadTimedOut = false) => ({ queueWaitMs: 2000, loadAtStart, loadTimedOut });

test('under load: either end above the limit, or the gate gave up waiting', () => {
  assert.equal(stampOf({ ...base, slot: slot(12), loadAtEnd: 14, limit: 30 }).underLoad, false);
  assert.equal(stampOf({ ...base, slot: slot(41), loadAtEnd: 14, limit: 30 }).underLoad, true);
  assert.equal(stampOf({ ...base, slot: slot(12), loadAtEnd: 31, limit: 30 }).underLoad, true);
  assert.equal(stampOf({ ...base, slot: slot(1, true), loadAtEnd: 1, limit: 30 }).underLoad, true);
  assert.equal(stampOf({ ...base, slot: slot(41), loadAtEnd: 1, limit: 0 }).underLoad, true, 'off is judged at 30');
  const s = stampOf({ ...base, loadAtEnd: 2.345, limit: 30 });
  assert.equal(s.loadAtEnd, 2.35);
  assert.equal(s.queueWaitMs, undefined, 'no slot taken: no queue wait');
  assert.equal(s.startedAt, '1970-01-01T00:00:00.000Z');
});

test('report line: a pass under load says it is not evidence', () => {
  const under = stampOf({ ...base, slot: slot(41), loadAtEnd: 14, limit: 30 });
  assert.match(stampLine('pass', under), /passed under load: not evidence of timing or feel/);
  assert.doesNotMatch(stampLine('failure', under), /not evidence/);
  assert.doesNotMatch(stampLine('pass', stampOf({ ...base, slot: slot(2), loadAtEnd: 2, limit: 30 })), /not evidence/);
  const shared = stampOf({ ...base, slot: slot(2), shared: true, loadAtEnd: 2, limit: 30 });
  assert.equal(shared.shared, true);
  assert.match(stampLine('pass', shared), /shared the machine with another run/);
});

test('killed: a signal, or the browser closed under a failing run; a game failure stays a failure', () => {
  assert.equal(killReason({ verdict: 'failure' }, 'SIGTERM'), 'signal SIGTERM');
  const closed = 'page.evaluate: Target page, context or browser has been closed';
  assert.match(killReason({ verdict: 'failure', error: closed }) ?? '', /browser closed from outside/);
  assert.match(killReason({ verdict: 'failure', errors: ['x', `Error: ${closed}\n  at y`] }) ?? '', /closed$/);
  assert.equal(killReason({ verdict: 'beat-failure', error: 'NEVER: hook' }), undefined);
  assert.equal(killReason({ verdict: 'pass', error: closed }), undefined);
});
