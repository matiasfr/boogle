// Real host, seat mirror subscription and recorder queue: a remote peer records every authoritative sit, move, stand and
// missed change without a local receipt, and floods cannot evict unrelated telemetry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { fixture } from './helpers/rail-tune.ts';
import { recordSeats } from '../../src/adapters/seat-recording.ts';
import { onPlayMark, onSeatSnapshot, SEAT_SNAPSHOT_MS } from '../../src/proto/mark.ts';
import { SEAT_SIT_MS } from '../../src/world/rules/seats.ts';
import { RULE_STEPS } from '../../src/world/room-clock.ts';

test('a remote peer records sits, stands and missed changes; floods keep unrelated events and the final table', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = await fixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  const source = readFileSync(new URL('../../src/proto/playdata/record.ts', import.meta.url), 'utf8');
  type Event = { k: string; n?: string; id?: string | null; pid?: string; count?: number; tick?: number };
  const ctx = {
    queue: [] as Event[],
    QUEUE: Number(source.match(/const QUEUE = (\d+)/)![1]),
    stopped: false,
    dropped: 0,
    clock: () => 0,
    me: {},
    round: Math.round,
    MARKS_PER_WINDOW: Number(source.match(/const MARKS_PER_WINDOW = (\d+)/)![1]),
    onPlayMark,
    onSeatSnapshot: (fn: Parameters<typeof onSeatSnapshot>[0]) => t.after(onSeatSnapshot(fn)),
  };
  runInNewContext(
    stripTypeScriptTypes(source.slice(source.indexOf('function push('), source.indexOf('// Complete configuration'))),
    ctx,
  );
  runInNewContext(
    stripTypeScriptTypes(source.slice(source.indexOf('onSeatSnapshot('), source.indexOf('function makeBatch'))),
    ctx,
  );
  runInNewContext(
    stripTypeScriptTypes(source.slice(source.indexOf('const here ='), source.indexOf("push('step',"))),
    ctx,
  );
  t.after(recordSeats(b.mirror.seats));
  f.run(3);
  const ends = () => ctx.queue.filter((e) => e.k === 'seat.end').length;
  const marks = () => ctx.queue.filter((e) => e.k === 'm' && e.n === 'seat.player').map((e) => [e.pid, e.id, e.tick]);
  const tick = () => Math.floor(f.host.sync.roomStep() / RULE_STEPS);
  assert.equal(ends(), 1);
  const sentinel = { k: 'unrelated' };
  ctx.queue.unshift(...Array.from({ length: 1000 }, () => sentinel));
  for (let i = 0; i < 40; i++) {
    a.adapter.act('seat.sit', { id: `chair-${i}` });
    f.run();
  }
  assert.ok(a.accepted.length < 5, 'host cadence bounds accepted spam');
  assert.ok(a.refused.length > 30);
  assert.ok(a.refused.every((event) => event.reason === 'rate'));
  assert.equal(marks().length, a.accepted.length, 'one incremental mark per accepted sit, recorded by the other peer');
  assert.equal(ends(), 1, 'changes never synchronously flood full snapshots');
  t.mock.timers.tick(SEAT_SNAPSHOT_MS - 1);
  f.advanceTime(SEAT_SIT_MS);
  a.adapter.act('seat.sit', { id: 'final-chair' });
  f.run();
  assert.deepEqual(marks().at(-1), ['alice', 'final-chair', tick()]);
  t.mock.timers.tick(1);
  assert.equal(ends(), 2);
  assert.equal(ctx.queue.at(-2)!.id, 'final-chair');
  assert.equal(ctx.queue.at(-1)!.count, 1);
  a.adapter.act('seat.stand', {});
  f.run();
  assert.deepEqual(marks().at(-1), ['alice', null, tick()], 'a stand is recorded as a cleared seat');
  // A change the peer missed while away is recorded as an incremental mark once its refill lands.
  b.disconnect();
  f.advanceTime(SEAT_SIT_MS);
  a.adapter.act('seat.sit', { id: 'away-chair' });
  f.run();
  const missed = marks().length;
  b.reconnect();
  f.run(3);
  assert.deepEqual(
    marks()
      .slice(missed)
      .map(([pid, id]) => [pid, id]),
    [['alice', 'away-chair']],
  );
  assert.equal(b.accepted.length, 0, 'the recording never depends on a local receipt');
  for (let i = 0; i < 40; i++) {
    b.disconnect();
    b.reconnect();
    f.run(3);
  }
  assert.equal(ends(), 2, 'unchanged refills share the same trailing window');
  t.mock.timers.tick(SEAT_SNAPSHOT_MS);
  assert.equal(ends(), 3);
  assert.equal(ctx.queue.at(-2)!.id, 'away-chair');
  assert.equal(ctx.queue.at(-1)!.count, 1);
  assert.ok(ctx.queue.length < 1020, 'snapshot and incremental traffic remain bounded');
  assert.equal(ctx.queue.filter((e) => e === sentinel).length, 1000);
  assert.equal(ctx.dropped, 0);
  const settled = ctx.queue.length;
  f.run(30);
  t.mock.timers.tick(SEAT_SNAPSHOT_MS * 2);
  assert.equal(ends(), 3, 'no idle periodic snapshots');
  assert.equal(ctx.queue.length, settled, 'unchanged packets record nothing');
});
