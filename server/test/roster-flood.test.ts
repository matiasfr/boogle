// Ported from the review: real host, replica, identity subscription, recorder queue and mark limiter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { fixture } from './helpers/rail-tune.ts';
import { setWho, serializeRoster } from '../../src/sim/roster.ts';
import { ROSTER_CHANGE_MS } from '../../src/world/rules/roster.ts';
import {
  onPlayMark,
  playMark,
  onRosterSnapshot,
  recordRosterSnapshot,
  ROSTER_SNAPSHOT_MS,
} from '../../src/proto/mark.ts';

test('rename and refill floods preserve other telemetry and eventually record the complete final roster', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = await fixture(t);
  for (let i = 0; i < 256; i++) {
    const pid = i === 0 ? 'alice' : `p${i}`;
    f.host.rules.roster.ensure(pid);
    setWho(f.host.rules.roster.roster, pid, `Player ${i}`, 0);
  }
  const a = f.join('alice'),
    b = f.join('bob');
  const source = readFileSync(new URL('../../src/proto/playdata/record.ts', import.meta.url), 'utf8');
  type Event = { k: string; n?: string; pid?: string; name?: string; color?: number; ordinal?: number };
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
    onRosterSnapshot: (fn: Parameters<typeof onRosterSnapshot>[0]) => t.after(onRosterSnapshot(fn)),
    onTuneRecord: () => {},
  };
  runInNewContext(
    stripTypeScriptTypes(source.slice(source.indexOf('function push('), source.indexOf('function recordTuning'))),
    ctx,
  );
  runInNewContext(
    stripTypeScriptTypes(source.slice(source.indexOf('const here ='), source.indexOf("push('step',"))),
    ctx,
  );
  const identity = readFileSync(new URL('../../src/features/identity.ts', import.meta.url), 'utf8');
  runInNewContext(
    stripTypeScriptTypes(
      identity.slice(identity.indexOf('let recordedRoster'), identity.indexOf('const WHO_EVERY_MS')),
    ),
    { railwayMirror: b.mirror, playMark, recordRosterSnapshot },
  );
  f.run(3);
  await f.settled();
  const ends = () => ctx.queue.filter((e) => e.k === 'roster.end').length;
  const complete = () => {
    const start = ctx.queue.findLastIndex((e) => e.k === 'roster.begin');
    const segment = ctx.queue.slice(start, start + 258);
    assert.equal(segment.length, 258);
    assert.equal(segment.at(-1)?.k, 'roster.end');
    assert.deepEqual(
      segment.slice(1, -1).map((e) => [e.pid, e.name, e.color]),
      serializeRoster(f.host.rules.roster.roster),
    );
  };
  complete();
  // Preserve unrelated events too; the old implementation evicted 2,000 events even from an empty queue.
  const sentinel = { k: 'unrelated' };
  ctx.queue.unshift(...Array.from({ length: 1000 }, () => sentinel));
  for (let i = 0; i < 20; i++) {
    assert.ok(a.adapter.act('who.set', { n: `Rename ${i}`, c: 0 }));
    f.run(12);
    await f.settled();
  }
  for (let i = 0; i < 10; i++) await f.settled();
  assert.equal(a.accepted.length, 2);
  assert.equal(a.refused.length, 18);
  assert.ok(a.refused.every((e) => e.reason === 'refused'));
  assert.equal(f.host.status().ready, true);
  assert.equal(ends(), 1, 'renames do not synchronously emit full snapshots');
  assert.equal(ctx.queue.filter((e) => e.k === 'm' && e.n === 'roster.player').length, 2);
  assert.equal(ctx.queue.length, 1260);
  assert.equal(ctx.dropped, 0);

  // A final change inside the window must be captured at its original trailing edge, not delayed by activity.
  t.mock.timers.tick(ROSTER_SNAPSHOT_MS - 1);
  f.advanceTime(ROSTER_CHANGE_MS);
  assert.ok(a.adapter.act('who.set', { n: 'Final', c: 3 }));
  f.run();
  await f.settled();
  assert.equal(a.accepted.length, 3);
  assert.equal(ends(), 1);
  t.mock.timers.tick(1);
  assert.equal(ends(), 2);
  complete();
  // Unchanged refills still produce complete recovery snapshots, but a refill flood shares one window.
  for (let i = 0; i < 20; i++) {
    b.disconnect();
    b.reconnect();
    f.run(3);
  }
  assert.equal(ends(), 2);
  t.mock.timers.tick(ROSTER_SNAPSHOT_MS);
  assert.equal(ends(), 3);
  complete();
  assert.equal(ctx.queue.length, 1777);
  assert.equal(ctx.queue.filter((e) => e === sentinel).length, 1000);
  assert.equal(ctx.dropped, 0);
  t.mock.timers.tick(ROSTER_SNAPSHOT_MS * 2);
  assert.equal(ends(), 3, 'no idle periodic snapshots');
});
