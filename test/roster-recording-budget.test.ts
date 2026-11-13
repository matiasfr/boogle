// Port of the independent review's regression: run the actual browser recorder's subscriptions and limiter.
// Only browser dependencies and the queue sink are supplied by this Node context; no budget stub or duplicate logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { onPlayMark, playMark, onRosterSnapshot, recordRosterSnapshot, ROSTER_SNAPSHOT_MS } from '../src/proto/mark.ts';

test('a full roster and late recorder retain every row even after the real mark budget is exhausted', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const source = readFileSync(new URL('../src/proto/playdata/record.ts', import.meta.url), 'utf8');
  const marks = source.slice(source.indexOf('const here ='), source.indexOf("push('step',"));
  const snapshots = source.slice(source.indexOf('onRosterSnapshot('), source.indexOf('function recordTuning'));
  const budget = Number(source.match(/const MARKS_PER_WINDOW = (\d+)/)![1]);
  const events: { kind: string; n?: string; name?: string; count?: number; ordinal?: number }[] = [];
  const ctx = {
    me: {},
    round: Math.round,
    MARKS_PER_WINDOW: budget,
    onPlayMark,
    onRosterSnapshot: (fn: Parameters<typeof onRosterSnapshot>[0]) => t.after(onRosterSnapshot(fn)),
    push: (kind: string, fields: object) => events.push({ kind, ...fields }),
    dropped: 0,
  };
  assert.ok(marks.includes('marksLeft--') && snapshots.includes("push('roster.end'"));
  runInNewContext(stripTypeScriptTypes(marks), ctx);
  for (let i = 0; i < budget + 1; i++) playMark('exhaust');
  assert.equal(events.length, budget);
  assert.equal(ctx.dropped, 1, 'the real limiter must be active');
  events.length = 0;

  const railwayMirror = createRailwayMirror();
  const identity = readFileSync(new URL('../src/features/identity.ts', import.meta.url), 'utf8');
  const listener = identity.slice(identity.indexOf('let recordedRoster'), identity.indexOf('const WHO_EVERY_MS'));
  runInNewContext(stripTypeScriptTypes(listener), { railwayMirror, playMark, recordRosterSnapshot });
  const rows = Array.from({ length: 256 }, (_, i) => ({ pid: `p${i}`, name: `Player ${i}`, color: 0 }));
  assert.equal(railwayMirror.mirror.apply({ t: 's', tk: 1, w: 1, c: rows.map((row, i) => ['player', i, row]) }), true);
  // The recorder may load after the first packet; the channel supplies its cached full snapshot.
  runInNewContext(stripTypeScriptTypes(snapshots), ctx);
  const complete = (changed = false) => {
    assert.equal(events.length, 258);
    assert.equal(events[0]!.kind, 'roster.begin');
    assert.equal(events.at(-1)!.kind, 'roster.end');
    assert.equal(events.at(-1)!.count, 256);
    rows.forEach((row, i) => {
      assert.equal(events[i + 1]!.kind, 'roster.player');
      assert.equal(events[i + 1]!.ordinal, i);
      assert.equal(events[i + 1]!.name, changed && i === 0 ? 'Changed' : row.name);
    });
    events.length = 0;
  };
  complete();
  assert.equal(railwayMirror.mirror.apply({ t: 's', tk: 2, c: [['player', 0, { name: 'Changed' }]] }), true);
  assert.equal(events.length, 0, 'rename only attempts one budgeted mark until the trailing snapshot');
  t.mock.timers.tick(ROSTER_SNAPSHOT_MS);
  complete(true);
  assert.equal(ctx.dropped, 2, 'incremental marks still respect the budget; the snapshot does not');
});
