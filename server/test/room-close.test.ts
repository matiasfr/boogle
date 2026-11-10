// A room's close always ends (server/src/host/rooms.ts, closeRoom): a close that fails or never settles leaves its
// room's `closing` slot, so the next join loads the room again from its last good file instead of being refused with
// `bye restart` until the process restarts (the live `smoke-node-2` lockout, 10 November).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createStore, type Store } from '../src/store.ts';
import { createRoomHost } from '../src/host/rooms.ts';
import type { RailwayWorldHost } from '../src/host/world-host.ts';
import { CLOSE } from '../../src/net/ws-wire.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

type Obj = Record<string, unknown>;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, label: string, ms = 4000) {
  const end = performance.now() + ms;
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
  return { ws, closed, first };
}
async function manager(store: Store, t: test.TestContext) {
  const logs: string[] = [];
  const rooms = createRoomHost(
    {
      serverRooms: ['*'],
      roomIdleMs: 0,
      roomCloseMs: 600,
      maxHostedRooms: 8,
      upgradesPerMin: 1000,
      allowedOrigins: ['*'],
      trustProxy: false,
      maxPlayers: 8,
      serverSaveMs: 600000,
      reconnectGraceMs: 0,
      deadMs: 100000,
      housekeepMs: 50,
      log: (...args) => logs.push(args.map(String).join(' ')),
    },
    store,
  );
  const server = createServer();
  server.on('upgrade', (req, socket, head) => rooms.upgrade(req, socket, head));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const sockets: WebSocket[] = [];
  t.after(async () => {
    for (const ws of sockets) ws.close();
    await Promise.race([rooms.close({ save: false }).catch(() => {}), sleep(2000)]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const base = `ws://127.0.0.1:${address.port}`;
  return {
    rooms,
    logs,
    join(room: string, sid: string) {
      const c = connect(base, room, sid);
      sockets.push(c.ws);
      return c;
    },
  };
}
async function tmpStore(t: test.TestContext) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-room-close-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  return { dataDir, base: createStore({ dataDir, maxRooms: 8 }) };
}

test('a room whose save did not load cleanly can be joined again after its idle close', async (t) => {
  const { dataDir, base } = await tmpStore(t);
  // An unloadable save (a reshaped state, a corrupt file): the room loads a fresh fallback that is never saved, so its
  // close with save rejects. That rejection used to fence the room in `closing` for the life of the process.
  const id = 'smoke-node-2';
  const file = path.join(dataDir, `${id}.json`);
  const original = JSON.stringify({ tick: 5, writerId: 'server', data: 'not a snapshot', updatedAt: 'fixture' });
  await fs.writeFile(file, original);
  await base.init();
  const app = await manager(base, t);
  const a = app.join(id, 'first');
  assert.equal((await a.first()).t, 'welcome');
  const room = app.rooms.room(id)!;
  assert.equal(room.status().noSave, true, 'the fallback is marked no-save');
  a.ws.close();
  await a.closed;
  await until(() => app.logs.some((l) => l.includes(`room ${id}: close `)), 'close failure reported');
  const b = app.join(id, 'second');
  assert.equal((await b.first()).t, 'welcome', 'the next join loads the room again');
  assert.notEqual(app.rooms.room(id), room, 'from a new authority');
  assert.equal(app.rooms.room(id)!.status().noSave, true, 'which still never saves over the unloadable file');
  assert.equal(await fs.readFile(file, 'utf8'), original, 'the save is untouched');
});

test('a close whose save never settles times out, fences the old writer and lets the next join load', async (t) => {
  const { base } = await tmpStore(t);
  await base.init();
  // Writes wait here while `hang` is set: a filesystem that stops answering, until release().
  let hang = true;
  const held: (() => void)[] = [];
  let writes = 0;
  const store: Store = {
    ...base,
    write(...args) {
      writes++;
      if (!hang) return base.write(...args);
      return new Promise((resolve, reject) => held.push(() => base.write(...args).then(resolve, reject)));
    },
  };
  const release = () => {
    hang = false;
    for (const go of held.splice(0)) go();
  };
  const app = await manager(store, t);
  // A railway room's close first awaits its startup checkpoint, then saves: a close that outlives its timeout could
  // still write afterwards, which is what the fence stops.
  const id = railwayRoomId('close-hang');
  const a = app.join(id, 'first');
  assert.equal((await a.first()).t, 'welcome');
  const room = app.rooms.room(id)!;
  let closeStarted = false;
  let closeSettled = false;
  const close = room.close;
  room.close = (o) => {
    closeStarted = true;
    return close(o).finally(() => (closeSettled = true));
  };
  await until(() => held.length > 0, 'the startup checkpoint is writing');
  a.ws.close();
  await a.closed;
  await until(() => closeStarted, 'the idle close is draining');
  const during = app.join(id, 'during');
  assert.equal((await during.first()).t, 'bye', 'a join racing the close is refused');
  assert.equal(await during.closed, CLOSE.RESTART);
  await until(() => app.logs.some((l) => l.includes(`room ${id}: close failed`) && l.includes('timed out')), 'timeout');
  assert.notEqual(app.rooms.room(id), room, 'the timed-out authority leaves its slot');
  // The filesystem answers again: the old close resumes, and its last save must not reach the store.
  const before = writes;
  release();
  await until(() => closeSettled, 'the old close ran on');
  assert.equal(writes, before, 'the fenced authority writes nothing more');
  assert.ok((room.world as RailwayWorldHost).status().recoveryError, 'its refused save stops it');
  const b = app.join(id, 'second');
  assert.equal((await b.first()).t, 'welcome', 'the next join loads the room again');
  assert.notEqual(app.rooms.room(id), room, 'from a new authority');
});

test('shutdown with a save that never settles is bounded and reports the failure', async (t) => {
  const { base } = await tmpStore(t);
  await base.init();
  let hang = false;
  const store: Store = {
    ...base,
    write(...args) {
      return hang ? new Promise(() => {}) : base.write(...args);
    },
  };
  const app = await manager(store, t);
  const a = app.join('shutdown-hang', 'first');
  assert.equal((await a.first()).t, 'welcome');
  hang = true;
  const outcome = await Promise.race([
    app.rooms.close({ save: true }).then(
      () => 'resolved',
      (error: unknown) => (error instanceof AggregateError ? 'reported' : String(error)),
    ),
    sleep(3000).then(() => 'hung'),
  ]);
  assert.equal(outcome, 'reported');
});
