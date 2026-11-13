// The railway host (replication R1a): real rules, requests, replicator and recovery store; no renderer. Actions apply
// on arrival; the actor hears ack/rej on the next replication packet; the state reaches disk with the 2 s checkpoint
// and the save on close.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.ts';
import { createWorldHost, createRailwayWorldHost } from '../src/host/world-host.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { worldRoomId } from '../../src/world/namespace.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { railMaxDuration } from '../../src/sim/railway-queries-line1.ts';
import { accounts, invariant, job, jobRun, rail, railClock, trees } from '../../test/helpers/rail.ts';
import { LINE1_INITIAL } from '../../src/sim/railway-line-layout.ts';
import { ROSTER_CHANGE_MS } from '../../src/world/rules/roster.ts';
import { MAX_PLAYERS } from '../../src/sim/roster.ts';
import type { ServerPacket } from '../../src/world/replicate.ts';

type Obj = Record<string, unknown>;
const START = 1800000000000;

test('a live railway apply failure preserves the checkpoint through periodic save, pause and close', async (t) => {
  const roomId = railwayRoomId('fatal-apply');
  const f = await fixture(roomId, 1);
  t.after(async () => {
    await f.host.close({ save: false }).catch(() => {});
    await fs.rm(f.dir, { recursive: true, force: true });
  });
  await f.open('a');
  f.host.sync.saveNow(true);
  await f.host.sync.whenDurable();
  const before = await f.store.read(roomId);
  const tick = f.host.status().tick;
  const act = f.host.rules.railway.act;
  t.mock.method(f.host.rules.railway, 'act', (...args: Parameters<typeof act>) => {
    const result = act(...args);
    assert.equal(result.status, 'accepted');
    throw new Error('railway failure after mutation');
  });
  f.pose('a', T1.wake.x, T1.wake.z);
  let escaped: unknown;
  try {
    f.send('a', { op: 'rail.wake' });
  } catch (error) {
    escaped = error;
  }
  f.host.step(0.1); // would checkpoint immediately with saveMs=1
  await f.host.sync.whenDurable();
  f.host.pause();
  await f.host.sync.whenDurable();
  assert.deepEqual(await f.store.read(roomId), before, 'a partial railway action must never replace the good save');
  assert.equal(escaped, undefined);
  assert.equal(f.host.status().ready, false);
  assert.equal(f.host.status().tick, tick);
  assert.deepEqual(f.sent.at(-1), { t: 'r:state', to: 'a', state: 'storage', epoch: 1, request: 1 });
  f.host.replication.flush(f.host.sync.roomStep(), (_sid, packet) => {
    assert.equal(packet.ack, undefined);
    assert.equal(packet.ok, undefined);
  });
  await assert.rejects(f.host.close(), /storage/);
  assert.deepEqual(await f.store.read(roomId), before);
});

test('a queued server command cannot checkpoint a later failed live railway action', async (t) => {
  const roomId = railwayRoomId('fatal-tail');
  const f = await fixture(roomId);
  t.after(async () => {
    await f.host.close({ save: false }).catch(() => {});
    await fs.rm(f.dir, { recursive: true, force: true });
  });
  await f.open('a');
  f.host.sync.saveNow(true);
  await f.host.sync.whenDurable();
  const before = await f.store.read(roomId);
  const act = f.host.rules.railway.act;
  t.mock.method(f.host.rules.railway, 'act', (...args: Parameters<typeof act>) => {
    act(...args);
    throw new Error('railway failure after mutation');
  });
  f.send('a', { op: 'who.set', n: 'Pending', c: 1 });
  f.pose('a', T1.wake.x, T1.wake.z);
  f.send('a', { op: 'rail.wake' });
  await f.host.sync.whenDurable().catch((error: Error) => assert.match(error.message, /storage/));
  assert.deepEqual(await f.store.read(roomId), before, 'a queued command must not persist the failed railway mutation');
  await assert.rejects(f.host.close(), /storage/);
});

