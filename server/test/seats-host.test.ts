import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { assignSeats, type Grants, type SeatRequest } from '../../src/entities/railway/seat-claims.ts';
import type { ServerPacket } from '../../src/world/replicate.ts';
import { fixture as adapterFixture } from './helpers/rail-tune.ts';
import { createSeatShadow } from '../../src/entities/railway/seat-shadow.ts';

test('review: sit-stand-sit 100 ms apart recovers the shadow row within 1 second', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice');
  const shadow = createSeatShadow(a.adapter, f.now);
  t.after(() => shadow.dispose());
  const run = (n: number) => {
    for (let k = 0; k < n; k++) {
      f.run();
      shadow.update();
    }
  };
  f.run(3);
  shadow.sit({ id: 'chair' });
  f.run(1);
  shadow.stand();
  f.run(1);
  f.advanceTime(66);
  shadow.sit({ id: 'chair' });
  f.run(1);
  assert.equal(a.refused.at(-1)?.reason, 'rate');
  run(70);
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  const sent = a.edits.length;
  run(180);
  assert.equal(a.edits.length, sent, 'accepted receipt stops shadow retries');
  console.log('Rapid re-sit: rate refused at 100 ms; reclaimed after one 1000 ms retry; retries stop on acceptance');
});

test('shadow retries a full request window with its alternates; taken stops without sending a stand', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  const shadow = createSeatShadow(a.adapter, f.now);
  t.after(() => shadow.dispose());
  const run = (n: number) => {
    for (let i = 0; i < n; i++) {
      f.run();
      shadow.update();
    }
  };
  run(70);
  assert.equal(a.edits.length, 0, 'startup does not send an unsolicited stand');
  b.adapter.act('seat.sit', { id: 'chair' });
  f.run(2);
  for (let i = 0; i < 8; i++) a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 30 + i });
  shadow.sit({ id: 'chair', alt: ['next'] });
  assert.equal(
    a.edits.some((e) => e.op === 'seat.sit'),
    false,
    'the full window refused queuing',
  );
  run(70);
  assert.ok(f.host.status().seats.some((r) => r.pid === 'alice' && r.id === 'next'));
  assert.deepEqual(a.edits.find((e) => e.op === 'seat.sit')?.alt, ['next']);
  shadow.stand();
  run(2);
  shadow.sit({ id: 'chair' });
  run(70);
  assert.equal(a.refused.at(-1)?.reason, 'taken');
  const sent = a.edits.length;
  run(180);
  assert.equal(a.edits.length, sent, 'taken ends this claim without standing the visible sitter');
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'bob' }]);
});

test('shadow reclaims after a whole reconnect mirror and disposes its receipt listeners', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice');
  const shadow = createSeatShadow(a.adapter, f.now);
  const run = (n: number) => {
    for (let i = 0; i < n; i++) {
      f.run();
      shadow.update();
    }
  };
  run(3);
  shadow.sit({ id: 'chair', alt: ['next'] });
  run(3);
  a.disconnect();
  f.host.rules.seats.clear();
  a.reconnect();
  run(100);
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  assert.equal(a.edits.filter((e) => e.op === 'seat.sit').length, 2);
  shadow.dispose();
  a.disconnect();
  f.host.rules.seats.clear();
  a.reconnect();
  run(100);
  assert.deepEqual(f.host.status().seats, [], 'disposed helper does not react to later resets');
});

test('existing roster, rail tuning and railway refusals retain their reasons and session behavior', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice');
  f.run(3);
  const epoch = a.adapter.read.debug().epoch;
  for (const [op, fields] of [
    ['who.set', { n: 42, c: 0 }],
    ['tune.set', { key: 'railRegrowMinutes', v: -1 }],
    ['tune.commit', { key: 'railRegrowMinutes', v: 40, expectedRevision: -1, requestId: 'bad' }],
  ] as const) {
    assert.notEqual(a.adapter.act(op, fields), false);
    f.run(2);
    assert.equal(a.refused.at(-1)?.op, op);
    assert.equal(a.refused.at(-1)?.reason, 'refused');
    assert.equal(a.adapter.read.debug().epoch, epoch, op);
    assert.equal(a.adapter.read.ready(), true, op);
  }
  const railRefused: string[] = [];
  a.adapter.onRefused((e) => railRefused.push(e.reason));
  assert.equal(a.adapter.callTrain(0, 1), true); // no reachable halt from this fixture's wake pose
  f.run(2);
  assert.deepEqual(railRefused, ['refused']);
  assert.equal(a.adapter.read.debug().epoch, epoch);
  assert.equal(a.adapter.read.ready(), true);
});

