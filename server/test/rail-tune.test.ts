// The real server command boundary and browser session adapter, without a browser or a socket.
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { createStore } from '../src/store.ts';
import { createRailwayWorldHost } from '../src/host/world-host.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { createRailwayMirror } from '../../src/world/railway-replicate.ts';
import { createRailwayAdapter, type CommandAccepted, type CommandRefusal } from '../../src/adapters/railway-session.ts';
import { railMovement } from '../../src/adapters/railway-read.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { RAILWAY_WINDOW } from '../../src/sim/railway.ts';
import { RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import type { RecoveryEnvelope, WorldRoom } from '../../src/world/sync.ts';
import type { ServerPacket } from '../../src/world/replicate.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function fixture(t: TestContext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-rail-tune-'));
  const store = createStore({ dataDir: dir, maxRooms: 1 });
  await store.init();
  const roomId = railwayRoomId('proto-rail-tune');
  let held: { gate: ReturnType<typeof deferred<void>>; entered: ReturnType<typeof deferred<void>> } | null = null;
  const writes: RecoveryEnvelope[] = [];
  const host = createRailwayWorldHost({
    roomId,
    tick: false,
    now: () => 1800000000000,
    pidOf: (sid) => sid,
    tuneController: (sid) => sid === 'alice',
    store: {
      ...store,
      async write(id, doc, options) {
        writes.push(doc.data as RecoveryEnvelope);
        const hold = held;
        held = null;
        if (hold) {
          hold.entered.resolve();
          await hold.gate.promise;
        }
        return store.write(id, doc, options);
      },
    },
  });
  await host.whenReady();
  let now = 1000;
  const up: { sid: string; message: unknown }[] = [];
  const clients = new Map<string, ReturnType<typeof join>>();
  const messages: Record<string, unknown>[] = [];
  host.onSend((m) => {
    messages.push(m);
    if (typeof m.to === 'string') clients.get(m.to)?.hear(m);
    else for (const c of clients.values()) c.hear(m);
  });
  function join(sid: string, holdSession = false) {
    const sessionReplies: unknown[] = [];
    const mirror = createRailwayMirror();
    const adapter = createRailwayAdapter({
      mirror,
      pid: sid,
      movement: () => railMovement(mirror.tune),
      pose: () => ({ x: RAILWAY_T1.wake.x / 100, y: 0, z: RAILWAY_T1.wake.z / 100 }),
      now: () => now,
    });
    const incoming = new Set<(m: unknown, from: string) => void>();
    const connection = new Set<(live: boolean) => void>();
    const accepted: CommandAccepted[] = [];
    const refused: CommandRefusal[] = [];
    const edits: Record<string, unknown>[] = [];
    const packets: ServerPacket[] = [];
    let live = true;
    const room: WorldRoom = {
      selfId: sid,
      send(message) {
        if (!live) return;
        const m = message as { t?: string; e?: Record<string, unknown> };
        if (m.t === 'r:edit' && m.e) edits.push(m.e);
        up.push({ sid, message });
      },
      onMessage: (fn) => (incoming.add(fn), () => incoming.delete(fn)),
      onConnection: (fn) => (connection.add(fn), () => connection.delete(fn)),
    };
    const c = {
      mirror,
      adapter,
      accepted,
      refused,
      edits,
      packets,
      hear(m: unknown) {
        if (holdSession && m && typeof m === 'object' && 't' in m && m.t === 'r:session') {
          sessionReplies.push(m);
          return;
        }
        if (live) for (const fn of incoming) fn(m, SERVER_ID);
      },
      releaseSession() {
        holdSession = false;
        for (const m of sessionReplies.splice(0)) c.hear(m);
      },
      disconnect() {
        live = false;
        host.replication.removeClient(sid);
        for (let k = up.length - 1; k >= 0; k--) if (up[k]!.sid === sid) up.splice(k, 1);
        for (const fn of connection) fn(false);
      },
      reconnect() {
        live = true;
        host.replication.addClient(sid);
        for (const fn of connection) fn(true);
      },
    };
    clients.set(sid, c);
    host.replication.addClient(sid);
    adapter.onAccepted((event) => accepted.push(event), 'command');
    adapter.onRefused((event) => refused.push(event), 'command');
    adapter.attach(room);
    return c;
  }
  function run(n = 1) {
    for (let i = 0; i < n; i++) {
      for (const { sid, message } of up.splice(0)) host.deliver(message, sid);
      host.step(0.017);
      const step = host.sync.roomStep();
      host.replication.commit(step);
      host.replication.flush(step, (sid, packet) => {
        const c = clients.get(sid);
        c?.packets.push(structuredClone(packet));
        c?.hear(packet);
      });
      now += 17;
      for (const c of clients.values()) c.adapter.update(now);
    }
  }
  async function settled() {
    await setImmediate();
    await host.sync.whenDurable();
    await setImmediate();
    run(2);
  }
  t.after(async () => {
    for (const c of clients.values()) c.adapter.dispose();
    await host.close({ save: false }).catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  });
  return {
    host,
    store,
    roomId,
    writes,
    messages,
    join,
    run,
    settled,
    holdNextWrite() {
      const h = { gate: deferred<void>(), entered: deferred<void>() };
      held = h;
      return h;
    },
  };
}

const commit = (revision: number, value = 44) => ({
  key: 'railRegrowMinutes',
  v: value,
  expectedRevision: revision,
  requestId: `commit-${revision}-${value}`,
});

