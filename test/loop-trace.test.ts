// The loop trace reads a session's marks onto graph nodes: today's names, older builds' names, and per-node tallies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSession } from '../dev/playtest/read.ts';
import { humanRows, reachedTimes } from '../dev/loop/trace.ts';

const session = (ev: Record<string, unknown>[]) =>
  parseSession('fixture', JSON.stringify({ at: '2026-11-09T00:00:00.000Z', card: 'railway', n: 0, now: 100, ev }));

test('trace maps marks to nodes, older names included', () => {
  const at = reachedTimes(
    session([
      { t: 1, k: 'm', n: 'woke' },
      { t: 10, k: 'm', n: 'stretch laid T1' },
      { t: 20, k: 'm', n: 'stretch laid', id: 'T2' },
      { t: 30, k: 'm', n: 'ability gained', what: 'jump' },
    ]),
  );
  assert.deepEqual([at.get('wake'), at.get('T1'), at.get('T2'), at.get('jump')], [1, 10, 20, 30]);
  assert.equal(at.has('T3'), false);
});

test('trace tallies carries by station and confusion by window', () => {
  const rows = new Map(
    humanRows(
      session([
        { t: 1, k: 'm', n: 'woke' },
        { t: 3, k: 'm', n: 'deposit', station: 'T1', material: 'rails', mine: true },
        { t: 4, k: 'm', n: 'deposit', station: 'T1', material: 'rails', mine: true },
        { t: 9, k: 'm', n: 'deposit', station: 'T1', material: 'rails', mine: true },
        { t: 5, k: 'press', verb: 'nothing in reach' },
        { t: 6, k: 'prompt', verb: 'take' },
        { t: 10, k: 'm', n: 'stretch laid T1' },
        { t: 12, k: 'press', verb: 'take', ran: false },
      ]),
    ).map((r) => [r.id, r]),
  );
  const t1 = rows.get('T1')!;
  assert.deepEqual([t1.carries, t1.noReach, t1.shown, t1.pressed, t1.confusion], [2, 1, 1, 0, 2.5]);
  // After T1 the time belongs to the first node never reached.
  assert.equal(rows.get('T2')!.refused, 1);
  assert.equal(rows.get('T2')!.rank, 2);
  assert.equal(t1.rank, 1);
});
