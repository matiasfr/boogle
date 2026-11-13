// Exercise the real room manager's idle eviction/rejoin boundary, sockets and store lock.
// Keep T1's expected carry at two: every published chop must survive authority replacement.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer, request } from 'node:http';
import { createService, loadConfig } from '../src/server.ts';
import { createStore, type Store } from '../src/store.ts';
import { createRoomHost } from '../src/host/rooms.ts';
import type { HostedRoom } from '../src/host/hosted-room.ts';
import type { RailwayWorldHost } from '../src/host/world-host.ts';
import { isRailwayRoom, railwayRoomId } from '../../src/world/railway-namespace.ts';
import { WORLD_NS } from '../../src/world/namespace.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../src/sim/railway-layout.ts';
import { CLOSE } from '../../src/net/ws-wire.ts';

type Obj = Record<string, unknown>;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, label: string) {
  const end = performance.now() + 4000;
  while (!predicate()) {
    if (performance.now() > end) throw new Error(`timeout: ${label}`);
    await sleep(5);
  }
}
function connect(base: string, room: string, sid: string) {
  const ws = new WebSocket(`${base}/room/${room}?self=${sid}&pid=alice&key=alicekey000000000000&b=test`, ['boogle.1']);
  const messages: Obj[] = [];
  ws.onmessage = (e) => messages.push(JSON.parse(String(e.data)) as Obj);
  const closed = new Promise<number>((resolve) => {
    ws.onclose = (e) => resolve(e.code);
  });
  const first = async () => {
    await until(() => messages.length > 0, `${sid} first message`);
    return messages[0]!;
  };
  const world = (type: string) =>
    messages.filter((m) => m.t === 'm' && (m.d as Obj)?.t === type).map((m) => m.d as Obj);
  // Railway acks ride on replication packets (src/world/replicate.ts): [epoch, request] applied.
  const acked = (request: number) => world('s').some((p) => Array.isArray(p.ack) && p.ack[1] >= request);
  const send = (m: Obj) => ws.send(JSON.stringify(m));
  const request = async (message: Obj, done: () => boolean, label: string) => {
    let next = 0;
    await until(() => {
      if (done()) return true;
      if (performance.now() >= next) {
        send({ t: 'm', d: message });
        next = performance.now() + 50;
      }
      return false;
    }, label);
  };
  return { ws, messages, closed, first, world, send, request, acked };
}
async function manager(store: Store) {
  const logs: unknown[][] = [];
  const rooms = createRoomHost(
    {
      serverRooms: ['*'],
      roomIdleMs: 0,
      maxHostedRooms: 8,
      upgradesPerMin: 1000,
      allowedOrigins: ['*'],
      trustProxy: false,
      maxPlayers: 8,
      serverSaveMs: 600000,
      reconnectGraceMs: 0,
      deadMs: 100000,
      housekeepMs: 50,
      log: (...args) => logs.push(args),
    },
    store,
  );
  const server = createServer();
  server.on('upgrade', (req, socket, head) => rooms.upgrade(req, socket, head));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    rooms,
    logs,
    base: `ws://127.0.0.1:${address.port}`,
    async close() {
      try {
        await rooms.close({ save: false });
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  };
}
const railwayHost = (room: HostedRoom) => room.world as RailwayWorldHost;
function material(room: HostedRoom) {
  return 'rules' in room.world
    ? (railwayHost(room).rules.railway.account('alice')?.carry ?? 0)
    : room.world.sync.world.tick;
}
async function drain(room: HostedRoom, store: Store, id: string) {
  room.world.sync.saveNow(true);
  await room.world.sync.whenDurable();
  await store.withLock(id, async () => {});
}
async function prepare(room: HostedRoom, client: ReturnType<typeof connect>, railway: boolean) {
  if (!railway) return;
  await railwayHost(room).whenReady();
  // Like the real client, ask for a session until one is issued.
  await client.request({ t: 'r:open' }, () => client.world('r:session').length > 0, 'session');
  client.send({ t: 'p', s: 1, d: { v: 1, p: [T1.x / 100, 0, T1.z / 100] } });
  client.send({ t: 'm', d: { t: 'r:edit', e: { op: 'rail.wake', epoch: 1, request: 1, at: [T1.x, 0, T1.z], ms: 0 } } });
  await until(() => {
    room.world.step(1 / 60);
    return client.acked(1);
  }, 'wake acknowledged');
  const rules = railwayHost(room).rules;
  // updateWorld() is a silent no-op while a stamp or checkpoint is unpublished, so a fixed number of manual
  // steps can all be dropped behind a slow durable write. Drive the clock until the wake has really finished.
  await until(() => {
    room.world.step(0.5);
    return rules.railway.phase() === 'idle';
  }, 'wake finished');
}
async function evidence(name: string, value: unknown) {
  const dir = new URL('../../.look/core-t1-spine/', import.meta.url);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(new URL(name, dir), JSON.stringify(value, null, 2));
}

function upgradeStatus(base: string) {
  return new Promise<number>((resolve, reject) => {
    const req = request(`${base.replace('ws:', 'http:')}/room/newroom?self=late&pid=alice&key=alicekey000000000000`, {
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Protocol': 'boogle.1',
      },
    });
    req.on('response', (res) => {
      res.resume();
      resolve(res.statusCode!);
    });
    req.on('upgrade', (_res, socket) => {
      socket.destroy();
      resolve(101);
    });
    req.on('error', reject);
    req.end();
  });
}