for (const reason of ['order', 'session'] as const) {
  test(`existing ${reason} receipt still invalidates the client session`, async (t) => {
    const f = await adapterFixture(t);
    const a = f.join('alice');
    f.run(3);
    const { epoch, next } = a.adapter.read.debug();
    f.host.replication.reject('alice', epoch, next, reason);
    f.run();
    assert.equal(a.adapter.read.debug().epoch, 0);
    assert.equal(a.adapter.read.ready(), false);
  });
}

async function fixture(t: TestContext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-seats-'));
  const store = createStore({ dataDir: dir, maxRooms: 1 });
  await store.init();
  let now = 1800000000000;
  let lead: { id: string; pid: string }[] | null = null;
  const logs: unknown[][] = [];
  const pids = new Map([
    ['a', 'alice'],
    ['b', 'bob'],
    ['c', 'charlie'],
    ['a2', 'alice'],
  ]);
  const host = createRailwayWorldHost({
    roomId: railwayRoomId('seats'),
    store,
    tick: false,
    now: () => now,
    pidOf: (sid) => pids.get(sid) ?? null,
    shadowSeats: () => lead,
    log: (...args) => logs.push(args),
  });
  t.after(async () => {
    await host.close();
    await fs.rm(dir, { recursive: true, force: true });
  });
  await host.whenReady();
  const sequences = new Map<string, number>();
  const epochs = new Map<string, number>();
  host.onSend((m) => {
    if (m.t === 'r:session') epochs.set(m.to as string, m.epoch as number);
  });
  function open(sid: string) {
    host.replication.addClient(sid);
    host.deliver({ t: 'r:open' }, sid);
  }
  for (const sid of ['a', 'b', 'c']) open(sid);
  function send(sid: string, fields: Record<string, unknown>, request = (sequences.get(sid) ?? 0) + 1) {
    sequences.set(sid, request);
    host.deliver({ t: 'r:edit', e: { ...fields, epoch: epochs.get(sid), request, at: [0, 0, 0], ms: 0 } }, sid);
    const packets: ServerPacket[] = [];
    host.replication.commit(host.sync.roomStep());
    host.replication.flush(host.sync.roomStep(), (cid, p) => {
      if (cid === sid) packets.push(p);
    });
    return packets.flatMap((p) => p.rej ?? []).find((r) => r[1] === request)?.[2] ?? null;
  }
  function step(ms: number) {
    now += ms;
    host.step(ms / 1000);
  }
  return {
    host,
    send,
    step,
    open,
    logs,
    lead: (rows: typeof lead) => {
      lead = rows;
    },
  };
}

test('real client adapters retain the session and refusal detail after rapid sits and a contested chair', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  f.run(3);
  a.adapter.act('seat.sit', { id: 'chair' });
  f.run(3);
  const epoch = a.accepted.at(-1)!.epoch;
  f.advanceTime(100);
  a.adapter.act('seat.sit', { id: 'chair' });
  f.run(3);
  assert.equal(a.refused.at(-1)?.reason, 'rate');
  b.adapter.act('seat.sit', { id: 'chair' });
  f.run(3);
  assert.equal(b.refused.at(-1)?.reason, 'taken');
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  a.adapter.act('seat.stand', {});
  f.run(3);
  assert.equal(a.accepted.at(-1)?.epoch, epoch, 'a seat refusal must not reopen the session');
  f.advanceTime(1000);
  a.adapter.act('seat.sit', { id: 'chair' });
  f.run(3);
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  assert.deepEqual(a.mirror.roster.roster, b.mirror.roster.roster);
});

