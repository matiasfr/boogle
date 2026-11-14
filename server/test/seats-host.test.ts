import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import type { ServerPacket } from '../../src/world/replicate.ts';
import { fixture as adapterFixture } from './helpers/rail-tune.ts';
import { createSeatSession } from '../../src/entities/railway/seat-session.ts';
import type { SeatSit } from '../../src/sim/seats.ts';

type AdapterFixture = Awaited<ReturnType<typeof adapterFixture>>;
function rider(t: TestContext, f: AdapterFixture, client: ReturnType<AdapterFixture['join']>) {
  let sitting: string | null = null;
  let taken = 0;
  const moves: string[] = [];
  const session = createSeatSession(client.adapter, client.mirror.seats, f.now, {
    move(id) {
      moves.push(id);
      sitting = id;
    },
    taken() {
      taken++;
      sitting = null;
    },
  });
  t.after(() => session.dispose());
  return {
    session,
    moves,
    sitting: () => sitting,
    taken: () => taken,
    sit(fields: SeatSit) {
      sitting = fields.id; // presentation is predicted on the press, before any server reply
      session.sit(fields);
    },
    stand() {
      sitting = null;
      session.stand();
    },
    run(n: number) {
      for (let i = 0; i < n; i++) {
        f.run();
        session.update();
      }
    },
  };
}

test('sit-stand-sit 100 ms apart holds the predicted seat on rate and reclaims within one reconcile', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice');
  const r = rider(t, f, a);
  f.run(3);
  r.sit({ id: 'chair' });
  assert.equal(r.sitting(), 'chair');
  assert.equal(a.mirror.seats.seatOf('alice'), null, 'press does not wait for a receipt');
  f.run(1);
  r.stand();
  assert.equal(r.sitting(), null, 'stand does not wait for a receipt');
  f.run(1);
  f.advanceTime(66);
  r.sit({ id: 'chair' });
  f.run(1);
  assert.equal(a.refused.at(-1)?.reason, 'rate');
  assert.equal(r.sitting(), 'chair', 'rate never steps the predicted rider off');
  assert.equal(r.taken(), 0);
  assert.equal(r.session.pending(), null);
  r.run(60);
  assert.equal(a.mirror.seats.seatOf('alice'), 'chair');
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'alice' }]);
  const sent = a.edits.length;
  r.run(180);
  assert.equal(a.edits.length, sent, 'matching accepted row stops retries');
});

test('full-window retry retains ordered alternates; only taken steps the loser off', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  const r = rider(t, f, a);
  r.run(70);
  assert.equal(a.edits.length, 0, 'startup does not send an unsolicited stand');
  b.adapter.act('seat.sit', { id: 'chair' });
  f.run(2);
  for (let i = 0; i < 8; i++) a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 30 + i });
  r.sit({ id: 'chair', alt: ['nearest', 'farther'] });
  assert.equal(
    a.edits.some((e) => e.op === 'seat.sit'),
    false,
    'the full window refused queuing',
  );
  r.run(70);
  assert.equal(r.sitting(), 'nearest');
  assert.ok(f.host.status().seats.some((row) => row.pid === 'alice' && row.id === 'nearest'));
  assert.deepEqual(a.edits.find((e) => e.op === 'seat.sit')?.alt, ['nearest', 'farther']);
  r.stand();
  r.run(30);
  r.sit({ id: 'chair' });
  r.run(70);
  assert.equal(a.refused.at(-1)?.reason, 'taken');
  assert.equal(r.sitting(), null);
  assert.equal(r.taken(), 1);
  const sent = a.edits.length;
  r.run(180);
  assert.equal(a.edits.length, sent, 'taken ends the claim, without a redundant stand');
  assert.deepEqual(f.host.status().seats, [{ id: 'chair', pid: 'bob' }]);
});

test('ordinary refused validation holds prediction rather than treating it as taken', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice');
  const r = rider(t, f, a);
  r.run(3);
  r.sit({ id: 'invalid chair' });
  r.run(2);
  assert.equal(a.refused.at(-1)?.reason, 'refused');
  assert.equal(r.sitting(), 'invalid chair');
  assert.equal(r.taken(), 0);
});

for (const state of ['storage', 'full'])
  test(`${state} refusal never converts an unknown outcome into a taken seat`, async (t) => {
    const f = await adapterFixture(t);
    const a = f.join('alice');
    const r = rider(t, f, a);
    r.run(3);
    r.sit({ id: 'chair' });
    const pending = r.session.pending()!;
    a.hear({ t: 'r:state', to: 'alice', state, ...pending });
    assert.equal(a.refused.at(-1)?.reason, state === 'storage' ? 'storage' : 'unknown');
    assert.equal(r.sitting(), 'chair');
    assert.equal(r.taken(), 0);
  });

test('a late taken receipt for an earlier sit cannot unseat a newer prediction', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  const r = rider(t, f, a);
  r.run(3);
  b.adapter.act('seat.sit', { id: 'chair' });
  f.run(3);
  r.sit({ id: 'chair' });
  r.stand();
  r.sit({ id: 'other' });
  r.run(3);
  assert.equal(a.refused.find((e) => e.op === 'seat.sit')?.reason, 'taken');
  assert.equal(r.sitting(), 'other');
  assert.equal(r.taken(), 0);
  assert.equal(a.mirror.seats.seatOf('alice'), 'other');
});