for (const id of [`${WORLD_NS}-boogle`, `${WORLD_NS}-beach`, railwayRoomId('eviction')]) {
  test(`real room manager preserves the closing authority before rejoin: ${id}`, async (t) => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-manager-eviction-'));
    const store = createStore({ dataDir, maxRooms: 8 });
    await store.init();
    const app = await manager(store);
    const clients: ReturnType<typeof connect>[] = [];
    let release: (() => void) | undefined;
    t.after(async () => {
      release?.();
      for (const c of clients) c.ws.close();
      await app.close();
      await fs.rm(dataDir, { recursive: true, force: true });
    });
    const railway = isRailwayRoom(id);
    const original = connect(app.base, id, 'old');
    clients.push(original);
    assert.equal((await original.first()).t, 'welcome');
    const old = app.rooms.room(id)!;
    await prepare(old, original, railway);
    await drain(old, store, id);
    const initial = material(old);
    if (railway) assert.equal(initial, 0);
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blocked = store.withLock(id, () => gate);
    let published = false;
    old.world.onSend((m) => {
      if (!railway && m.t === 'w:c' && (m.ht as number) > initial) published = true;
    });
    if (railway) {
      const source = RAILWAY_SOURCES[0]!;
      original.send({ t: 'p', s: 2, d: { v: 1, p: [source[1] / 100, 0, source[2] / 100] } });
      original.send({
        t: 'm',
        d: {
          t: 'r:edit',
          e: {
            op: 'rail.chop',
            id: source[0],
            epoch: 1,
            request: 2,
            at: [source[1], 0, source[2]],
            ms: 1000,
            yaw: 0.5,
            collapsed: false,
          },
        },
      });
      // Applied on arrival and replicated; its durability is the close's save (the store lock holds it back).
      await until(() => material(old) === 2, 'chop applied');
      published = true;
    } else {
      old.world.step(0.2);
      assert.ok(material(old) > initial, 'ordinary room advances its clock');
      old.world.sync.saveNow(true);
    }
    let closing = false;
    const close = old.close.bind(old);
    old.close = (options) => {
      closing = true;
      return close(options);
    };
    original.ws.close();
    await original.closed;
    await until(() => closing, 'idle close began');
    const during = connect(app.base, id, 'during');
    clients.push(during);
    const duringFirst = await during.first();
    const overlapping = duringFirst.t === 'welcome';
    const changedAuthority = app.rooms.room(id) !== old;
    assert.ok(release);
    release();
    await blocked;
    if (overlapping) await until(() => old.world.status().mode === 'local', 'old close drained');
    else await until(() => !app.rooms.room(id), 'closing room removed after drain');
    let replacement = app.rooms.room(id);
    if (!overlapping) {
      assert.equal(await during.closed, CLOSE.RESTART);
      const retry = connect(app.base, id, 'retry');
      clients.push(retry);
      assert.equal((await retry.first()).t, 'welcome');
      replacement = app.rooms.room(id);
    }
    assert.ok(replacement);
    if (railway) await railwayHost(replacement).whenReady();
    const restored = material(replacement);
    await drain(replacement, store, id);
    const result = {
      room: id,
      kind: railway ? 'railway (Server kind)' : 'ordinary server clock',
      initial,
      published,
      overlapping,
      changedAuthority,
      expected: railway ? 2 : old.world.sync.world.tick,
      restored,
      receipt: railway ? railwayHost(replacement).rules.railway.outcome('alice', 1, 2) : null,
      saved: store.readSync(id),
    };
    await evidence(`manager-eviction-${id}-${overlapping ? 'before' : 'after'}.json`, result);
    console.log(
      `[manager-eviction] ${id}: overlapping=${overlapping} published=${published} restored=${restored} expected=${result.expected}`,
    );
    assert.ok(published, 'accepted state or clock was published');
    if (railway) assert.equal(restored, result.expected, 'saved accepted material must survive eviction and rejoin');
    else assert.ok(restored >= result.expected, 'the restored clock cannot move backwards');
    assert.equal(overlapping, false, 'rejoin cannot create another writer while close drains');
    assert.equal(changedAuthority, false, 'the old authority retains its manager slot until durable close');
  });
}

