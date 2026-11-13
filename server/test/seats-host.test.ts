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
