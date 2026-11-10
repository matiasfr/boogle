// The loop trace reads a session's marks onto graph nodes: today's names, older builds' names, and per-node tallies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSession } from '../dev/playtest/read.ts';
import { humanRows, notTheLoop, predictedSegment, reachedTimes } from '../dev/loop/trace.ts';
import type { NodeId } from '../dev/loop/graph.ts';

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

test('a detour compares only a window that is a canonical segment', () => {
  const s = session([
    { t: 1, k: 'm', n: 'woke' },
    { t: 30, k: 'm', n: 'stretch laid T1' },
    { t: 31, k: 'm', n: 'stretch laid T2' },
    { t: 90, k: 'm', n: 'stretch laid T3' },
    { t: 200, k: 'm', n: 'forge lit' },
  ]);
  const rows = humanRows(s);
  const row = (id: NodeId) => rows.find((r) => r.id === id)!;
  const pred = new Map<NodeId, number>([
    ['T1', 30],
    ['T3', 100],
    ['jump', 7],
    ['beam', 50],
    ['forge', 80],
  ]);
  assert.equal(predictedSegment(row('T1'), rows, pred), 30);
  assert.equal(predictedSegment(row('T2'), rows, pred), undefined, 'two marks a second apart');
  assert.equal(predictedSegment(row('T3'), rows, pred), 100, 'the beam is not optional: done elsewhere, not inside');
  assert.equal(predictedSegment(row('forge'), rows, pred), 87, 'the skipped optional jump sits inside');
  assert.equal(notTheLoop(s), null);
  assert.equal(notTheLoop(session([{ t: 1, k: 'm', n: 'stretch laid', id: 'T1' }])), 'an older world');
});