for (const [id, failure] of [
  [`${WORLD_NS}-boogle`, 'refused'],
  [railwayRoomId('eviction'), 'io'],
] as const) {
  test(`failed close fences its writer, keeps its last good file and frees the room: ${id}`, async (t) => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-manager-refusal-'));
    const base = createStore({ dataDir, maxRooms: 8 });
    await base.init();
    let fail = false;
    const store: Store = {
      ...base,
      async write(...args) {
        if (fail) {
          if (failure === 'io') throw new Error('injected close I/O failure');
          return { status: 507, body: { error: 'injected refused close' } };
        }
        return base.write(...args);
      },
    };
    const app = await manager(store);
    const clients: ReturnType<typeof connect>[] = [];
    t.after(async () => {
      for (const c of clients) c.ws.close();
      await app.close();
      await fs.rm(dataDir, { recursive: true, force: true });
    });
    const client = connect(app.base, id, 'initial');
    clients.push(client);
    assert.equal((await client.first()).t, 'welcome');
    const room = app.rooms.room(id)!;
    const railway = isRailwayRoom(id);
    await prepare(room, client, railway);
    if (railway) {
      const source = RAILWAY_SOURCES[0]!;
      client.send({ t: 'p', s: 2, d: { v: 1, p: [source[1] / 100, 0, source[2] / 100] } });
      client.send({
        t: 'm',
        d: {
          t: 'r:edit',
          e: {
            op: 'rail.chop',
            id: source[0],
            epoch: 1,
            request: 2,
            at: [source[1], 0, source[2]],
            ms: 1000,
            yaw: 0.5,
            collapsed: false,
          },
        },
      });
    } else room.world.step(0.2);
    await until(() => (railway ? material(room) === 2 : material(room) >= 2), 'saved accepted state or clock');
    await drain(room, store, id);
    const expected = material(room);
    const file = path.join(dataDir, `${id}.json`);
    const before = await fs.readFile(file, 'utf8');
    fail = true;
    client.ws.close();
    await client.closed;
    await until(() => app.logs.some((args) => String(args[0]).includes('close failed')), 'close failure reported');
    // The failed authority is fenced (its later writes are refused) and frees its slot: no lockout until a restart.
    await until(() => app.rooms.room(id) !== room, 'failure frees the authority slot');
    assert.equal(await fs.readFile(file, 'utf8'), before, 'failed close never overwrites the last good file');
    fail = false;
    const retry = connect(app.base, id, 'retry');
    clients.push(retry);
    assert.equal((await retry.first()).t, 'welcome', 'the next join loads the room again');
    const next = app.rooms.room(id)!;
    assert.notEqual(next, room, 'from a new authority');
    if (railway) await railwayHost(next).whenReady();
    if (railway) assert.equal(material(next), expected, 'which loads the last good save');
    else assert.ok(material(next) >= expected, 'which resumes the last good clock');
    await evidence(`manager-close-${id}.json`, {
      room: id,
      failure,
      fenced: true,
      expectedMaterial: expected,
      lastGoodUnchanged: true,
      rejoin: 'welcome',
    });
  });
}

test('shutdown fences new upgrades and drains other writes before reporting a refused close', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-manager-shutdown-'));
  const base = createStore({ dataDir, maxRooms: 8 });
  await base.init();
  let refuse = false;
  const store: Store = {
    ...base,
    async write(...args) {
      if (refuse && args[0] === `${WORLD_NS}-boogle`) return { status: 507, body: { error: 'refused shutdown write' } };
      return base.write(...args);
    },
  };
  const app = await manager(store);
  let release: (() => void) | undefined;
  t.after(async () => {
    release?.();
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  const a = connect(app.base, `${WORLD_NS}-boogle`, 'a');
  const b = connect(app.base, `${WORLD_NS}-beach`, 'b');
  await a.first();
  await b.first();
  await drain(app.rooms.room(`${WORLD_NS}-boogle`)!, store, `${WORLD_NS}-boogle`);
  await drain(app.rooms.room(`${WORLD_NS}-beach`)!, store, `${WORLD_NS}-beach`);
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const blocked = base.withLock(`${WORLD_NS}-beach`, () => gate);
  refuse = true;
  const closing = app.rooms.close({ save: true });
  let settled = false;
  void closing.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  await until(
    () => app.logs.some((line) => String(line[0]).includes(`${WORLD_NS}-boogle: close failed`)),
    'refused shutdown close',
  );
  assert.equal(settled, false, 'failure in one room must not return while another writer is blocked');
  assert.equal(await upgradeStatus(app.base), 503);
  assert.equal(app.rooms.room('newroom'), undefined);
  assert.ok(release);
  release();
  await blocked;
  await assert.rejects(closing, /rooms failed to close/);
  assert.ok(base.readSync(`${WORLD_NS}-beach`), 'the other room finished its durable close');
  await a.closed;
  await b.closed;
  await evidence('manager-shutdown.json', { refusedCloseReported: true, otherWriterDrained: true, lateUpgrade: 503 });
});

test('service shutdown closes HTTP even when its room reports a save failure', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-service-close-'));
  const service = createService(
    loadConfig({ DATA_DIR: dataDir, SERVER_ROOMS: `${WORLD_NS}-beach` }, { log: () => {} }),
  );
  const port = await service.listen(0);
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const room = service.roomHost()!.room(`${WORLD_NS}-beach`)!;
  const close = room.close.bind(room);
  room.close = async () => {
    await close({ save: false });
    throw new Error('reported save failure');
  };
  await assert.rejects(service.close(), /rooms failed to close/);
  await assert.rejects(fetch(`http://127.0.0.1:${port}/health`), /fetch failed/);
});