async function fixture(roomId = railwayRoomId('host'), saveMs = 2000) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-host-'));
  const store = createStore({ dataDir: dir, maxRooms: 10 });
  await store.init();
  let now = START;
  const poses = new Map<string, { x: number; z: number }>();
  const pids = new Map([
    ['a', 'alice'],
    ['b', 'bob'],
    ['a2', 'alice'],
  ]);
  const sent: Obj[] = [];
  const packets: { cid: string; p: ServerPacket }[] = [];
  let host = create();
  function create() {
    const h = createRailwayWorldHost({
      roomId,
      store,
      tick: false,
      saveMs,
      now: () => now,
      pidOf: (sid) => pids.get(sid) ?? null,
    });
    h.onSend((m) => sent.push(m));
    for (const sid of pids.keys()) h.replication.addClient(sid);
    return h;
  }
  await host.whenReady();
  const flush = () =>
    host.replication.flush(host.sync.roomStep(), (cid, p) => {
      packets.push({ cid, p });
    });
  const step = async (ticks: number) => {
    for (let k = 0; k < ticks; k++) {
      await host.sync.whenDurable();
      now += 100;
      host.step(0.1);
      host.replication.commit(host.sync.roomStep());
      flush();
    }
    await host.sync.whenDurable();
  };
  const pose = (sid: string, x: number, z: number) => poses.set(sid, { x, z });
  // What a client action carries: where its actor stands (cm) and its action clock (ms). No pose, no position.
  const act = (sid: string) => {
    const p = poses.get(sid);
    return p ? { at: [p.x, 0, p.z], ms: now - START } : {};
  };
  const open = async (sid: string) => {
    host.deliver({ t: 'r:open' }, sid);
    const msg = sent.findLast((m) => m.t === 'r:session' && m.to === sid);
    assert.ok(msg);
    return msg.epoch as number;
  };
  const requests = new Map<string, number>();
  const send = (sid: string, fields: Obj, epoch = 1, request?: number) => {
    const r = request ?? (requests.get(sid) ?? 0) + 1;
    requests.set(sid, Math.max(r, requests.get(sid) ?? 0));
    host.deliver({ t: 'r:edit', e: { ...fields, epoch, request: r, ...act(sid) } }, sid);
    return r;
  };
  const edit = async (sid: string, fields: Obj, epoch = 1) => {
    const request = send(sid, fields, epoch);
    await step(3); // actions 300 ms apart on the action clock
    const result = host.rules.railway.outcome(pids.get(sid)!, epoch, request);
    assert.ok(result, `missing outcome ${JSON.stringify(fields)}`);
    return result;
  };
  // What the actor heard about its own requests: acks and refusals, in order.
  const heard = (sid: string) => ({
    acks: packets.filter((x) => x.cid === sid && x.p.ack).map((x) => x.p.ack!),
    rej: packets.filter((x) => x.cid === sid).flatMap((x) => x.p.rej ?? []),
  });
  const wake = async () => {
    pose('a', T1.x, T1.z);
    await edit('a', { op: 'rail.wake' });
    await step(T1.wakeTicks);
  };
  const harvest = async (sid: string, amount: number, epoch = 1) => {
    const pid = pids.get(sid)!;
    const before = host.rules.railway.account(pid)!.carry;
    while (host.rules.railway.account(pid)!.carry < before + amount) {
      const index = trees(host.rules.railway.world()).findIndex((t) => t.left > 0);
      const source = RAILWAY_SOURCES[index]!;
      pose(sid, source[1], source[2]);
      const r = await edit(sid, { op: 'rail.chop', id: source[0], yaw: 0, collapsed: false }, epoch);
      assert.equal(r.status, 'accepted');
    }
  };
  const deposit = async (sid: string, n: number, epoch = 1) => {
    pose(sid, T1.x, T1.z);
    return edit(sid, { op: 'rail.deposit', station: 'T1', n }, epoch);
  };
  return {
    dir,
    store,
    sent,
    packets,
    heard,
    requests,
    step,
    pose,
    open,
    send,
    edit,
    wake,
    harvest,
    deposit,
    get host() {
      return host;
    },
    /** The room's world, read again each time: a restart replaces it. */
    world: () => host.rules.railway.world(),
    advance(ms: number) {
      now += ms;
    },
    /** An orderly restart (a deploy): the room saves on close, then stays down for downMs. */
    async restart(downMs = 0) {
      await host.close({ save: true });
      now += downMs;
      host = create();
      await host.whenReady();
    },
    /** A crash: nothing saved on the way down. */
    async crash() {
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

test('ordinary rooms keep only the clock; a railway room holds only server states', async () => {
  const f = await fixture();
  try {
    const ordinary = createWorldHost({ roomId: worldRoomId('boogle'), store: f.store, tick: false });
    assert.deepEqual(ordinary.sync.registry().states, []);
    assert.throws(() => createRailwayWorldHost({ roomId: worldRoomId('boogle'), store: f.store, tick: false }));
    await ordinary.close({ save: false });
    assert.ok(f.host.sync.registry().states.includes('railway'));
    assert.ok('railway' in f.host.sync.snapshot().data, 'server state is checkpointed');
    assert.deepEqual(f.host.sync.registry().states, ['roster', 'railTune', 'railway']);
    await f.open('a');
    // Missing reach (no position) is a recorded rejection, refused to the actor, and survives a restart.
    const rejected = await f.edit('a', { op: 'rail.wake' });
    assert.equal(rejected.status, 'rejected');
    assert.deepEqual(f.heard('a').rej, [[1, 1, 'refused']]);
    assert.deepEqual(f.heard('a').acks.at(-1), [1, 1], 'a refused request is settled too');
    assert.equal(rail(f.world()).awake, -1);
    await f.restart();
    assert.equal(f.host.rules.railway.outcome('alice', 1, 1)?.status, 'rejected');
  } finally {
    await f.close();
  }
});

test('the last-piece race between two players in one step transfers one log; it restores once', async () => {
  const f = await fixture();
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
    await f.edit('a', { op: 'rail.drop', x: T1.x, y: 3000, z: T1.z, n: 1 });
    await f.harvest('b', 4);
    assert.equal(job(f.world(), 0).stock, 23);
    // Both arrive before the next step: they apply in arrival order, each rechecking the bill.
    const races = ['a', 'b'].map((sid) => {
      f.pose(sid, T1.x, T1.z);
      return f.send(sid, { op: 'rail.deposit', station: 'T1', n: 4 });
    });
    await f.step(1);
    const api = f.host.rules.railway;
    assert.equal(api.outcome('alice', 1, races[0]!)!.accepted, 1);
    assert.equal(api.outcome('bob', 1, races[1]!)!.accepted, 0);
    assert.equal(api.account('alice')!.carry + api.account('bob')!.carry, 7);
    assert.equal(jobRun(api.world(), 0).allocation, 24);
    assert.equal(invariant(api.world()), null);
    await f.restart();
    assert.equal(jobRun(f.world(), 0).allocation, 24);
    await f.step(railMaxDuration(f.world()) + 1);
    assert.equal(jobRun(f.world(), 0).used, 24);
    assert.equal(job(f.world(), 0).completion, 1);
    await f.restart();
    assert.equal(job(f.world(), 0).completion, 1);
    assert.equal(f.host.rules.railway.counts().total, LINE1_INITIAL[0]);
  } finally {
    await f.close();
  }
});

test('the railway registry accepts bounded identity but rejects classic-channel edits and snapshot import', async () => {
  const f = await fixture(railwayRoomId('boogle'));
  try {
    await f.open('a');
    f.pose('a', 0, 0);
    f.send('a', { op: 'who.set', n: 'Alice', c: 2, ignored: 'x'.repeat(10000) });
    await f.step(4);
    assert.equal(f.host.rules.roster.nameOf(0), 'Alice');
    f.advance(ROSTER_CHANGE_MS); // The next valid rename is outside the server-only cadence bound.
    f.send('a', { op: 'who.set', n: '\ud800'.repeat(16), c: 2 });
    await f.step(4);
    assert.equal(f.host.rules.roster.nameOf(0), '\ud800'.repeat(16), 'same cleanName result as the classic oracle');
    assert.equal(
      f.sent.some((m) => m.t === 'w:edits'),
      false,
      'roster never enters the classic tail',
    );
    f.advance(ROSTER_CHANGE_MS);
    f.send('a', { op: 'who.set', n: 'Alice', c: 2 });
    await f.step(4);
    const before = JSON.stringify(f.host.sync.snapshot().data);
    for (const op of ['who.set', 'tune.set', 'tune.commit', 'rail.chop'])
      f.host.deliver({ t: 'w:edit', e: { op, i: 0, j: 0, id: 0, n: 8, k: 0, epoch: 1, request: 1 } }, 'a');
    f.host.deliver({ t: 'placeCoop', shared: { back: { logs: 24 } } }, 'a');
    await f.step(4);
    assert.equal(JSON.stringify(f.host.sync.snapshot().data), before);
    await f.restart();
    assert.equal(f.host.rules.roster.nameOf(0), 'Alice');
    assert.equal(f.host.rules.railway.counts().total, LINE1_INITIAL[0]);
  } finally {
    await f.close();
  }
});

test('requests apply in order: a resend is answered from its outcome, a gap or a stale session is refused', async () => {
  const f = await fixture();
  try {
    await f.open('a');
    await f.wake();
    await f.harvest('a', 8);
    f.pose('a', T1.x, T1.z);
    const first = f.requests.get('a')! + 1;
    const acks = f.heard('a').acks.length;
    // A burst of eight deposits in one step: all apply on arrival, each judged on its own action clock.
    for (let k = 0; k < 8; k++) {
      f.send('a', { op: 'rail.deposit', station: 'T1', n: 1 });
      f.advance(T1.unloadMs);
    }
    await f.step(1);
    assert.equal(f.host.rules.railway.account('alice')!.request, first + 7);
    assert.equal(job(f.world(), 0).stock, 8);
    assert.deepEqual(f.heard('a').acks.slice(acks).at(-1), [1, first + 7], 'one ack covers the burst');
    // A resend changes nothing and is acknowledged again.
    f.send('a', { op: 'rail.deposit', station: 'T1', n: 1 }, 1, first);
    await f.step(1);
    assert.equal(job(f.world(), 0).stock, 8);
    assert.deepEqual(f.heard('a').acks.at(-1), [1, first]);
    // A gap is refused without spending its number.
    f.send('a', { op: 'rail.wake' }, 1, first + 10);
    await f.step(1);
    assert.deepEqual(f.heard('a').rej.at(-1), [1, first + 10, 'order']);
    assert.equal(f.host.rules.railway.account('alice')!.request, first + 7);
    // A takeover fences the old socket's session.
    assert.equal(await f.open('a2'), 2);
    f.send('a', { op: 'rail.wake' }, 1, first + 8);
    await f.step(1);
    assert.deepEqual(f.heard('a').rej.at(-1), [1, first + 8, 'session']);
    // Another socket's player cannot act through the new session either; the new socket can.
    f.send('a2', { op: 'rail.wake' }, 1, 1);
    await f.step(1);
    assert.deepEqual(f.heard('a2').rej.at(-1), [1, 1, 'session']);
    assert.equal(invariant(f.world()), null);
  } finally {
    await f.close();
  }
});

test('a session whose account is gone is refused without a change and reopens; the room stays up', async () => {
  const f = await fixture(railwayRoomId('lost-account'));
  try {
    const rules = () => f.host.rules.railway;
    // A world with no accounts at all, loaded under a live session below (as a test reseed or a load can).
    const bare = JSON.parse(JSON.stringify(rules().world().snapshot()));
    await f.open('a');
    await f.wake();
    assert.ok(rules().account('alice'));
    rules().world().load(bare, railwayCheck);
    rules().touchAll();
    assert.equal(rules().account('alice'), undefined);
    const hash = rules().world().hash();
    const r = f.send('a', { op: 'rail.wake' });
    await f.step(1);
    assert.deepEqual(f.heard('a').rej.at(-1), [1, r, 'session'], 'refused: reopen');
    assert.equal(rules().world().hash(), hash, 'nothing changed');
    assert.equal(rules().account('alice'), undefined);
    // The reopen makes a fresh session (and account), and its actions apply.
    const epoch = await f.open('a');
    assert.ok(rules().account('alice'));
    f.pose('a', T1.x, T1.z);
    const first = f.send('a', { op: 'rail.wake' }, epoch, 1);
    await f.step(3);
    assert.equal(rules().outcome('alice', epoch, first)?.status, 'accepted');
  } finally {
    await f.close();
  }
});

test('the 2 s checkpoint bounds what a crash loses; an orderly close loses nothing', async () => {
  const f = await fixture(railwayRoomId('checkpoint'), 2000);
  try {
    await f.open('a');
    await f.wake();
    await f.harvest('a', 2);
    // Wait for a periodic checkpoint, then act inside the next interval.
    const saves = f.host.sync.worldStatus().saves;
    while (f.host.sync.worldStatus().saves === saves) await f.step(1);
    const carry = f.host.rules.railway.account('alice')!.carry;
    await f.harvest('a', 2); // inside the interval: a crash takes it back
    await f.crash();
    assert.equal(f.host.rules.railway.account('alice')!.carry, carry);
    assert.equal(f.host.rules.railway.counts().total, LINE1_INITIAL[0]);
    assert.equal(await f.open('a'), 2, 'no session survives a restart');
    f.requests.set('a', 0);
    await f.harvest('a', 2, 2);
    await f.restart();
    assert.equal(f.host.rules.railway.account('alice')!.carry, carry + 2);
  } finally {
    await f.close();
  }
});

test('offline time completes only funded work and consumes its absolute interval once', async () => {
  const f = await fixture(railwayRoomId('offline'));
  try {
    await f.open('a');
    await f.wake();
    await f.harvest('a', 8);
    await f.deposit('a', 8);
    await f.harvest('a', 8);
    await f.deposit('a', 8);
    await f.restart(10000);
    assert.equal(job(f.world(), 0).stock, 16);
    assert.equal(job(f.world(), 0).start, -1);
    assert.equal(job(f.world(), 0).completion, 0);
    assert.equal(await f.open('a'), 2);
    f.requests.set('a', 0);
    await f.harvest('a', 8, 2);
    await f.deposit('a', 8, 2);
    assert.ok(job(f.world(), 0).start >= 0, 'funded');
    await f.restart();
    const before = jobRun(f.world(), 0).elapsed;
    await f.restart(2000);
    assert.equal(jobRun(f.world(), 0).elapsed, before + 20, 'twenty absent ticks, once');
    const elapsed = jobRun(f.world(), 0).elapsed;
    const marker = railClock(f.world()).resumeMarker;
    assert.ok(marker > 2147483647, 'absolute wall tick survives beyond signed32');
    await f.restart();
    assert.equal(jobRun(f.world(), 0).elapsed, elapsed);
    assert.equal(railClock(f.world()).resumeMarker, marker);
    await f.restart(60000);
    await f.restart();
    assert.equal(job(f.world(), 0).completion, 1);
    assert.equal(jobRun(f.world(), 0).used, 24);
    assert.equal(f.host.rules.railway.counts().total, LINE1_INITIAL[0]);
  } finally {
    await f.close();
  }
});

test('refused recovery writes report storage and never serve a fresh fallback', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-refused-'));
  const store = createStore({ dataDir: dir, maxRooms: 0 });
  await store.init();
  const roomId = railwayRoomId('recovery');
  const host = createRailwayWorldHost({ roomId, store, tick: false, pidOf: () => 'alice' });
  host.replication.addClient('a');
  const sent: Obj[] = [];
  host.onSend((m) => sent.push(m));
  await assert.rejects(host.whenReady(), /refused/);
  host.deliver({ t: 'w:need' }, 'a');
  host.deliver({ t: 'r:open' }, 'a');
  host.deliver({ t: 'r:edit', e: { op: 'rail.wake', epoch: 1, request: 1, at: [0, 0, 0], ms: 0 } }, 'a');
  // Said at once, outside the held room clock: no session, no snapshot, and the action refused for storage.
  assert.deepEqual(sent, [
    { t: 'r:state', to: 'a', state: 'storage' },
    { t: 'r:state', to: 'a', state: 'storage', epoch: 1, request: 1 },
  ]);
  const rej: unknown[] = [];
  host.replication.flush(0, (_cid, p) => rej.push(...(p.rej ?? [])));
  assert.deepEqual(rej, []);
  assert.equal(host.status().ready, false);
  await assert.rejects(host.close({ save: false }), /refused/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('before ready a session request hears starting at once; a full roster of accounts hears full', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-railway-starting-'));
  const store = createStore({ dataDir: dir, maxRooms: 4 });
  await store.init();
  const host = createRailwayWorldHost({
    roomId: railwayRoomId('starting'),
    store,
    tick: false,
    pidOf: (sid) => (sid === 'late' ? 'latecomer' : 'alice'),
  });
  const sent: Obj[] = [];
  host.onSend((m) => sent.push(m));
  try {
    host.deliver({ t: 'r:open' }, 'a'); // the room has not finished starting
    assert.deepEqual(sent, [{ t: 'r:state', to: 'a', state: 'starting' }]);
    await host.whenReady();
    // Every account slot taken: a new player gets a refusal instead of silence (and stops asking).
    for (let k = 0; accounts(host.rules.railway.world()).length < MAX_PLAYERS; k++)
      assert.ok(host.rules.railway.session(`filler${k}`, 1));
    host.deliver({ t: 'r:open' }, 'late');
    assert.deepEqual(sent.at(-1), { t: 'r:state', to: 'late', state: 'full' });
  } finally {
    await host.close({ save: false });
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('mover clock probes echo the current room step only for a live session, bounded and without state writes', async () => {
  const f = await fixture(railwayRoomId('mover-clock'));
  const replies = () => f.sent.filter((m) => m.t === 'r:clock');
  try {
    f.host.deliver({ t: 'r:clock', at: 100 }, 'a');
    assert.equal(replies().length, 0, 'a clock probe cannot create a session');
    await f.open('a');
    const hash = f.host.rules.railway.world().hash();
    for (const at of [null, '100', NaN, -1, -0, 1.5, 2147483648]) f.host.deliver({ t: 'r:clock', at }, 'a');
    assert.equal(replies().length, 0, 'malformed probes do not consume the reply budget');
    f.host.deliver({ t: 'r:clock', at: 100 }, 'a');
    assert.deepEqual(replies().at(-1), { t: 'r:clock', to: 'a', at: 100, step: f.host.sync.roomStep() });
    assert.equal(f.host.rules.railway.world().hash(), hash);
    f.host.deliver({ t: 'r:clock', at: 999999 }, 'a');
    assert.equal(replies().length, 1, 'client timestamps cannot bypass the host step rate limit');
    await f.step(1);
    f.host.deliver({ t: 'r:clock', at: 200 }, 'a');
    assert.equal(replies().length, 2);
    await f.open('a2');
    f.host.deliver({ t: 'r:clock', at: 300 }, 'a');
    assert.equal(replies().length, 2, 'a taken-over socket cannot sample the room');
  } finally {
    await f.close();
  }
});

test('an r:edit whose op is an object with a non-callable toString never throws in the host and writes nothing', async () => {
  // From the independent review (12 November): String(e.op) on such an op threw out of world.deliver.
  const f = await fixture(railwayRoomId('op-throw'));
  try {
    await f.open('a');
    await f.wake();
    const rules = () => f.host.rules.railway;
    const hash = rules().world().hash();
    const request = rules().account('alice')!.request;
    const packets = f.packets.length;
    f.pose('a', T1.x, T1.z);
    // Each arrives off the socket through JSON, with the session's epoch and next request number.
    for (const op of ['{"toString":0}', '{"toString":0,"valueOf":0}', '[{"toString":0}]', '{}', '[]', 'null', '7']) {
      assert.doesNotThrow(() => f.send('a', { op: JSON.parse(op) }, 1, request + 1), `op ${op}`);
      assert.equal(rules().outcome('alice', 1, request + 1), null, `op ${op}: no outcome recorded`);
    }
    await f.step(1);
    assert.equal(rules().world().hash(), hash, 'nothing written');
    assert.equal(rules().account('alice')!.request, request, 'the request number is not spent');
    assert.equal(
      f.packets.slice(packets).some((x) => x.cid === 'a' && (x.p.ack || x.p.rej)),
      false,
      'dropped like other malformed messages: no ack or rej',
    );
    // The session goes on: the same number, well formed, is settled and acknowledged.
    f.send('a', { op: 'rail.wake' }, 1, request + 1);
    await f.step(1);
    assert.equal(rules().account('alice')!.request, request + 1);
    assert.deepEqual(f.heard('a').acks.at(-1), [1, request + 1]);
  } finally {
    await f.close();
  }
});

test('a tuning edit whose key is an object with a non-callable toString never throws and writes nothing', async () => {
  const f = await fixture(railwayRoomId('key-throw'));
  try {
    await f.open('a');
    const hash = f.host.rules.railway.world().hash();
    const sent = f.sent.length;
    for (const op of ['tune.set', 'tune.commit'])
      for (const key of ['{"toString":0}', '[{"toString":0}]'])
        assert.doesNotThrow(
          () =>
            f.host.deliver(
              { t: 'w:edit', e: { op, i: 0, j: 0, key: JSON.parse(key), v: 1, expectedRevision: 0 } },
              'a',
            ),
          `${op} key ${key}`,
        );
    await f.step(1);
    assert.equal(f.host.rules.railway.world().hash(), hash);
    assert.equal(
      f.sent.slice(sent).some((m) => m.t === 'w:edit' || m.t === 'w:accepted'),
      false,
      'no edit reached the sync',
    );
  } finally {
    await f.close();
  }
});
