// Sync diagnostics: the actual recorder limiter and snapshot sink must survive lost incremental seat marks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { onPlayMark, playMark, onSeatSnapshot, recordSeatSnapshot, SEAT_SNAPSHOT_MS } from '../src/proto/mark.ts';

test('seat recovery snapshots survive the mark budget and coalesce floods at a fixed trailing edge', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const source = readFileSync(new URL('../src/proto/playdata/record.ts', import.meta.url), 'utf8');
  const budget = Number(source.match(/const MARKS_PER_WINDOW = (\d+)/)![1]);
  type Event = { kind: string; id?: string; pid?: string; count?: number; ordinal?: number };
  const events: Event[] = [];
  const ctx = {
    me: {},
    round: Math.round,
    MARKS_PER_WINDOW: budget,
    onPlayMark,
    onSeatSnapshot: (fn: Parameters<typeof onSeatSnapshot>[0]) => t.after(onSeatSnapshot(fn)),
    push: (kind: string, fields: object) => events.push({ kind, ...fields }),
    dropped: 0,
  };
  runInNewContext(
    stripTypeScriptTypes(source.slice(source.indexOf('const here ='), source.indexOf("push('step',"))),
    ctx,
  );
  for (let i = 0; i < budget + 1; i++) playMark('exhaust');
  assert.equal(events.length, budget);
  assert.equal(ctx.dropped, 1);
  events.length = 0;
  const rows = Array.from({ length: 8 }, (_, i) => ({ id: `chair-${i}`, pid: `player-${i}` }));
  recordSeatSnapshot({ rows, tick: 1 });
  // Late recorder still gets a complete current snapshot without spending the exhausted mark allowance.
  runInNewContext(
    stripTypeScriptTypes(source.slice(source.indexOf('onSeatSnapshot('), source.indexOf('function makeBatch'))),
    ctx,
  );
  assert.equal(events.length, 10);
  assert.equal(events[0]!.kind, 'seat.begin');
  assert.equal(events[9]!.kind, 'seat.end');
  assert.equal(events[9]!.count, 8);
  rows.forEach((row, i) => assert.equal(events[i + 1]!.id, row.id));
  events.length = 0;
  for (let i = 0; i < 200; i++) recordSeatSnapshot({ rows, tick: i + 2 });
  playMark('seat.player', { pid: 'player-0', id: null });
  assert.equal(ctx.dropped, 2);
  t.mock.timers.tick(SEAT_SNAPSHOT_MS - 1);
  assert.equal(events.length, 0);
  recordSeatSnapshot({ rows: [], tick: 203 });
  t.mock.timers.tick(1);
  assert.equal(events.length, 2);
  assert.equal(events[1]!.count, 0, 'a final stand is recoverable even if its mark was dropped');
  events.length = 0;
  t.mock.timers.tick(SEAT_SNAPSHOT_MS * 2);
  assert.equal(events.length, 0, 'no idle periodic snapshots');
});