test('server seat receipts: first free, one seat per pid, duplicate, taken and rate preserve occupants', async (t) => {
  const f = await fixture(t);
  assert.equal(f.send('a', { op: 'seat.sit', id: 'chair' }), null);
  assert.equal(f.send('a', { op: 'seat.sit', id: 'forged-replay' }, 1), null);
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }], 'accepted duplicate applies once');
  f.step(100);
  assert.equal(f.send('a', { op: 'seat.sit', id: 'chair' }), 'rate');
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  assert.equal(f.send('a', { op: 'seat.sit', id: 'elsewhere' }, 2), 'rate', 'duplicate keeps its reason');
  assert.equal(f.send('b', { op: 'seat.sit', id: 'chair', alt: ['next', 'last'] }), null);
  assert.equal(f.send('c', { op: 'seat.sit', id: 'chair' }), 'taken');
  assert.equal(f.send('c', { op: 'seat.sit', id: 'last' }), null, 'taken did not spend cadence');
  f.step(300);
  assert.equal(f.send('a', { op: 'seat.sit', id: 'moved' }), null, 'refused sit did not move cadence');
  assert.equal(f.host.status().seats.length, 3);
  assert.equal(f.send('a', { op: 'seat.stand', u: 'bob', id: 'next' }), null);
  assert.ok(f.host.status().seats.some((r) => r.pid === 'bob' && r.id === 'next'));
  assert.equal(f.send('a', { op: 'seat.stand', u: 'bob' }), 'refused');
  assert.equal(f.send('b', { op: 'seat.stand' }), null);
  f.step(1000);
  assert.equal(f.send('b', { op: 'seat.sit', id: 'next' }), null);
  assert.deepEqual(f.host.sync.registry().states, ['roster', 'railTune', 'railway']);
  assert.equal('seats' in f.host.sync.snapshot().data, false);
});

test('hostile seats stay nonfatal, preserve the chair, and permit a later durable checkpoint', async (t) => {
  const f = await fixture(t);
  f.send('a', { op: 'seat.sit', id: 'chair' });
  const invalid = [null, {}, [], 42, '', 'bad id', 'a\n', 'x'.repeat(65)];
  for (const id of invalid) assert.equal(f.send('b', { op: 'seat.sit', id }), 'refused');
  for (const alt of [null, {}, 'chair', Array(8).fill('chair'), ['bad id']])
    assert.equal(f.send('b', { op: 'seat.sit', id: 'valid', alt }), 'refused');
  for (let i = 0; i < 80; i++) assert.equal(f.send('a', { op: 'seat.sit', id: 'other', ms: 999999 }), 'rate');
  assert.equal(f.send('b', { op: 'seat.sit', id: 'chair', u: 'alice' }), 'taken');
  assert.equal(f.send('b', { op: 'seat.stand', u: 'alice' }), 'refused');
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  f.send('b', { op: 'who.set', n: 'Still healthy', c: 1 });
  await f.host.close();
  assert.equal(f.host.status().recoveryError, null);
});

test('a replacement session keeps its seat; departure and pause release transient rows', async (t) => {
  const f = await fixture(t);
  f.send('a', { op: 'seat.sit', id: 'chair' });
  f.open('a2');
  f.host.depart('a');
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  assert.equal(f.send('a2', { op: 'seat.sit', id: 'other' }), 'rate');
  f.host.depart('a2');
  assert.deepEqual(f.host.status().seats, []);
  f.send('b', { op: 'seat.sit', id: 'chair' });
  f.host.pause();
  assert.deepEqual(f.host.status().seats, []);
});

test('two-player shadow agrees after each lead sit/stand, and logs/counts a stable mismatch', async (t) => {
  const f = await fixture(t);
  const requests = new Map<string, SeatRequest>();
  const chairs = ['chair', 'next'].map((id) => ({ id, group: 'bench', available: () => true }));
  let grants: Grants = {};
  const compare = () => {
    grants = assignSeats(grants, requests, chairs);
    f.lead(Object.entries(grants).map(([id, g]) => ({ id, pid: g.peer === 'a' ? 'alice' : 'bob' })));
    f.step(100);
    f.step(500);
  };
  requests.set('a', { id: 'chair', ticket: 1 });
  f.send('a', { op: 'seat.sit', id: 'chair', alt: ['next'] });
  compare();
  requests.set('b', { id: 'chair', ticket: 1 });
  f.send('b', { op: 'seat.sit', id: 'chair', alt: ['next'] });
  compare();
  requests.delete('a');
  f.send('a', { op: 'seat.stand' });
  compare();
  requests.delete('b');
  f.send('b', { op: 'seat.stand' });
  compare();
  assert.deepEqual(f.host.status().seatShadow, { checks: 4, agreements: 4, mismatches: 0 });
  f.lead([{ id: 'chair', pid: 'alice' }]);
  f.step(100);
  f.step(500);
  assert.deepEqual(f.host.status().seatShadow, { checks: 5, agreements: 4, mismatches: 1 });
  assert.equal(f.logs.filter((args) => String(args[0]).includes('seat shadow mismatch')).length, 1);
  f.step(1000);
  assert.equal(f.host.status().seatShadow.mismatches, 1, 'unchanged mismatch is not logged every tick');
  console.log('Seat shadow: 4/4 agreement checkpoints; 1 injected mismatch logged/counted');
});
