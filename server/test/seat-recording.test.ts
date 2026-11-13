// Sync diagnostics: real host rows feed each tab's actual recording subscription independently of receipts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fixture } from './helpers/rail-tune.ts';
import { SEAT_SIT_MS } from '../../src/world/rules/seats.ts';
import { SEAT_SNAPSHOT_MS } from '../../src/proto/mark.ts';
import { RULE_STEPS } from '../../src/world/room-clock.ts';
type Client = ReturnType<Awaited<ReturnType<typeof fixture>>['join']>;
type Record = { kind: string; pid?: string; id?: string | null; count?: number };
let serial = 0;
async function record(client: Client, cleanup: (fn: () => void) => void) {
  const suffix = `?seat-recording=${serial++}`;
  const mark = new URL('../../src/proto/mark.ts', import.meta.url);
  const binder = new URL('../../src/adapters/seat-recording.ts', import.meta.url);
  mark.search = binder.search = suffix;
  const hooks = registerHooks({
    resolve(specifier, ctx, next) {
      if (ctx.parentURL === binder.href && specifier === '../proto/mark.ts')
        return { url: mark.href, shortCircuit: true };
      return next(specifier, ctx);
    },
  });
  try {
    const channel: typeof import('../../src/proto/mark.ts') = await import(mark.href);
    const binding: typeof import('../../src/adapters/seat-recording.ts') = await import(binder.href);
    const records: Record[] = [];
    channel.onPlayMark((kind, fields) => records.push({ kind, ...fields }));
    cleanup(
      channel.onSeatSnapshot(({ rows }) => {
        records.push({ kind: 'seat.begin', count: rows.length });
        for (const row of rows) records.push({ kind: 'seat.player', ...row });
        records.push({ kind: 'seat.end', count: rows.length });
      }),
    );
    cleanup(binding.recordSeats(client.mirror.seats));
    return records;
  } finally {
    hooks.deregister();
  }
}

test('each peer records sit, move, stand and changed reconnect snapshots without requiring local receipts', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = await fixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  const records = [await record(a, (fn) => t.after(fn)), await record(b, (fn) => t.after(fn))];
  f.run(3);
  for (const r of records) r.length = 0;
  a.adapter.act('seat.sit', { id: 'chair-a' });
  f.run();
  for (const r of records)
    assert.deepEqual(r, [
      { kind: 'seat.player', pid: 'alice', id: 'chair-a', tick: Math.floor(f.host.sync.roomStep() / RULE_STEPS) },
    ]);
  f.advanceTime(SEAT_SIT_MS);
  a.adapter.act('seat.sit', { id: 'chair-b' });
  f.run();
  a.adapter.act('seat.stand', {});
  f.run();
  for (const r of records)
    assert.deepEqual(
      r.map((e) => e.id),
      ['chair-a', 'chair-b', null],
    );
  assert.equal(b.accepted.length, 0);
  b.disconnect();
  f.advanceTime(SEAT_SIT_MS);
  a.adapter.act('seat.sit', { id: 'chair-a' });
  f.run();
  b.reconnect();
  const late = f.join('late');
  const lateRecords = await record(late, (fn) => t.after(fn));
  f.run(3);
  t.mock.timers.tick(SEAT_SNAPSHOT_MS);
  for (const r of [...records, lateRecords]) {
    assert.equal(r.at(-1)!.kind, 'seat.end');
    assert.equal(r.at(-1)!.count, 1);
    assert.equal(r.at(-2)!.id, 'chair-a');
  }
  const lengths = records.map((r) => r.length);
  f.run(30);
  assert.deepEqual(
    records.map((r) => r.length),
    lengths,
  );
});
