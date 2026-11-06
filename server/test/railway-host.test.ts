// Isolated T1 host: real rules + recovery store, no renderer and no default-room changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createWorldHost, createRailwayWorldHost, type RailwayPosition } from '../src/host/world-host.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import { RAILWAY_ROOM, railwayRoomId } from '../../src/world/railway-namespace.ts';
import { railwayInvariant } from '../../src/sim/railway.ts';
import { LINE1_INITIAL } from '../../src/sim/railway-line-layout.ts';

type Obj = Record<string, unknown>;
async function fixture(roomId = RAILWAY_ROOM) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-host-'));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  let now = 1800000000000;
  const poses = new Map<string, RailwayPosition>();
  const pids = new Map([
    ['a', 'alice'],
    ['b', 'bob'],
    ['a2', 'alice'],
  ]);
  const sent: Obj[] = [];
  let host = create();
  function create() {
    const h = createRailwayWorldHost({
      roomId,
      store,
      tick: false,
      now: () => now,
      pidOf: (sid) => pids.get(sid) ?? null,
    });
    h.onSend((m) => sent.push(m));
    return h;
  }
  await host.whenReady();
  const step = async (ticks: number) => {
    for (let k = 0; k < ticks; k++) {
      await host.sync.whenDurable();
      now += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
  };
  const pose = (sid: string, x: number, z: number) => poses.set(sid, { x: x / 100, z: z / 100, at: now });
  // What a client action carries: where its actor stands (cm) and its action clock (ms). No pose, no position.
  const act = (sid: string) => {
    const p = poses.get(sid);
    return p ? { at: [Math.round(p.x * 100) || 0, 0, Math.round(p.z * 100) || 0], ms: now - 1800000000000 } : {};
  };
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    await host.sync.whenDurable();
    await step(3);
    const msg = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(msg);
    return msg.epoch as number;
  };
  const requests = new Map<string, number>();
  const edit = async (sid: string, fields: Obj, epoch = 1) => {
    const request = (requests.get(sid) ?? 0) + 1;
    requests.set(sid, request);
    host.deliver({ t: 'r:edit', e: { ...fields, epoch, request, ...act(sid) } }, sid);
    await host.sync.whenDurable();
    await step(3);
    const result = sent.findLast(
      (m) => m.t === 'r:result' && m.to === sid && m.request === request && m.epoch === epoch,
    );
    assert.ok(result, `missing terminal result ${JSON.stringify(fields)}`);
    return result;
  };
  const wake = async () => {
    pose('a', T1.x, T1.z);
    await edit('a', { op: 'rail.wake' });
    await step(T1.wakeTicks);
  };
  const harvest = async (sid: string, amount: number) => {
    const before = host.rules.railway.account(pids.get(sid)!)!.carry;
    while (host.rules.railway.account(pids.get(sid)!)!.carry < before + amount) {
      const index = host.rules.railway.railway.sources.findIndex((n) => n > 0);
      const source = RAILWAY_SOURCES[index]!;
      pose(sid, source[1], source[2]);
      const r = await edit(sid, { op: 'rail.chop', id: source[0] });
      assert.equal(r.status, 'accepted');
    }
  };
  const deposit = async (sid: string, n: number) => {
    pose(sid, T1.x, T1.z);
    return edit(sid, { op: 'rail.deposit', station: 'T1', n });
  };
  return {
    dir,
    store,
    sent,
    poses,
    act,
    pids,
    requests,
    step,
    pose,
    open,
    edit,
    wake,
    harvest,
    deposit,
    get host() {
      return host;
    },
    advance(ms: number) {
      now += ms;
    },
    async restart() {
      await host.close({ save: false });
      host = create();
      await host.whenReady();
    },
    async close() {
      await host.close({ save: false });
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

test('ordinary rooms keep the classic registry; isolated missing reach is a durable terminal rejection', async () => {
  const f = await fixture();
  try {
    const ordinary = createWorldHost({ roomId: 'v06-boogle', store: f.store, tick: false });
    assert.equal(ordinary.sync.registry().states.includes('railway'), false);
    assert.deepEqual(f.host.sync.registry().states, ['roster', 'railway']);
    assert.throws(() => createRailwayWorldHost({ roomId: 'v06-boogle', store: f.store, tick: false }));
    await ordinary.close({ save: false });
    await f.open('a');
    const rejected = await f.edit('a', { op: 'rail.wake' });
    assert.equal(rejected.status, 'rejected');
    f.pose('a', T1.x, T1.z);
    f.host.deliver({ t: 'r:edit', e: { op: 'rail.wake', epoch: 1, request: 1, ...f.act('a') } }, 'a');
    assert.equal(f.sent.at(-1)?.status, 'rejected');
    assert.equal(f.host.rules.railway.railway.awake, -1);
    await f.restart();
    assert.equal(f.host.rules.railway.outcome('alice', 1, 1)?.status, 'rejected');
  } finally {
    await f.close();
  }
});

for (const roomId of [RAILWAY_ROOM])
  test(`host last-piece race transfers one of eight logs and restores once: ${roomId}`, async () => {
    const f = await fixture(roomId);
    try {
      await f.open('a');
      await f.open('b');
      await f.wake();
      await f.harvest('a', 8);
      await f.deposit('a', 8);
      await f.harvest('a', 8);
      await f.deposit('a', 8);
      await f.harvest('a', 8);
      await f.deposit('a', 7);
      await f.harvest('a', 4);
      f.pose('a', T1.x, T1.z);
      await f.edit('a', { op: 'rail.drop', x: T1.x, z: T1.z, n: 1 });
      await f.harvest('b', 4);
      assert.equal(f.host.rules.railway.railway.stock, 23);
      for (const sid of ['a', 'b']) {
        f.pose(sid, T1.x, T1.z);
        const request = (f.requests.get(sid) ?? 0) + 1;
        f.requests.set(sid, request);
        f.host.deliver(
          { t: 'r:edit', e: { op: 'rail.deposit', station: 'T1', n: 4, epoch: 1, request, ...f.act(sid) } },
          sid,
        );
      }
      await f.host.sync.whenDurable();
      const stamps = f.sent.filter((m) => m.t === 'w:edits').at(-1)!;
      assert.equal((stamps.list as unknown[]).length, 2);
      // Neither edit has applied yet; restart consumes the durably published tail in its original order.
      await f.restart();
      const api = f.host.rules.railway;
      assert.equal(api.account('alice')!.carry + api.account('bob')!.carry, 7);
      assert.equal(api.railway.allocation, 24);
      assert.equal(api.railway.delivered, 24);
      assert.equal(api.railway.piles[0]!.n, 1);
      assert.equal(railwayInvariant(api.railway), null);
      assert.equal(api.outcome('alice', 1, f.requests.get('a')!)!.accepted, 1);
      assert.equal(api.outcome('bob', 1, f.requests.get('b')!)!.accepted, 0);
      await f.step(110);
      assert.equal(api.railway.used, 24);
      assert.equal(api.railway.completion, 1);
      await f.restart();
      assert.equal(f.host.rules.railway.railway.completion, 1);
      assert.equal(f.host.rules.railway.counts().total, 3880);
    } finally {
      await f.close();
    }
  });

test('playable registry accepts bounded identity but rejects every legacy material op and snapshot import', async () => {
  const f = await fixture(railwayRoomId('boogle'));
  try {
    assert.deepEqual(f.host.sync.registry().states, [
      'gifts',
      'roster',
      'stacks',
      'piles',
      'sites',
      'sources',
      'bank',
      'tune',
      'opening',
      'railway',
    ]);
    await f.open('a');
    f.host.deliver({ t: 'w:edit', e: { op: 'who.set', n: 'Alice', c: 2, ignored: 'x'.repeat(10000) } }, 'a');
    await f.step(4);
    assert.equal(f.host.rules.roster.nameOf(0), 'Alice');
    f.host.deliver({ t: 'w:edit', e: { op: 'who.set', n: '\ud800'.repeat(16), c: 2 } }, 'a');
    await f.step(4);
    assert.equal(f.host.rules.roster.nameOf(0), '\ufffd'.repeat(16));
    const nameStamp = f.sent.filter((m) => m.t === 'w:edits').at(-1)!;
    assert.ok(Buffer.byteLength(JSON.stringify(nameStamp)) < 500, 'name is normalized before entering the tail');
    f.host.deliver({ t: 'w:edit', e: { op: 'who.set', n: 'Alice', c: 2 } }, 'a');
    await f.step(4);
    const before = f.host.sync.snapshot().data;
    for (const op of [
      'src.take',
      'pile.take',
      'pile.drop',
      'site.stock',
      'site.run',
      'gift.toss',
      'tune.fill',
      'rail.chop',
    ])
      f.host.deliver({ t: 'w:edit', e: { op, i: 0, j: 0, id: 0, n: 8, k: 0, epoch: 1, request: 1 } }, 'a');
    f.host.deliver({ t: 'placeCoop', shared: { back: { logs: 24 } } }, 'a');
    await f.step(4);
    assert.deepEqual(f.host.sync.snapshot().data, before);
    await f.restart();
    assert.equal(f.host.rules.roster.nameOf(0), 'Alice');
    assert.equal(f.host.rules.railway.counts().total, LINE1_INITIAL[0]);
  } finally {
    await f.close();
  }
});

test('a burst split by a durable write retries in order without snapshot recovery', async () => {
  const f = await fixture();
  try {
    await f.open('a');
    await f.wake();
    await f.harvest('a', 8);
    f.pose('a', T1.x, T1.z);
    const first = f.requests.get('a')! + 1;
    const send = (request: number) =>
      f.host.deliver(
        { t: 'r:edit', e: { op: 'rail.deposit', station: 'T1', n: 1, epoch: 1, request, ...f.act('a') } },
        'a',
      );
    send(first);
    // Run flush's microtask, but not the asynchronous disk write. This deterministically splits the burst.
    await Promise.resolve();
    assert.equal(f.host.sync.worldStatus().recoveryPending, true);
    for (let request = first + 1; request < first + 8; request++) {
      send(request);
      assert.deepEqual(f.sent.at(-1), { t: 'r:state', to: 'a', state: 'busy', epoch: 1, request });
    }
    assert.equal(f.host.rules.railway.account('alice')!.request, first - 1);
    await f.step(3);
    // Retry the original tokens after the barrier, just as the browser adapter does after correlated busy.
    for (let request = first + 1; request < first + 8; request++) send(request);
    await f.step(3);
    const results = f.sent.filter((m) => m.t === 'r:result' && Number(m.request) >= first);
    assert.deepEqual(
      results.map((r) => r.request),
      Array.from({ length: 8 }, (_, k) => first + k),
    );
    const deposited = results.reduce((sum, r) => sum + Number(r.accepted), 0);
    assert.equal(deposited, 2);
    assert.equal(f.host.rules.railway.railway.stock, deposited);
    assert.equal(f.host.rules.railway.account('alice')!.carry, 8 - deposited);
    assert.equal(railwayInvariant(f.host.rules.railway.railway), null);
    for (let request = first; request < first + 8; request++) {
      send(request);
      assert.deepEqual(f.sent.at(-1), results[request - first], 'duplicates return the same terminal receipt');
    }
    send(first + 16);
    assert.equal(f.sent.at(-1)?.state, 'snapshot-required', 'a token beyond the pipeline still needs recovery');
  } finally {
    await f.close();
  }
});

test('same-pid takeover fences the old session and eight outstanding tokens bound admission', async () => {
  const f = await fixture();
  try {
    await f.open('a');
    for (let request = 1; request <= 9; request++)
      f.host.deliver({ t: 'r:edit', e: { op: 'invalid', epoch: 1, request } }, 'a');
    assert.equal(f.sent.at(-1)?.state, 'busy');
    await f.host.sync.whenDurable();
    await f.step(3);
    assert.equal(f.host.rules.railway.account('alice')!.request, 8);
    assert.equal(f.host.rules.railway.railway.outcomes.length, 8);
    assert.equal(await f.open('a2'), 2);
    f.host.deliver({ t: 'r:edit', e: { op: 'rail.wake', epoch: 1, request: 9, ...f.act('a') } }, 'a');
    assert.equal(f.sent.at(-1)?.state, 'snapshot-required');
    f.host.deliver({ t: 'r:status', epoch: 1, request: 1 }, 'a2');
    assert.equal(f.sent.at(-1)?.status, 'rejected');
    f.host.deliver({ t: 'w:edit', e: { op: 'rail.wake', epoch: 2, request: 1 } }, 'a2');
    await f.step(3);
    assert.equal(f.host.rules.railway.railway.awake, -1);
  } finally {
    await f.close();
  }
});

for (const roomId of [RAILWAY_ROOM])
  test(`offline time completes only funded work and consumes its absolute interval once: ${roomId}`, async () => {
    const f = await fixture(roomId);
    try {
      await f.open('a');
      await f.wake();
      await f.harvest('a', 8);
      await f.deposit('a', 8);
      await f.harvest('a', 8);
      await f.deposit('a', 8);
      f.host.sync.saveNow(true);
      await f.host.sync.whenDurable();
      f.advance(10000);
      await f.restart();
      assert.equal(f.host.rules.railway.railway.stock, 16);
      assert.equal(f.host.rules.railway.railway.start, -1);
      assert.equal(f.host.rules.railway.railway.completion, 0);
      await f.open('a');
      f.requests.set('a', 0);
      // Reconnected account's new epoch is two; harvest through its ordinary request interface.
      for (let k = 0; k < 12 && f.host.rules.railway.account('alice')!.carry < 8; k++) {
        const index = f.host.rules.railway.railway.sources.findIndex((n) => n > 0);
        const source = RAILWAY_SOURCES[index]!;
        f.pose('a', source[1], source[2]);
        await f.edit('a', { op: 'rail.chop', id: source[0] }, 2);
      }
      f.pose('a', T1.x, T1.z);
      await f.edit('a', { op: 'rail.deposit', station: 'T1', n: 8 }, 2);
      f.host.sync.saveNow(true);
      await f.host.sync.whenDurable();
      const before = f.host.rules.railway.railway.elapsed;
      f.advance(2000);
      await f.restart();
      assert.equal(f.host.rules.railway.railway.elapsed, before + 23, '20 absent and three live startup ticks');
      const elapsed = f.host.rules.railway.railway.elapsed;
      const marker = f.host.rules.railway.railway.resumeMarker;
      assert.ok(marker > 2147483647, 'absolute wall tick survives beyond signed32');
      await f.restart();
      assert.equal(f.host.rules.railway.railway.elapsed, elapsed);
      assert.equal(f.host.rules.railway.railway.resumeMarker, marker);
      f.advance(60000);
      await f.restart();
      await f.restart();
      assert.equal(f.host.rules.railway.railway.completion, 1);
      assert.equal(f.host.rules.railway.railway.used, 24);
      assert.equal(f.host.rules.railway.counts().total, 3880);
    } finally {
      await f.close();
    }
  });

for (const roomId of [RAILWAY_ROOM, railwayRoomId('recovery')])
  test(`refused recovery writes report storage and never serve a fresh fallback: ${roomId}`, async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-refused-'));
    const store = createStore({ dataDir: dir, maxRooms: 0 });
    await store.init();
    const host = createRailwayWorldHost({ roomId, store, tick: false, pidOf: () => 'alice' });
    const sent: Obj[] = [];
    host.onSend((m) => sent.push(m));
    await assert.rejects(host.whenReady(), /refused/);
    host.deliver({ t: 'w:need' }, 'a');
    host.deliver({ t: 'r:open' }, 'a');
    assert.ok(sent.every((m) => m.t === 'r:state' && m.state === 'storage'));
    assert.equal(host.status().ready, false);
    await assert.rejects(host.close({ save: false }), /refused/);
    await fs.rm(dir, { recursive: true, force: true });
  });