test('rail tune: two mirrors, late join, stale revision and wrong controller', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  const b = f.join('bob');
  f.run(3);
  assert.equal(a.adapter.read.ready(), true);
  assert.equal(a.adapter.act('tune.commit', commit(0)), 1);
  f.run();
  await f.settled();
  assert.equal(a.accepted.length, 1);
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 44);
  assert.deepEqual(a.mirror.tune.tune.v, b.mirror.tune.tune.v);
  assert.equal(a.mirror.tune.tune.revision, 1);
  const late = f.join('late');
  f.run(3);
  assert.equal(late.mirror.tune.get('railRegrowMinutes'), 44, 'whole snapshot includes tuned values');
  assert.deepEqual(late.mirror.tune.tune.v, a.mirror.tune.tune.v);
  assert.equal(a.adapter.act('tune.commit', commit(0, 45)), 2);
  assert.equal(b.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 46 }), 1);
  f.run(2);
  assert.equal(a.refused.at(-1)?.reason, 'refused');
  assert.equal(b.refused.at(-1)?.reason, 'refused');
  assert.equal(f.host.rules.railTune.get('railRegrowMinutes'), 44);
  const hashes = f.host.sync.stateHashes();
  assert.equal(Object.hasOwn(hashes, 'railTune'), false);
  assert.equal(Object.keys(f.host.rules.tune.tune.v).length, 8);
});

test('rail tune: reconnect retains a pending commit and waits for its durable receipt', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  const hold = f.holdNextWrite();
  assert.equal(a.adapter.act('tune.commit', commit(0)), 1);
  f.run();
  await hold.entered.promise;
  assert.equal(a.accepted.length, 0, 'in-memory value is not an accepted durable receipt');
  a.disconnect();
  a.reconnect();
  f.run(2);
  assert.equal(a.accepted.length, 0, 'r:open during the write cannot settle the commit');
  hold.gate.resolve();
  await f.settled();
  f.run(40); // the existing session probe interval; same epoch resends its exact request
  await f.settled();
  assert.equal(a.accepted.length, 1);
  assert.equal(a.accepted[0]?.request, 1);
  assert.equal(a.refused.length, 0);
  assert.equal(f.host.rules.railTune.tune.revision, 1, 'resend applies once');
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 44);
  assert.ok(a.edits.filter((e) => e.request === 1).length >= 2, 'same identity was retried');
  const saved = (await f.store.read(f.roomId))!.data as RecoveryEnvelope;
  assert.equal((saved.checkpoint.data.railTune as { revision: number }).revision, 1);
});

test('rail tune: duplicate requests and stale packets cannot apply twice; request gaps are refused', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  const oldPacket = a.packets.at(-1)!;
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 41 }), 1);
  f.run(2);
  f.host.deliver({ t: 'r:edit', e: a.edits[0] }, 'alice');
  f.run();
  assert.equal(f.host.rules.railTune.tune.revision, 1);
  assert.equal(a.accepted.length, 1);
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 42 }), 2);
  f.run(2);
  a.hear(oldPacket);
  a.hear(a.packets.at(-1)!);
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 42);
  assert.equal(a.accepted.length, 2);
  f.host.deliver({ t: 'r:edit', e: { ...a.edits.at(-1), request: 4, v: 43 } }, 'alice');
  f.run();
  assert.ok(a.packets.some((p) => p.rej?.some(([, r, why]) => r === 4 && why === 'order')));
  assert.equal(f.host.rules.railTune.tune.revision, 2);
});

test('rail tune and predicted actions use one bounded request window', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  assert.equal(a.adapter.wake(), true);
  for (let k = 1; k < RAILWAY_WINDOW; k++)
    assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 30 + k }), k + 1);
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 50 }), false);
  f.run(2);
  assert.deepEqual(
    a.edits.map((e) => e.request),
    Array.from({ length: RAILWAY_WINDOW }, (_, i) => i + 1),
  );
  assert.equal(a.accepted.length, RAILWAY_WINDOW - 1);
  assert.equal(a.adapter.act('tune.set', { key: 'railRegrowMinutes', v: 50 }), RAILWAY_WINDOW + 1);
  f.run(2);
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 50);
});

test('rail tune: failed durable write reports unknown and never checkpoints the fatal state', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  f.run(3);
  const before = await f.store.read(f.roomId);
  const hold = f.holdNextWrite();
  assert.equal(a.adapter.act('tune.commit', commit(0)), 1);
  f.run();
  await hold.entered.promise;
  hold.gate.reject(new Error('disk unavailable'));
  await setImmediate();
  await setImmediate();
  assert.equal(a.accepted.length, 0);
  assert.equal(a.refused.at(-1)?.reason, 'storage');
  assert.equal(f.host.status().ready, false);
  const writes = f.writes.length;
  f.run(200);
  f.host.pause();
  await assert.rejects(f.host.close(), /storage/);
  assert.equal(f.writes.length, writes, 'periodic, pause and close paths never start another write');
  assert.deepEqual(await f.store.read(f.roomId), before, 'last good file is intact');
});

test('rail tune readiness is notified when the session arrives after its whole snapshot', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice', true);
  let ready = 0;
  a.adapter.onReady(() => ready++);
  f.run(3);
  assert.equal(a.mirror.synced(), true);
  assert.equal(a.adapter.read.ready(), false);
  assert.equal(ready, 0);
  a.releaseSession();
  assert.equal(a.adapter.read.ready(), true);
  assert.equal(ready, 1, 'session arrival unblocks a command waiting for both authorities');
  f.run(3);
  assert.equal(ready, 1, 'ordinary packets do not repeat readiness');
});