test('the third player at a two-stool machine steps off without displacing either sitter', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice'),
    b = f.join('bob'),
    c = f.join('charlie');
  const r = rider(t, f, c);
  r.run(3);
  const choices = { id: 'machine-deck-0', alt: ['machine-deck-1'] };
  a.adapter.act('seat.sit', choices);
  b.adapter.act('seat.sit', choices);
  r.sit(choices);
  r.run(3);
  assert.equal(r.sitting(), null);
  assert.equal(r.taken(), 1);
  assert.equal(c.mirror.seats.seatOf('alice'), 'machine-deck-0');
  assert.equal(c.mirror.seats.seatOf('bob'), 'machine-deck-1');
  assert.equal(c.mirror.seats.seatOf('charlie'), null);
});

test('a confirmed or unanswered seat stays predicted through its own reconnect', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice');
  const r = rider(t, f, a);
  r.run(3);
  r.sit({ id: 'chair', alt: ['next'] });
  a.disconnect(); // queued request never reached the server
  r.run(20);
  assert.equal(r.sitting(), 'chair');
  a.reconnect();
  r.run(90);
  assert.equal(r.sitting(), 'chair');
  assert.equal(a.mirror.seats.seatOf('alice'), 'chair');
  assert.equal(r.session.pending(), null, 'old epoch request cannot block reconciliation');
  const sent = a.edits.length;
  a.disconnect();
  r.run(60); // one second, inside the real hosted-room's 1.5 s grace
  assert.equal(r.sitting(), 'chair');
  a.reconnect();
  r.run(90);
  assert.equal(r.sitting(), 'chair');
  assert.equal(a.mirror.seats.seatOf('alice'), 'chair');
  assert.equal(a.edits.length, sent, 'a retained row needs no second claim');
  assert.equal(r.taken(), 0);
});

test('reclaim after departure sends alternatives when a friend took the chair in the gap', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  const r = rider(t, f, a);
  r.run(3);
  r.sit({ id: 'chair', alt: ['nearest', 'farther'] });
  r.run(3);
  a.disconnect();
  f.host.depart('alice'); // the host calls this only after its socket grace
  f.advanceTime(1600);
  b.adapter.act('seat.sit', { id: 'chair' });
  f.run(3);
  a.reconnect();
  r.run(90);
  assert.equal(r.sitting(), 'nearest');
  assert.equal(r.taken(), 0);
  assert.equal(a.mirror.seats.seatOf('bob'), 'chair', 'the friend is never displaced');
  assert.deepEqual(a.edits.filter((e) => e.op === 'seat.sit').at(-1)?.alt, ['nearest', 'farther']);
});

for (const occupied of [false, true])
  test(`actual restart keeps prediction and ${occupied ? 'slides around a friend' : 'reclaims the same seat'}`, async (t) => {
    const f = await adapterFixture(t);
    const a = f.join('alice'),
      b = f.join('bob');
    const r = rider(t, f, a);
    r.run(3);
    r.sit({ id: 'chair', alt: ['nearest', 'farther'] });
    r.run(3);
    const oldHost = f.host;
    await f.restart();
    assert.notEqual(f.host, oldHost);
    assert.deepEqual(f.host.status().seats, [], 'no transient seat survives a real host restart');
    assert.equal(r.sitting(), 'chair', 'restart does not undo the local sitting pose');
    if (occupied) {
      b.reconnect();
      f.run(3);
      b.adapter.act('seat.sit', { id: 'chair' });
      f.run(3);
    }
    a.reconnect();
    r.run(100);
    assert.equal(r.sitting(), occupied ? 'nearest' : 'chair');
    assert.equal(a.mirror.seats.seatOf('alice'), r.sitting());
    assert.equal(r.taken(), 0);
    assert.deepEqual(a.edits.filter((e) => e.op === 'seat.sit').at(-1)?.alt, ['nearest', 'farther']);
    assert.equal(a.edits.filter((e) => e.op === 'seat.sit').length, 2);
  });

test('a taken reclaim steps off; a disposed controller never reclaims', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice'),
    b = f.join('bob');
  const r = rider(t, f, a);
  r.run(3);
  r.sit({ id: 'chair' });
  r.run(3);
  await f.restart();
  b.reconnect();
  f.run(3);
  b.adapter.act('seat.sit', { id: 'chair' });
  f.run(3);
  a.reconnect();
  r.run(100);
  assert.equal(r.sitting(), null);
  assert.equal(r.taken(), 1);
  r.sit({ id: 'other' });
  r.run(3);
  r.session.dispose();
  a.disconnect();
  f.host.rules.seats.clear();
  a.reconnect();
  f.run(100);
  assert.deepEqual(f.host.status().seats, [], 'disposed helper does not react to later resets');
});

test('a stand lost during reconnect is immediate locally and reconciles the retained row away', async (t) => {
  const f = await adapterFixture(t);
  const a = f.join('alice');
  const r = rider(t, f, a);
  r.run(3);
  r.sit({ id: 'chair' });
  r.run(3);
  a.disconnect();
  r.stand();
  assert.equal(r.sitting(), null);
  a.reconnect();
  r.run(90);
  assert.equal(a.mirror.seats.seatOf('alice'), null);
  assert.equal(r.sitting(), null);
  assert.equal(r.taken(), 0);
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
  assert.deepEqual(f.host.sync.registry().states, ['roster', 'railTune', 'railway', 'boogler']);
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
