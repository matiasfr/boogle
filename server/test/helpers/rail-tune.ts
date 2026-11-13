// The real server command boundary and browser session adapter, without a browser or a socket.
import type { TestContext } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { createStore } from '../../src/store.ts';
import { createRailwayWorldHost } from '../../src/host/world-host.ts';
import { railwayRoomId } from '../../../src/world/railway-namespace.ts';
import { createRailwayMirror } from '../../../src/world/railway-replicate.ts';
import {
  createRailwayAdapter,
  type CommandAccepted,
  type CommandRefusal,
} from '../../../src/adapters/railway-session.ts';
import { railMovement } from '../../../src/adapters/railway-read.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import { RAILWAY_T1 } from '../../../src/sim/railway-layout.ts';
import type { RecoveryEnvelope, WorldRoom } from '../../../src/world/sync.ts';
import type { ServerPacket } from '../../../src/world/replicate.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export async function fixture(t: TestContext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-rail-tune-'));
  const store = createStore({ dataDir: dir, maxRooms: 1 });
  await store.init();
  const roomId = railwayRoomId('proto-rail-tune');
  let held: { gate: ReturnType<typeof deferred<void>>; entered: ReturnType<typeof deferred<void>> } | null = null;
  const writes: RecoveryEnvelope[] = [];
  let serverNow = 1800000000000;
  const makeHost = () =>
    createRailwayWorldHost({
      roomId,
      tick: false,
      now: () => serverNow,
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
  let host = makeHost();
  await host.whenReady();
  let now = 1000;
  const up: { sid: string; message: unknown }[] = [];
  const clients = new Map<string, ReturnType<typeof join>>();
  const messages: Record<string, unknown>[] = [];
  const bindHost = () =>
    host.onSend((m) => {
      messages.push(m);
      if (typeof m.to === 'string') clients.get(m.to)?.hear(m);
      else for (const c of clients.values()) c.hear(m);
    });
  bindHost();
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
      serverNow += 17;
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
    get host() {
      return host;
    },
    store,
    roomId,
    writes,
    messages,
    join,
    run,
    settled,
    /** A new host reads the same verified store; clients retain their adapters and predicted presentation. */
    async restart() {
      for (const c of clients.values()) c.disconnect();
      await host.close();
      host = makeHost();
      await host.whenReady();
      bindHost();
    },
    now: () => serverNow,
    advanceTime: (ms: number) => {
      serverNow += ms;
    },
    holdNextWrite() {
      const h = { gate: deferred<void>(), entered: deferred<void>() };
      held = h;
      return h;
    },
  };
}
